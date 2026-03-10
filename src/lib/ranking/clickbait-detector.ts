/**
 * Clickbait Detector
 * Phrase matching for clickbait patterns in titles/snippets.
 */

/** Clickbait phrases (case-insensitive matching) */
const CLICKBAIT_PHRASES = [
  'you won\'t believe',
  'you won\'t believe',
  'shocking',
  'mind-blowing',
  'mind blowing',
  'jaw-dropping',
  'jaw dropping',
  'top 10',
  'top 5',
  'top 20',
  'top 15',
  'must-see',
  'must see',
  'insane',
  'unbelievable',
  'this one weird trick',
  'doctors hate',
  'what happened next',
  'will blow your mind',
  'you need to see',
  'the real reason',
  'secret they don\'t',
  'number \\d+ will',
  'won\'t believe what',
  'is breaking the internet',
  'gone wrong',
  'gone viral',
  'clap back',
  'slams',
  'destroys',
  'epic fail',
  'literally dying',
  'i\'m screaming',
  'wait for it',
];

/** Compiled regex patterns (lowercase) */
const CLICKBAIT_PATTERNS = CLICKBAIT_PHRASES.map(
  (phrase) => new RegExp(phrase, 'i')
);

/**
 * Check if text contains clickbait phrases.
 * Returns true if clickbait is detected.
 */
export function isClickbait(text: string): boolean {
  const lower = text.toLowerCase();
  return CLICKBAIT_PATTERNS.some((pattern) => pattern.test(lower));
}

/** Clickbait penalty score */
export const CLICKBAIT_PENALTY = -40;
