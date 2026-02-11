import { prisma } from '@/lib/db';
import { hasTimeRemaining } from '@/lib/utils';
import { logDailyTick } from '@/lib/logger';
import { buildDigestForUser } from '@/services/digest/builder';
import type { BuildDigestsResult } from '@/types';

/**
 * Build digest emails for users who have matches but no digest for today.
 */
export async function buildDigests(opts: {
  maxDuration: number;
  maxUsers?: number;
}): Promise<BuildDigestsResult> {
  const startTime = Date.now();
  const { maxDuration, maxUsers = 10 } = opts;
  let digestsBuilt = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find users who:
  // 1. Have emailEnabled and are not paused
  // 2. Don't have a digest for today
  // 3. Have ArticleMatches in the last 48 hours
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const eligibleUsers = await prisma.user.findMany({
    where: {
      profile: {
        emailEnabled: true,
        paused: false,
      },
      digests: {
        none: { runDate: today },
      },
      articleMatches: {
        some: { createdAt: { gte: twoDaysAgo } },
      },
    },
    select: { id: true },
    take: maxUsers,
  });

  for (const user of eligibleUsers) {
    if (!hasTimeRemaining(startTime, maxDuration, 3000)) break;

    try {
      const digestId = await buildDigestForUser({ userId: user.id, runDate: today });
      if (digestId) digestsBuilt++;
    } catch (error) {
      logDailyTick('build_digest_error', {
        userId: user.id.slice(0, 8),
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  return {
    digestsBuilt,
    elapsed: Date.now() - startTime,
  };
}
