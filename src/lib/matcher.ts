import { prisma } from './db';

interface ScoredMatch {
  articleId: string;
  interestId: string;
  score: number;
  reason: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreArticleForInterest(
  title: string,
  snippet: string | null,
  interestLabel: string
): { score: number; reason: string } {
  const labelLower = interestLabel.toLowerCase();
  const titleLower = title.toLowerCase();
  const snippetLower = (snippet || '').toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  // Exact label match in title: +100
  if (titleLower.includes(labelLower)) {
    score += 100;
    reasons.push(`label "${interestLabel}" found in title`);
  }

  // Exact label match in snippet: +60
  if (snippetLower.includes(labelLower)) {
    score += 60;
    reasons.push(`label "${interestLabel}" found in snippet`);
  }

  // Word overlap (>=2 distinct tokens): +30
  const labelTokens = tokenize(interestLabel);
  const titleTokens = new Set(tokenize(title));
  const snippetTokens = new Set(tokenize(snippet || ''));
  const allArticleTokens = new Set([...titleTokens, ...snippetTokens]);

  const overlapping = labelTokens.filter((t) => allArticleTokens.has(t));
  if (overlapping.length >= 2) {
    score += 30;
    reasons.push(`word overlap: ${overlapping.join(', ')}`);
  }

  return {
    score,
    reason: reasons.join('; ') || 'no match',
  };
}

export async function matchArticlesForUser(userId: string): Promise<ScoredMatch[]> {
  const interests = await prisma.interest.findMany({
    where: { userId },
  });

  if (interests.length === 0) return [];

  // Articles from last 72 hours, not paywalled
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const articles = await prisma.article.findMany({
    where: {
      accessStatus: { not: 'paywalled' },
      OR: [
        { publishedAt: { gte: since } },
        { fetchedAt: { gte: since } },
      ],
    },
  });

  const allMatches: ScoredMatch[] = [];

  for (const article of articles) {
    for (const interest of interests) {
      const { score, reason } = scoreArticleForInterest(
        article.title,
        article.snippet,
        interest.label
      );

      if (score > 0) {
        allMatches.push({
          articleId: article.id,
          interestId: interest.id,
          score,
          reason,
        });
      }
    }
  }

  // Sort by score descending, take top 50
  allMatches.sort((a, b) => b.score - a.score);
  const topMatches = allMatches.slice(0, 50);

  // Store in DB
  for (const match of topMatches) {
    await prisma.articleMatch.create({
      data: {
        articleId: match.articleId,
        userId,
        interestId: match.interestId,
        score: match.score,
        reason: match.reason,
      },
    });
  }

  return topMatches;
}
