import { runDailyTick } from '@/jobs/dailyTick';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Validate cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyTick();
    return Response.json(result);
  } catch (error) {
    console.error('Daily tick failed:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
