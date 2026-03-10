/**
 * Email Token Factory
 * Creates auth token sets and builds fully-qualified email URLs.
 */

import { createTokenSet, validateAuthToken } from './auth';

export interface TokenValidationResult {
  valid: boolean;
  userId: string;
  error?: string;
}

export async function validateToken(
  token: string,
  scope: string
): Promise<TokenValidationResult> {
  const userId = await validateAuthToken(token, scope);
  if (!userId) {
    return { valid: false, userId: '', error: 'Invalid or expired token' };
  }
  return { valid: true, userId };
}

export interface EmailTokens {
  prefs: string;
  pause: string;
  unsubscribe: string;
  prefsUrl: string;
  pauseUrl: string;
  unsubscribeUrl: string;
  readerUrl: string;
  feedbackBaseUrl: string;
}

/**
 * Create a full set of auth tokens + URLs for a user's email.
 * Uses APP_HOST env var (falls back to NEXT_PUBLIC_APP_URL, then localhost).
 */
export async function createEmailTokens(userId: string): Promise<EmailTokens> {
  const appHost =
    process.env.APP_HOST ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  const tokens = await createTokenSet(userId);

  return {
    prefs: tokens.prefs,
    pause: tokens.pause,
    unsubscribe: tokens.unsubscribe,
    prefsUrl: `${appHost}/prefs?token=${tokens.prefs}`,
    pauseUrl: `${appHost}/api/pause?token=${tokens.pause}`,
    unsubscribeUrl: `${appHost}/api/unsubscribe?token=${tokens.unsubscribe}`,
    readerUrl: `${appHost}/reader?token=${tokens.prefs}`,
    feedbackBaseUrl: `${appHost}/api/feedback?token=${tokens.prefs}`,
  };
}
