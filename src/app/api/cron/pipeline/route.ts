import { runDailyTick } from '@/jobs/dailyTick';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyTick();
    return Response.json({
      ...result,
      deprecatedRoute: true,
      message: 'Use /api/cron/daily. This route now delegates to runDailyTick().',
    });
  } catch (err) {
    console.error('Pipeline error:', err);
    return Response.json(
      { ok: false, error: String(err), deprecatedRoute: true },
      { status: 500 }
    );
  }
}
