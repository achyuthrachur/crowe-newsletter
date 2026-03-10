import { describe, it, expect } from 'vitest';
import { applyPersonalization } from '../ranking/scorer-v2';
import type { PersonalizationResult } from '../ranking/scorer-v2';

// ── Test helpers ──

function makeMatch(overrides: {
  articleId?: string;
  interestId?: string;
  score?: number;
  reason?: string;
  canonicalUrl?: string;
  title?: string;
  snippet?: string | null;
  sourceName?: string;
  publishedAt?: Date | null;
}) {
  return {
    id: 'match-' + Math.random().toString(36).slice(2, 8),
    articleId: overrides.articleId || 'article-1',
    userId: 'user-1',
    interestId: overrides.interestId || 'interest-1',
    score: overrides.score ?? 100,
    reason: overrides.reason || 'title match',
    createdAt: new Date(),
    article: {
      id: overrides.articleId || 'article-1',
      canonicalUrl: overrides.canonicalUrl || 'https://example.com/article',
      title: overrides.title || 'Test Article',
      snippet: overrides.snippet ?? 'Some snippet text',
      sourceName: overrides.sourceName || 'Example News',
      publishedAt: overrides.publishedAt ?? new Date(),
      fetchedAt: new Date(),
      accessStatus: 'unknown',
      contentHash: null,
    },
  };
}

function makeContext(overrides: {
  interestWeights?: Map<string, number>;
  keywordBlocks?: string[];
  sourceBlocks?: Set<string>;
  suppressedUrls?: Set<string>;
  feedbackByDomain?: Map<string, { upvotes: number; downvotes: number }>;
  feedbackByInterest?: Map<string, { upvotes: number; downvotes: number }>;
} = {}) {
  return {
    interestWeights: overrides.interestWeights || new Map(),
    keywordBlocks: overrides.keywordBlocks || [],
    sourceBlocks: overrides.sourceBlocks || new Set(),
    suppressedUrls: overrides.suppressedUrls || new Set(),
    feedbackByDomain: overrides.feedbackByDomain || new Map(),
    feedbackByInterest: overrides.feedbackByInterest || new Map(),
  };
}

// ── Tests ──

describe('scorer-v2: keyword blocking', () => {
  it('drops matches with blocked keywords in title', () => {
    const matches = [
      makeMatch({ title: 'Bitcoin price surges again', score: 100 }),
      makeMatch({ title: 'AI in healthcare', score: 90, canonicalUrl: 'https://example.com/ai' }),
    ];

    const result = applyPersonalization(matches, makeContext({
      keywordBlocks: ['bitcoin'],
    }));

    expect(result.dropped.keyword).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].match.article.title).toBe('AI in healthcare');
  });

  it('drops matches with blocked keywords in snippet', () => {
    const matches = [
      makeMatch({ title: 'Market Update', snippet: 'Cryptocurrency bitcoin trends', score: 100 }),
    ];

    const result = applyPersonalization(matches, makeContext({
      keywordBlocks: ['bitcoin'],
    }));

    expect(result.dropped.keyword).toBe(1);
    expect(result.results).toHaveLength(0);
  });

  it('keyword matching is case-insensitive', () => {
    const matches = [
      makeMatch({ title: 'BITCOIN Price Update', score: 100 }),
    ];

    const result = applyPersonalization(matches, makeContext({
      keywordBlocks: ['bitcoin'],
    }));

    expect(result.dropped.keyword).toBe(1);
  });
});

describe('scorer-v2: source blocking', () => {
  it('drops matches from blocked domains', () => {
    const matches = [
      makeMatch({ canonicalUrl: 'https://www.blocked-site.com/article', score: 100 }),
      makeMatch({ canonicalUrl: 'https://good-site.com/article', score: 90 }),
    ];

    const result = applyPersonalization(matches, makeContext({
      sourceBlocks: new Set(['blocked-site.com']),
    }));

    expect(result.dropped.source).toBe(1);
    expect(result.results).toHaveLength(1);
  });

  it('normalizes www. when matching domains', () => {
    const matches = [
      makeMatch({ canonicalUrl: 'https://www.blocked.com/news', score: 100 }),
    ];

    const result = applyPersonalization(matches, makeContext({
      sourceBlocks: new Set(['blocked.com']),
    }));

    expect(result.dropped.source).toBe(1);
  });
});

describe('scorer-v2: suppression filtering', () => {
  it('drops suppressed URLs', () => {
    const url = 'https://example.com/old-story';
    const matches = [
      makeMatch({ canonicalUrl: url, score: 100 }),
      makeMatch({ canonicalUrl: 'https://example.com/new-story', score: 90 }),
    ];

    const result = applyPersonalization(matches, makeContext({
      suppressedUrls: new Set([url]),
    }));

    expect(result.dropped.suppressed).toBe(1);
    expect(result.results).toHaveLength(1);
  });
});

