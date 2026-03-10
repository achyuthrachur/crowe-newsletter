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
      keywordBlocks: { orderBy: { createdAt: 'asc' } },
      sourceBlocks: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // Parse schedule RRULE into days/hour/minute
  const schedule = parseRrule(user.schedule?.rrule ?? '');

  // Fetch last digest sent
  const lastEmailEvent = await prisma.emailEvent.findFirst({
    where: { userId, type: 'sent', digestId: { not: null } },
    orderBy: { createdAt: 'desc' },
    include: { digest: true },
  });

  let lastDigest = null;
  if (lastEmailEvent?.digest) {
    const d = lastEmailEvent.digest;
    // Parse section names from digest HTML (simple extract from subject fallback)
    const sectionMatches = d.html.match(/──\s*([^─]+?)\s*──/g) ?? [];
    const sections = sectionMatches
      .map((m: string) => m.replace(/──/g, '').trim())
      .filter((s: string) => s.length > 0)
      .slice(0, 5);

    lastDigest = {
      id: d.id,
      date: new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(d.createdAt),
      articleCount: (d.html.match(/article-card/g) ?? []).length || null,
      sections,
      sentAt: lastEmailEvent.createdAt.toISOString(),
    };
  }

  // Fetch recent feedback (last 10)
  const feedbackRows = await prisma.feedbackEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { article: { select: { title: true } } },
  });

  const recentFeedback = feedbackRows.map((f) => ({
    articleTitle: f.article.title,
    action: f.action as 'upvote' | 'downvote' | 'dismiss',
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(f.createdAt),
  }));

  // Try to fetch deep dive config (Stage 3 - graceful fallback if tables don't exist)
  let deepDive = { enabled: false, dayOfWeek: 'FR', maxSources: 12, topicIds: [] as string[] };
  try {
    const ddc = await (prisma as unknown as { deepDiveConfig: { findUnique: (opts: { where: { userId: string }; include: { deepDiveTopics: boolean } }) => Promise<{ enabled: boolean; dayOfWeek: string; maxSources: number; deepDiveTopics: Array<{ interestId: string }> } | null> } }).deepDiveConfig.findUnique({
      where: { userId },
      include: { deepDiveTopics: true },
    });
    if (ddc) {
      deepDive = {
        enabled: ddc.enabled,
        dayOfWeek: ddc.dayOfWeek,
        maxSources: ddc.maxSources,
        topicIds: ddc.deepDiveTopics.map((t) => t.interestId),
      };
    }
  } catch {
    // Stage 3 tables may not exist yet
  }

  return Response.json({
    email: user.email,
    timezone: user.timezone,
    profile: {
      displayName: user.profile?.displayName ?? '',
      roleTitle: user.profile?.roleTitle ?? '',
      industryFocus: user.profile?.industryFocus ?? '',
      paused: user.profile?.paused ?? false,
      maxItemsTotal: user.profile?.maxItemsTotal ?? 8,
      maxItemsPerSection: user.profile?.maxItemsPerSection ?? 3,
      depthLevel: user.profile?.depthLevel ?? 'standard',
    },
    schedule,
    interests: user.interests.map((i) => ({
      id: i.id,
      section: i.section,
      label: i.label,
      type: i.type,
      weight: i.weight,
    })),
    keywordBlocks: user.keywordBlocks.map((b) => b.keyword),
    sourceBlocks: user.sourceBlocks.map((b) => b.domain),
    deepDive,
    lastDigest,
    recentFeedback,
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

  // Update profile (including Stage 4 caps)
  if (body.profile) {
    const maxItemsTotal = Math.min(12, Math.max(1, body.profile.maxItemsTotal ?? 8));
    const maxItemsPerSection = Math.min(5, Math.max(1, body.profile.maxItemsPerSection ?? 3));

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: body.profile.displayName,
        roleTitle: body.profile.roleTitle,
        industryFocus: body.profile.industryFocus,
        paused: body.profile.paused ?? false,
        depthLevel: body.profile.depthLevel ?? 'standard',
        maxItemsTotal,
        maxItemsPerSection,
      },
      update: {
        displayName: body.profile.displayName,
        roleTitle: body.profile.roleTitle,
        industryFocus: body.profile.industryFocus,
        paused: body.profile.paused ?? false,
        depthLevel: body.profile.depthLevel ?? 'standard',
        maxItemsTotal,
        maxItemsPerSection,
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

  // Update interests (replace all) — include weight
  if (body.interests) {
    await prisma.interest.deleteMany({ where: { userId } });
    if (body.interests.length > 0) {
      await prisma.interest.createMany({
        data: body.interests.map((i: { section: string; label: string; type: string; weight?: number }) => ({
          userId,
          section: i.section,
          label: i.label,
          type: i.type,
          weight: Math.min(200, Math.max(0, i.weight ?? 100)),
        })),
      });
    }
  }

  // Update keyword blocks (replace all)
  if (Array.isArray(body.keywordBlocks)) {
    await prisma.userKeywordBlock.deleteMany({ where: { userId } });
    const keywords = (body.keywordBlocks as string[])
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
    if (keywords.length > 0) {
      await prisma.userKeywordBlock.createMany({
        data: keywords.map((keyword) => ({ userId, keyword })),
        skipDuplicates: true,
      });
    }
  }

  // Update source blocks (replace all)
  if (Array.isArray(body.sourceBlocks)) {
    await prisma.userSourceBlock.deleteMany({ where: { userId } });
    const domains = (body.sourceBlocks as string[])
      .map((d) => d.trim().toLowerCase().replace(/^www\./, ''))
      .filter((d) => d.length > 0);
    if (domains.length > 0) {
      await prisma.userSourceBlock.createMany({
        data: domains.map((domain) => ({ userId, domain })),
        skipDuplicates: true,
      });
    }
  }

  // Update deep dive config (Stage 3) — graceful fallback
  if (body.deepDive) {
    try {
      const ddc = prisma as unknown as {
        deepDiveConfig: {
          upsert: (opts: unknown) => Promise<unknown>;
        };
        deepDiveTopic: {
          deleteMany: (opts: unknown) => Promise<unknown>;
          createMany: (opts: unknown) => Promise<unknown>;
        };
      };

      await ddc.deepDiveConfig.upsert({
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

      if (body.deepDive.topicIds) {
        await ddc.deepDiveTopic.deleteMany({ where: { userId } });

        const newInterests = await prisma.interest.findMany({
          where: { userId },
          select: { id: true },
        });
        const validIds = new Set(newInterests.map((i) => i.id));
        const validTopicIds = (body.deepDive.topicIds as string[]).filter((id) => validIds.has(id));

        if (validTopicIds.length > 0) {
          await ddc.deepDiveTopic.createMany({
            data: validTopicIds.map((interestId) => ({ userId, interestId })),
          });
        }
      }
    } catch {
      // Stage 3 tables may not exist yet — continue
    }
  }

  return Response.json({ ok: true });
}
