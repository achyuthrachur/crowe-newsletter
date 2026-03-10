/**
 * Paywall Markers
 * URL patterns and known paywall domains for heuristic detection.
 */

/** URL path segments that indicate a paywall or login gate */
export const PAYWALL_PATH_PATTERNS = [
  '/subscribe',
  '/login',
  '/paywall',
  '/register',
  '/signup',
  '/sign-up',
  '/sign-in',
  '/signin',
  '/membership',
  '/premium',
  '/checkout',
] as const;

/** Known hard-paywall domains */
export const KNOWN_PAYWALL_DOMAINS = new Set([
  'wsj.com',
  'ft.com',
  'nytimes.com',
  'economist.com',
  'barrons.com',
  'hbr.org',
  'bloomberg.com',
  'washingtonpost.com',
  'theathletic.com',
  'thetimes.co.uk',
  'telegraph.co.uk',
  'afr.com',
  'businessinsider.com',
  'seekingalpha.com',
  'stratechery.com',
  'theinformation.com',
  'foreignaffairs.com',
]);

/** HTTP status codes that indicate paywall/auth requirement */
export const PAYWALL_STATUS_CODES = new Set([401, 403]);

/** Timeout for HEAD requests in milliseconds */
export const HEAD_REQUEST_TIMEOUT_MS = 3000;

/** User agent for HEAD requests */
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
