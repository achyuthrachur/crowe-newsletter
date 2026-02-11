import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { canonicalizeUrl, extractDomain } from '@/lib/utils';
import { logDailyTick } from '@/lib/logger';

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Run web searches for a single user's sparse interests.
 * For each interest with < 3 matches in the last 24h, run a web search query.
 */
export async function runWebSearchForUser(opts: {
  userId: string;
  depthLevel: string;
}): Promise<{ queriesRun: number; resultsFound: number; matchesCreated: number }> {
  const { userId, depthLevel } = opts;

  // Determine max queries based on depth level
  const maxQueriesDefault = parseInt(process.env.WEBSEARCH_MAX_QUERIES_PER_USER || '8');
  let maxQueries: number;
  if (depthLevel === 'quick') return { queriesRun: 0, resultsFound: 0, matchesCreated: 0 };
  else if (depthLevel === 'standard') maxQueries = Math.min(4, maxQueriesDefault);
  else maxQueries = maxQueriesDefault; // expanded

  // Load user interests
  const interests = await prisma.interest.findMany({
    where: { userId },
  });

  if (interests.length === 0) return { queriesRun: 0, resultsFound: 0, matchesCreated: 0 };

  // Check which interests are sparse (< 3 matches in last 24h)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const sparseInterests: typeof interests = [];
  for (const interest of interests) {
    const matchCount = await prisma.articleMatch.count({
      where: {
        userId,
        interestId: interest.id,
        createdAt: { gte: oneDayAgo },
      },
    });
    if (matchCount < 3) sparseInterests.push(interest);
  }

  if (sparseInterests.length === 0) return { queriesRun: 0, resultsFound: 0, matchesCreated: 0 };

  // Load block rules
  const blockRules = await prisma.sourceRule.findMany({
    where: { action: 'block' },
  });
  const blockedPatterns = blockRules.map((r) => r.pattern);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let queriesRun = 0;
  let resultsFound = 0;
  let matchesCreated = 0;

  for (const interest of sparseInterests.slice(0, maxQueries)) {
    const queryText = `Latest developments in ${interest.label} — important news, regulatory updates, and industry impact ${monthYear}`;

    try {
      // Create SearchQuery record
      const searchQuery = await prisma.searchQuery.create({
        data: {
          userId,
          runDate: today,
          query: queryText,
        },
      });

      // Call OpenAI with web_search_preview tool
      const maxToolCalls = parseInt(process.env.WEBSEARCH_MAX_TOOL_CALLS || '12');
      const completion = await getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a research assistant for a professional newsletter digest. ' +
              'Your job is to find the most important, recent, and actionable news articles on a given topic. ' +
              'Focus on:\n' +
              '- Breaking developments and regulatory changes\n' +
              '- Analysis from reputable sources (Reuters, WSJ, FT, Bloomberg, industry publications)\n' +
              '- Practical implications for professionals in accounting, advisory, tax, and financial services\n' +
              '- Technology trends affecting professional services (AI, automation, cybersecurity)\n\n' +
              'Avoid opinion pieces, listicles, and promotional content. ' +
              'Prioritize articles published in the last 7 days. ' +
              'Return 5-8 of the most relevant articles with their titles, URLs, and a one-sentence summary of why each matters.',
          },
          { role: 'user', content: queryText },
        ],
        tools: [
          {
            type: 'web_search_preview' as 'function',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
        max_tokens: 1200,
      });

      queriesRun++;

      // Extract URLs and article info from the response
      const responseText = completion.choices[0]?.message?.content ?? '';

      // Parse URLs from annotations if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = completion.choices[0]?.message as any;
      const annotations = msg?.annotations as
        | Array<{ url?: string; title?: string; type?: string }>
        | undefined;

      const searchResults: Array<{
        title: string;
        url: string;
        snippet: string;
      }> = [];

      if (annotations && Array.isArray(annotations)) {
        for (const ann of annotations) {
          if (ann.url && ann.title) {
            const domain = extractDomain(ann.url);
            if (blockedPatterns.some((p) => domain.includes(p))) continue;
            searchResults.push({
              title: ann.title,
              url: ann.url,
              snippet: '',
            });
          }
        }
      }

      // Fallback: parse URLs from response text
      if (searchResults.length === 0) {
        const urlRegex = /https?:\/\/[^\s)>\]]+/g;
        const urls = responseText.match(urlRegex) || [];
        for (const url of urls.slice(0, 5)) {
          const domain = extractDomain(url);
          if (blockedPatterns.some((p) => domain.includes(p))) continue;
          searchResults.push({ title: '', url, snippet: '' });
        }
      }

      // Store search results and create articles/matches
      for (let i = 0; i < searchResults.length; i++) {
        const sr = searchResults[i];
        const canonical = canonicalizeUrl(sr.url);

        // Create SearchResult
        await prisma.searchResult.create({
          data: {
            searchQueryId: searchQuery.id,
            rank: i + 1,
            title: sr.title || 'Untitled',
            url: sr.url,
            snippet: sr.snippet || null,
          },
        }).catch(() => {
          // Skip duplicate search results
        });

        resultsFound++;

        // Create or find Article
        let article = await prisma.article.findUnique({
          where: { canonicalUrl: canonical },
        });

        if (!article) {
          article = await prisma.article.create({
            data: {
              canonicalUrl: canonical,
              title: sr.title || 'Untitled',
              sourceName: extractDomain(sr.url),
              snippet: sr.snippet || null,
              accessStatus: 'unknown',
            },
          }).catch(() => null);

          // If create failed due to race condition, try to find it
          if (!article) {
            article = await prisma.article.findUnique({
              where: { canonicalUrl: canonical },
            });
          }
        }

        if (!article) continue;

        // Create ArticleMatch
        await prisma.articleMatch.create({
          data: {
            articleId: article.id,
            userId,
            interestId: interest.id,
            score: 50, // Default score for web search results
            reason: 'web_search',
          },
        }).catch(() => {
          // Skip duplicate matches
        });

        matchesCreated++;
      }

      void maxToolCalls; // Used as config reference
    } catch (error) {
      logDailyTick('web_search_query_error', {
        interest: interest.label,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  return { queriesRun, resultsFound, matchesCreated };
}
