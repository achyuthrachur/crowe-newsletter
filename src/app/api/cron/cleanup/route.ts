import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    const [tokenResult, suppressionResult] = await Promise.all([
      prisma.authToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.userStorySuppression.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      deletedTokens: tokenResult.count,
      deletedSuppressions: suppressionResult.count,
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
