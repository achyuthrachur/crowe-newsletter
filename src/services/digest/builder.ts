import { prisma } from '@/lib/db';
import { createTokenSet } from '@/lib/auth';
import { flags } from '@/lib/flags';
import { renderDigestEmail, renderDigestText } from '@/services/email/templates/digest';
import { computeFeedbackAdjustments } from '@/services/feedback/scorer';
import { generateGreeting } from '@/services/email/greeting';
import type { DigestArticle, DigestSection, DigestData } from '@/types';

const MAX_ARTICLES_PER_DIGEST = 20;

/**
 * Build a digest for a single user.
 * Returns the digest ID if created, null if no matches found.
 */
export async function buildDigestForUser(opts: {
  userId: string;
  runDate: Date;
  maxArticles?: number;
}): Promise<string | null> {
  const { userId, runDate, maxArticles = MAX_ARTICLES_PER_DIGEST } = opts;

  // Check if digest already exists for this user+date
  const existing = await prisma.digest.findUnique({
    where: { userId_runDate: { userId, runDate } },
  });
  if (existing) return existing.id;

  // Load recent article matches (last 48 hours)
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const matches = await prisma.articleMatch.findMany({
    where: {
      userId,
      createdAt: { gte: twoDaysAgo },
    },
    include: {
      article: true,
      interest: true,
    },
    orderBy: { score: 'desc' },
    take: maxArticles * 2, // Fetch extra for deduplication
  });

  if (matches.length === 0) return null;

  // Apply feedback adjustments if personalization is enabled
  let feedbackBoosts = new Map<string, number>();
  if (flags.personalizationEnabled) {
    feedbackBoosts = await computeFeedbackAdjustments(userId);
  }

  // Dedupe by article and apply feedback boosts
  const seen = new Set<string>();
  const articles: (DigestArticle & { adjustedScore: number })[] = [];

  for (const match of matches) {
    if (seen.has(match.articleId)) continue;
    seen.add(match.articleId);

    const boost = feedbackBoosts.get(match.interestId) ?? 0;
    const adjustedScore = match.score + boost;

    articles.push({
      articleId: match.articleId,
      title: match.article.title,
      url: match.article.canonicalUrl,
      sourceName: match.article.sourceName,
      snippet: match.article.snippet || '',
      score: match.score,
      interestLabel: match.interest.label,
      interestSection: match.interest.section,
      adjustedScore,
    });
  }

  // Sort by adjusted score and take top N
  articles.sort((a, b) => b.adjustedScore - a.adjustedScore);
  const topArticles = articles.slice(0, maxArticles);

  if (topArticles.length === 0) return null;

  // Group by section
  const sectionMap = new Map<string, DigestArticle[]>();
  for (const article of topArticles) {
    const section = article.interestSection;
    if (!sectionMap.has(section)) sectionMap.set(section, []);
    sectionMap.get(section)!.push(article);
  }

  const sections: DigestSection[] = Array.from(sectionMap.entries()).map(
    ([section, sectionArticles]) => ({ section, articles: sectionArticles })
  );

  const dateLabel = runDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const digestData: DigestData = {
    sections,
    totalArticles: topArticles.length,
    dateLabel,
  };

  // Fetch display name for greeting
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { displayName: true },
  });

  // Generate dynamic greeting
  const greeting = await generateGreeting(profile?.displayName);

  // Render email
  const appHost = process.env.APP_HOST || 'http://localhost:3000';
  const tokens = await createTokenSet(userId);
  const subject = `Briefing \u2014 ${runDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const html = renderDigestEmail(digestData, tokens, appHost, subject, greeting);
  const text = renderDigestText(digestData, greeting);

  // Create digest record
  const digest = await prisma.digest.create({
    data: {
      userId,
      runDate,
      subject,
      html,
      text,
    },
  });

  return digest.id;
}
