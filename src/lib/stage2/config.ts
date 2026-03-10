/**
 * Stage 2 Configuration
 * Loads environment variables with sensible defaults.
 */

export interface Stage2Config {
  /** Whether web search is enabled */
  webSearchEnabled: boolean;
  /** Max queries per user per digest build */
  maxQueriesPerUser: number;
  /** Max results to keep per query */
  resultsPerQuery: number;
  /** Max OpenAI tool calls (web_search) across all queries */
  maxToolCalls: number;
  /** Max total candidate URLs per user */
  maxCandidateUrls: number;
  /** OpenAI API key */
  openaiApiKey: string;
  /** Model for web search (Responses API) */
  webSearchModel: string;
  /** Model for summarization */
  summaryModel: string;
  /** Database URL */
  databaseUrl: string;
}

let _config: Stage2Config | null = null;

export function getStage2Config(): Stage2Config {
  if (_config) return _config;

  _config = {
    webSearchEnabled: process.env.WEBSEARCH_ENABLED !== 'false',
    maxQueriesPerUser: parseInt(process.env.WEBSEARCH_MAX_QUERIES_PER_USER ?? '8', 10),
    resultsPerQuery: parseInt(process.env.WEBSEARCH_RESULTS_PER_QUERY ?? '5', 10),
    maxToolCalls: parseInt(process.env.WEBSEARCH_MAX_TOOL_CALLS ?? '12', 10),
    maxCandidateUrls: 40,
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    webSearchModel: process.env.WEBSEARCH_MODEL ?? 'gpt-4o-mini',
    summaryModel: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    databaseUrl: process.env.DATABASE_URL ?? '',
  };

  return _config;
}

/** Reset config cache (useful for testing) */
export function resetConfigCache(): void {
  _config = null;
}
