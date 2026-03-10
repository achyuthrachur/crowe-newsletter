import { describe, it, expect } from 'vitest';

// Test the scoring logic directly (extracted from matcher.ts)
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreArticleForInterest(
  title: string,
  snippet: string | null,
  interestLabel: string
): { score: number; reason: string } {
  const labelLower = interestLabel.toLowerCase();
  const titleLower = title.toLowerCase();
  const snippetLower = (snippet || '').toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  if (titleLower.includes(labelLower)) {
    score += 100;
    reasons.push(`label "${interestLabel}" found in title`);
  }

  if (snippetLower.includes(labelLower)) {
    score += 60;
    reasons.push(`label "${interestLabel}" found in snippet`);
  }

  const labelTokens = tokenize(interestLabel);
  const titleTokens = new Set(tokenize(title));
  const snippetTokens = new Set(tokenize(snippet || ''));
  const allArticleTokens = new Set([...titleTokens, ...snippetTokens]);

  const overlapping = labelTokens.filter((t) => allArticleTokens.has(t));
  if (overlapping.length >= 2) {
    score += 30;
    reasons.push(`word overlap: ${overlapping.join(', ')}`);
  }

  return { score, reason: reasons.join('; ') || 'no match' };
}

describe('matcher scoring', () => {
  it('gives +100 for exact label match in title', () => {
    const { score } = scoreArticleForInterest(
      'AI in financial services is booming',
      null,
      'AI in financial services'
    );
    expect(score).toBeGreaterThanOrEqual(100);
  });

  it('gives +60 for exact label match in snippet', () => {
    const { score } = scoreArticleForInterest(
      'Industry news update',
      'The rise of AI in financial services continues...',
      'AI in financial services'
    );
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it('gives +30 for word overlap >= 2 tokens', () => {
    const { score } = scoreArticleForInterest(
      'Financial regulations update: new consulting rules',
      null,
      'Financial consulting services'
    );
    // "financial" and "consulting" both match (>2 chars each)
    expect(score).toBeGreaterThanOrEqual(30);
  });

  it('gives 0 for no match', () => {
    const { score } = scoreArticleForInterest(
      'Sports news: football season recap',
      'The latest scores from the weekend games',
      'Anti-Money Laundering'
    );
    expect(score).toBe(0);
  });

  it('is case insensitive', () => {
    const { score } = scoreArticleForInterest(
      'AI IN CONSULTING: New Trends',
      null,
      'ai in consulting'
    );
    expect(score).toBeGreaterThanOrEqual(100);
  });

  it('accumulates scores for title + snippet match', () => {
    const { score } = scoreArticleForInterest(
      'Anti-Money Laundering enforcement rises',
      'Banks face stricter anti-money laundering regulations',
      'Anti-Money Laundering'
    );
    // Title match (100) + snippet match (60) = 160
    expect(score).toBeGreaterThanOrEqual(160);
  });
});
