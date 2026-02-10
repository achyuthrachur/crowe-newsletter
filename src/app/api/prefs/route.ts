import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAuthToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const userId = await validateAuthToken(token, 'prefs');
  if (!userId) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      schedule: true,
      interests: true,
      deepDiveConfig: true,
      deepDiveTopics: true,
    },
  });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // Parse schedule RRULE into days/hour/minute
  const schedule = parseRrule(user.schedule?.rrule ?? '');

  return Response.json({
    email: user.email,
    timezone: user.timezone,
    profile: {
      displayName: user.profile?.displayName ?? '',
      roleTitle: user.profile?.roleTitle ?? '',
      industryFocus: user.profile?.industryFocus ?? '',
      paused: user.profile?.paused ?? false,
    },
    schedule,
    interests: user.interests.map((i) => ({
      id: i.id,
      section: i.section,
      label: i.label,
      type: i.type,
    })),
    deepDive: user.deepDiveConfig
      ? {
          enabled: user.deepDiveConfig.enabled,
          dayOfWeek: user.deepDiveConfig.dayOfWeek,
          maxSources: user.deepDiveConfig.maxSources,
          topicIds: user.deepDiveTopics.map((t) => t.interestId),
        }
      : {
          enabled: false,
          dayOfWeek: 'FR',
          maxSources: 12,
          topicIds: [],
        },
  });
}

export async function PUT(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const userId = await validateAuthToken(token, 'prefs');
  if (!userId) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const body = await request.json();

  // Update profile
  if (body.profile) {
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: body.profile.displayName,
        roleTitle: body.profile.roleTitle,
        industryFocus: body.profile.industryFocus,
        paused: body.profile.paused ?? false,
      },
      update: {
        displayName: body.profile.displayName,
        roleTitle: body.profile.roleTitle,
        industryFocus: body.profile.industryFocus,
        paused: body.profile.paused ?? false,
      },
    });
  }

  // Update schedule
  if (body.schedule) {
    const rrule = buildRrule(body.schedule.days, body.schedule.hour, body.schedule.minute ?? 0);
    const nextSendAt = computeNextSend(body.schedule.days, body.schedule.hour, body.schedule.minute ?? 0);

    await prisma.schedule.upsert({
      where: { userId },
      create: { userId, rrule, nextSendAt },
      update: { rrule, nextSendAt },
    });
  }

  // Update interests (replace all)
  if (body.interests) {
    await prisma.interest.deleteMany({ where: { userId } });
    if (body.interests.length > 0) {
      await prisma.interest.createMany({
        data: body.interests.map((i: { section: string; label: string; type: string }) => ({
          userId,
          section: i.section,
          label: i.label,
          type: i.type,
        })),
      });
    }
  }

  // Update deep dive config (Stage 3)
  if (body.deepDive) {
    await prisma.deepDiveConfig.upsert({
      where: { userId },
      create: {
        userId,
        enabled: body.deepDive.enabled,
        dayOfWeek: body.deepDive.dayOfWeek,
        maxSources: body.deepDive.maxSources,
      },
      update: {
        enabled: body.deepDive.enabled,
        dayOfWeek: body.deepDive.dayOfWeek,
        maxSources: body.deepDive.maxSources,
      },
    });

    // Update deep dive topics
    if (body.deepDive.topicIds) {
      await prisma.deepDiveTopic.deleteMany({ where: { userId } });

      // Get the new interest IDs (after the replace above)
      const newInterests = await prisma.interest.findMany({
        where: { userId },
        select: { id: true },
      });
      const validIds = new Set(newInterests.map((i) => i.id));

      const validTopicIds = (body.deepDive.topicIds as string[]).filter((id) =>
        validIds.has(id)
      );

      if (validTopicIds.length > 0) {
        await prisma.deepDiveTopic.createMany({
          data: validTopicIds.map((interestId) => ({
            userId,
            interestId,
          })),
        });
      }
    }
  }

  return Response.json({ ok: true });
}

// ─── Helpers ───────────────────────────────────────────

function parseRrule(rrule: string): { days: string[]; hour: number; minute: number } {
  const days: string[] = [];
  let hour = 6;
  let minute = 0;

  const byDayMatch = rrule.match(/BYDAY=([^;]+)/);
  if (byDayMatch) {
    days.push(...byDayMatch[1].split(','));
  }

  const byHourMatch = rrule.match(/BYHOUR=(\d+)/);
  if (byHourMatch) hour = parseInt(byHourMatch[1]);

  const byMinuteMatch = rrule.match(/BYMINUTE=(\d+)/);
  if (byMinuteMatch) minute = parseInt(byMinuteMatch[1]);

  return { days, hour, minute };
}

function buildRrule(days: string[], hour: number, minute: number): string {
  return `FREQ=WEEKLY;BYDAY=${days.join(',')};BYHOUR=${hour};BYMINUTE=${minute};BYSECOND=0`;
}

function computeNextSend(days: string[], hour: number, minute: number): Date {
  const dayMap: Record<string, number> = {
    SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
  };

  const now = new Date();
  const targetDays = days.map((d) => dayMap[d]).filter((d) => d !== undefined).sort();

  if (targetDays.length === 0) {
    // Default to tomorrow
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(hour, minute, 0, 0);
    return next;
  }

  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hour * 60 + minute;

  // Find next occurrence
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

  // Wrap around: first target day next week
  const next = new Date(now);
  const daysUntil = (targetDays[0] - currentDay + 7) % 7 || 7;
  next.setDate(next.getDate() + daysUntil);
  next.setHours(hour, minute, 0, 0);
  return next;
}
