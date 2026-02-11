import * as cheerio from 'cheerio';

export interface ParsedFeedItem {
  title: string;
  url: string;
  publishedAt: Date | null;
  snippet: string;
}

export interface ParsedFeed {
  feedTitle: string;
  items: ParsedFeedItem[];
}

const MAX_SNIPPET_LENGTH = 500;
const MAX_AGE_DAYS = 7;

/**
 * Parse RSS 2.0 (<item>) and Atom (<entry>) feeds using Cheerio.
 * Skips items older than 7 days and truncates snippets to 500 chars.
 */
export function parseFeed(xml: string): ParsedFeed {
  const $ = cheerio.load(xml, { xml: true });
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);

  // Detect feed title
  const feedTitle =
    $('channel > title').first().text().trim() ||
    $('feed > title').first().text().trim() ||
    'Unknown Feed';

  const items: ParsedFeedItem[] = [];

  // RSS 2.0 items
  $('item').each((_i, el) => {
    const $el = $(el);

    const title = $el.find('title').first().text().trim();
    const url = $el.find('link').first().text().trim() || $el.find('guid').first().text().trim();

    if (!title || !url) return;

    const pubDateStr = $el.find('pubDate').first().text().trim();
    const publishedAt = pubDateStr ? new Date(pubDateStr) : null;

    if (publishedAt && !isNaN(publishedAt.getTime()) && publishedAt < cutoff) {
      return; // Too old
    }

    const rawDesc = $el.find('description').first().text().trim();
    const snippet = stripHtml(rawDesc).slice(0, MAX_SNIPPET_LENGTH);

    items.push({ title, url, publishedAt, snippet });
  });

  // Atom entries (only if no RSS items found)
  if (items.length === 0) {
    $('entry').each((_i, el) => {
      const $el = $(el);

      const title = $el.find('title').first().text().trim();
      const url =
        $el.find('link[rel="alternate"]').attr('href') ||
        $el.find('link').first().attr('href') ||
        '';

      if (!title || !url) return;

      const updatedStr =
        $el.find('updated').first().text().trim() ||
        $el.find('published').first().text().trim();
      const publishedAt = updatedStr ? new Date(updatedStr) : null;

      if (publishedAt && !isNaN(publishedAt.getTime()) && publishedAt < cutoff) {
        return;
      }

      const rawDesc =
        $el.find('summary').first().text().trim() ||
        $el.find('content').first().text().trim();
      const snippet = stripHtml(rawDesc).slice(0, MAX_SNIPPET_LENGTH);

      items.push({ title, url, publishedAt, snippet });
    });
  }

  return { feedTitle, items };
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
