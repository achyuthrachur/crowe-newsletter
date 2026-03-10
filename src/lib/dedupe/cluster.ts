/**
 * Story Clustering
 * Groups articles with high title similarity into clusters.
 * If 3+ articles share title similarity > CLUSTER_THRESHOLD and
 * at least 1 common capitalized token → group them.
 */

import type { ScoredCandidate, StoryCluster } from '../stage2/types';
import { CLUSTER_THRESHOLD, DEDUPE_THRESHOLD, titleSimilarity } from './title-similarity';

/**
 * Extract capitalized tokens (proper nouns) from a title.
 */
function extractCapitalizedTokens(title: string): Set<string> {
  const tokens = new Set<string>();
  const words = title.split(/\s+/);
  for (const word of words) {
    // Skip first word (always capitalized) and common words
    if (word.length > 1 && /^[A-Z]/.test(word) && !/^(The|A|An|In|On|At|To|For|Of|And|But|Or|Is|It)$/.test(word)) {
      tokens.add(word.toLowerCase());
    }
  }
  return tokens;
}

/**
 * Check if two sets share at least one common element.
 */
function hasCommonToken(a: Set<string>, b: Set<string>): boolean {
  for (const token of a) {
    if (b.has(token)) return true;
  }
  return false;
}

/**
 * Deduplicate candidates: if two articles have title similarity > DEDUPE_THRESHOLD,
 * keep the one with higher quality tier (then earlier published).
 */
export function deduplicateCandidates(
  candidates: ScoredCandidate[]
): ScoredCandidate[] {
  if (candidates.length <= 1) return candidates;

  const kept: ScoredCandidate[] = [];
  const removed = new Set<number>();

  for (let i = 0; i < candidates.length; i++) {
    if (removed.has(i)) continue;

    for (let j = i + 1; j < candidates.length; j++) {
      if (removed.has(j)) continue;

      const similarity = titleSimilarity(
        candidates[i].article.title,
        candidates[j].article.title
      );

      if (similarity > DEDUPE_THRESHOLD) {
        // Keep the higher-tier article, or earlier published
        const tierI = candidates[i].article.qualityTier;
        const tierJ = candidates[j].article.qualityTier;

        if (tierJ < tierI) {
          // j has better tier (lower number = higher quality)
          removed.add(i);
          break;
        } else if (tierI < tierJ) {
          removed.add(j);
        } else {
          // Same tier — keep earlier published
          const dateI = candidates[i].article.publishedAt?.getTime() ?? Infinity;
          const dateJ = candidates[j].article.publishedAt?.getTime() ?? Infinity;
          if (dateJ < dateI) {
            removed.add(i);
            break;
          } else {
            removed.add(j);
          }
        }
      }
    }

    if (!removed.has(i)) {
      kept.push(candidates[i]);
    }
  }

  return kept;
}

/**
 * Build story clusters from scored candidates.
 * Groups articles with similarity > CLUSTER_THRESHOLD and shared proper nouns.
 */
export function buildClusters(
  candidates: ScoredCandidate[]
): StoryCluster[] {
  if (candidates.length === 0) return [];

  // Build adjacency: find similar pairs
  const groups: number[][] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < candidates.length; i++) {
    if (assigned.has(i)) continue;

    const group = [i];
    const tokensI = extractCapitalizedTokens(candidates[i].article.title);

    for (let j = i + 1; j < candidates.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = titleSimilarity(
        candidates[i].article.title,
        candidates[j].article.title
      );

      if (similarity > CLUSTER_THRESHOLD) {
        const tokensJ = extractCapitalizedTokens(candidates[j].article.title);
        if (hasCommonToken(tokensI, tokensJ)) {
          group.push(j);
        }
      }
    }

    if (group.length >= 3) {
      // This is a cluster
      for (const idx of group) assigned.add(idx);
      groups.push(group);
    }
  }

  const clusters: StoryCluster[] = [];

  // Build clusters from groups
  for (const group of groups) {
    const groupCandidates = group.map((idx) => candidates[idx]);

    // Pick primary: highest tier → earliest published → highest score
    groupCandidates.sort((a, b) => {
      if (a.article.qualityTier !== b.article.qualityTier) {
        return a.article.qualityTier - b.article.qualityTier;
      }
      const dateA = a.article.publishedAt?.getTime() ?? Infinity;
      const dateB = b.article.publishedAt?.getTime() ?? Infinity;
      if (dateA !== dateB) return dateA - dateB;
      return b.score.totalScore - a.score.totalScore;
    });

    const primary = groupCandidates[0];
    const secondaryLinks = groupCandidates.slice(1, 3).map((c) => ({
      title: c.article.title,
      url: c.article.url,
      sourceName: c.article.sourceName,
    }));

    clusters.push({ primary, secondaryLinks });
  }

  // Add unclustered candidates as single-item clusters
  for (let i = 0; i < candidates.length; i++) {
    if (!assigned.has(i)) {
      clusters.push({
        primary: candidates[i],
        secondaryLinks: [],
      });
    }
  }

  // Sort clusters by primary score DESC
  clusters.sort(
    (a, b) => b.primary.score.totalScore - a.primary.score.totalScore
  );

  return clusters;
}
