/**
 * Stage 2 Type Definitions
 * Web Search Research Layer + Quality Gates
 */

// ── Depth Level ──────────────────────────────────────────────────
export type DepthLevel = 'quick' | 'standard' | 'expanded';

// ── Quality Tier ─────────────────────────────────────────────────
/** 1 = highest, 2 = good, 3 = allowed, 9 = blocked */
export type QualityTier = 1 | 2 | 3 | 9;

// ── Source Rule ──────────────────────────────────────────────────
export type SourceRuleAction = 'allow' | 'block';

export interface SourceRule {
  id: string;
  pattern: string;
  action: SourceRuleAction;
  reason: string;
  createdAt: Date;
}

// ── Stream Origin ────────────────────────────────────────────────
export type StreamOrigin = 'rss' | 'websearch';

// ── Candidate Article ────────────────────────────────────────────
export interface CandidateArticle {
  url: string;
  canonicalUrl: string;
  title: string;
  sourceName: string;
  snippet: string | null;
  publishedAt: Date | null;
  streamOrigin: StreamOrigin;
  qualityTier: QualityTier;
  /** Interest ID that matched this article */
  matchedInterestId: string | null;
  /** Section name from matched interest */
  matchedSection: string | null;
}

// ── Score Breakdown ──────────────────────────────────────────────
export interface ScoreBreakdown {
  interestMatchScore: number;
  tierBonus: number;
  recencyBonus: number;
  clickbaitPenalty: number;
  unknownPublisherPenalty: number;
  totalScore: number;
}

export interface ScoredCandidate {
  article: CandidateArticle;
  score: ScoreBreakdown;
  matchedInterestId: string;
  matchedSection: string;
}

// ── Story Cluster ────────────────────────────────────────────────
export interface StoryCluster {
  primary: ScoredCandidate;
  /** Up to 2 secondary "Also covered by:" links */
  secondaryLinks: Array<{
    title: string;
    url: string;
    sourceName: string;
  }>;
}

// ── Article Summary ──────────────────────────────────────────────
export type ValidationStatus = 'passed' | 'retried' | 'fallback';

export interface ArticleSummary {
  summary: string;
  whyItMatters: string;
  validationStatus: ValidationStatus;
  /** Validation errors encountered (empty if passed first try) */
  validationErrors: string[];
}

// ── Paywall Detection ────────────────────────────────────────────
export type PaywallStatus = 'ok' | 'paywalled' | 'error';

export interface PaywallCheckResult {
  url: string;
  status: PaywallStatus;
  reason: string | null;
}

// ── Web Search ───────────────────────────────────────────────────
export interface SearchQuery {
  userId: string;
  runDate: string; // ISO date YYYY-MM-DD
  query: string;
  interestId: string;
  section: string;
}

export interface SearchResult {
  rank: number;
  title: string;
  url: string;
  snippet: string | null;
  sourceName: string | null;
  publishedAt: Date | null;
}

export interface SearchRunMetrics {
  queriesIssued: number;
  totalResults: number;
  toolCallsUsed: number;
  tokensUsed: number;
}

// ── Capability Harness ───────────────────────────────────────────
export interface HarnessReport {
  profileId: string;
  runDate: string;
  rssOnlyCandidates: number;
  webSearchCandidates: number;
  totalCandidates: number;
  paywallExclusions: number;
  dedupeRemovals: number;
  finalItemsBySection: Record<string, number>;
  finalItemsTotal: number;
  toolCallCount: number;
  tokenCount: number;
  estimatedCostUsd: number;
}

// ── Digest Build Context ─────────────────────────────────────────
export interface DigestBuildContext {
  userId: string;
  depthLevel: DepthLevel;
  rssCandidates: CandidateArticle[];
  webSearchCandidates: CandidateArticle[];
  /** Whether web search was triggered */
  webSearchTriggered: boolean;
  /** Reason web search was triggered (or null if not) */
  webSearchReason: string | null;
}

// ── Filter Result ────────────────────────────────────────────────
export type FilterAction = 'allow' | 'block' | 'none';

export interface FilterResult {
  action: FilterAction;
  reason: string | null;
}
