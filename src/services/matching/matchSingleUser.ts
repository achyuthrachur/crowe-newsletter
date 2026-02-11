import { prisma } from '@/lib/db';
import { extractDomain } from '@/lib/utils';
import { computeMatchScore } from './scorer';

const MIN_SCORE_THRESHOLD = 30;

/**
 * Match ALL articles against a single user's interests.
 * Unlike the daily matcher, this has no 24h filter — demo articles
 * may have been seeded earlier.
 *
 * Returns the number of matches created.
 */
export async function matchArticlesForSingleUser(userId: string): Promise<number> {
  // Load user interests
  const interests = await prisma.interest.findMany({
    where: { userId },
  });

  if (interests.length === 0) return 0;

  // Load ALL articles (no time filter)
  const articles = await prisma.article.findMany();

  if (articles.length === 0) return 0;

  // Build source-domain-to-tier map
  const sources = await prisma.source.findMany({
    select: { url: true, qualityTier: true },
  });
  const domainTiers = new Map<string, number>();
  for (const source of sources) {
    const domain = extractDomain(source.url);
    if (domain) domainTiers.set(domain, source.qualityTier);
  }

  // Score all interest-article combinations for this user
  const matchData: {
    articleId: string;
    userId: string;
    interestId: string;
    score: number;
    reason: string;
  }[] = [];

  for (const article of articles) {
    let bestScore = 0;
    let bestReason = '';
    let bestInterestId = '';

    const articleDomain = extractDomain(article.canonicalUrl);
    const tier = domainTiers.get(articleDomain) ?? 2;

    for (const interest of interests) {
      const { score, reason } = computeMatchScore(
        article.title,
        article.snippet,
        interest.label,
        tier
      );

      if (score > bestScore) {
        bestScore = score;
        bestReason = reason;
        bestInterestId = interest.id;
      }
    }

    if (bestScore >= MIN_SCORE_THRESHOLD && bestInterestId) {
      matchData.push({
        articleId: article.id,
        userId,
        interestId: bestInterestId,
        score: bestScore,
        reason: bestReason,
      });
    }
  }

  if (matchData.length === 0) return 0;

  const result = await prisma.articleMatch.createMany({
    data: matchData,
    skipDuplicates: true,
  });

  return result.count;
}
