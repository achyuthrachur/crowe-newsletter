import { prisma } from '@/lib/db';

/**
 * Compute per-interest feedback adjustments for a user.
 *
 * Looks at ArticleFeedback joined with ArticleMatch to get per-interest engagement:
 * - positiveRate > 0.7 → boost +15
 * - positiveRate < 0.3 → penalty -15
 * - otherwise → no adjustment
 *
 * Returns a Map of interestId → boost value.
 */
export async function computeFeedbackAdjustments(
  userId: string
): Promise<Map<string, number>> {
  const boosts = new Map<string, number>();

  // Get all feedback for this user with their article matches
  const feedback = await prisma.articleFeedback.findMany({
    where: { userId },
    select: {
      articleId: true,
      rating: true,
    },
  });

  if (feedback.length === 0) return boosts;

  // Build articleId → rating map
  const ratingMap = new Map<string, string>();
  for (const fb of feedback) {
    ratingMap.set(fb.articleId, fb.rating);
  }

  // Get the article matches for the feedback articles
  const articleIds = Array.from(ratingMap.keys());
  const matches = await prisma.articleMatch.findMany({
    where: {
      userId,
      articleId: { in: articleIds },
    },
    select: {
      articleId: true,
      interestId: true,
    },
  });

  // Aggregate per interest
  const interestStats = new Map<string, { up: number; total: number }>();

  for (const match of matches) {
    const rating = ratingMap.get(match.articleId);
    if (!rating) continue;

    const stats = interestStats.get(match.interestId) ?? { up: 0, total: 0 };
    stats.total++;
    if (rating === 'up') stats.up++;
    interestStats.set(match.interestId, stats);
  }

  // Compute boost values
  for (const [interestId, stats] of interestStats) {
    if (stats.total < 3) continue; // Need at least 3 data points

    const positiveRate = stats.up / stats.total;
    if (positiveRate > 0.7) {
      boosts.set(interestId, 15);
    } else if (positiveRate < 0.3) {
      boosts.set(interestId, -15);
    }
  }

  return boosts;
}
