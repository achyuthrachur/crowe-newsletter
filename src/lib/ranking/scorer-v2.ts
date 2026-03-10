/**
 * Scorer v2 — Personalized scoring engine (Stage 4)
 *
 * Operates directly on ArticleMatch records from DB — no CandidateArticle conversion.
 * Applies weight multiplier + feedback adjustments on top of existing ArticleMatch.score.
 */

import { prisma } from '../db';

// ── Types ──────────────────────────────────────────────────────

interface ArticleData {
  id: string;
  canonicalUrl: string;
  title: string;
  snippet: string | null;
  sourceName: string;
  publishedAt: Date | null;
  fetchedAt: Date;
  accessStatus: string;
  contentHash: string | null;
}

interface MatchRecord {
  id: string;
  articleId: string;
  userId: string;
  interestId: string;
  score: number;
  reason: string;
  createdAt: Date;
  article: ArticleData;
}

interface PersonalizationContext {
  interestWeights: Map<string, number>; // interestId → weight (0-200)
  keywordBlocks: string[];
  sourceBlocks: Set<string>; // normalized domains
  suppressedUrls: Set<string>;
  feedbackByDomain: Map<string, { upvotes: number; downvotes: number }>;
  feedbackByInterest: Map<string, { upvotes: number; downvotes: number }>;
}

export interface PersonalizedMatch {
  match: MatchRecord;
  adjustedScore: number;
}

export interface PersonalizationResult {
  dropped: {
    keyword: number;
    source: number;
    suppressed: number;
  };
  results: PersonalizedMatch[];
}

// ── Domain extraction ──────────────────────────────────────────

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ── Load context ───────────────────────────────────────────────

export async function loadPersonalizationContext(
  userId: string
): Promise<PersonalizationContext> {
  const lookbackDays = parseInt(process.env.FEEDBACK_LOOKBACK_DAYS || '30', 10);
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  const [interests, keywords, sources, suppressions, feedbackEvents] = await Promise.all([
    prisma.interest.findMany({
      where: { userId },
      select: { id: true, weight: true },
    }),
    prisma.userKeywordBlock.findMany({
      where: { userId },
      select: { keyword: true },
    }),
    prisma.userSourceBlock.findMany({
      where: { userId },
      select: { domain: true },
    }),
    prisma.userStorySuppression.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { canonicalUrl: true },
    }),
    prisma.feedbackEvent.findMany({
      where: { userId, createdAt: { gte: lookbackDate } },
      select: { action: true, articleId: true, interestId: true, article: { select: { canonicalUrl: true } } },
    }),
  ]);

  // Build interest weights map
  const interestWeights = new Map<string, number>();
  for (const i of interests) {
    interestWeights.set(i.id, i.weight);
  }

  // Build feedback aggregates by domain and interest
  const feedbackByDomain = new Map<string, { upvotes: number; downvotes: number }>();
  const feedbackByInterest = new Map<string, { upvotes: number; downvotes: number }>();

  for (const event of feedbackEvents) {
    // Domain-level aggregation
    const domain = extractDomain(event.article.canonicalUrl);
    if (domain) {
      const existing = feedbackByDomain.get(domain) || { upvotes: 0, downvotes: 0 };
      if (event.action === 'upvote') existing.upvotes++;
      if (event.action === 'downvote') existing.downvotes++;
      feedbackByDomain.set(domain, existing);
    }

    // Interest-level aggregation
    if (event.interestId) {
      const existing = feedbackByInterest.get(event.interestId) || { upvotes: 0, downvotes: 0 };
      if (event.action === 'upvote') existing.upvotes++;
      if (event.action === 'downvote') existing.downvotes++;
      feedbackByInterest.set(event.interestId, existing);
    }
  }

  return {
    interestWeights,
    keywordBlocks: keywords.map((k) => k.keyword),
    sourceBlocks: new Set(sources.map((s) => s.domain)),
    suppressedUrls: new Set(suppressions.map((s) => s.canonicalUrl)),
    feedbackByDomain,
    feedbackByInterest,
  };
}

// ── Apply personalization ──────────────────────────────────────

export function applyPersonalization(
  matches: MatchRecord[],
  context: PersonalizationContext
): PersonalizationResult {
  const dropped = { keyword: 0, source: 0, suppressed: 0 };
  const results: PersonalizedMatch[] = [];

  for (const match of matches) {
    const article = match.article;

    // 1. Keyword block check (case-insensitive substring on title + snippet)
    const textToCheck = (article.title + ' ' + (article.snippet || '')).toLowerCase();
    if (context.keywordBlocks.some((kw) => textToCheck.includes(kw))) {
      dropped.keyword++;
      continue;
    }

    // 2. Source block check (domain from canonicalUrl)
    const domain = extractDomain(article.canonicalUrl);
    if (domain && context.sourceBlocks.has(domain)) {
      dropped.source++;
      continue;
    }

    // 3. Suppression check
    if (context.suppressedUrls.has(article.canonicalUrl)) {
      dropped.suppressed++;
      continue;
    }

    // 4. Apply weight multiplier: score * (weight / 100)
    const weight = context.interestWeights.get(match.interestId) ?? 100;
    let adjustedScore = match.score * (weight / 100);

    // 5. Apply feedback adjustments
    if (domain) {
      const domainFeedback = context.feedbackByDomain.get(domain);
      if (domainFeedback) {
        if (domainFeedback.upvotes >= 3) adjustedScore += 10;
        if (domainFeedback.downvotes >= 3) adjustedScore -= 25;
      }
    }

    const interestFeedback = context.feedbackByInterest.get(match.interestId);
    if (interestFeedback) {
      if (interestFeedback.downvotes >= 3) adjustedScore -= 20;
    }

    results.push({ match, adjustedScore });
  }

  // Sort by adjusted score descending
  results.sort((a, b) => b.adjustedScore - a.adjustedScore);

  return { dropped, results };
}
