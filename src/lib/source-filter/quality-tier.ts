/**
 * Quality Tier Lookup
 * Queries sources table by domain for quality tier.
 * If quality_tier === 9 → drop.
 * If not found → treat as tier 3.
 */

import type { QualityTier } from '../stage2/types';

export interface SourceRecord {
  url: string;
  qualityTier: number;
}

/**
 * Look up quality tier for a domain.
 * Accepts a loader function to decouple from Prisma.
 *
 * @param domain - Normalized domain (lowercase, no www.)
 * @param sources - Pre-loaded sources from the database
 * @returns QualityTier (1, 2, 3, or 9)
 */
export function getQualityTier(
  domain: string,
  sources: SourceRecord[]
): QualityTier {
  for (const source of sources) {
    try {
      const sourceUrl = new URL(source.url);
      let sourceHost = sourceUrl.hostname.toLowerCase();
      if (sourceHost.startsWith('www.')) {
        sourceHost = sourceHost.slice(4);
      }
      if (sourceHost === domain || domain.endsWith('.' + sourceHost)) {
        const tier = source.qualityTier;
        if (tier === 1 || tier === 2 || tier === 3 || tier === 9) {
          return tier;
        }
        return 2; // default if invalid tier value
      }
    } catch {
      continue;
    }
  }
  // Not found in sources → treat as tier 3
  return 3;
}

/**
 * Check if a quality tier should cause the article to be dropped.
 */
export function isTierBlocked(tier: QualityTier): boolean {
  return tier === 9;
}
