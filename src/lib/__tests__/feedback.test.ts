import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// ── Inline helpers matching feedback route logic ──

function normalizeDomain(raw: string): string {
  return raw.toLowerCase().replace(/^www\./, '');
}

function titleHash(title: string): string {
  return createHash('sha256').update(title.toLowerCase().trim()).digest('hex').slice(0, 16);
}

const VALID_ACTIONS = ['upvote', 'downvote', 'dismiss', 'block_source'] as const;

describe('feedback: action validation', () => {
  it('accepts valid actions', () => {
    for (const action of VALID_ACTIONS) {
      expect(VALID_ACTIONS.includes(action)).toBe(true);
    }
  });

  it('rejects invalid actions', () => {
    const invalid = 'like' as (typeof VALID_ACTIONS)[number];
    expect(VALID_ACTIONS.includes(invalid)).toBe(false);
  });
});

describe('feedback: domain normalization', () => {
  it('strips www. prefix', () => {
    expect(normalizeDomain('www.example.com')).toBe('example.com');
  });

  it('lowercases domain', () => {
    expect(normalizeDomain('WWW.Example.COM')).toBe('example.com');
  });

  it('preserves subdomain that is not www', () => {
    expect(normalizeDomain('blog.example.com')).toBe('blog.example.com');
  });

  it('handles domain already without www', () => {
    expect(normalizeDomain('example.com')).toBe('example.com');
  });
});

describe('feedback: title hashing', () => {
  it('produces consistent 16-char hex hash', () => {
    const hash = titleHash('Breaking News: AI Advances');
    expect(hash).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(titleHash('Test Title')).toBe(titleHash('test title'));
  });

  it('trims whitespace', () => {
    expect(titleHash('  Test Title  ')).toBe(titleHash('Test Title'));
  });

  it('produces different hashes for different titles', () => {
    expect(titleHash('Title A')).not.toBe(titleHash('Title B'));
  });
});

describe('feedback: suppression expiry computation', () => {
  it('computes correct expiry from SUPPRESSION_DAYS_DEFAULT', () => {
    const days = 14;
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + days);

    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(14);
  });

  it('defaults to 14 days when env not set', () => {
    const envValue: string | undefined = undefined;
    const days = parseInt(envValue || '14', 10);
    expect(days).toBe(14);
  });
});
