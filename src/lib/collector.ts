/**
 * RSS Source Collector
 * Fetches RSS feeds from enabled sources and stores new articles in the DB.
 */

import { prisma } from './db';
import { createHash } from 'crypto';

interface CollectResult {
  collected: number;
  errors: Error[];
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string | null;
  description: string | null;
}

/**
 * Parse RSS XML text into items using basic regex extraction.
 * Works for RSS 2.0 and Atom feeds.
 */
function parseRssItems(xml: string, sourceName: string): RssItem[] {
  const items: RssItem[] = [];

  // Try RSS 2.0 <item> tags
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch =
      itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?(https?:\/\/[^\s<]+?)(?:\]\]>)?<\/link>/i) ||
      itemXml.match(/<link[^>]*href="(https?:\/\/[^"]+)"/i);
    const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const descMatch = itemXml.match(
      /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i
    );

    const title = titleMatch?.[1]?.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const link = linkMatch?.[1]?.trim();

    if (title && link) {
      items.push({
        title,
        link,
        pubDate: pubDateMatch?.[1]?.trim() ?? null,
        description: descMatch?.[1]
          ?.trim()
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .substring(0, 500) ?? null,
      });
    }
  }

  // If no RSS items found, try Atom <entry> tags
  if (items.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];

      const titleMatch = entryXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = entryXml.match(/<link[^>]*href="(https?:\/\/[^"]+)"/i);
      const pubDateMatch =
        entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
        entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
      const summaryMatch = entryXml.match(
        /<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i
      );

      const title = titleMatch?.[1]?.trim();
      const link = linkMatch?.[1]?.trim();

      if (title && link) {
        items.push({
          title,
          link,
          pubDate: pubDateMatch?.[1]?.trim() ?? null,
          description: summaryMatch?.[1]?.replace(/<[^>]+>/g, '').trim().substring(0, 500) ?? null,
        });
      }
    }
  }

  return items;
}

/**
 * Normalize a URL: strip UTM params, normalize trailing slash.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove UTM and tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    // Remove trailing slash from pathname
    parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Collect articles from all enabled RSS sources.
 * Skips articles already in the DB.
 */
export async function collectSources(): Promise<CollectResult> {
  const sources = await prisma.source.findMany({
    where: { enabled: true },
  });

  let collected = 0;
  const errors: Error[] = [];

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Crowe Intelligence Bot/1.0; +https://crowe.com)',
          Accept: 'application/rss+xml, application/atom+xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        errors.push(new Error(`[${source.name}] HTTP ${response.status}`));
        continue;
      }

      const xml = await response.text();
      const items = parseRssItems(xml, source.name);

      for (const item of items) {
        const canonicalUrl = normalizeUrl(item.link);
        const contentHash = createHash('md5').update(item.title + canonicalUrl).digest('hex');

        // Skip if already stored
        const existing = await prisma.article.findUnique({
          where: { canonicalUrl },
          select: { id: true },
        });
        if (existing) continue;

        let publishedAt: Date | null = null;
        if (item.pubDate) {
          const parsed = new Date(item.pubDate);
          if (!isNaN(parsed.getTime())) publishedAt = parsed;
        }

        await prisma.article.create({
          data: {
            canonicalUrl,
            title: item.title.substring(0, 500),
            sourceName: source.name,
            publishedAt,
            snippet: item.description,
            accessStatus: 'unknown',
            contentHash,
          },
        });

        collected++;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }

  return { collected, errors };
}
