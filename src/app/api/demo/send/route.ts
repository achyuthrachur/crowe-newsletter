import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { buildDigestForUser } from '@/services/digest/builder';
import { sendEmail } from '@/services/email/sender';
import { runWebSearchForUser } from '@/services/search/webSearch';

const DEMO_MAX_ARTICLES = 7;

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 });
  }

  const { userId } = body;

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // If interests were passed from the form, update the user's interests
  // This handles the case where an existing user re-submits with different topics
  if (body.interests && Array.isArray(body.interests) && body.interests.length > 0) {
    await prisma.interest.deleteMany({ where: { userId } });
    await prisma.interest.createMany({
      data: body.interests.map((i: { section: string; label: string; type: string }) => ({
        userId,
        section: i.section,
        label: i.label,
        type: i.type,
      })),
    });
  }

  const interestCount = await prisma.interest.count({ where: { userId } });

  // Clear old article matches so demo only shows freshly-fetched articles
  await prisma.articleMatch.deleteMany({ where: { userId } });

  // Step 1: Run AI web search to fetch fresh articles for this user's interests
  let webSearchResults = { queriesRun: 0, resultsFound: 0, matchesCreated: 0, errors: [] as string[] };
  let webSearchError: string | undefined;
  try {
    webSearchResults = await runWebSearchForUser({
      userId,
      depthLevel: 'expanded',
      forceSearch: true,
    });
  } catch (err) {
    webSearchError = err instanceof Error ? err.message : String(err);
    console.error('Demo web search error:', webSearchError);
  }

  if (webSearchResults.matchesCreated === 0) {
    return Response.json({
      ok: true,
      emailSent: false,
      articlesMatched: 0,
      reason: 'no_matches',
      interestCount,
      ...(webSearchError && { webSearchError }),
      ...(webSearchResults.errors.length > 0 && { webSearchErrors: webSearchResults.errors }),
    });
  }

  // Step 2: Build digest from fresh web search results only
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Always rebuild digest in demo mode
  await prisma.digest.deleteMany({ where: { userId, runDate: today } });

  const digestId = await buildDigestForUser({
    userId,
    runDate: today,
    maxArticles: DEMO_MAX_ARTICLES,
  });

  if (!digestId) {
    return Response.json({
      ok: true,
      emailSent: false,
      articlesMatched: webSearchResults.matchesCreated,
      reason: 'no_digest',
    });
  }

  // Step 3: Send email
  const digest = await prisma.digest.findUnique({ where: { id: digestId } });

  if (!digest) {
    return Response.json({
      ok: true,
      emailSent: false,
      articlesMatched: webSearchResults.matchesCreated,
      reason: 'digest_not_found',
    });
  }

  try {
    await sendEmail({
      to: user.email,
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    return Response.json({
      ok: false,
      error: `Email send failed: ${message}`,
      articlesMatched: webSearchResults.matchesCreated,
    }, { status: 502 });
  }

  // Step 4: Record email event
  await prisma.emailEvent.create({
    data: {
      userId,
      digestId,
      type: 'sent',
    },
  });

  return Response.json({
    ok: true,
    emailSent: true,
    articlesMatched: webSearchResults.matchesCreated,
    webSearchQueries: webSearchResults.queriesRun,
    webSearchResults: webSearchResults.resultsFound,
    interestCount,
    ...(webSearchError && { webSearchError }),
    ...(webSearchResults.errors.length > 0 && { webSearchErrors: webSearchResults.errors }),
  });
}
