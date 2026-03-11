import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateToken } from '@/lib/tokens';
import { renderEmailActionPage } from '@/lib/email/action-page';

async function unsubscribeByToken(token: string): Promise<{ ok: true } | { ok: false; status: number }> {
  const result = await validateToken(token, 'unsubscribe');
  if (!result.valid) {
    return { ok: false, status: 401 };
  }

  await prisma.profile.update({
    where: { userId: result.userId },
    data: { emailEnabled: false },
  });

  await prisma.emailEvent.create({
    data: {
      userId: result.userId,
      type: 'unsubscribed',
    },
  });

  return { ok: true };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response(
      renderEmailActionPage({
        title: 'Unsubscribe link invalid',
        message: 'This unsubscribe link is missing a token. Use the most recent briefing email.',
        tone: 'error',
      }),
      {
        status: 400,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }
    );
  }

  const outcome = await unsubscribeByToken(token);
  if (!outcome.ok) {
    return new Response(
      renderEmailActionPage({
        title: 'Unsubscribe link expired',
        message: 'This unsubscribe link is invalid or expired. Use the most recent briefing email to unsubscribe.',
        tone: 'error',
      }),
      {
        status: outcome.status,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }
    );
  }

  return new Response(
    renderEmailActionPage({
      title: 'You are unsubscribed',
      message: 'Your Crowe Intelligence briefings have been turned off. You will not receive future digest emails.',
    }),
    {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
  );
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Token is required' }, { status: 400 });
  }

  try {
    const outcome = await unsubscribeByToken(token);
    if (!outcome.ok) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
