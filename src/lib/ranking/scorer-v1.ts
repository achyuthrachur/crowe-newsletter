/**
 * Scorer v1 — Stage 2 candidate scoring.
 * Applies tier bonus, recency bonus, clickbait penalty, unknown publisher penalty.
 * Per Stage 2 spec section 9.
 */

import type { CandidateArticle, ScoredCandidate, ScoreBreakdown } from '../stage2/types';
import { isClickbait, CLICKBAIT_PENALTY } from './clickbait-detector';

/**
 * Score a candidate article.
 *
 * @param candidate - The article to score
 * @param interestMatchScore - Base match score from interest matching (0–100)
 * @param isKnownSource - Whether the domain is in the known sources allowlist
 */
export function scoreCandidate(
  candidate: CandidateArticle,
  interestMatchScore: number,
  isKnownSource: boolean
): ScoreBreakdown {
  // Source tier bonus
  let tierBonus = 0;
  if (candidate.qualityTier === 1) tierBonus = 30;
  else if (candidate.qualityTier === 2) tierBonus = 15;

  // Recency bonus
  let recencyBonus = 0;
  if (candidate.publishedAt) {
    const ageHours = (Date.now() - candidate.publishedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) recencyBonus = 25;
    else if (ageHours < 72) recencyBonus = 10;
  }

  // Clickbait penalty
  const clickbaitPenalty = isClickbait(candidate.title) ? CLICKBAIT_PENALTY : 0;

  // Unknown publisher penalty
  const unknownPublisherPenalty = isKnownSource ? 0 : -20;

  const totalScore =
    interestMatchScore + tierBonus + recencyBonus + clickbaitPenalty + unknownPublisherPenalty;

  return {
    interestMatchScore,
    tierBonus,
    recencyBonus,
    clickbaitPenalty,
    unknownPublisherPenalty,
    totalScore,
  };
}

/**
 * Select the top candidates: max 8 total, max 3 per section.
 * Sorted by totalScore DESC before selection.
 */
export function selectTopCandidates(
  candidates: ScoredCandidate[],
  maxTotal = 8,
  maxPerSection = 3
): ScoredCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.score.totalScore - a.score.totalScore);
  const selected: ScoredCandidate[] = [];
  const sectionCounts = new Map<string, number>();

  for (const candidate of sorted) {
    if (selected.length >= maxTotal) break;
    const section = candidate.matchedSection;
    const count = sectionCounts.get(section) ?? 0;
    if (count >= maxPerSection) continue;
    selected.push(candidate);
    sectionCounts.set(section, count + 1);
  }

  return selected;
}
