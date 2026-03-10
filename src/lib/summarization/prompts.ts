/**
 * Summarization Prompt Templates
 * Primary + retry prompt templates for grounded, no-slop summaries.
 */

export interface SummarizationInput {
  title: string;
  source: string;
  publishDate: string | null;
  text: string;
  matchedInterest: string;
  matchedSection: string;
}

/**
 * Primary summarization prompt.
 */
export function buildPrimaryPrompt(input: SummarizationInput): string {
  return `Summarize this news article for a professional financial services reader.

ARTICLE:
Title: ${input.title}
Source: ${input.source}
${input.publishDate ? `Published: ${input.publishDate}` : ''}

Text:
${input.text}

MATCHED INTEREST: ${input.matchedInterest} (Section: ${input.matchedSection})

INSTRUCTIONS:
1. Write "Summary:" followed by 1-2 sentences with concrete facts (names, numbers, dates, actions).
2. Write "Why it matters:" followed by 1 sentence that explicitly ties to "${input.matchedInterest}".

RULES:
- Lead with the most important fact.
- Use active voice and plain language.
- Include at least 1 proper noun (organization, person, regulator, product).
- Do NOT use filler phrases like "in today's fast-changing landscape", "it is important to note", "this article discusses".
- Do NOT reference the article itself ("This article", "The piece", "The post").
- Do NOT use more than 1 exclamation mark total.
- Do NOT make claims not supported by the text above.
- Keep it under 80 words total.`;
}

/**
 * Retry prompt — stricter, includes validation errors.
 */
export function buildRetryPrompt(
  input: SummarizationInput,
  validationErrors: string[]
): string {
  return `Your previous summary was rejected. Fix these issues and try again:

ISSUES:
${validationErrors.map((e) => `- ${e}`).join('\n')}

ARTICLE:
Title: ${input.title}
Source: ${input.source}
${input.publishDate ? `Published: ${input.publishDate}` : ''}

Text:
${input.text}

MATCHED INTEREST: ${input.matchedInterest} (Section: ${input.matchedSection})

STRICT INSTRUCTIONS:
1. Write "Summary:" followed by 1-2 sentences. Start with a specific fact (who did what, when).
2. Write "Why it matters:" followed by 1 sentence connecting to "${input.matchedInterest}".

ABSOLUTE RULES:
- Every sentence must contain a proper noun or specific number.
- Zero filler phrases. Zero references to "this article" or "the piece".
- Zero exclamation marks.
- Only state facts from the text above.
- Under 70 words total.`;
}
