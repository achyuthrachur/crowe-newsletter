/**
 * Summarizer v2 — Grounded, no-slop summarization engine.
 * Uses structured prompts, hard validators, and retry logic.
 */

import OpenAI from 'openai';
import type { SummarizationInput } from './prompts';
import { buildPrimaryPrompt, buildRetryPrompt } from './prompts';
import { validateSummary } from './validators';
import { generateFallbackSummary } from './fallback';
import type { ArticleSummary } from '../stage2/types';

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
}

function parseResponse(text: string): { summary: string; whyItMatters: string } | null {
  const summaryMatch = text.match(/Summary:\s*(.+?)(?=Why it matters:|$)/s);
  const whyMatch = text.match(/Why it matters:\s*(.+)/s);
  if (!summaryMatch || !whyMatch) return null;
  return {
    summary: summaryMatch[1].trim(),
    whyItMatters: whyMatch[1].trim(),
  };
}

async function callLLM(prompt: string): Promise<{ summary: string; whyItMatters: string } | null> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });
    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return null;
    return parseResponse(text);
  } catch (err) {
    console.error('[summarizer-v2] LLM call failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function summarizeArticle(input: SummarizationInput): Promise<ArticleSummary> {
  const sourceText = input.text || input.title;

  // Primary attempt
  const prompt1 = buildPrimaryPrompt(input);
  const result1 = await callLLM(prompt1);

  if (result1) {
    const combinedText = `${result1.summary} ${result1.whyItMatters}`;
    const errors1 = validateSummary(combinedText, sourceText);
    if (errors1.length === 0) {
      return {
        summary: result1.summary,
        whyItMatters: result1.whyItMatters,
        validationStatus: 'passed',
        validationErrors: [],
      };
    }

    // Retry with validation errors surfaced to the model
    const prompt2 = buildRetryPrompt(input, errors1);
    const result2 = await callLLM(prompt2);

    if (result2) {
      const errors2 = validateSummary(`${result2.summary} ${result2.whyItMatters}`, sourceText);
      if (errors2.length === 0) {
        return {
          summary: result2.summary,
          whyItMatters: result2.whyItMatters,
          validationStatus: 'retried',
          validationErrors: errors1,
        };
      }
    }
  }

  // Fallback: title + snippet rewrite, no extra claims
  const fallback = generateFallbackSummary(input);
  return {
    summary: fallback.summary,
    whyItMatters: fallback.whyItMatters,
    validationStatus: 'fallback',
    validationErrors: [],
  };
}

export async function summarizeBatch(inputs: SummarizationInput[]): Promise<ArticleSummary[]> {
  return Promise.all(inputs.map(summarizeArticle));
}
