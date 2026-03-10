/**
 * Stage 2 ↔ Stage 1 Interface Contracts
 *
 * Defines what Stage 2 expects from Stage 1.
 * During parallel development: implemented by mocks.
 * After Stage 1 merge: satisfied by real Prisma calls.
 */

// ── Stage 1 Data Shapes ─────────────────────────────────────────

export interface Stage1User {
  id: string;
  email: string;
  timezone: string;
}

export interface Stage1Profile {
  id: string;
  userId: string;
  displayName: string | null;
  roleTitle: string | null;
  industryFocus: string | null;
  emailEnabled: boolean;
  paused: boolean;
  /** Stage 2 addition */
  depthLevel: 'quick' | 'standard' | 'expanded';
}

export interface Stage1Interest {
  id: string;
  userId: string;
  section: string;
  label: string;
  type: 'topic' | 'industry' | 'entity';
  weight: number;
}

export interface Stage1ArticleRecord {
  id: string;
  canonicalUrl: string;
  title: string;
  sourceName: string;
  publishedAt: Date | null;
  fetchedAt: Date;
  snippet: string | null;
  accessStatus: 'ok' | 'paywalled' | 'blocked' | 'unknown';
  contentHash: string | null;
}

export interface Stage1ArticleMatch {
  id: string;
  articleId: string;
  userId: string;
  interestId: string;
  score: number;
  reason: string;
}

export interface Stage1UserWithProfile {
  user: Stage1User;
  profile: Stage1Profile;
  interests: Stage1Interest[];
}

// ── Pipeline Contract ────────────────────────────────────────────

export interface DigestPipelineContract {
  /** Get all users eligible for digest (email_enabled, not paused) */
  getEligibleUsers(): Promise<Stage1UserWithProfile[]>;

  /** Get a single user with profile and interests */
  getUserWithProfile(userId: string): Promise<Stage1UserWithProfile | null>;

  /** Get recent articles (last N hours) with access_status != 'paywalled' */
  getRecentArticles(hoursBack: number): Promise<Stage1ArticleRecord[]>;

  /** Get article matches for a user, ordered by score DESC */
  getArticleMatches(userId: string, limit: number): Promise<Stage1ArticleMatch[]>;

  /** Upsert an article (from web search results) */
  upsertArticle(article: Omit<Stage1ArticleRecord, 'id' | 'fetchedAt'>): Promise<Stage1ArticleRecord>;

  /** Create an article match */
  createArticleMatch(match: Omit<Stage1ArticleMatch, 'id'>): Promise<Stage1ArticleMatch>;
}

// ── Mock Implementation (for parallel development) ───────────────

export class MockDigestPipeline implements DigestPipelineContract {
  private users: Stage1UserWithProfile[] = [];
  private articles: Stage1ArticleRecord[] = [];
  private matches: Stage1ArticleMatch[] = [];

  constructor(seed?: {
    users?: Stage1UserWithProfile[];
    articles?: Stage1ArticleRecord[];
    matches?: Stage1ArticleMatch[];
  }) {
    this.users = seed?.users ?? [];
    this.articles = seed?.articles ?? [];
    this.matches = seed?.matches ?? [];
  }

  async getEligibleUsers(): Promise<Stage1UserWithProfile[]> {
    return this.users.filter(
      (u) => u.profile.emailEnabled && !u.profile.paused
    );
  }

  async getUserWithProfile(userId: string): Promise<Stage1UserWithProfile | null> {
    return this.users.find((u) => u.user.id === userId) ?? null;
  }

  async getRecentArticles(hoursBack: number): Promise<Stage1ArticleRecord[]> {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.articles.filter(
      (a) => a.accessStatus !== 'paywalled' && a.fetchedAt >= cutoff
    );
  }

  async getArticleMatches(userId: string, limit: number): Promise<Stage1ArticleMatch[]> {
    return this.matches
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async upsertArticle(
    article: Omit<Stage1ArticleRecord, 'id' | 'fetchedAt'>
  ): Promise<Stage1ArticleRecord> {
    const existing = this.articles.find(
      (a) => a.canonicalUrl === article.canonicalUrl
    );
    if (existing) {
      Object.assign(existing, article);
      return existing;
    }
    const newArticle: Stage1ArticleRecord = {
      ...article,
      id: crypto.randomUUID(),
      fetchedAt: new Date(),
    };
    this.articles.push(newArticle);
    return newArticle;
  }

  async createArticleMatch(
    match: Omit<Stage1ArticleMatch, 'id'>
  ): Promise<Stage1ArticleMatch> {
    const newMatch: Stage1ArticleMatch = {
      ...match,
      id: crypto.randomUUID(),
    };
    this.matches.push(newMatch);
    return newMatch;
  }
}
