/**
 * Web Search Client
 * Executes web searches using the OpenAI Responses API with the web_search_preview tool.
 * Per Stage 2 spec section 5.
 */

import OpenAI from 'openai';
import type { GeneratedQuery } from './query-generator';
import type { SearchResult } from '../stage2/types';

export interface QueryResult {
  query: string;
  results: SearchResult[];
}

export interface SearchExecutionResult {
  results: QueryResult[];
  metrics: {
    queriesIssued: number;
    totalResults: number;
    toolCallsUsed: number;
    tokensUsed: number;
  };
}

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getModel(): string {
  return process.env.OPENAI_WEBSEARCH_MODEL || 'gpt-4.1-mini';
}

const MAX_RESULTS_PER_QUERY = parseInt(
  process.env.WEBSEARCH_RESULTS_PER_QUERY || '5',
  10
);
const MAX_TOOL_CALLS = parseInt(process.env.WEBSEARCH_MAX_TOOL_CALLS || '12', 10);

/**
 * Extract domain name from URL for sourceName fallback.
 */
function extractDomainName(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Capitalize first letter of domain for display
    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return null;
  }
}

/**
 * Run web searches for a list of generated queries.
 * Uses OpenAI Responses API with web_search_preview tool.
 */
export async function runWebSearch(
  queries: GeneratedQuery[]
): Promise<SearchExecutionResult> {
  const openai = getOpenAI();
  const model = getModel();

  const queryResults: QueryResult[] = [];
  let totalToolCalls = 0;
  let totalTokens = 0;

  for (const generatedQuery of queries) {
    if (totalToolCalls >= MAX_TOOL_CALLS) break;

    try {
      const response = await openai.responses.create({
        model,
        tools: [{ type: 'web_search_preview' as const }],
        input: `Search for recent news (past 7 days): ${generatedQuery.query}

Return the top ${MAX_RESULTS_PER_QUERY} most relevant results. For each result provide:
- Title
- URL
- Brief snippet (1-2 sentences)
- Publication date if available
- Source/publisher name

Focus on authoritative sources: regulatory bodies, major financial publications, law firms, consulting firms.`,
      });

      totalToolCalls++;
      if (response.usage) {
        totalTokens += response.usage.total_tokens ?? 0;
      }

      // Extract structured results from the response text
      const outputText = response.output
        .filter((o) => o.type === 'message')
        .flatMap((o) => (o.type === 'message' ? o.content : []))
        .filter((c) => c.type === 'output_text')
        .map((c) => (c.type === 'output_text' ? c.text : ''))
        .join('\n');

      // Extract URLs from web_search_call annotations if present
      const searchResults: SearchResult[] = [];

      // Try to parse structured data from annotations
      for (const outputItem of response.output) {
        if (outputItem.type === 'message') {
          for (const contentItem of outputItem.content) {
            if (contentItem.type === 'output_text' && 'annotations' in contentItem) {
              const annotations = (contentItem as { annotations?: Array<{ type: string; url?: string; title?: string; start_index?: number; end_index?: number }> }).annotations ?? [];
              let rank = 1;
              for (const annotation of annotations) {
                if (annotation.type === 'url_citation' && annotation.url) {
                  if (searchResults.length >= MAX_RESULTS_PER_QUERY) break;

                  searchResults.push({
                    rank: rank++,
                    title: annotation.title || outputText.substring(0, 80),
                    url: annotation.url,
                    snippet: null,
                    sourceName: extractDomainName(annotation.url),
                    publishedAt: null,
                  });
                }
              }
            }
          }
        }
      }

      // If no annotations found, try to extract URLs from the text output
      if (searchResults.length === 0 && outputText) {
        const urlPattern = /https?:\/\/[^\s)"',]+/g;
        const urls = outputText.match(urlPattern) ?? [];
        let rank = 1;
        for (const url of urls.slice(0, MAX_RESULTS_PER_QUERY)) {
          searchResults.push({
            rank: rank++,
            title: url,
            url,
            snippet: null,
            sourceName: extractDomainName(url),
            publishedAt: null,
          });
        }
      }

      if (searchResults.length > 0) {
        queryResults.push({
          query: generatedQuery.query,
          results: searchResults,
        });
      }
    } catch (err) {
      console.error(
        `[search-client] Query failed: "${generatedQuery.query}"`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return {
    results: queryResults,
    metrics: {
      queriesIssued: queryResults.length,
      totalResults: queryResults.reduce((sum, r) => sum + r.results.length, 0),
      toolCallsUsed: totalToolCalls,
      tokensUsed: totalTokens,
    },
  };
}
