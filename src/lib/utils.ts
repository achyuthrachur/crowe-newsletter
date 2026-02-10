/**
 * Normalize a URL to a canonical form for deduplication.
 * Strips UTM params, trailing slashes, and lowercases the host.
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // Remove tracking params
    const stripParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'fbclid', 'gclid', 'msclkid',
    ];
    for (const param of stripParams) {
      url.searchParams.delete(param);
    }
    // Normalize
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let path = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.protocol}//${url.hostname}${path}${url.search}`;
  } catch {
    return rawUrl;
  }
}

/**
 * Extract domain from a URL (lowercase, no www).
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Get the Monday (start of week) for a given date in a timezone.
 */
export function getMondayOfWeek(date: Date, timezone: string): Date {
  const localStr = date.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
  const local = new Date(localStr + 'T00:00:00Z');
  const day = local.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  local.setUTCDate(local.getUTCDate() + diff);
  return local;
}

/**
 * Get the day-of-week code for a date in a timezone.
 */
export function getDayOfWeek(date: Date, timezone: string): string {
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const dayIndex = new Date(
    date.toLocaleDateString('en-CA', { timeZone: timezone }) + 'T12:00:00Z'
  ).getUTCDay();
  return days[dayIndex];
}

/**
 * Truncate text to a max length, preserving word boundaries.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxLength * 0.8 ? truncated.slice(0, lastSpace) : truncated;
}

/**
 * Check remaining time against a buffer threshold.
 */
export function hasTimeRemaining(startTime: number, maxDuration: number, buffer: number = 8000): boolean {
  return Date.now() - startTime < maxDuration - buffer;
}
