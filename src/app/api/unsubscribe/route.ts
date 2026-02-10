import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAuthToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const userId = await validateAuthToken(token, 'unsubscribe');
  if (!userId) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  await prisma.profile.update({
    where: { userId },
    data: { emailEnabled: false },
  });

  await prisma.emailEvent.create({
    data: {
      userId,
      type: 'unsubscribed',
    },
  });

  return Response.json({ ok: true });
}
