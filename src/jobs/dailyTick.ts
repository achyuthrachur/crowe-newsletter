import { flags } from '@/lib/flags';
import { logDailyTick } from '@/lib/logger';
import { hasTimeRemaining } from '@/lib/utils';
import { sendDueEmails } from './sendDueEmails';
import { collectSources } from './collectSources';
import { buildDigests } from './buildDigests';
import { runWebSearches } from './runWebSearches';
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
 * 1. Send due daily digest emails (deliver yesterday's built digests)
 * 2. Collect RSS sources + match to user interests
 * 3. Web search expansion (Stage 2, gated by flag)
 * 4. Build pending digests for tomorrow's delivery
 * 5. Schedule + advance deep dive jobs (Stage 3)
 */
export async function runDailyTick(): Promise<DailyTickResult> {
  const startTime = Date.now();
  const result: DailyTickResult = {
    ok: true,
    elapsed: 0,
    emailsSent: 0,
    digestsBuilt: 0,
    deepDiveJobsAdvanced: 0,
    articlesCollected: 0,
    matchesCreated: 0,
    webSearchQueries: 0,
  };

  logDailyTick('start', { maxDuration: MAX_DURATION });

  try {
    // ─────────────────────────────────────────────────────
    // Priority 1: Send due emails (15s budget)
    // Delivers yesterday's built digests to users whose schedule says now
    // ─────────────────────────────────────────────────────
    if (hasTimeRemaining(startTime, MAX_DURATION, 20_000)) {
      const emailResult = await sendDueEmails({ maxDuration: 15_000 });
      result.emailsSent = emailResult.emailsSent;
      logDailyTick('send_emails', {
        sent: emailResult.emailsSent,
        errors: emailResult.errors,
        elapsed: emailResult.elapsed,
      });
    }

    // ─────────────────────────────────────────────────────
    // Priority 2: Collect RSS sources + match (10s budget)
    // Fetches feeds, inserts articles, scores against user interests
    // ─────────────────────────────────────────────────────
    if (hasTimeRemaining(startTime, MAX_DURATION, 15_000)) {
      const collectResult = await collectSources();
      result.articlesCollected = collectResult.articlesInserted;
      result.matchesCreated = collectResult.matchesCreated;
      logDailyTick('collect_sources', {
        feeds: collectResult.feedsFetched,
        articles: collectResult.articlesInserted,
        matches: collectResult.matchesCreated,
        elapsed: collectResult.elapsed,
      });
    }

    // ─────────────────────────────────────────────────────
    // Priority 3: Web search expansion (8s budget, Stage 2)
    // Supplements sparse interests with OpenAI web_search
    // ─────────────────────────────────────────────────────
    if (
      flags.websearchEnabled &&
      hasTimeRemaining(startTime, MAX_DURATION, 15_000)
    ) {
      const searchResult = await runWebSearches({ maxDuration: 8_000 });
      result.webSearchQueries = searchResult.queriesRun;
      result.matchesCreated += searchResult.matchesCreated;
      logDailyTick('web_search', {
        queries: searchResult.queriesRun,
        results: searchResult.resultsFound,
        matches: searchResult.matchesCreated,
        elapsed: searchResult.elapsed,
      });
    } else if (!flags.websearchEnabled) {
      logDailyTick('web_search', { status: 'disabled' });
    }

    // ─────────────────────────────────────────────────────
    // Priority 4: Build pending digests (8s budget)
    // Compiles today's top matches per user into HTML for tomorrow's send
    // ─────────────────────────────────────────────────────
    if (hasTimeRemaining(startTime, MAX_DURATION, 15_000)) {
      const digestResult = await buildDigests({ maxDuration: 8_000, maxUsers: 10 });
      result.digestsBuilt = digestResult.digestsBuilt;
      logDailyTick('build_digests', {
        built: digestResult.digestsBuilt,
        elapsed: digestResult.elapsed,
      });
    }

    // ─────────────────────────────────────────────────────
    // Priority 5: Deep dive scheduling + advancement (Stage 3)
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
