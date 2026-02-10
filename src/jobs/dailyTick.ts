import { flags } from '@/lib/flags';
import { logDailyTick } from '@/lib/logger';
import { hasTimeRemaining } from '@/lib/utils';
import { scheduleDeepDives } from './scheduleDeepDives';
import { advanceDeepDiveJobs } from './advanceDeepDiveJobs';
import type { DailyTickResult } from '@/types';

const MAX_DURATION = 55_000; // 55s hard limit (5s buffer for response)

/**
 * Main daily tick orchestrator.
 *
 * Runs all scheduled work in priority order within a 55s budget.
 * Called by the Vercel cron endpoint once per day.
 *
 * Priority order:
 * 1. Send due daily digest emails (Stage 1/2) — placeholder until implemented
 * 2. Collect RSS sources (Stage 1) — placeholder until implemented
 * 3. Build pending digests (Stage 1/2) — placeholder until implemented
 * 4. Schedule + advance deep dive jobs (Stage 3)
 */
export async function runDailyTick(): Promise<DailyTickResult> {
  const startTime = Date.now();
  const result: DailyTickResult = {
    ok: true,
    elapsed: 0,
    emailsSent: 0,
    digestsBuilt: 0,
    deepDiveJobsAdvanced: 0,
  };

  logDailyTick('start', { maxDuration: MAX_DURATION });

  try {
    // ─────────────────────────────────────────────────────
    // Priority 1: Send due emails (Stage 1/2)
    // Placeholder — will be implemented with Stage 1
    // ─────────────────────────────────────────────────────
    if (hasTimeRemaining(startTime, MAX_DURATION, 20_000)) {
      // TODO: await sendDueEmails({ maxDuration: 20_000 });
      logDailyTick('send_emails', { status: 'skipped', reason: 'stage1_not_implemented' });
    }

    // ─────────────────────────────────────────────────────
    // Priority 2: Collect RSS sources (Stage 1)
    // Placeholder — will be implemented with Stage 1
    // ─────────────────────────────────────────────────────
    if (hasTimeRemaining(startTime, MAX_DURATION, 10_000)) {
      // TODO: await collectSources({ maxDuration: 8_000 });
      logDailyTick('collect_sources', { status: 'skipped', reason: 'stage1_not_implemented' });
    }

    // ─────────────────────────────────────────────────────
    // Priority 3: Build pending digests (Stage 1/2)
    // Placeholder — will be implemented with Stage 1/2
    // ─────────────────────────────────────────────────────
    if (hasTimeRemaining(startTime, MAX_DURATION, 10_000)) {
      // TODO: await buildDigests({ maxDuration: 12_000, maxUsers: 10 });
      logDailyTick('build_digests', { status: 'skipped', reason: 'stage1_not_implemented' });
    }

    // ─────────────────────────────────────────────────────
    // Priority 4: Deep dive scheduling + advancement (Stage 3)
    // ─────────────────────────────────────────────────────
    if (
      flags.deepResearchEnabled &&
      hasTimeRemaining(startTime, MAX_DURATION, 15_000)
    ) {
      // Schedule new jobs for users whose day matches
      const scheduled = await scheduleDeepDives();
      logDailyTick('schedule_deep_dives', { created: scheduled });

      // Advance existing jobs
      if (hasTimeRemaining(startTime, MAX_DURATION, 12_000)) {
        const maxJobs = parseInt(process.env.DEEP_DIVE_MAX_USERS_PER_TICK || '3');
        const advanced = await advanceDeepDiveJobs({
          maxJobs,
          maxDuration: MAX_DURATION,
          startTime,
        });
        result.deepDiveJobsAdvanced = advanced;
      }
    } else if (!flags.deepResearchEnabled) {
      logDailyTick('deep_dive', { status: 'disabled' });
    }
  } catch (error) {
    logDailyTick('error', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    result.ok = false;
  }

  result.elapsed = Date.now() - startTime;
  logDailyTick('complete', result);

  return result;
}
