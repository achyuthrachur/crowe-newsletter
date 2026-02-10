import type { DeepDiveReportData, ValidationResult } from '@/types';

const BANNED_PHRASES = [
  'fast-changing landscape',
  'rapidly evolving',
  'paradigm shift',
  'paradigm-shifting',
  'leveraging',
  'it is important to note',
  'it\'s important to note',
  'this article',
  'the piece',
  'the post',
  'in conclusion',
  'in today\'s',
  'game-changer',
  'game changer',
  'cutting-edge',
  'cutting edge',
  'at the end of the day',
  'moving forward',
  'going forward',
  'synergy',
  'synergies',
  'holistic approach',
  'best-in-class',
  'thought leader',
  'disruptive',
  'unprecedented times',
];

/**
 * Validate a deep dive report against anti-slop and grounding rules.
 * Returns { valid, errors } where errors describe what failed.
 */
export function validateReport(
  report: DeepDiveReportData,
  sourceTexts: string[]
): ValidationResult {
  const errors: string[] = [];

  // Check 1: Required sections must not be empty
  if (!report.headline || report.headline.trim().length < 5) {
    errors.push('Headline is missing or too short');
  }
  if (!report.whatHappened || report.whatHappened.length === 0) {
    errors.push('"What Happened" section is empty');
  }
  if (report.whatHappened && (report.whatHappened.length < 3 || report.whatHappened.length > 6)) {
    errors.push('"What Happened" must have 3-6 bullets');
  }
  // "What Changed" can be minimal ("No meaningful change identified.")
  if (!report.whatChanged || report.whatChanged.length === 0) {
    errors.push('"What Changed" section is empty');
  }
  if (!report.whyItMatters || report.whyItMatters.length === 0) {
    errors.push('"Why It Matters" section is empty');
  }
  if (report.whyItMatters && report.whyItMatters.length !== 3) {
    errors.push('"Why It Matters" must have exactly 3 bullets');
  }
  if (!report.risks || report.risks.length === 0) {
    errors.push('"Risks / Watch-outs" section is empty');
  }
  if (!report.actionPrompts || report.actionPrompts.length === 0) {
    errors.push('"Action Prompts" section is empty');
  }
  if (report.actionPrompts && report.actionPrompts.length !== 3) {
    errors.push('"Action Prompts" must have exactly 3 bullets');
  }
  if (!report.sources || report.sources.length === 0) {
    errors.push('"Sources" section is empty');
  }

  // Check 2: Banned filler phrases
  const fullText = serializeReport(report).toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (fullText.includes(phrase.toLowerCase())) {
      errors.push(`Contains banned filler phrase: "${phrase}"`);
    }
  }

  // Check 3: Max 1 exclamation mark
  const exclamationCount = (fullText.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    errors.push(`Too many exclamation marks (${exclamationCount}, max 1)`);
  }

  // Check 4: Entity grounding — named entities in report should appear in sources
  if (sourceTexts.length > 0) {
    const entities = extractEntities(report);
    const combinedSourceText = sourceTexts.join(' ').toLowerCase();
    const ungrounded = entities.filter(
      (e) => !combinedSourceText.includes(e.toLowerCase())
    );
    if (entities.length > 0 && ungrounded.length > entities.length * 0.3) {
      errors.push(
        `Too many ungrounded entities (${ungrounded.length}/${entities.length}): ${ungrounded.slice(0, 5).join(', ')}`
      );
    }
  }

  // Check 5: Vague filler ratio
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length > 0) {
    const vagueCount = sentences.filter((s) =>
      BANNED_PHRASES.some((p) => s.includes(p.toLowerCase()))
    ).length;
    if (vagueCount / sentences.length > 0.2) {
      errors.push(`>20% of sentences contain vague filler (${vagueCount}/${sentences.length})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Serialize report to a single string for text analysis.
 */
function serializeReport(report: DeepDiveReportData): string {
  return [
    report.headline,
    ...report.whatHappened,
    ...report.whatChanged,
    ...report.whyItMatters,
    ...report.risks,
    ...report.actionPrompts,
    ...report.sources.map((s) => s.title),
  ].join(' ');
}

/**
 * Extract likely proper nouns / named entities from report text.
 * Simple heuristic: multi-word capitalized sequences not at sentence starts.
 */
function extractEntities(report: DeepDiveReportData): string[] {
  const text = serializeReport(report);
  const entities = new Set<string>();

  // Match capitalized words that aren't common English words
  const commonWords = new Set([
    'The', 'This', 'That', 'These', 'Those', 'What', 'Why', 'How', 'When',
    'Where', 'Which', 'Who', 'No', 'Yes', 'Not', 'And', 'But', 'For',
    'With', 'From', 'Into', 'Over', 'Under', 'After', 'Before', 'Between',
    'Through', 'During', 'Without', 'Within', 'Along', 'Following',
    'Across', 'Behind', 'Beyond', 'Also', 'However', 'Moreover',
    'Furthermore', 'Additionally', 'Meanwhile', 'Nevertheless',
    'Action', 'Risk', 'Source', 'Key', 'New', 'Major',
  ]);

  // Find capitalized words mid-sentence (likely entities)
  const pattern = /(?<=[.!?]\s+\w+\s+|,\s+|;\s+|:\s+|-\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const candidate = match[1];
    if (!commonWords.has(candidate) && candidate.length > 2) {
      entities.add(candidate);
    }
  }

  // Also find all-caps acronyms (SEC, FDIC, etc.)
  const acronymPattern = /\b([A-Z]{2,6})\b/g;
  while ((match = acronymPattern.exec(text)) !== null) {
    const acr = match[1];
    if (!['AND', 'THE', 'FOR', 'NOT', 'BUT', 'NOR', 'YET'].includes(acr)) {
      entities.add(acr);
    }
  }

  return [...entities];
}
