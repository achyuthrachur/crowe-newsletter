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
  forceSearch?: boolean;
}): Promise<{ queriesRun: number; resultsFound: number; matchesCreated: number; errors: string[] }> {
  const { userId, depthLevel, forceSearch = false } = opts;

  // Determine max queries based on depth level
  const maxQueriesDefault = parseInt(process.env.WEBSEARCH_MAX_QUERIES_PER_USER || '8');
  let maxQueries: number;
  if (!forceSearch && depthLevel === 'quick') return { queriesRun: 0, resultsFound: 0, matchesCreated: 0, errors: [] };
  else if (depthLevel === 'standard') maxQueries = Math.min(4, maxQueriesDefault);
  else maxQueries = maxQueriesDefault; // expanded

  // Load user interests
  const interests = await prisma.interest.findMany({
    where: { userId },
  });

  if (interests.length === 0) return { queriesRun: 0, resultsFound: 0, matchesCreated: 0, errors: [] };

  // In force mode, search all interests. Otherwise, only sparse ones (< 3 matches in 24h).
  let targetInterests = interests;

  if (!forceSearch) {
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

    if (sparseInterests.length === 0) return { queriesRun: 0, resultsFound: 0, matchesCreated: 0, errors: [] };
    targetInterests = sparseInterests;
  }

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
  const errors: string[] = [];

  for (const interest of targetInterests.slice(0, maxQueries)) {
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

      // Call OpenAI Responses API with web_search_preview tool
      const websearchModel = process.env.WEBSEARCH_MODEL || 'gpt-4o-mini';
      const maxResultsPerInterest = parseInt(process.env.WEBSEARCH_RESULTS_PER_QUERY || '5');
      const response = await getOpenAI().responses.create({
        model: websearchModel,
        tools: [{ type: 'web_search_preview' }],
        instructions:
          'You are a research assistant for a professional newsletter digest. ' +
          'Find the most important, recent, and actionable news on the given topic.\n\n' +
          'Focus on:\n' +
          '- Breaking developments and regulatory changes\n' +
          '- Analysis from reputable sources (Reuters, WSJ, FT, Bloomberg, industry publications)\n' +
          '- Practical implications for professionals\n' +
          '- Technology trends affecting professional services\n\n' +
          'For each article, write 2-3 sentences explaining what happened and why it matters. ' +
          'Avoid opinion pieces, listicles, and promotional content. ' +
          'Prioritize articles from the last 7 days. ' +
          `Return exactly ${maxResultsPerInterest} articles, each with a clear summary paragraph followed by its source link.`,
        input: queryText,
      });

      queriesRun++;

      // Extract full response text and annotations
      let fullText = '';
      const allAnnotations: Array<{ url: string; title: string; start_index: number; end_index: number }> = [];

      for (const item of response.output) {
        if (item.type === 'message') {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              fullText += content.text;
              if (content.annotations) {
                for (const ann of content.annotations) {
                  if (ann.type === 'url_citation' && ann.url && ann.title) {
                    allAnnotations.push({
                      url: ann.url,
                      title: ann.title,
                      start_index: ann.start_index,
                      end_index: ann.end_index,
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Deduplicate annotations and extract snippets from surrounding text
      const searchResults: Array<{ title: string; url: string; snippet: string }> = [];
      const seenUrls = new Set<string>();

      // Sort annotations by position in text
      allAnnotations.sort((a, b) => a.start_index - b.start_index);

      for (let ai = 0; ai < allAnnotations.length; ai++) {
        const ann = allAnnotations[ai];
        if (seenUrls.has(ann.url)) continue;
        seenUrls.add(ann.url);

        const domain = extractDomain(ann.url);
        if (blockedPatterns.some((p) => domain.includes(p))) continue;

        // Extract snippet: look backwards from the citation to find the paragraph
        const textBefore = fullText.slice(0, ann.start_index);
        // Find the start of the current section/paragraph (look for double newline or numbered list item)
        const paragraphBreak = Math.max(
          textBefore.lastIndexOf('\n\n'),
          textBefore.lastIndexOf('\n1.'),
          textBefore.lastIndexOf('\n2.'),
          textBefore.lastIndexOf('\n3.'),
          textBefore.lastIndexOf('\n4.'),
          textBefore.lastIndexOf('\n5.'),
          textBefore.lastIndexOf('\n6.'),
          textBefore.lastIndexOf('\n7.'),
          textBefore.lastIndexOf('\n**'),
        );
        const snippetStart = paragraphBreak >= 0 ? paragraphBreak : Math.max(0, ann.start_index - 300);
        let snippet = fullText.slice(snippetStart, ann.start_index).trim();

        // Clean up: remove markdown formatting, list markers, and citation brackets
        snippet = snippet
          .replace(/^\d+\.\s*/, '')       // Remove leading "1. "
          .replace(/\*\*/g, '')           // Remove bold markers
          .replace(/\[.*?\]/g, '')        // Remove [citation] brackets
          .replace(/^[-•]\s*/, '')        // Remove bullet points
          .trim();

        // Limit to ~2-3 sentences
        const sentences = snippet.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length > 3) {
          snippet = sentences.slice(-3).join(' ').trim();
        }

        if (searchResults.length >= maxResultsPerInterest) break;

        searchResults.push({
          title: ann.title,
          url: ann.url,
          snippet,
        });
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
        } else if (sr.snippet && !article.snippet) {
          // Update existing article with snippet if it was missing
          await prisma.article.update({
            where: { id: article.id },
            data: { snippet: sr.snippet },
          }).catch(() => {});
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

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown';
      errors.push(`${interest.label}: ${errMsg}`);
      logDailyTick('web_search_query_error', {
        interest: interest.label,
        error: errMsg,
      });
    }
  }

  return { queriesRun, resultsFound, matchesCreated, errors };
}
