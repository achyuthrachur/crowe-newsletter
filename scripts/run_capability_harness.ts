/**
 * Capability Harness Script
 *
 * Compares RSS-only vs RSS+WebSearch digest quality for a given user profile.
 *
 * Usage:
 *   npx tsx scripts/run_capability_harness.ts --profile <userId>
 *
 * Output:
 *   reports/capability_<date>_<profile>.md
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { CandidateArticle, ScoredCandidate, HarnessReport } from '../src/lib/stage2/types';
import { extractDomain } from '../src/lib/source-filter/domain-extractor';
import { loadRules, matchDomain } from '../src/lib/source-filter/rule-matcher';
import { getQualityTier, isTierBlocked } from '../src/lib/source-filter/quality-tier';
import type { SourceRecord } from '../src/lib/source-filter/quality-tier';
import type { SourceRule } from '../src/lib/stage2/types';
import { checkPaywall } from '../src/lib/paywall/detector';
import { canonicalizeUrl } from '../src/lib/dedupe/url-canonicalizer';
import { deduplicateCandidates } from '../src/lib/dedupe/cluster';
import { scoreCandidate, selectTopCandidates } from '../src/lib/ranking/scorer-v1';
import { generateQueries } from '../src/lib/websearch/query-generator';
import { runWebSearch } from '../src/lib/websearch/search-client';
import type { Stage1Interest } from '../src/lib/stage2/contracts';

const prisma = new PrismaClient();

function parseArgs(): { profileId: string } {
  const args = process.argv.slice(2);
  const profileIdx = args.indexOf('--profile');
  if (profileIdx === -1 || !args[profileIdx + 1]) {
    console.error('Usage: npx tsx scripts/run_capability_harness.ts --profile <userId>');
    process.exit(1);
  }
  return { profileId: args[profileIdx + 1] };
}

async function main() {
  const { profileId } = parseArgs();
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n=== Capability Harness ===`);
  console.log(`Profile: ${profileId}`);
  console.log(`Date: ${today}\n`);

  // Load user
  const user = await prisma.user.findUnique({
    where: { id: profileId },
    include: { profile: true, interests: true },
  });

  if (!user || !user.profile) {
    console.error(`User ${profileId} not found`);
    process.exit(1);
  }

  console.log(`User: ${user.email}`);
  console.log(`Depth: ${user.profile.depthLevel}`);
  console.log(`Interests: ${user.interests.length}\n`);

  // Load sources and rules
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

  // ── Stream A: RSS candidates ──────────────────────────────
  console.log('--- Stream A: RSS ---');
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
    return {
      url: a.canonicalUrl,
      canonicalUrl: canonicalizeUrl(a.canonicalUrl),
      title: a.title,
      sourceName: a.sourceName,
      snippet: a.snippet,
      publishedAt: a.publishedAt,
      streamOrigin: 'rss' as const,
      qualityTier: domain ? getQualityTier(domain, sourceRecords) : 3,
      matchedInterestId: null,
      matchedSection: null,
    };
  });

  console.log(`  RSS candidates: ${rssCandidates.length}`);

  // Score RSS-only
  const rssScored = scoreCandidates(rssCandidates, user.interests, sourceRecords, rules);
  const rssDeduped = deduplicateCandidates(rssScored);
  const rssSelected = selectTopCandidates(rssDeduped);

  console.log(`  RSS after scoring/filter: ${rssScored.length}`);
  console.log(`  RSS after dedupe: ${rssDeduped.length}`);
  console.log(`  RSS selected (top 8): ${rssSelected.length}`);

  // ── Stream B: WebSearch candidates ─────────────────────────
  console.log('\n--- Stream B: WebSearch ---');

  const interests: Stage1Interest[] = user.interests.map((i) => ({
    id: i.id,
    userId: i.userId,
    section: i.section,
    label: i.label,
    type: i.type as 'topic' | 'industry' | 'entity',
    weight: i.weight,
  }));

  const queries = generateQueries(interests);
  console.log(`  Generated queries: ${queries.length}`);

  let webSearchCandidates: CandidateArticle[] = [];
  let toolCallCount = 0;
  let tokenCount = 0;

  try {
    const { results, metrics } = await runWebSearch(queries);
    toolCallCount = metrics.toolCallsUsed;
    tokenCount = metrics.tokensUsed;

    webSearchCandidates = results.flatMap((r) =>
      r.results.map((sr) => {
        const domain = extractDomain(sr.url);
        return {
          url: sr.url,
          canonicalUrl: canonicalizeUrl(sr.url),
          title: sr.title,
          sourceName: sr.sourceName ?? (domain ?? 'Unknown'),
          snippet: sr.snippet,
          publishedAt: sr.publishedAt,
          streamOrigin: 'websearch' as const,
          qualityTier: domain ? getQualityTier(domain, sourceRecords) : 3,
          matchedInterestId: null,
          matchedSection: null,
        } as CandidateArticle;
      })
    );

    console.log(`  WebSearch candidates: ${webSearchCandidates.length}`);
    console.log(`  Tool calls: ${toolCallCount}`);
    console.log(`  Tokens: ${tokenCount}`);
  } catch (err) {
    console.error(`  WebSearch failed: ${err instanceof Error ? err.message : err}`);
  }

  // ── Combined: RSS + WebSearch ──────────────────────────────
  console.log('\n--- Combined ---');
  const allCandidates = [...rssCandidates, ...webSearchCandidates];
  const combinedScored = scoreCandidates(allCandidates, user.interests, sourceRecords, rules);

  // Paywall check on combined
  let paywallExclusions = 0;
  const accessChecked: ScoredCandidate[] = [];
  for (const sc of combinedScored) {
    const result = await checkPaywall(sc.article.url);
    if (result.status === 'paywalled') {
      paywallExclusions++;
    } else {
      accessChecked.push(sc);
    }
  }

  const combinedDeduped = deduplicateCandidates(accessChecked);
  const dedupeRemovals = accessChecked.length - combinedDeduped.length;
  const combinedSelected = selectTopCandidates(combinedDeduped);

  console.log(`  Total candidates: ${allCandidates.length}`);
  console.log(`  After scoring/filter: ${combinedScored.length}`);
  console.log(`  Paywall exclusions: ${paywallExclusions}`);
  console.log(`  Dedupe removals: ${dedupeRemovals}`);
  console.log(`  Final selected: ${combinedSelected.length}`);

  // ── Compute section breakdown ──────────────────────────────
  const rssItemsBySection: Record<string, number> = {};
  for (const s of rssSelected) {
    rssItemsBySection[s.matchedSection] = (rssItemsBySection[s.matchedSection] ?? 0) + 1;
  }

  const combinedItemsBySection: Record<string, number> = {};
  for (const s of combinedSelected) {
    combinedItemsBySection[s.matchedSection] = (combinedItemsBySection[s.matchedSection] ?? 0) + 1;
  }

  // ── Cost estimate ──────────────────────────────────────────
  // gpt-4o-mini: ~$0.15/1M input tokens, ~$0.60/1M output tokens
  const estimatedCost = (tokenCount / 1_000_000) * 0.375; // rough average

  // ── Build report ───────────────────────────────────────────
  const report: HarnessReport = {
    profileId,
    runDate: today,
    rssOnlyCandidates: rssCandidates.length,
    webSearchCandidates: webSearchCandidates.length,
    totalCandidates: allCandidates.length,
    paywallExclusions,
    dedupeRemovals,
    finalItemsBySection: combinedItemsBySection,
    finalItemsTotal: combinedSelected.length,
    toolCallCount,
    tokenCount,
    estimatedCostUsd: estimatedCost,
  };

  const markdown = generateMarkdownReport(report, rssItemsBySection, combinedItemsBySection, rssSelected, combinedSelected);

  // Write report
  const reportsDir = join(process.cwd(), 'reports');
  mkdirSync(reportsDir, { recursive: true });
  const filename = `capability_${today}_${profileId.slice(0, 8)}.md`;
  const filepath = join(reportsDir, filename);
  writeFileSync(filepath, markdown, 'utf-8');

  console.log(`\nReport written to: ${filepath}`);
}

function scoreCandidates(
  candidates: CandidateArticle[],
  interests: Array<{ id: string; section: string; label: string; type: string; weight: number }>,
  sourceRecords: SourceRecord[],
  rules: SourceRule[]
): ScoredCandidate[] {
  const scored: ScoredCandidate[] = [];

  for (const candidate of candidates) {
    // Source filter
    const domain = extractDomain(candidate.url);
    if (domain) {
      const ruleResult = matchDomain(domain, rules);
      if (ruleResult.action === 'block') continue;
    }
    if (isTierBlocked(candidate.qualityTier)) continue;

    // Interest matching
    let bestScore = 0;
    let bestInterestId = '';
    let bestSection = '';

    for (const interest of interests) {
      let matchScore = 0;
      const labelLower = interest.label.toLowerCase();
      const titleLower = candidate.title.toLowerCase();
      const snippetLower = candidate.snippet?.toLowerCase() ?? '';

      if (titleLower.includes(labelLower)) {
        matchScore = 100;
      } else if (snippetLower.includes(labelLower)) {
        matchScore = 60;
      } else {
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

  return scored;
}

function generateMarkdownReport(
  report: HarnessReport,
  rssItemsBySection: Record<string, number>,
  combinedItemsBySection: Record<string, number>,
  rssSelected: ScoredCandidate[],
  combinedSelected: ScoredCandidate[]
): string {
  const allSections = new Set([
    ...Object.keys(rssItemsBySection),
    ...Object.keys(combinedItemsBySection),
  ]);

  let md = `# Capability Harness Report

**Profile ID:** \`${report.profileId}\`
**Run Date:** ${report.runDate}

---

## Summary

| Metric | RSS Only | RSS + WebSearch |
|--------|----------|-----------------|
| Candidates | ${report.rssOnlyCandidates} | ${report.totalCandidates} |
| WebSearch Candidates | 0 | ${report.webSearchCandidates} |
| Paywall Exclusions | — | ${report.paywallExclusions} |
| Dedupe Removals | — | ${report.dedupeRemovals} |
| Final Items | ${rssSelected.length} | ${report.finalItemsTotal} |

## Items by Section

| Section | RSS Only | RSS + WebSearch |
|---------|----------|-----------------|
`;

  for (const section of allSections) {
    md += `| ${section} | ${rssItemsBySection[section] ?? 0} | ${combinedItemsBySection[section] ?? 0} |\n`;
  }

  md += `
## Resource Usage

| Metric | Value |
|--------|-------|
| Tool Calls (web_search) | ${report.toolCallCount} |
| Tokens Used | ${report.tokenCount.toLocaleString()} |
| Estimated Cost (USD) | $${report.estimatedCostUsd.toFixed(4)} |

## Selected Articles (RSS + WebSearch)

`;

  for (const item of combinedSelected) {
    md += `### ${item.article.title}
- **Source:** ${item.article.sourceName} (${item.article.streamOrigin})
- **Section:** ${item.matchedSection}
- **Score:** ${item.score.totalScore} (interest: ${item.score.interestMatchScore}, tier: ${item.score.tierBonus}, recency: ${item.score.recencyBonus}, clickbait: ${item.score.clickbaitPenalty}, publisher: ${item.score.unknownPublisherPenalty})
- **URL:** ${item.article.url}

`;
  }

  md += `---
*Generated by Stage 2 Capability Harness*
`;

  return md;
}

main()
  .catch((err) => {
    console.error('Harness failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