describe('scorer-v2: weight multipliers', () => {
  it('multiplies score by weight/100', () => {
    const matches = [
      makeMatch({ interestId: 'int-high', score: 100, canonicalUrl: 'https://a.com/1' }),
      makeMatch({ interestId: 'int-low', score: 100, canonicalUrl: 'https://b.com/2' }),
    ];

    const result = applyPersonalization(matches, makeContext({
      interestWeights: new Map([
        ['int-high', 150],
        ['int-low', 50],
      ]),
    }));

    expect(result.results).toHaveLength(2);
    const highResult = result.results.find((r) => r.match.interestId === 'int-high')!;
    const lowResult = result.results.find((r) => r.match.interestId === 'int-low')!;

    expect(highResult.adjustedScore).toBe(150); // 100 * 1.5
    expect(lowResult.adjustedScore).toBe(50);   // 100 * 0.5
  });

  it('defaults to weight 100 for unknown interests', () => {
    const matches = [makeMatch({ interestId: 'unknown', score: 80 })];

    const result = applyPersonalization(matches, makeContext());

    expect(result.results[0].adjustedScore).toBe(80); // 80 * 1.0
  });

  it('handles weight of 0 (muted interest)', () => {
    const matches = [makeMatch({ interestId: 'muted', score: 100 })];

    const result = applyPersonalization(matches, makeContext({
      interestWeights: new Map([['muted', 0]]),
    }));

    expect(result.results[0].adjustedScore).toBe(0);
  });
});

describe('scorer-v2: feedback adjustments', () => {
  it('adds +10 for domains with >=3 upvotes', () => {
    const matches = [makeMatch({
      canonicalUrl: 'https://popular.com/article',
      score: 100,
      interestId: 'int-1',
    })];

    const result = applyPersonalization(matches, makeContext({
      feedbackByDomain: new Map([
        ['popular.com', { upvotes: 3, downvotes: 0 }],
      ]),
    }));

    expect(result.results[0].adjustedScore).toBe(110); // 100 + 10
  });

  it('subtracts -25 for domains with >=3 downvotes', () => {
    const matches = [makeMatch({
      canonicalUrl: 'https://unpopular.com/article',
      score: 100,
      interestId: 'int-1',
    })];

    const result = applyPersonalization(matches, makeContext({
      feedbackByDomain: new Map([
        ['unpopular.com', { upvotes: 0, downvotes: 3 }],
      ]),
    }));

    expect(result.results[0].adjustedScore).toBe(75); // 100 - 25
  });

  it('subtracts -20 for interests with >=3 downvotes', () => {
    const matches = [makeMatch({
      canonicalUrl: 'https://example.com/article',
      score: 100,
      interestId: 'bad-interest',
    })];

    const result = applyPersonalization(matches, makeContext({
      feedbackByInterest: new Map([
        ['bad-interest', { upvotes: 0, downvotes: 3 }],
      ]),
    }));

    expect(result.results[0].adjustedScore).toBe(80); // 100 - 20
  });

  it('combines domain and interest feedback adjustments', () => {
    const matches = [makeMatch({
      canonicalUrl: 'https://popular.com/article',
      score: 100,
      interestId: 'good-interest',
    })];

    const result = applyPersonalization(matches, makeContext({
      feedbackByDomain: new Map([
        ['popular.com', { upvotes: 5, downvotes: 0 }],
      ]),
      feedbackByInterest: new Map([
        ['good-interest', { upvotes: 10, downvotes: 1 }],
      ]),
    }));

    // +10 domain bonus, no interest penalty (only 1 downvote < 3)
    expect(result.results[0].adjustedScore).toBe(110);
  });

  it('does not apply bonus for fewer than 3 feedback events', () => {
    const matches = [makeMatch({
      canonicalUrl: 'https://site.com/article',
      score: 100,
    })];

    const result = applyPersonalization(matches, makeContext({
      feedbackByDomain: new Map([
        ['site.com', { upvotes: 2, downvotes: 2 }],
      ]),
    }));

    expect(result.results[0].adjustedScore).toBe(100); // No adjustment
  });
});

describe('scorer-v2: result ordering', () => {
  it('sorts results by adjusted score descending', () => {
    const matches = [
      makeMatch({ interestId: 'low', score: 50, canonicalUrl: 'https://a.com/1', title: 'A' }),
      makeMatch({ interestId: 'high', score: 200, canonicalUrl: 'https://b.com/2', title: 'B' }),
      makeMatch({ interestId: 'mid', score: 100, canonicalUrl: 'https://c.com/3', title: 'C' }),
    ];

    const result = applyPersonalization(matches, makeContext());

    expect(result.results[0].adjustedScore).toBe(200);
    expect(result.results[1].adjustedScore).toBe(100);
    expect(result.results[2].adjustedScore).toBe(50);
  });
});

describe('scorer-v2: combined filtering', () => {
  it('applies all filters together and reports drop counts', () => {
    const matches = [
      makeMatch({ title: 'Good article', canonicalUrl: 'https://good.com/1', score: 100 }),
      makeMatch({ title: 'Blocked keyword here', canonicalUrl: 'https://good.com/2', score: 90 }),
      makeMatch({ title: 'Normal article', canonicalUrl: 'https://blocked.com/3', score: 80 }),
      makeMatch({ title: 'Old story', canonicalUrl: 'https://suppressed.com/old', score: 70 }),
    ];

    const result = applyPersonalization(matches, makeContext({
      keywordBlocks: ['blocked keyword'],
      sourceBlocks: new Set(['blocked.com']),
      suppressedUrls: new Set(['https://suppressed.com/old']),
    }));

    expect(result.dropped.keyword).toBe(1);
    expect(result.dropped.source).toBe(1);
    expect(result.dropped.suppressed).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].match.article.title).toBe('Good article');
  });
});
