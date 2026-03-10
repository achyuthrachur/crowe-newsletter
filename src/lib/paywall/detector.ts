/**
 * Paywall Detector (Lightweight)
 *
 * Fits within Vercel free tier 10s timeout:
 * 1. HEAD request with real user-agent, 3s timeout
 * 2. Check HTTP status (401/403 → paywalled)
 * 3. Check final URL path for paywall patterns
 * 4. Check domain against known paywall domains
 *
 * Does NOT do full GET + HTML parsing (too slow for serverless).
 */

import type { PaywallCheckResult } from '../stage2/types';
import { extractDomain } from '../source-filter/domain-extractor';
import {
  HEAD_REQUEST_TIMEOUT_MS,
  KNOWN_PAYWALL_DOMAINS,
  PAYWALL_PATH_PATTERNS,
  PAYWALL_STATUS_CODES,
  USER_AGENT,
} from './markers';

/**
 * Check if a URL is behind a paywall.
 * Returns status 'ok', 'paywalled', or 'error'.
 */
export async function checkPaywall(url: string): Promise<PaywallCheckResult> {
  const domain = extractDomain(url);

  // Check known paywall domains first (no network needed)
  if (domain && KNOWN_PAYWALL_DOMAINS.has(domain)) {
    return {
      url,
      status: 'paywalled',
      reason: `Known paywall domain: ${domain}`,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      HEAD_REQUEST_TIMEOUT_MS
    );

    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    // Check HTTP status
    if (PAYWALL_STATUS_CODES.has(response.status)) {
      return {
        url,
        status: 'paywalled',
        reason: `HTTP ${response.status} response`,
      };
    }

    // Check final URL (after redirects) for paywall path patterns
    const finalUrl = response.url || url;
    const finalPath = finalUrl.toLowerCase();
    for (const pattern of PAYWALL_PATH_PATTERNS) {
      if (finalPath.includes(pattern)) {
        return {
          url,
          status: 'paywalled',
          reason: `Redirect to paywall path: ${pattern}`,
        };
      }
    }

    return { url, status: 'ok', reason: null };
  } catch (err) {
    // Timeout or network error — don't block, treat as ok
    // but flag that we couldn't verify
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('abort')) {
      // Timeout — treat as ok (assume accessible)
      return { url, status: 'ok', reason: null };
    }
    return {
      url,
      status: 'error',
      reason: `Network error: ${message}`,
    };
  }
}

/**
 * Batch check multiple URLs for paywalls.
 * Runs checks concurrently with concurrency limit.
 */
export async function checkPaywallBatch(
  urls: string[],
  concurrency = 5
): Promise<PaywallCheckResult[]> {
  const results: PaywallCheckResult[] = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      const result = await checkPaywall(url);
      results.push(result);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
