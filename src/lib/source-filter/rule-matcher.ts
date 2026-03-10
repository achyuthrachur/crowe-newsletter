/**
 * Rule Matcher
 * Matches domains against source_rules table.
 * Loads rules once per job run (cached in memory).
 * First match wins (ordered by created_at ASC).
 */

import type { FilterResult, SourceRule, SourceRuleAction } from '../stage2/types';

let _cachedRules: SourceRule[] | null = null;
let _cacheExpiry = 0;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load rules from database. Accepts a loader function to decouple from Prisma.
 */
export async function loadRules(
  loader: () => Promise<SourceRule[]>
): Promise<SourceRule[]> {
  const now = Date.now();
  if (_cachedRules && now < _cacheExpiry) {
    return _cachedRules;
  }
  _cachedRules = await loader();
  // Sort by createdAt ascending — first match wins
  _cachedRules.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  _cacheExpiry = now + CACHE_TTL_MS;
  return _cachedRules;
}

/** Reset cached rules (useful for testing) */
export function resetRuleCache(): void {
  _cachedRules = null;
  _cacheExpiry = 0;
}

/**
 * Match a domain against loaded source rules.
 * Returns 'allow', 'block', or 'none' (no rule matched).
 */
export function matchDomain(
  domain: string,
  rules: SourceRule[]
): FilterResult {
  for (const rule of rules) {
    if (domain.includes(rule.pattern)) {
      return {
        action: rule.action as SourceRuleAction,
        reason: rule.reason,
      };
    }
  }
  return { action: 'none', reason: null };
}
