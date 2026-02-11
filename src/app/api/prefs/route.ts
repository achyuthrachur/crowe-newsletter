import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAuthToken } from '@/lib/auth';
import { parseRrule, buildRrule, computeNextSend } from '@/lib/rrule';

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

