import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Token is required' }, { status: 400 });
  }

  const result = await validateToken(token, 'unsubscribe');
  if (!result.valid) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
  }

  try {
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
