import { prisma } from '@/lib/db';
import { getDayOfWeek, getMondayOfWeek } from '@/lib/utils';
import { logDailyTick } from '@/lib/logger';
import { toJson, type DeepDiveState } from '@/types';

/**
 * Check all users with deep dive enabled and create jobs for those
 * whose configured day-of-week matches today in their timezone.
 *
 * Only creates one job per user per week (unique on userId + runWeek).
 */
export async function scheduleDeepDives(): Promise<number> {
  const configs = await prisma.deepDiveConfig.findMany({
    where: { enabled: true },
    include: {
      user: {
        include: {
          deepDiveTopics: true,
        },
      },
    },
  });

  let created = 0;

  for (const config of configs) {
    const user = config.user;

    // Skip users with no deep dive topics
    if (user.deepDiveTopics.length === 0) continue;

    // Check if today matches configured day in user's timezone
    const now = new Date();
    const todayDow = getDayOfWeek(now, user.timezone);

    if (todayDow !== config.dayOfWeek) continue;

    // Get Monday of current week in user's timezone
    const monday = getMondayOfWeek(now, user.timezone);

    // Check if job already exists for this week
    try {
      const existing = await prisma.deepDiveJob.findUnique({
        where: {
          userId_runWeek: {
            userId: user.id,
            runWeek: monday,
          },
        },
      });

      if (existing) continue;

      // Pick a topic (rotate: use topic with fewest recent jobs)
      const topicId = await selectTopicForUser(user.id, user.deepDiveTopics);

      if (!topicId) continue;

      // Create job
      await prisma.deepDiveJob.create({
        data: {
          userId: user.id,
          runWeek: monday,
          status: 'queued',
          topicInterestId: topicId,
          state: toJson({ stage: 'DISCOVER' } satisfies DeepDiveState),
        },
      });

      created++;
      logDailyTick('schedule_deep_dive', {
        userId: user.id.slice(0, 8),
        topicId: topicId.slice(0, 8),
        runWeek: monday.toISOString().split('T')[0],
      });
    } catch {
      // Unique constraint violation means job already exists — skip
      continue;
    }
  }

  return created;
}

/**
 * Select a topic interest for the user's deep dive.
 * Rotates through configured topics based on least recently used.
 */
async function selectTopicForUser(
  userId: string,
  topics: Array<{ interestId: string }>
): Promise<string | null> {
  if (topics.length === 0) return null;
  if (topics.length === 1) return topics[0].interestId;

  // Find the topic that was least recently used in deep dives
  const recentJobs = await prisma.deepDiveJob.findMany({
    where: {
      userId,
      topicInterestId: { in: topics.map((t) => t.interestId) },
    },
    orderBy: { createdAt: 'desc' },
    take: topics.length,
    select: { topicInterestId: true },
  });

  const usedTopics = new Set(recentJobs.map((j) => j.topicInterestId));

  // Find first topic not recently used
  for (const topic of topics) {
    if (!usedTopics.has(topic.interestId)) {
      return topic.interestId;
    }
  }

  // All used — pick the least recently used (last in the recentJobs list)
  return recentJobs.length > 0
    ? recentJobs[recentJobs.length - 1].topicInterestId
    : topics[0].interestId;
}
