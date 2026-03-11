import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAuthToken } from '@/lib/auth';
import { renderEmailActionPage } from '@/lib/email/action-page';

async function pauseProfile(token: string, paused = true): Promise<boolean> {
  const userId = await validateAuthToken(token, 'pause');
  if (!userId) {
    return false;
  }

  await prisma.profile.update({
    where: { userId },
    data: { paused },
  });

  return true;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return new Response(
      renderEmailActionPage({
        title: 'Pause link invalid',
        message: 'This email pause link is missing a token. Use the most recent briefing email.',
        tone: 'error',
      }),
      {
        status: 400,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }
    );
  }

  const paused = await pauseProfile(token, true);
  if (!paused) {
    return new Response(
      renderEmailActionPage({
        title: 'Pause link expired',
        message: 'This pause link is invalid or expired. Use the most recent briefing email to pause delivery.',
        tone: 'error',
      }),
      {
        status: 401,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }
    );
  }

  return new Response(
    renderEmailActionPage({
      title: 'Emails paused',
      message: 'Your Crowe Intelligence briefings are paused. You can resume them later from your preferences page.',
    }),
    {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
  );
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const body = await request.json();
  const paused = body.paused ?? true;

  const updated = await pauseProfile(token, paused);
  if (!updated) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  return Response.json({ ok: true, paused });
}
