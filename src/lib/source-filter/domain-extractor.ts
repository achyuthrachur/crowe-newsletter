/**
 * Domain Extractor
 * Pure function: extracts + normalizes domain from URL.
 */

/**
 * Extract and normalize domain from a URL.
 * Lowercases and strips "www." prefix.
 * Returns null if URL is malformed.
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    return null;
  }
}
