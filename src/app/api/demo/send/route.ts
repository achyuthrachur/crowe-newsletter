import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { matchArticlesForSingleUser } from '@/services/matching/matchSingleUser';
import { buildDigestForUser } from '@/services/digest/builder';
import { sendEmail } from '@/services/email/sender';

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

  // Step 1: Match articles against this user's interests
  const articlesMatched = await matchArticlesForSingleUser(userId);

  if (articlesMatched === 0) {
    return Response.json({
      ok: true,
      emailSent: false,
      articlesMatched: 0,
      reason: 'no_matches',
    });
  }

  // Step 2: Build digest
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Allow force-rebuild to clear cached digest (for testing)
  if (body.force) {
    await prisma.digest.deleteMany({ where: { userId, runDate: today } });
  }

  const digestId = await buildDigestForUser({ userId, runDate: today });

  if (!digestId) {
    return Response.json({
      ok: true,
      emailSent: false,
      articlesMatched,
      reason: 'no_digest',
    });
  }

  // Step 3: Send email
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
    articlesMatched,
  });
}
