import { prisma } from '@/lib/db';
import { logDeepDive } from '@/lib/logger';
import { discoverCandidates } from './discover';
import { fetchAndExtractBatch } from './fetchExtract';
import { synthesizeReport } from './synthesize';
import { publishReport } from './publish';
import { toJson, fromJson, type DeepDiveState } from '@/types';

const MAX_ATTEMPTS = 3;

/**
 * Execute one step of a deep dive job's state machine.
 *
 * State machine: DISCOVER → FETCH → SYNTHESIZE → PUBLISH
 *
 * Each call advances at most one stage (or a bounded batch within FETCH).
 * If attempt >= MAX_ATTEMPTS without completion, forces partial publish.
 *
 * @param jobId - The deep dive job ID
 * @param maxDuration - Maximum milliseconds this invocation can run
 */
export async function deepDiveStep(
  jobId: string,
  maxDuration: number
): Promise<void> {
  const startTime = Date.now();

  const job = await prisma.deepDiveJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return;
  if (['complete', 'aborted', 'failed'].includes(job.status)) return;

  // Increment attempt counter
  const newAttempt = job.attempt + 1;
  await prisma.deepDiveJob.update({
    where: { id: jobId },
    data: { attempt: newAttempt, status: 'running', updatedAt: new Date() },
  });

  const state = fromJson(job.state);

  logDeepDive({
    jobId,
    userId: job.userId,
    stage: state.stage,
    status: 'starting',
    elapsed: 0,
  });

  try {
    const remainingTime = maxDuration - (Date.now() - startTime);

    switch (state.stage) {
      case 'DISCOVER':
        await discoverCandidates(jobId);
        break;

      case 'FETCH':
        await fetchAndExtractBatch(jobId, remainingTime);
        break;

      case 'SYNTHESIZE':
        await synthesizeReport(jobId, remainingTime);
        break;

      case 'PUBLISH':
        await publishReport(jobId);
        break;

      default:
        // Unknown state — reset to DISCOVER
        await prisma.deepDiveJob.update({
          where: { id: jobId },
          data: { state: toJson({ stage: 'DISCOVER' } satisfies DeepDiveState) },
        });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    logDeepDive({
      jobId,
      userId: job.userId,
      stage: state.stage,
      status: 'error',
      error: errorMsg,
      elapsed: Date.now() - startTime,
    });

    // Check abort conditions
    if (newAttempt >= MAX_ATTEMPTS) {
      logDeepDive({
        jobId,
        userId: job.userId,
        stage: state.stage,
        status: 'aborting',
      });

      // Force transition to PUBLISH with partial data
      const currentJob = await prisma.deepDiveJob.findUnique({
        where: { id: jobId },
      });
      const currentState = currentJob ? fromJson(currentJob.state) : state;

      if (currentState.stage !== 'PUBLISH') {
        await prisma.deepDiveJob.update({
          where: { id: jobId },
          data: {
            status: 'partial',
            state: toJson({
              ...currentState,
              stage: 'PUBLISH',
              synthesis: currentState.synthesis ?? {
                strategy: 'map-reduce',
                retryCount: 0,
              },
            } satisfies DeepDiveState),
          },
        });
        // Attempt publish with whatever we have
        try {
          await publishReport(jobId);
        } catch {
          await prisma.deepDiveJob.update({
            where: { id: jobId },
            data: { status: 'failed' },
          });
        }
      }
    } else {
      // Keep as 'queued' so it gets retried next daily tick
      await prisma.deepDiveJob.update({
        where: { id: jobId },
        data: { status: 'queued' },
      });
    }
  }

  logDeepDive({
    jobId,
    userId: job.userId,
    stage: state.stage,
    status: 'step_complete',
    elapsed: Date.now() - startTime,
  });
}
