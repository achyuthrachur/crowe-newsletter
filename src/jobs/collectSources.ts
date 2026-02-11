import { collectRssArticles } from '@/services/rss/collector';
import { matchArticlesToUsers } from '@/services/matching/scorer';
import { logDailyTick } from '@/lib/logger';
import type { CollectSourcesResult } from '@/types';

/**
 * Collect RSS articles and match them to user interests.
 */
export async function collectSources(): Promise<CollectSourcesResult> {
  const start = Date.now();

  // Step 1: Fetch RSS feeds and insert articles
  const { feedsFetched, articlesInserted } = await collectRssArticles();

  logDailyTick('collect_rss', { feedsFetched, articlesInserted });

  // Step 2: Match articles to user interests
  const { matchesCreated } = await matchArticlesToUsers();

  logDailyTick('match_articles', { matchesCreated });

  return {
    feedsFetched,
    articlesInserted,
    matchesCreated,
    elapsed: Date.now() - start,
  };
}
