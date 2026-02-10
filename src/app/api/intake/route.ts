import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createTokenSet } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate required fields
  if (!body.email || !body.interests || body.interests.length === 0) {
    return Response.json(
      { error: 'Email and at least one interest are required.' },
      { status: 400 }
    );
  }

  if (!body.schedule?.days || body.schedule.days.length === 0) {
    return Response.json(
      { error: 'At least one delivery day is required.' },
      { status: 400 }
    );
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existing) {
    // Generate a prefs token for the existing user
    const tokens = await createTokenSet(existing.id);
    const appHost = process.env.APP_HOST || 'http://localhost:3000';
    return Response.json({
      ok: true,
      prefsUrl: `${appHost}/prefs?token=${tokens.prefs}`,
      message: 'Account already exists. Use the preferences link to update.',
    });
  }

  // Build RRULE
  const days = body.schedule.days as string[];
  const hour = body.schedule.hour ?? 6;
  const minute = body.schedule.minute ?? 0;
  const rrule = `FREQ=WEEKLY;BYDAY=${days.join(',')};BYHOUR=${hour};BYMINUTE=${minute};BYSECOND=0`;

  // Compute next send time
  const nextSendAt = computeNextSend(days, hour, minute);

  // Create user with all related records in a transaction
  const user = await prisma.user.create({
    data: {
      email: body.email,
      timezone: body.timezone || 'America/Indiana/Indianapolis',
      profile: {
        create: {
          displayName: body.displayName || null,
          roleTitle: body.roleTitle || null,
          industryFocus: body.industryFocus || null,
        },
      },
      schedule: {
        create: {
          rrule,
          nextSendAt,
        },
      },
      interests: {
        create: body.interests.map(
          (i: { section: string; label: string; type: string }) => ({
            section: i.section,
            label: i.label,
            type: i.type,
          })
        ),
      },
    },
  });

  // Generate auth tokens
  const tokens = await createTokenSet(user.id);
  const appHost = process.env.APP_HOST || 'http://localhost:3000';

  return Response.json({
    ok: true,
    prefsUrl: `${appHost}/prefs?token=${tokens.prefs}`,
  });
}

function computeNextSend(days: string[], hour: number, minute: number): Date {
  const dayMap: Record<string, number> = {
    SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
  };

  const now = new Date();
  const targetDays = days.map((d) => dayMap[d]).filter((d) => d !== undefined).sort();

  if (targetDays.length === 0) {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(hour, minute, 0, 0);
    return next;
  }

  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hour * 60 + minute;

  for (let offset = 0; offset < 7; offset++) {
    const candidateDay = (currentDay + offset) % 7;
    if (targetDays.includes(candidateDay)) {
      if (offset === 0 && currentMinutes >= targetMinutes) continue;
      const next = new Date(now);
      next.setDate(next.getDate() + offset);
      next.setHours(hour, minute, 0, 0);
      return next;
    }
  }

  const next = new Date(now);
  const daysUntil = (targetDays[0] - currentDay + 7) % 7 || 7;
  next.setDate(next.getDate() + daysUntil);
  next.setHours(hour, minute, 0, 0);
  return next;
}
