import { createHash } from 'crypto';
import { prisma } from './db';
import { summarizeArticle } from './summarizer';
import {
  loadPersonalizationContext,
  applyPersonalization,
} from './ranking/scorer-v2';

export interface DigestItem {
  title: string;
  url: string;
  summary: string;
  whyItMatters: string;
  sourceName: string;
  publishedAt: Date | null;
  whyYouGotThis?: string;
  articleId?: string;
  interestId?: string;
}

export interface DigestSection {
  name: string;
  items: DigestItem[];
}

function titleSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const bLower = b.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  if (aLower === bLower) return 1;

  const aTokens = new Set(aLower.split(/\s+/));
  const bTokens = new Set(bLower.split(/\s+/));
  const intersection = [...aTokens].filter((t) => bTokens.has(t));
  const union = new Set([...aTokens, ...bTokens]);

  return union.size > 0 ? intersection.length / union.size : 0;
}

function buildReasonString(
  interestLabel: string,
  matchReason: string,
  publishedAt: Date | null
): string {
  // Match type from ArticleMatch.reason
  const reasonLower = matchReason.toLowerCase();
  let matchType = 'Keyword match';
  if (reasonLower.includes('title')) matchType = 'Title match';
  else if (reasonLower.includes('snippet')) matchType = 'Snippet match';

  // Recency
  let recency = '';
  if (publishedAt) {
    const ageMs = Date.now() - publishedAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 24) recency = '<24h';
    else if (ageHours < 72) recency = '1-3d';
    else recency = '3-7d';
  }

  const parts = [interestLabel, matchType];
  if (recency) parts.push(recency);
  parts.push('Tier 2'); // Default tier

  return parts.join(' \u00B7 ');
}

function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 8);
}

export async function buildDigestForUser(
  userId: string,
  runDate: Date
): Promise<{ sections: DigestSection[]; totalItems: number } | null> {
  // Get user's interests grouped by section
  const interests = await prisma.interest.findMany({
    where: { userId },
  });

  if (interests.length === 0) return null;

  const sectionMap = new Map<string, string[]>();
  const interestIdMap = new Map<string, string>();
  const interestLabelMap = new Map<string, string>();
  for (const interest of interests) {
    if (!sectionMap.has(interest.section)) {
      sectionMap.set(interest.section, []);
    }
    sectionMap.get(interest.section)!.push(interest.id);
    interestIdMap.set(interest.id, interest.section);
    interestLabelMap.set(interest.id, interest.label);
  }

  // Get top article matches for this user
  const matches = await prisma.articleMatch.findMany({
    where: { userId },
    orderBy: { score: 'desc' },
    take: 50,
    include: { article: true },
  });

  if (matches.length === 0) return null;

  // Load user profile caps
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { maxItemsTotal: true, maxItemsPerSection: true },
  });
  const maxItemsTotal = profile?.maxItemsTotal ?? 8;
  const maxItemsPerSection = profile?.maxItemsPerSection ?? 3;

  // Apply personalization if enabled
  const personalizationEnabled = process.env.PERSONALIZATION_ENABLED === 'true';
  const userHash = hashUserId(userId);

  let orderedMatches: Array<{
    match: typeof matches[0];
    adjustedScore: number;
  }>;

  if (personalizationEnabled) {
    const context = await loadPersonalizationContext(userId);
    const personalized = applyPersonalization(matches, context);

    console.log(
      `[digest] user=${userHash} candidates_before=${matches.length} candidates_after=${personalized.results.length} dropped_keyword=${personalized.dropped.keyword} dropped_source=${personalized.dropped.source} dropped_suppressed=${personalized.dropped.suppressed}`
    );

    orderedMatches = personalized.results;
  } else {
    orderedMatches = matches.map((m) => ({ match: m, adjustedScore: m.score }));
  }

  // Group matches by section, dedup by canonical_url and title similarity
  const seenUrls = new Set<string>();
  const seenTitles: string[] = [];
  const sectionItems = new Map<string, DigestItem[]>();

  for (const { match, adjustedScore: _adjustedScore } of orderedMatches) {
    const section = interestIdMap.get(match.interestId);
    if (!section) continue;

    const article = match.article;

    // Dedupe by URL
    if (seenUrls.has(article.canonicalUrl)) continue;

    // Dedupe by title similarity
    if (seenTitles.some((t) => titleSimilarity(t, article.title) > 0.92)) continue;

    if (!sectionItems.has(section)) {
      sectionItems.set(section, []);
    }

    const items = sectionItems.get(section)!;

    // Enforce per-section cap
    if (items.length >= maxItemsPerSection) continue;

    // Generate summary
    const summaryResult = await summarizeArticle(article.title, article.snippet);

    // Build "Why you got this" reason
    const interestLabel = interestLabelMap.get(match.interestId) || section;
    const whyYouGotThis = buildReasonString(
      interestLabel,
      match.reason,
      article.publishedAt
    );

    items.push({
      title: article.title,
      url: article.canonicalUrl,
      summary: summaryResult.summary,
      whyItMatters: summaryResult.whyItMatters,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt,
      whyYouGotThis,
      articleId: article.id,
      interestId: match.interestId,
    });

    seenUrls.add(article.canonicalUrl);
    seenTitles.push(article.title);

    // Check total items across all sections
    const totalSoFar = [...sectionItems.values()].reduce((sum, arr) => sum + arr.length, 0);
    if (totalSoFar >= maxItemsTotal) break;
  }

  // Build sections array (omit empty sections)
  const sections: DigestSection[] = [];
  const sectionCounts: string[] = [];
  for (const [name, items] of sectionItems) {
    if (items.length > 0) {
      sections.push({ name, items });
      sectionCounts.push(`${name}=${items.length}`);
    }
  }

  if (sections.length === 0) return null;

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

  // Observability logging
  if (personalizationEnabled) {
    // Count top 5 domains
    const domainCounts = new Map<string, number>();
    for (const section of sections) {
      for (const item of section.items) {
        try {
          const domain = new URL(item.url).hostname.replace(/^www\./, '');
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        } catch { /* skip */ }
      }
    }
    const topDomains = [...domainCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([d, c]) => `${d}:${c}`)
      .join(',');

    console.log(
      `[digest] user=${userHash} final_total=${totalItems} sections=${sectionCounts.join(',')} top_domains=${topDomains}`
    );
  }

  return { sections, totalItems };
}
