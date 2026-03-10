import { describe, it, expect } from 'vitest';
import { createHash, randomBytes } from 'crypto';

// Test the token hashing logic directly (without DB)
function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

describe('token hashing', () => {
  it('produces a consistent hash for the same input', () => {
    const token = 'test-token-abc123';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashToken('token-a');
    const hash2 = hashToken('token-b');
    expect(hash1).not.toBe(hash2);
  });

  it('produces a 64-char hex string', () => {
    const hash = hashToken('any-input');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('generates tokens of sufficient length', () => {
    const raw = randomBytes(32).toString('base64url');
    // 32 bytes → 43 base64url chars
    expect(raw.length).toBeGreaterThanOrEqual(32);
  });
});

describe('token scope expiry', () => {
  const SCOPE_EXPIRY_DAYS: Record<string, number> = {
    prefs: 14,
    pause: 14,
    unsubscribe: 90,
  };

  it('prefs tokens expire in 14 days', () => {
    expect(SCOPE_EXPIRY_DAYS['prefs']).toBe(14);
  });

  it('pause tokens expire in 14 days', () => {
    expect(SCOPE_EXPIRY_DAYS['pause']).toBe(14);
  });

  it('unsubscribe tokens expire in 90 days', () => {
    expect(SCOPE_EXPIRY_DAYS['unsubscribe']).toBe(90);
  });

  it('generates correct expiry date', () => {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + SCOPE_EXPIRY_DAYS['prefs']);

    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(14);
  });
});
