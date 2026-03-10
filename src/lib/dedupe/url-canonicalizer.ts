/**
 * URL Canonicalizer
 * Strips tracking parameters, normalizes URL for deduplication.
 */

/** Query parameters to strip (tracking/attribution) */
const STRIP_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
  'mc_cid',
  'mc_eid',
  'msclkid',
  'twclid',
  'igshid',
  'ncid',
  'ocid',
  '_hsenc',
  '_hsmi',
  'hss_channel',
]);

/**
 * Canonicalize a URL for deduplication.
 * - Strip tracking params (utm_*, fbclid, gclid, ref, mc_*)
 * - Remove trailing slash
 * - Lowercase hostname
 * - Sort remaining query params
 * - Remove fragment
 */
export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove www.
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }

    // Strip tracking params
    const params = new URLSearchParams(parsed.search);
    for (const key of [...params.keys()]) {
      if (STRIP_PARAMS.has(key.toLowerCase())) {
        params.delete(key);
      }
    }

    // Sort remaining params
    const sortedParams = new URLSearchParams(
      [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    );
    parsed.search = sortedParams.toString()
      ? '?' + sortedParams.toString()
      : '';

    // Remove fragment
    parsed.hash = '';

    // Remove trailing slash (but keep root path /)
    let result = parsed.toString();
    if (result.endsWith('/') && parsed.pathname !== '/') {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    // If URL is malformed, return as-is
    return url;
  }
}
