import * as cheerio from 'cheerio';
import { prisma } from '@/lib/db';
import { truncateText, hasTimeRemaining } from '@/lib/utils';
import { logDeepDive } from '@/lib/logger';
import { toJson, fromJson, type DeepDiveState } from '@/types';

const MAX_EXTRACTED_TEXT = 20_000;
const MIN_READABLE_CHARS = 1200;
const PAYWALL_MARKERS = [
  'subscribe to continue',
  'sign in to read',
  'sign in to continue',
  'metered paywall',
  'create a free account',
  'start your free trial',
  'subscribe for full access',
  'premium content',
  'members only',
  'you have reached your limit',
];
const PAYWALL_URL_PATTERNS = ['/subscribe', '/login', '/paywall', '/register', '/signin', '/sign-in'];

/**
 * FETCH stage: Fetch and extract text from candidate URLs in batches.
 *
 * Per invocation: process at most DEEP_DIVE_MAX_FETCH_PER_INVOCATION sources.
 * For each URL:
 *   - HEAD check for redirects/blocks
 *   - GET with user-agent
 *   - Extract readable text with Cheerio
 *   - Check length (>=1200 chars) and paywall markers
 *   - Update deep_dive_sources record
 *
 * Transitions:
 *   - If 4+ sources OK → SYNTHESIZE
 *   - If unfetched remain → stay in FETCH
 *   - If exhausted with <4 OK → mark partial, go to SYNTHESIZE
 */
export async function fetchAndExtractBatch(
  jobId: string,
  maxDuration: number
): Promise<void> {
  const startTime = Date.now();
  const maxFetch = parseInt(process.env.DEEP_DIVE_MAX_FETCH_PER_INVOCATION || '4');

  const job = await prisma.deepDiveJob.findUniqueOrThrow({
    where: { id: jobId },
  });

  const state = fromJson(job.state);

  // Get unfetched sources
  const unfetched = await prisma.deepDiveSource.findMany({
    where: { jobId, accessStatus: 'unknown' },
    take: maxFetch,
  });

  let fetchedCount = state.fetch?.fetchedCount ?? 0;
  let okCount = state.fetch?.okCount ?? 0;

  for (const source of unfetched) {
    if (!hasTimeRemaining(startTime, maxDuration, 8000)) {
      break; // Preserve buffer for DB writes
    }

    try {
      const result = await fetchSingleSource(source.url);

      await prisma.deepDiveSource.update({
        where: { id: source.id },
        data: {
          accessStatus: result.status,
          title: result.title,
          extractedText: result.text ? truncateText(result.text, MAX_EXTRACTED_TEXT) : null,
          sourceName: result.sourceName,
        },
      });

      if (result.status === 'ok') {
        okCount++;
      }
    } catch (error) {
      await prisma.deepDiveSource.update({
        where: { id: source.id },
        data: { accessStatus: 'blocked' },
      });
    }

    fetchedCount++;
  }

  // Check remaining unfetched
  const remainingUnfetched = await prisma.deepDiveSource.count({
    where: { jobId, accessStatus: 'unknown' },
  });

  // Determine next state
  let newState: DeepDiveState;

  if (okCount >= 4) {
    // Enough sources, proceed to synthesis
    newState = {
      stage: 'SYNTHESIZE',
      discovery: state.discovery,
      fetch: { totalSources: state.fetch?.totalSources ?? 0, fetchedCount, okCount, nextIndex: 0 },
      synthesis: { strategy: 'deep-research', retryCount: 0 },
    };
  } else if (remainingUnfetched > 0) {
    // More to fetch, stay in FETCH
    newState = {
      stage: 'FETCH',
      discovery: state.discovery,
      fetch: { totalSources: state.fetch?.totalSources ?? 0, fetchedCount, okCount, nextIndex: fetchedCount },
    };
  } else if (okCount >= 2) {
    // Exhausted sources but have at least 2 — proceed with partial
    newState = {
      stage: 'SYNTHESIZE',
      discovery: state.discovery,
      fetch: { totalSources: state.fetch?.totalSources ?? 0, fetchedCount, okCount, nextIndex: 0 },
      synthesis: { strategy: 'deep-research', retryCount: 0 },
    };
    await prisma.deepDiveJob.update({
      where: { id: jobId },
      data: { status: 'partial' },
    });
  } else {
    // Not enough sources at all
    newState = {
      stage: 'SYNTHESIZE',
      discovery: state.discovery,
      fetch: { totalSources: state.fetch?.totalSources ?? 0, fetchedCount, okCount, nextIndex: 0 },
      synthesis: { strategy: 'map-reduce', retryCount: 0 },
    };
    await prisma.deepDiveJob.update({
      where: { id: jobId },
      data: { status: 'partial' },
    });
  }

  await prisma.deepDiveJob.update({
    where: { id: jobId },
    data: { state: toJson(newState) },
  });

  logDeepDive({
    jobId,
    userId: job.userId,
    stage: 'FETCH',
    status: newState.stage === 'FETCH' ? 'continuing' : 'done',
    sourcesOk: okCount,
    sourcesTotal: fetchedCount,
  });
}

/**
 * Fetch a single URL, extract readable text, and check for paywalls.
 */
async function fetchSingleSource(url: string): Promise<{
  status: 'ok' | 'paywalled' | 'blocked';
  title?: string;
  text?: string;
  sourceName?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s per source

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Check status
    if (response.status === 401 || response.status === 403) {
      return { status: 'paywalled' };
    }
    if (!response.ok) {
      return { status: 'blocked' };
    }

    // Check redirect chain for paywall patterns
    const finalUrl = response.url;
    if (PAYWALL_URL_PATTERNS.some((p) => finalUrl.includes(p))) {
      return { status: 'paywalled' };
    }

    const html = await response.text();

    // Check for paywall markers in HTML
    const htmlLower = html.toLowerCase();
    if (PAYWALL_MARKERS.some((marker) => htmlLower.includes(marker))) {
      return { status: 'paywalled' };
    }

    // Extract readable text
    const $ = cheerio.load(html);

    // Get title
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      undefined;

    // Get source name
    const sourceName =
      $('meta[property="og:site_name"]').attr('content') ||
      undefined;

    // Remove non-content elements
    $('script, style, nav, header, footer, aside, iframe, noscript, svg, [role="navigation"], [role="banner"], .sidebar, .nav, .menu, .ad, .advertisement, .social-share').remove();

    // Extract main content
    const contentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.article-body',
      '.post-content',
      '.entry-content',
      '.story-body',
    ];

    let text = '';
    for (const selector of contentSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        text = el.text().replace(/\s+/g, ' ').trim();
        break;
      }
    }

    // Fallback to body
    if (text.length < MIN_READABLE_CHARS) {
      text = $('body').text().replace(/\s+/g, ' ').trim();
    }

    // Check minimum length
    if (text.length < MIN_READABLE_CHARS) {
      return { status: 'blocked', title };
    }

    return { status: 'ok', title, text, sourceName };
  } catch {
    clearTimeout(timeout);
    return { status: 'blocked' };
  }
}
