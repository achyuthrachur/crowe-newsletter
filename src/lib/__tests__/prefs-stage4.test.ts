import { describe, it, expect } from 'vitest';

// ── Inline helpers matching prefs route validation logic ──

function clampWeight(weight: unknown): number {
  if (typeof weight !== 'number') return 100;
  return Math.max(0, Math.min(200, weight));
}

function clampMaxItemsTotal(value: unknown): number {
  if (typeof value !== 'number') return 8;
  return Math.max(1, Math.min(12, value));
}

function clampMaxItemsPerSection(value: unknown): number {
  if (typeof value !== 'number') return 3;
  return Math.max(1, Math.min(5, value));
}

function normalizeKeyword(raw: string): string {
  return raw.toLowerCase().trim();
}

function normalizeDomain(raw: string): string {
  return raw.toLowerCase().trim().replace(/^www\./, '');
}

// ── Tests ──

describe('prefs-stage4: weight clamping', () => {
  it('defaults to 100 for non-number input', () => {
    expect(clampWeight(undefined)).toBe(100);
    expect(clampWeight(null)).toBe(100);
    expect(clampWeight('high')).toBe(100);
  });

  it('clamps to 0 minimum', () => {
    expect(clampWeight(-50)).toBe(0);
    expect(clampWeight(-1)).toBe(0);
  });

  it('clamps to 200 maximum', () => {
    expect(clampWeight(250)).toBe(200);
    expect(clampWeight(999)).toBe(200);
  });

  it('passes through valid values', () => {
    expect(clampWeight(0)).toBe(0);
    expect(clampWeight(100)).toBe(100);
    expect(clampWeight(140)).toBe(140);
    expect(clampWeight(200)).toBe(200);
  });
});

describe('prefs-stage4: cap clamping', () => {
  it('clamps maxItemsTotal between 1-12', () => {
    expect(clampMaxItemsTotal(0)).toBe(1);
    expect(clampMaxItemsTotal(-5)).toBe(1);
    expect(clampMaxItemsTotal(1)).toBe(1);
    expect(clampMaxItemsTotal(8)).toBe(8);
    expect(clampMaxItemsTotal(12)).toBe(12);
    expect(clampMaxItemsTotal(20)).toBe(12);
  });

  it('clamps maxItemsPerSection between 1-5', () => {
    expect(clampMaxItemsPerSection(0)).toBe(1);
    expect(clampMaxItemsPerSection(-1)).toBe(1);
    expect(clampMaxItemsPerSection(1)).toBe(1);
    expect(clampMaxItemsPerSection(3)).toBe(3);
    expect(clampMaxItemsPerSection(5)).toBe(5);
    expect(clampMaxItemsPerSection(10)).toBe(5);
  });

  it('defaults on non-number input', () => {
    expect(clampMaxItemsTotal(undefined)).toBe(8);
    expect(clampMaxItemsPerSection(undefined)).toBe(3);
  });
});

describe('prefs-stage4: keyword normalization', () => {
  it('lowercases keywords', () => {
    expect(normalizeKeyword('Bitcoin')).toBe('bitcoin');
    expect(normalizeKeyword('CRYPTO')).toBe('crypto');
  });

  it('trims whitespace', () => {
    expect(normalizeKeyword('  bitcoin  ')).toBe('bitcoin');
  });

  it('preserves spaces in multi-word keywords', () => {
    expect(normalizeKeyword('machine learning')).toBe('machine learning');
  });
});

describe('prefs-stage4: domain normalization', () => {
  it('lowercases domains', () => {
    expect(normalizeDomain('Example.COM')).toBe('example.com');
  });

  it('strips www. prefix', () => {
    expect(normalizeDomain('www.example.com')).toBe('example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeDomain('  www.example.com  ')).toBe('example.com');
  });

  it('preserves subdomains other than www', () => {
    expect(normalizeDomain('blog.example.com')).toBe('blog.example.com');
  });

  it('handles domain without www', () => {
    expect(normalizeDomain('nytimes.com')).toBe('nytimes.com');
  });
});

describe('prefs-stage4: deduplication of blocks', () => {
  it('deduplicates keyword list', () => {
    const keywords = ['bitcoin', 'Bitcoin', 'BITCOIN', 'ethereum'];
    const normalized = [...new Set(keywords.map(normalizeKeyword))];
    expect(normalized).toEqual(['bitcoin', 'ethereum']);
  });

  it('deduplicates domain list', () => {
    const domains = ['www.example.com', 'example.com', 'EXAMPLE.COM'];
    const normalized = [...new Set(domains.map(normalizeDomain))];
    expect(normalized).toEqual(['example.com']);
  });

  it('filters empty strings', () => {
    const keywords = ['bitcoin', '', '  ', 'ethereum'];
    const filtered = keywords
      .filter((k) => typeof k === 'string' && k.trim())
      .map(normalizeKeyword);
    expect(filtered).toEqual(['bitcoin', 'ethereum']);
  });
});
