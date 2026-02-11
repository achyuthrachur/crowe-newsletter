// ============================================================
// Stage 1 — Daily Digest Types
// ============================================================

export interface DigestArticle {
  articleId: string;
  title: string;
  url: string;
  sourceName: string;
  snippet: string;
  score: number;
  interestLabel: string;
  interestSection: string;
}

export interface DigestSection {
  section: string;
  articles: DigestArticle[];
}

export interface DigestData {
  sections: DigestSection[];
  totalArticles: number;
  dateLabel: string;
}

export interface CollectSourcesResult {
  feedsFetched: number;
  articlesInserted: number;
  matchesCreated: number;
  elapsed: number;
}

export interface BuildDigestsResult {
  digestsBuilt: number;
  elapsed: number;
}

export interface SendEmailsResult {
  emailsSent: number;
  errors: number;
  elapsed: number;
}

// ============================================================
// Stage 2 — Web Search Types
// ============================================================

export interface WebSearchResult {
  queriesRun: number;
  resultsFound: number;
  matchesCreated: number;
  elapsed: number;
}

// ============================================================
// Stage 4 — Feedback Types
// ============================================================

export type FeedbackRating = 'up' | 'down';

// ============================================================
// Stage 3 — Deep Dive Types
// ============================================================

export interface DeepDiveState {
  stage: 'DISCOVER' | 'FETCH' | 'SYNTHESIZE' | 'PUBLISH';
  discovery?: {
    candidateUrls: string[];
    selectedCount: number;
  };
  fetch?: {
    totalSources: number;
    fetchedCount: number;
    okCount: number;
    nextIndex: number;
  };
  synthesis?: {
    strategy: 'deep-research' | 'map-reduce';
    retryCount: number;
    partialMarkdown?: string;
  };
  publish?: {
    reportId: string | null;
    emailSent: boolean;
  };
}

export interface DeepDiveReportData {
  headline: string;
  whatHappened: string[];
  whatChanged: string[];
  whyItMatters: string[];
  risks: string[];
  actionPrompts: string[];
  sources: SourceCitation[];
}

export interface SourceCitation {
  title: string;
  url: string;
  source: string;
  date?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface JobStepResult {
  advanced: boolean;
  newStage: DeepDiveState['stage'];
  message: string;
}

export interface DailyTickResult {
  ok: boolean;
  elapsed: number;
  emailsSent: number;
  digestsBuilt: number;
  deepDiveJobsAdvanced: number;
  articlesCollected: number;
  matchesCreated: number;
  webSearchQueries: number;
}

// ============================================================
// Shared Types
// ============================================================

export interface AuthTokenSet {
  prefs: string;
  pause: string;
  unsubscribe: string;
}

// Helper to cast typed state to Prisma Json-compatible value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toJson(value: DeepDiveState): any {
  return JSON.parse(JSON.stringify(value));
}

// Helper to cast Prisma Json value back to typed state
export function fromJson(value: unknown): DeepDiveState {
  return (value as DeepDiveState) ?? { stage: 'DISCOVER' };
}
