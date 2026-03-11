import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuthToken, validateAuthToken } from '@/lib/auth';
import { buildEmailUrls } from '@/lib/tokens';

export interface DigestArticle {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string | null;
  summary: string;
  whyItMatters: string;
  section: string;
  score: number;
}

export interface DigestData {
  id: string;
  date: string;
  greeting: string;
  sections: Array<{
    section: string;
    articles: DigestArticle[];
  }>;
  articleCount: number;
  feedbackEnabled: boolean;
  prefsToken?: string;
  links: {
    prefsUrl: string;
    pauseUrl: string;
    unsubscribeUrl: string;
    readerUrl: string;
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const digestId = request.nextUrl.searchParams.get('digestId');

  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const userId = await validateAuthToken(token, 'prefs');
  if (!userId) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Find digest
  let digest;
  if (digestId) {
    digest = await prisma.digest.findFirst({
      where: { id: digestId, userId },
    });
  } else {
    // Most recent sent digest
    const latestEvent = await prisma.emailEvent.findFirst({
      where: { userId, type: 'sent', digestId: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { digest: true },
    });
    digest = latestEvent?.digest ?? null;
  }

  if (!digest) {
    return Response.json({ error: 'No digest found' }, { status: 404 });
  }

  // Fetch article matches for this digest's run date
  const matches = await prisma.articleMatch.findMany({
    where: { userId },
    include: {
      article: true,
      interest: { select: { section: true, label: true } },
    },
    orderBy: { score: 'desc' },
    take: 20,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  const displayName = user?.profile?.displayName ?? '';
  const firstName = displayName.split(' ')[0] || '';
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? `Good morning${firstName ? `, ${firstName}` : ''}. Here's what matters today.`
      : hour < 17
      ? `Good afternoon${firstName ? `, ${firstName}` : ''}. Here's your intelligence briefing.`
      : `Good evening${firstName ? `, ${firstName}` : ''}. Here's today's briefing.`;

  // Group by section
  const sectionMap = new Map<string, DigestArticle[]>();
  for (const match of matches) {
    const section = match.interest.section;
    if (!sectionMap.has(section)) sectionMap.set(section, []);

    // Parse summary and whyItMatters from article snippet
    const snippet = match.article.snippet ?? '';
    const whyMatch = snippet.match(/Why it matters[:\s]+(.+?)(?:\n|$)/i);
    const whyItMatters = whyMatch?.[1]?.trim() ?? `Relevant to your ${section} focus area.`;
    const summary = snippet.replace(/Why it matters[:\s]+.+/i, '').trim() || snippet.slice(0, 200);

    sectionMap.get(section)!.push({
      id: match.article.id,
      title: match.article.title,
      url: match.article.canonicalUrl,
      sourceName: match.article.sourceName,
      publishedAt: match.article.publishedAt?.toISOString() ?? null,
      summary,
      whyItMatters,
      section,
      score: match.score,
    });
  }

  const sections = Array.from(sectionMap.entries()).map(([section, articles]) => ({
    section,
    articles: articles.slice(0, 3),
  }));

  const articleCount = sections.reduce((s, sec) => s + sec.articles.length, 0);

  const feedbackEnabled = process.env.NEXT_PUBLIC_FEEDBACK_ENABLED === 'true';
  const [pauseToken, unsubscribeToken] = await Promise.all([
    createAuthToken(userId, 'pause'),
    createAuthToken(userId, 'unsubscribe'),
  ]);
  const links = buildEmailUrls(request.nextUrl.origin, {
    prefs: token,
    pause: pauseToken,
    unsubscribe: unsubscribeToken,
  });

  return Response.json({
    id: digest.id,
    date: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(digest.createdAt),
    greeting,
    sections,
    articleCount,
    feedbackEnabled,
    links: {
      prefsUrl: links.prefsUrl,
      pauseUrl: links.pauseUrl,
      unsubscribeUrl: links.unsubscribeUrl,
      readerUrl: links.readerUrl,
    },
  } satisfies DigestData);
}
