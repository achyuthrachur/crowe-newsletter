import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { matchArticlesForSingleUser } from '@/services/matching/matchSingleUser';
import { buildDigestForUser } from '@/services/digest/builder';
import { sendEmail } from '@/services/email/sender';
import { runWebSearchForUser } from '@/services/search/webSearch';

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 });
  }

  const { userId } = body;

  // Verify user exists and get depth level
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, profile: { select: { depthLevel: true } } },
  });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // Check interest count for diagnostics
  const interestCount = await prisma.interest.count({ where: { userId } });

  // Clear old article matches so demo only shows freshly-fetched articles
  await prisma.articleMatch.deleteMany({ where: { userId } });

  // Step 1: Run AI web search to fetch fresh articles for this user's interests
  let webSearchResults = { queriesRun: 0, resultsFound: 0, matchesCreated: 0, errors: [] as string[] };
  let webSearchError: string | undefined;
  try {
    webSearchResults = await runWebSearchForUser({
      userId,
      depthLevel: 'expanded', // Always use expanded for demo so we get maximum coverage
      forceSearch: true, // Skip sparseness check — always fetch fresh articles
    });
  } catch (err) {
    webSearchError = err instanceof Error ? err.message : String(err);
    console.error('Demo web search error:', webSearchError);
  }

  // Step 2: Match all articles (web search + any existing) against interests
  const articlesMatched = await matchArticlesForSingleUser(userId);

  if (articlesMatched === 0 && webSearchResults.matchesCreated === 0) {
    return Response.json({
      ok: true,
      emailSent: false,
      articlesMatched: 0,
      reason: 'no_matches',
    });
  }

  // Step 3: Build digest (force-rebuild clears cached digest)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Always rebuild digest in demo mode since we just fetched fresh articles
  await prisma.digest.deleteMany({ where: { userId, runDate: today } });

  const digestId = await buildDigestForUser({ userId, runDate: today });

  if (!digestId) {
    return Response.json({
      ok: true,
      emailSent: false,
      articlesMatched,
      reason: 'no_digest',
    });
  }

  // Step 4: Send email
  const digest = await prisma.digest.findUnique({ where: { id: digestId } });

  if (!digest) {
    return Response.json({
      ok: true,
      emailSent: false,
      articlesMatched,
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
      articlesMatched,
    }, { status: 502 });
  }

  // Step 5: Record email event
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
    articlesMatched,
    webSearchQueries: webSearchResults.queriesRun,
    webSearchResults: webSearchResults.resultsFound,
    interestCount,
    ...(webSearchError && { webSearchError }),
    ...(webSearchResults.errors.length > 0 && { webSearchErrors: webSearchResults.errors }),
  });
}
