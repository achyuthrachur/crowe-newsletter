import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createTokenSet } from '@/lib/auth';
import { buildRrule, computeNextSend } from '@/lib/rrule';

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
      userId: existing.id,
      prefsUrl: `${appHost}/prefs?token=${tokens.prefs}`,
      message: 'Account already exists. Use the preferences link to update.',
    });
  }

  // Build RRULE
  const days = body.schedule.days as string[];
  const hour = body.schedule.hour ?? 6;
  const minute = body.schedule.minute ?? 0;
  const rrule = buildRrule(days, hour, minute);

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
    userId: user.id,
    prefsUrl: `${appHost}/prefs?token=${tokens.prefs}`,
  });
}

