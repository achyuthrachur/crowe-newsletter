/**
 * Title Similarity
 * Cosine similarity on character trigrams for title deduplication.
 */

/**
 * Normalize title for comparison:
 * lowercase, strip punctuation, collapse whitespace.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

/**
 * Generate character trigrams from a string.
 * Returns a Map of trigram → count.
 */
export function generateTrigrams(text: string): Map<string, number> {
  const trigrams = new Map<string, number>();
  const normalized = normalizeTitle(text);

  if (normalized.length < 3) {
    // For very short strings, use the string itself as the only trigram
    trigrams.set(normalized, 1);
    return trigrams;
  }

  for (let i = 0; i <= normalized.length - 3; i++) {
    const trigram = normalized.slice(i, i + 3);
    trigrams.set(trigram, (trigrams.get(trigram) ?? 0) + 1);
  }

  return trigrams;
}

/**
 * Compute cosine similarity between two trigram vectors.
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  // Dot product
  for (const [trigram, countA] of a) {
    const countB = b.get(trigram) ?? 0;
    dotProduct += countA * countB;
    magnitudeA += countA * countA;
  }

  // Magnitude of B (including trigrams not in A)
  for (const [, countB] of b) {
    magnitudeB += countB * countB;
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Compute title similarity between two titles.
 * Returns a value between 0 and 1.
 */
export function titleSimilarity(titleA: string, titleB: string): number {
  const trigramsA = generateTrigrams(titleA);
  const trigramsB = generateTrigrams(titleB);
  return cosineSimilarity(trigramsA, trigramsB);
}

/** Threshold for exact dedupe (keep only one) */
export const DEDUPE_THRESHOLD = 0.92;

/** Threshold for clustering (group as same story) */
export const CLUSTER_THRESHOLD = 0.85;
