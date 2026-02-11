import { prisma } from '@/lib/db';
import { hasTimeRemaining } from '@/lib/utils';
import { logDailyTick } from '@/lib/logger';
import { runWebSearchForUser } from '@/services/search/webSearch';
import type { WebSearchResult } from '@/types';

/**
 * Run web searches for users with sparse interests.
 * Finds users due for digest today and supplements their content.
 */
export async function runWebSearches(opts: {
  maxDuration: number;
  maxUsers?: number;
}): Promise<WebSearchResult> {
  const startTime = Date.now();
  const { maxDuration, maxUsers = 5 } = opts;
  let queriesRun = 0;
  let resultsFound = 0;
  let matchesCreated = 0;

  // Find active users with interests
  const users = await prisma.user.findMany({
    where: {
      profile: {
        emailEnabled: true,
        paused: false,
      },
    },
    include: {
      profile: true,
    },
    take: maxUsers,
  });

  for (const user of users) {
    if (!hasTimeRemaining(startTime, maxDuration, 3000)) break;

    try {
      const result = await runWebSearchForUser({
        userId: user.id,
        depthLevel: user.profile?.depthLevel ?? 'quick',
      });

      queriesRun += result.queriesRun;
      resultsFound += result.resultsFound;
      matchesCreated += result.matchesCreated;
    } catch (error) {
      logDailyTick('web_search_user_error', {
        userId: user.id.slice(0, 8),
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  return {
    queriesRun,
    resultsFound,
    matchesCreated,
    elapsed: Date.now() - startTime,
  };
}
