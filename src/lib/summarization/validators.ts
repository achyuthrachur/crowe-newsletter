/**
 * Summary Validators
 * Hard validator functions that reject low-quality summaries.
 */

/** Banned filler phrases (case-insensitive) */
const BANNED_FILLER_PHRASES = [
  'in today\'s fast-changing landscape',
  'in today\'s rapidly evolving',
  'in today\'s digital age',
  'in today\'s competitive',
  'it is important to note',
  'it\'s important to note',
  'it is worth noting',
  'it\'s worth noting',
  'this article discusses',
  'this article explores',
  'this article examines',
  'the article discusses',
  'the article explores',
  'needless to say',
  'at the end of the day',
  'going forward',
  'game-changer',
  'game changer',
  'paradigm shift',
  'leverage synergies',
  'move the needle',
  'low-hanging fruit',
  'deep dive into',
  'unpacking the',
  'a closer look at',
  'breaking down the',
  'what you need to know',
  'here\'s what you need',
  'everything you need to know',
];

/** Banned self-references */
const BANNED_REFERENCES = [
  'this article',
  'the piece',
  'the post',
  'the report discusses',
  'the study finds that the study',
  'as discussed in',
  'the author argues',
  'the writer notes',
];

/**
 * Validate a summary against all hard rules.
 * Returns an array of error messages (empty = passed).
 */
export function validateSummary(
  summary: string,
  sourceText: string
): string[] {
  const errors: string[] = [];
  const lowerSummary = summary.toLowerCase();

  // 1. Check banned filler phrases
  for (const phrase of BANNED_FILLER_PHRASES) {
    if (lowerSummary.includes(phrase.toLowerCase())) {
      errors.push(`Contains banned filler phrase: "${phrase}"`);
    }
  }

  // 2. Check banned self-references
  for (const ref of BANNED_REFERENCES) {
    if (lowerSummary.includes(ref.toLowerCase())) {
      errors.push(`Contains banned reference: "${ref}"`);
    }
  }

  // 3. Max 1 exclamation mark
  const exclamationCount = (summary.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    errors.push(
      `Contains ${exclamationCount} exclamation marks (max 1 allowed)`
    );
  }

  // 4. Must contain at least 1 proper noun or event keyword
  if (!containsProperNounOrEvent(summary)) {
    errors.push(
      'Does not contain a proper noun (organization, person) or event keyword'
    );
  }

  // 5. Basic contradiction check: entities in summary not in source
  const contradictions = checkContradictions(summary, sourceText);
  if (contradictions.length > 0) {
    errors.push(
      `Potential fabrication — mentions entities not in source: ${contradictions.join(', ')}`
    );
  }

  return errors;
}

/**
 * Check if text contains at least one proper noun or event keyword.
 * Simple heuristic: look for capitalized multi-char words not at sentence start.
 */
function containsProperNounOrEvent(text: string): boolean {
  // Event keywords
  const eventKeywords = [
    'launch', 'launched', 'launches',
    'acquire', 'acquired', 'acquisition',
    'merge', 'merged', 'merger',
    'rule', 'ruling', 'regulation',
    'outage', 'breach', 'hack',
    'filing', 'filed', 'lawsuit',
    'partnership', 'partnered',
    'announced', 'announcement',
    'approved', 'approval',
    'fined', 'fine', 'penalty',
    'earnings', 'revenue', 'profit',
    'IPO', 'SEC', 'FDA', 'FDIC', 'OCC', 'CFPB',
  ];

  const lower = text.toLowerCase();
  for (const keyword of eventKeywords) {
    if (lower.includes(keyword.toLowerCase())) return true;
  }

  // Check for proper nouns (capitalized words not at sentence start)
  const sentences = text.split(/[.!?]\s+/);
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    // Skip first word (always capitalized)
    for (let i = 1; i < words.length; i++) {
      if (/^[A-Z][a-z]+/.test(words[i]) && words[i].length > 2) {
        return true;
      }
      // Also check for all-caps abbreviations
      if (/^[A-Z]{2,}$/.test(words[i])) {
        return true;
      }
    }
  }

  // Check for numbers (dollar amounts, percentages, dates)
  if (/\$[\d.,]+|[\d.]+%|\d{4}/.test(text)) {
    return true;
  }

  return false;
}

/**
 * Basic contradiction check:
 * Extract capitalized multi-word names from summary,
 * check if they appear in source text.
 */
function checkContradictions(
  summary: string,
  sourceText: string
): string[] {
  const contradictions: string[] = [];
  const lowerSource = sourceText.toLowerCase();

  // Find capitalized sequences (2+ words) that might be entity names
  const namePattern = /(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  const matches = summary.match(namePattern) || [];

  for (const name of matches) {
    // Skip common phrases
    if (/^(Why It Matters|Summary|The [A-Z])/.test(name)) continue;

    if (!lowerSource.includes(name.toLowerCase())) {
      contradictions.push(name);
    }
  }

  return contradictions;
}
