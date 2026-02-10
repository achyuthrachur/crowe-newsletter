import { prisma } from '@/lib/db';
import { canonicalizeUrl, extractDomain } from '@/lib/utils';
import { logDeepDive } from '@/lib/logger';
import { toJson, type DeepDiveState } from '@/types';

/**
 * DISCOVER stage: Select candidate URLs for a deep dive job.
 *
 * 1. Load the user's deep dive topic interest
 * 2. Query recent articles (last 7 days) matching that interest
 * 3. Filter by access status, prefer higher quality tiers
 * 4. Dedupe by canonical URL
 * 5. Persist up to maxSources into deep_dive_sources
 * 6. Transition job state to FETCH
 */
export async function discoverCandidates(jobId: string): Promise<void> {
  const job = await prisma.deepDiveJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      user: {
        include: {
          deepDiveConfig: true,
        },
      },
    },
  });

  const maxSources = job.user.deepDiveConfig?.maxSources ??
    parseInt(process.env.DEEP_DIVE_MAX_SOURCES || '12');

  // Get the topic interest label
  const interest = await prisma.interest.findUnique({
    where: { id: job.topicInterestId },
  });

  if (!interest) {
    await prisma.deepDiveJob.update({
      where: { id: jobId },
      data: { status: 'failed', state: { stage: 'DISCOVER', error: 'Interest not found' } },
    });
    return;
  }

  // Query recent articles matching this interest (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const matches = await prisma.articleMatch.findMany({
    where: {
      userId: job.userId,
      interestId: interest.id,
      article: {
        accessStatus: { in: ['ok', 'unknown'] },
        fetchedAt: { gte: sevenDaysAgo },
      },
    },
    include: {
      article: true,
    },
    orderBy: { score: 'desc' },
    take: maxSources * 2, // Fetch more than needed for filtering
  });

  // If no matches from article_matches, fall back to direct article search
  let candidateUrls: string[] = [];

  if (matches.length > 0) {
    candidateUrls = matches.map((m) => m.article.canonicalUrl);
  } else {
    // Fallback: search articles by title/snippet containing the interest label
    const articles = await prisma.article.findMany({
      where: {
        accessStatus: { in: ['ok', 'unknown'] },
        fetchedAt: { gte: sevenDaysAgo },
        OR: [
          { title: { contains: interest.label, mode: 'insensitive' } },
          { snippet: { contains: interest.label, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: maxSources * 2,
    });
    candidateUrls = articles.map((a) => a.canonicalUrl);
  }

  // Dedupe by canonical URL
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const url of candidateUrls) {
    const canonical = canonicalizeUrl(url);
    if (!seen.has(canonical)) {
      seen.add(canonical);
      deduped.push(url);
    }
  }

  // Apply source quality tier ranking
  const ranked = await rankBySourceTier(deduped);

  // Take top maxSources
  const selected = ranked.slice(0, maxSources);

  if (selected.length === 0) {
    logDeepDive({
      jobId,
      userId: job.userId,
      topic: interest.label,
      stage: 'DISCOVER',
      status: 'no_candidates',
    });

    await prisma.deepDiveJob.update({
      where: { id: jobId },
      data: {
        status: 'partial',
        state: toJson({
          stage: 'SYNTHESIZE',
          discovery: { candidateUrls: [], selectedCount: 0 },
        } satisfies DeepDiveState),
      },
    });
    return;
  }

  // Persist selected URLs as deep_dive_sources
  await prisma.deepDiveSource.createMany({
    data: selected.map((url) => ({
      jobId,
      url,
      accessStatus: 'unknown',
    })),
    skipDuplicates: true,
  });

  // Update job state to FETCH
  const newState: DeepDiveState = {
    stage: 'FETCH',
    discovery: {
      candidateUrls: selected,
      selectedCount: selected.length,
    },
    fetch: {
      totalSources: selected.length,
      fetchedCount: 0,
      okCount: 0,
      nextIndex: 0,
    },
  };

  await prisma.deepDiveJob.update({
    where: { id: jobId },
    data: { state: toJson(newState) },
  });

  logDeepDive({
    jobId,
    userId: job.userId,
    topic: interest.label,
    stage: 'DISCOVER',
    status: 'complete',
    sourcesTotal: selected.length,
  });
}

/**
 * Rank URLs by their source quality tier.
 * Tier 1 first, then tier 2, then tier 3/unknown.
 */
async function rankBySourceTier(urls: string[]): Promise<string[]> {
  const sources = await prisma.source.findMany({
    select: { url: true, qualityTier: true },
  });

  const domainTiers = new Map<string, number>();
  for (const source of sources) {
    const domain = extractDomain(source.url);
    if (domain) domainTiers.set(domain, source.qualityTier);
  }

  // Check block rules
  const blockRules = await prisma.sourceRule.findMany({
    where: { action: 'block' },
  });

  return urls
    .filter((url) => {
      const domain = extractDomain(url);
      // Filter out blocked domains
      return !blockRules.some((rule) => domain.includes(rule.pattern));
    })
    .sort((a, b) => {
      const tierA = domainTiers.get(extractDomain(a)) ?? 3;
      const tierB = domainTiers.get(extractDomain(b)) ?? 3;
      return tierA - tierB;
    });
}
