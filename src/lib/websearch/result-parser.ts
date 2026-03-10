/**
 * Result Parser
 * Extracts url_citation annotations from OpenAI Responses API output.
 * Counts web_search_call items for budget tracking.
 */

import type { SearchResult } from '../stage2/types';

interface ResponseOutput {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        url?: string;
        title?: string;
        start_index?: number;
        end_index?: number;
      }>;
    }>;
  }>;
  usage?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

export interface ParsedCitations {
  citations: SearchResult[];
  toolCallCount: number;
  tokenCount: number;
}

/**
 * Extract citations and metrics from an OpenAI Responses API response.
 */
export function extractCitations(response: ResponseOutput): ParsedCitations {
  const citations: SearchResult[] = [];
  let toolCallCount = 0;
  const seenUrls = new Set<string>();

  if (!response.output) {
    return { citations: [], toolCallCount: 0, tokenCount: 0 };
  }

  for (const item of response.output) {
    // Count web_search_call items for budget tracking
    if (item.type === 'web_search_call') {
      toolCallCount++;
      continue;
    }

    // Extract citations from message content
    if (item.type === 'message' && item.content) {
      for (const content of item.content) {
        if (content.type === 'output_text' && content.annotations) {
          for (const annotation of content.annotations) {
            if (
              annotation.type === 'url_citation' &&
              annotation.url &&
              !seenUrls.has(annotation.url)
            ) {
              seenUrls.add(annotation.url);
              citations.push({
                rank: citations.length + 1,
                title: annotation.title ?? '',
                url: annotation.url,
                snippet: extractSnippet(content.text, annotation),
                sourceName: extractSourceName(annotation.url),
                publishedAt: null, // Not available from citations
              });
            }
          }
        }
      }
    }
  }

  const tokenCount = response.usage?.total_tokens ?? 0;

  return { citations, toolCallCount, tokenCount };
}

/**
 * Extract a snippet from surrounding text around the citation.
 */
function extractSnippet(
  text: string | undefined,
  annotation: { start_index?: number; end_index?: number }
): string | null {
  if (!text || annotation.start_index === undefined) {
    return null;
  }

  // Get ~200 chars around the citation
  const start = Math.max(0, annotation.start_index - 100);
  const end = Math.min(text.length, (annotation.end_index ?? annotation.start_index) + 100);
  let snippet = text.slice(start, end).trim();

  // Clean up partial words at boundaries
  if (start > 0) snippet = '...' + snippet.replace(/^\S*\s/, '');
  if (end < text.length) snippet = snippet.replace(/\s\S*$/, '') + '...';

  return snippet || null;
}

/**
 * Extract source name from URL domain.
 */
function extractSourceName(url: string): string | null {
  try {
    const parsed = new URL(url);
    let host = parsed.hostname;
    if (host.startsWith('www.')) host = host.slice(4);
    return host;
  } catch {
    return null;
  }
}
