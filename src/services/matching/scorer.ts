import { prisma } from '@/lib/db';
import { extractDomain } from '@/lib/utils';

/**
 * Compute a match score between an article and a user interest.
 *
 * Scoring:
 * - Interest label in title (case-insensitive): +100
 * - Interest word in title: +70
 * - Interest label in snippet: +40
 * - Interest word in snippet: +25
 * - Tier 1 source: +20
 * - Tier 2 source: +0
 * - Tier 3 source: -10
 *
 * Minimum threshold: 30
 */
export function computeMatchScore(
  title: string,
  snippet: string | null,
  interestLabel: string,
  qualityTier: number
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  const titleLower = title.toLowerCase();
  const snippetLower = (snippet || '').toLowerCase();
  const labelLower = interestLabel.toLowerCase();
  const words = labelLower.split(/\s+/).filter((w) => w.length > 2);

  // Full label match in title
  if (titleLower.includes(labelLower)) {
    score += 100;
    reasons.push('label_in_title');
  } else {
    // Individual word matches in title
    for (const word of words) {
      if (titleLower.includes(word)) {
        score += 70;
        reasons.push(`word_in_title:${word}`);
        break; // Only count once
      }
    }
  }

  // Full label match in snippet
  if (snippetLower.includes(labelLower)) {
    score += 40;
    reasons.push('label_in_snippet');
  } else {
    // Individual word matches in snippet
    for (const word of words) {
      if (snippetLower.includes(word)) {
        score += 25;
        reasons.push(`word_in_snippet:${word}`);
        break;
      }
    }
  }

  // Quality tier bonus
  if (qualityTier === 1) {
    score += 20;
    reasons.push('tier1');
  } else if (qualityTier === 3) {
    score -= 10;
    reasons.push('tier3_penalty');
  }

  return { score, reason: reasons.join(', ') };
}

const MIN_SCORE_THRESHOLD = 30;

/**
 * Match recent articles to all active users' interests.
 * Creates ArticleMatch records for scores above threshold.
 */
export async function matchArticlesToUsers(): Promise<{
  matchesCreated: number;
}> {
  // Load active users with interests
  const users = await prisma.user.findMany({
    where: {
      profile: {
        emailEnabled: true,
        paused: false,
      },
    },
    include: {
      interests: true,
    },
  });

  if (users.length === 0) return { matchesCreated: 0 };

  // Load articles from last 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const articles = await prisma.article.findMany({
    where: {
      fetchedAt: { gte: oneDayAgo },
    },
  });

  if (articles.length === 0) return { matchesCreated: 0 };

  // Build source-domain-to-tier map
  const sources = await prisma.source.findMany({
    select: { url: true, qualityTier: true },
  });
  const domainTiers = new Map<string, number>();
  for (const source of sources) {
    const domain = extractDomain(source.url);
    if (domain) domainTiers.set(domain, source.qualityTier);
  }

  // Score all user-interest-article combinations
  const matchData: {
    articleId: string;
    userId: string;
    interestId: string;
    score: number;
    reason: string;
  }[] = [];

  for (const user of users) {
    for (const article of articles) {
      let bestScore = 0;
      let bestReason = '';
      let bestInterestId = '';

      const articleDomain = extractDomain(article.canonicalUrl);
      const tier = domainTiers.get(articleDomain) ?? 2;

      for (const interest of user.interests) {
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
          userId: user.id,
          interestId: bestInterestId,
          score: bestScore,
          reason: bestReason,
        });
      }
    }
  }

  let matchesCreated = 0;

  if (matchData.length > 0) {
    const result = await prisma.articleMatch.createMany({
      data: matchData,
      skipDuplicates: true,
    });
    matchesCreated = result.count;
  }

  return { matchesCreated };
}
