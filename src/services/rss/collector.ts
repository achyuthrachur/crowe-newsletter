import { prisma } from '@/lib/db';
import { canonicalizeUrl } from '@/lib/utils';
import { parseFeed } from './parser';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FEED_TIMEOUT = 5_000;

/**
 * Fetch all enabled RSS sources and insert new articles.
 */
export async function collectRssArticles(): Promise<{
  feedsFetched: number;
  articlesInserted: number;
}> {
  const sources = await prisma.source.findMany({
    where: { enabled: true, type: 'rss' },
  });

  let feedsFetched = 0;
  let articlesInserted = 0;

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT);

      try {
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) return { source, items: [] };

        const xml = await response.text();
        const feed = parseFeed(xml);

        return {
          source,
          items: feed.items.map((item) => ({
            canonicalUrl: canonicalizeUrl(item.url),
            title: item.title,
            sourceName: source.name,
            publishedAt: item.publishedAt,
            snippet: item.snippet || null,
            accessStatus: 'unknown' as const,
          })),
        };
      } catch {
        clearTimeout(timeout);
        return { source, items: [] };
      }
    })
  );

  // Collect all articles for batch insert
  const allArticles: {
    canonicalUrl: string;
    title: string;
    sourceName: string;
    publishedAt: Date | null;
    snippet: string | null;
    accessStatus: string;
  }[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.items.length > 0) {
      feedsFetched++;
      allArticles.push(...result.value.items);
    }
  }

  // Batch insert, skip duplicates on canonicalUrl
  if (allArticles.length > 0) {
    const inserted = await prisma.article.createMany({
      data: allArticles,
      skipDuplicates: true,
    });
    articlesInserted = inserted.count;
  }

  return { feedsFetched, articlesInserted };
}
