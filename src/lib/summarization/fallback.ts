/**
 * Fallback Summary Generator
 * Used when LLM-based summarization fails validation after retry.
 */

import type { SummarizationInput } from './prompts';

export interface FallbackResult {
  summary: string;
  whyItMatters: string;
}

/**
 * Generate a minimal fallback summary from title + snippet.
 * No LLM call — safe to use when all else fails.
 */
export function generateFallbackSummary(input: SummarizationInput): FallbackResult {
  const cleanText = input.text
    ? input.text.substring(0, 150).replace(/\n/g, ' ').trim()
    : '';

  const summary = cleanText ? `${input.title}. ${cleanText}` : input.title;
  const whyItMatters = `Relevant to ${input.matchedInterest} (${input.matchedSection}).`;

  return { summary, whyItMatters };
}
