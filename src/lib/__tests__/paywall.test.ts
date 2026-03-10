import { describe, it, expect } from 'vitest';

// Test the paywall detection markers directly
const PAYWALL_MARKERS = [
  'subscribe to continue',
  'sign in to read',
  'create a free account',
  'this content is for subscribers',
  'premium content',
  'paywall',
  'subscription required',
  'register to read',
  'log in to access',
  'members only',
];

function detectPaywallInContent(body: string): boolean {
  const bodyLower = body.toLowerCase();
  return PAYWALL_MARKERS.some((marker) => bodyLower.includes(marker));
}

function detectLoginRedirect(url: string): boolean {
  return (
    url.includes('/login') ||
    url.includes('/signin') ||
    url.includes('/subscribe') ||
    url.includes('/registration')
  );
}

describe('paywall detection', () => {
  it('detects "subscribe to continue" marker', () => {
    expect(
      detectPaywallInContent('<html><body>Please subscribe to continue reading</body></html>')
    ).toBe(true);
  });

  it('detects "premium content" marker', () => {
    expect(
      detectPaywallInContent('<html><body>This is premium content</body></html>')
    ).toBe(true);
  });

  it('does not flag clean content', () => {
    expect(
      detectPaywallInContent(
        '<html><body>The SEC announced new regulations for financial reporting.</body></html>'
      )
    ).toBe(false);
  });

  it('is case insensitive', () => {
    expect(
      detectPaywallInContent('SUBSCRIPTION REQUIRED to view this article')
    ).toBe(true);
  });

  it('detects login redirect URLs', () => {
    expect(detectLoginRedirect('https://example.com/login?redirect=/article/123')).toBe(true);
    expect(detectLoginRedirect('https://example.com/signin')).toBe(true);
    expect(detectLoginRedirect('https://example.com/subscribe')).toBe(true);
    expect(detectLoginRedirect('https://example.com/registration')).toBe(true);
  });

  it('does not flag normal URLs', () => {
    expect(detectLoginRedirect('https://example.com/article/new-regulations')).toBe(false);
    expect(detectLoginRedirect('https://example.com/news/technology')).toBe(false);
  });
});
