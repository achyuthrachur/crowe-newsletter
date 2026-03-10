/**
 * Query Generator
 * Builds search queries from user interests.
 * Pure function — no side effects.
 */

import type { Stage1Interest } from '../stage2/contracts';

/** Industry/domain context terms appended to topic queries */
const TOPIC_CONTEXT_TERMS = [
  'bank',
  'financial services',
  'consulting',
  'regulation',
  'technology',
];

/** Event-type terms appended to entity queries */
const ENTITY_CONTEXT_TERMS = [
  'press release',
  'earnings',
  'regulatory',
  'partnership',
  'acquisition',
  'lawsuit',
];

export interface GeneratedQuery {
  query: string;
  interestId: string;
  section: string;
  interestLabel: string;
  interestType: string;
}

/**
 * Generate search queries from user interests.
 *
 * Rules:
 * - Group interests by section
 * - Take up to 2 per section (by weight DESC)
 * - Build query with context terms based on type
 * - Cap at maxQueries total (default 8)
 */
export function generateQueries(
  interests: Stage1Interest[],
  maxQueries = 8
): GeneratedQuery[] {
  // Group by section
  const bySection = new Map<string, Stage1Interest[]>();
  for (const interest of interests) {
    const list = bySection.get(interest.section) ?? [];
    list.push(interest);
    bySection.set(interest.section, list);
  }

  const queries: GeneratedQuery[] = [];

  for (const [section, sectionInterests] of bySection) {
    // Sort by weight DESC, take top 2
    const sorted = [...sectionInterests].sort((a, b) => b.weight - a.weight);
    const top = sorted.slice(0, 2);

    for (const interest of top) {
      if (queries.length >= maxQueries) break;

      const query = buildQuery(interest);
      queries.push({
        query,
        interestId: interest.id,
        section,
        interestLabel: interest.label,
        interestType: interest.type,
      });
    }

    if (queries.length >= maxQueries) break;
  }

  return queries;
}

function buildQuery(interest: Stage1Interest): string {
  const label = interest.label;

  if (interest.type === 'entity') {
    const context = ENTITY_CONTEXT_TERMS.join(' OR ');
    return `"${label}" AND (${context})`;
  }

  // topic or industry
  const context = TOPIC_CONTEXT_TERMS.join(' OR ');
  return `"${label}" AND (${context})`;
}
