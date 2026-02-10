import { prisma } from '@/lib/db';
import { hasTimeRemaining } from '@/lib/utils';
import { logDailyTick } from '@/lib/logger';
import { deepDiveStep } from '@/services/deepDive/orchestrator';

interface AdvanceOptions {
  maxJobs: number;
  maxDuration: number;
  startTime: number;
}

/**
 * Advance up to N queued/running deep dive jobs.
 * Each job gets stepped once through its state machine.
 * Stops early if time budget is exhausted.
 */
export async function advanceDeepDiveJobs(options: AdvanceOptions): Promise<number> {
  const { maxJobs, maxDuration, startTime } = options;

  // Find jobs that need advancing
  const jobs = await prisma.deepDiveJob.findMany({
    where: {
      status: { in: ['queued', 'running', 'partial'] },
    },
    orderBy: [
      { status: 'asc' }, // 'partial' first (try to complete them)
      { createdAt: 'asc' }, // oldest first
    ],
    take: maxJobs,
  });

  if (jobs.length === 0) return 0;

  let advanced = 0;

  for (const job of jobs) {
    // Check time budget before each job
    if (!hasTimeRemaining(startTime, maxDuration, 12000)) {
      logDailyTick('advance_deep_dives', {
        message: 'Time budget exhausted',
        advanced,
        remaining: jobs.length - advanced,
      });
      break;
    }

    // Skip partial jobs that already have a report (they're done)
    if (job.status === 'partial') {
      const report = await prisma.deepDiveReport.findUnique({
        where: { jobId: job.id },
      });
      if (report) continue;
    }

    const remainingMs = maxDuration - (Date.now() - startTime);
    // Give each job a fair share of remaining time, but at least 10s
    const perJobBudget = Math.max(10000, Math.min(remainingMs - 5000, 45000));

    try {
      await deepDiveStep(job.id, perJobBudget);
      advanced++;
    } catch (error) {
      logDailyTick('advance_deep_dives', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  logDailyTick('advance_deep_dives', {
    jobsFound: jobs.length,
    advanced,
  });

  return advanced;
}
