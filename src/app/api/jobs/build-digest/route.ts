/**
 * POST /api/jobs/build-digest?userId=<UUID>
 *
 * Updated digest builder that merges Stream A (RSS) + Stream B (WebSearch).
 *
 * Flow:
 * 1. Load user profile + interests
 * 2. Get Stream A (RSS) candidates from articles table
 * 3. Decide if Stream B (WebSearch) is needed
 * 4. Apply source filter → paywall check → dedupe → rank → select top 8
 * 5. Summarize each selected article
 * 6. Build digest HTML + text
 * 7. Save to digests table
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getStage2Config } from '@/lib/stage2/config';
import type {
  CandidateArticle,
  DepthLevel,
  ScoredCandidate,
} from '@/lib/stage2/types';
import {
  extractDomain,
  matchDomain,
  loadRules,
  getQualityTier,
  isTierBlocked,
} from '@/lib/source-filter';
import type { SourceRecord } from '@/lib/source-filter';
import type { SourceRule } from '@/lib/stage2/types';
import { checkPaywall } from '@/lib/paywall/detector';
import { canonicalizeUrl } from '@/lib/dedupe/url-canonicalizer';
import { deduplicateCandidates, buildClusters } from '@/lib/dedupe/cluster';
import { scoreCandidate, selectTopCandidates } from '@/lib/ranking';
import { summarizeArticle } from '@/lib/summarization';
import type { SummarizationInput } from '@/lib/summarization';
import { renderDigestItemWithCluster } from '@/lib/email/cluster-section';
import { renderCoverageNote } from '@/lib/email/coverage-note';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'userId query parameter required' },
      { status: 400 }
    );
  }

  try {
    // ── 1. Load user ──────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        interests: true,
      },
    });

    if (!user || !user.profile) {
      return NextResponse.json(
        { ok: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const depthLevel = (user.profile.depthLevel || 'quick') as DepthLevel;
    const today = new Date().toISOString().split('T')[0];

    // Check if digest already exists for today
    const existingDigest = await prisma.digest.findUnique({
      where: {
        userId_runDate: { userId, runDate: new Date(today) },
      },
    });

    if (existingDigest) {
      return NextResponse.json({
        ok: true,
        message: 'Digest already exists for today',
        digestId: existingDigest.id,
      });
    }

    // ── 2. Load sources + rules for filtering ──────────────
    const sources = await prisma.source.findMany({
      select: { url: true, qualityTier: true },
    });
    const sourceRecords: SourceRecord[] = sources.map((s) => ({
      url: s.url,
      qualityTier: s.qualityTier,
    }));

    const rules = await loadRules(async () => {
      const dbRules = await prisma.sourceRule.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return dbRules.map(
        (r): SourceRule => ({
          id: r.id,
          pattern: r.pattern,
          action: r.action as 'allow' | 'block',
          reason: r.reason,
          createdAt: r.createdAt,
        })
      );
    });

    // ── 3. Stream A: RSS candidates ──────────────────────────
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const rssArticles = await prisma.article.findMany({
      where: {
        fetchedAt: { gte: cutoff },
        accessStatus: { not: 'paywalled' },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    const rssCandidates: CandidateArticle[] = rssArticles.map((a) => {
      const domain = extractDomain(a.canonicalUrl);
      const tier = domain
        ? getQualityTier(domain, sourceRecords)
        : 3;

      return {
        url: a.canonicalUrl,
        canonicalUrl: canonicalizeUrl(a.canonicalUrl),
        title: a.title,
        sourceName: a.sourceName,
        snippet: a.snippet,
        publishedAt: a.publishedAt,
        streamOrigin: 'rss' as const,
        qualityTier: tier,
        matchedInterestId: null,
        matchedSection: null,
      };
    });

    // ── 4. Decide if Stream B needed ─────────────────────────
    let webSearchCandidates: CandidateArticle[] = [];
    let webSearchUsed = false;
    const config = getStage2Config();

    const sectionCounts = new Map<string, number>();
    for (const interest of user.interests) {
      const count = rssCandidates.filter((c) =>
        c.title.toLowerCase().includes(interest.label.toLowerCase()) ||
        (c.snippet?.toLowerCase().includes(interest.label.toLowerCase()) ?? false)
      ).length;
      const current = sectionCounts.get(interest.section) ?? 0;
      sectionCounts.set(interest.section, current + count);
    }

    const hasEmptySection = [...sectionCounts.values()].some((c) => c === 0);
    const totalEligible = rssCandidates.length;

    const shouldWebSearch =
      config.webSearchEnabled &&
      (totalEligible < 6 ||
        hasEmptySection ||
        depthLevel === 'standard' ||
        depthLevel === 'expanded');

    if (shouldWebSearch) {
      webSearchUsed = true;

      // Load pre-fetched search results from today
      const searchResults = await prisma.searchResult.findMany({
        where: {
          searchQuery: {
            userId,
            runDate: new Date(today),
          },
        },
        include: { searchQuery: true },
      });

      webSearchCandidates = searchResults.map((sr) => {
        const domain = extractDomain(sr.url);
        const tier = domain
          ? getQualityTier(domain, sourceRecords)
          : 3;

        return {
          url: sr.url,
          canonicalUrl: canonicalizeUrl(sr.url),
          title: sr.title,
          sourceName: sr.sourceName ?? (domain ?? 'Unknown'),
          snippet: sr.snippet,
          publishedAt: sr.publishedAt,
          streamOrigin: 'websearch' as const,
          qualityTier: tier,
          matchedInterestId: null,
          matchedSection: null,
        };
      });
    }

    // ── 5. Merge + Filter ────────────────────────────────────
    const allCandidates = [...rssCandidates, ...webSearchCandidates];

    const filtered = allCandidates.filter((c) => {
      // Quality tier filter
      if (isTierBlocked(c.qualityTier)) return false;

      // Source rule filter
      const domain = extractDomain(c.url);
      if (domain) {
        const ruleResult = matchDomain(domain, rules);
        if (ruleResult.action === 'block') return false;
      }

      return true;
    });

    // ── 6. Paywall check (batch, concurrent) ─────────────────
    const paywallResults = await Promise.all(
      filtered.slice(0, 40).map(async (c) => {
        const result = await checkPaywall(c.url);
        return { candidate: c, paywall: result };
      })
    );

    const accessible = paywallResults
      .filter((r) => r.paywall.status === 'ok')
      .map((r) => r.candidate);

    // ── 7. Score + match interests ───────────────────────────
    const scored: ScoredCandidate[] = [];

    for (const candidate of accessible) {
      let bestScore = 0;
      let bestInterestId = '';
      let bestSection = '';

      for (const interest of user.interests) {
        let matchScore = 0;
        const labelLower = interest.label.toLowerCase();
        const titleLower = candidate.title.toLowerCase();
        const snippetLower = candidate.snippet?.toLowerCase() ?? '';

        if (titleLower.includes(labelLower)) {
          matchScore = 100;
        } else if (snippetLower.includes(labelLower)) {
          matchScore = 60;
        } else {
          // Word overlap
          const labelWords = labelLower.split(/\s+/).filter((w) => w.length > 3);
          const textWords = (titleLower + ' ' + snippetLower).split(/\s+/);
          const overlap = labelWords.filter((w) => textWords.includes(w)).length;
          if (overlap >= 2) matchScore = 30;
        }

        if (matchScore > bestScore) {
          bestScore = matchScore;
          bestInterestId = interest.id;
          bestSection = interest.section;
        }
      }

      if (bestScore > 0) {
        const domain = extractDomain(candidate.url);
        const isKnown = domain
          ? sourceRecords.some((s) => {
              try {
                const h = new URL(s.url).hostname.toLowerCase().replace(/^www\./, '');
                return h === domain;
              } catch {
                return false;
              }
            })
          : false;

        const score = scoreCandidate(candidate, bestScore, isKnown);
        scored.push({
          article: { ...candidate, matchedInterestId: bestInterestId, matchedSection: bestSection },
          score,
          matchedInterestId: bestInterestId,
          matchedSection: bestSection,
        });
      }
    }

    // ── 8. Dedupe + select top 8 ─────────────────────────────
    const deduped = deduplicateCandidates(scored);
    const selected = selectTopCandidates(deduped);

    // ── 9. Cluster ───────────────────────────────────────────
    const clusters = buildClusters(selected);

    // ── 10. Summarize ────────────────────────────────────────
    const digestItems: Array<{
      cluster: typeof clusters[0];
      summary: { summary: string; whyItMatters: string };
    }> = [];

    for (const cluster of clusters) {
      const article = cluster.primary.article;
      const matchedInterest = user.interests.find(
        (i) => i.id === cluster.primary.matchedInterestId
      );

      const input: SummarizationInput = {
        title: article.title,
        source: article.sourceName,
        publishDate: article.publishedAt?.toISOString().split('T')[0] ?? null,
        text: article.snippet ?? article.title,
        matchedInterest: matchedInterest?.label ?? 'general news',
        matchedSection: cluster.primary.matchedSection,
      };

      const result = await summarizeArticle(input);
      digestItems.push({
        cluster,
        summary: { summary: result.summary, whyItMatters: result.whyItMatters },
      });
    }

    // ── 11. Build HTML ───────────────────────────────────────
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: user.timezone,
    });
    const subject = `Your Briefing — ${dateStr}`;

    // Group items by section
    const sectionMap = new Map<string, typeof digestItems>();
    for (const item of digestItems) {
      const section = item.cluster.primary.matchedSection;
      const list = sectionMap.get(section) ?? [];
      list.push(item);
      sectionMap.set(section, list);
    }

    let html = buildEmailHeader(dateStr);

    for (const [section, items] of sectionMap) {
      html += `
        <tr>
          <td style="padding: 24px 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: bold; color: #002D62; border-bottom: 2px solid #FDB913;">
            ${escapeHtml(section)}
          </td>
        </tr>`;

      for (const item of items) {
        html += renderDigestItemWithCluster(item.cluster, item.summary);
      }
    }

    html += renderCoverageNote(webSearchUsed);
    html += buildEmailFooter();

    // Build plain text version
    let text = `Your Briefing — ${dateStr}\n\n`;
    for (const [section, items] of sectionMap) {
      text += `== ${section} ==\n\n`;
      for (const item of items) {
        text += `${item.cluster.primary.article.title}\n`;
        text += `${item.summary.summary}\n`;
        text += `Why it matters: ${item.summary.whyItMatters}\n`;
        text += `${item.cluster.primary.article.sourceName} — ${item.cluster.primary.article.url}\n\n`;
      }
    }

    // ── 12. Save digest ──────────────────────────────────────
    const digest = await prisma.digest.create({
      data: {
        userId,
        runDate: new Date(today),
        subject,
        html,
        text,
      },
    });

    return NextResponse.json({
      ok: true,
      digestId: digest.id,
      itemCount: digestItems.length,
      webSearchUsed,
      sections: [...sectionMap.keys()],
    });
  } catch (err) {
    console.error('[build-digest] Failed:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

function buildEmailHeader(dateStr: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F7F7F7; font-family: Arial, Helvetica, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F7F7F7;">
<tr><td align="center" style="padding: 24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden;">
<tr>
  <td style="background-color: #002D62; padding: 24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: #FFFFFF;">
          Your Briefing
        </td>
        <td align="right" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #BDBDBD;">
          ${escapeHtml(dateStr)}
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr><td style="padding: 16px 32px;">
<table width="100%" cellpadding="0" cellspacing="0">`;
}

function buildEmailFooter(): string {
  return `
</table>
</td></tr>
<tr>
  <td style="padding: 24px 32px; background-color: #F7F7F7; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #828282;">
    <a href="{{PREFS_URL}}" style="color: #FDB913; text-decoration: underline;">Update preferences</a>
    &nbsp;&middot;&nbsp;
    <a href="{{PAUSE_URL}}" style="color: #FDB913; text-decoration: underline;">Pause emails</a>
    &nbsp;&middot;&nbsp;
    <a href="{{UNSUBSCRIBE_URL}}" style="color: #FDB913; text-decoration: underline;">Unsubscribe</a>
  </td>
</tr>
</table>
</td></tr></table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
