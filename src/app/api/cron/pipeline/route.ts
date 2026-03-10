import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { collectSources } from '@/lib/collector';
import { checkPaywall } from '@/lib/paywall';
import { matchArticlesForUser } from '@/lib/matcher';
import { buildDigestForUser } from '@/lib/digest-builder';
import { renderHtml, renderPlainText, buildSubject } from '@/lib/email/template';
import { sendDigestEmail } from '@/lib/email/sender';
import { createEmailTokens } from '@/lib/tokens';
import { computeNextSendFromRrule } from '@/lib/rrule';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const log: string[] = [];

  try {
    // Step 1: Collect articles from RSS feeds
    log.push('Starting source collection...');
    const { collected, errors } = await collectSources();
    log.push(`Collected ${collected} articles. Errors: ${errors.length}`);

    // Step 2: Find users due for digest
    const now = new Date();
    const dueUsers = await prisma.user.findMany({
      where: {
        profile: {
          emailEnabled: true,
          paused: false,
        },
        schedule: {
          nextSendAt: { lte: now },
        },
      },
      include: {
        profile: true,
        schedule: true,
      },
    });

    log.push(`Found ${dueUsers.length} users due for digest`);

    for (const user of dueUsers) {
      try {
        // Step 2a: Check paywall on recent articles
        const recentArticles = await prisma.article.findMany({
          where: {
            accessStatus: 'unknown',
            fetchedAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) },
          },
          take: 50,
        });

        for (const article of recentArticles) {
          await checkPaywall(article.id, article.canonicalUrl);
        }

        // Step 3: Match articles to user interests
        await matchArticlesForUser(user.id);

        // Step 4: Build digest
        const runDate = new Date();
        const digestResult = await buildDigestForUser(user.id, runDate);

        if (!digestResult || digestResult.totalItems === 0) {
          log.push(`No matching articles for ${user.email}, skipping`);
          // Still update next_send_at
          if (user.schedule) {
            const nextSendAt = computeNextSendFromRrule(user.schedule.rrule);
            await prisma.schedule.update({
              where: { id: user.schedule.id },
              data: { nextSendAt },
            });
          }
          continue;
        }

        // Step 5: Pre-generate digestId and tokens, then render email
        const digestId = randomUUID();
        const tokens = await createEmailTokens(user.id);
        const subject = buildSubject(runDate);
        const showStrapline = process.env.EMAIL_SHOW_STRAPLINE === 'true';
        const feedbackEnabled = process.env.FEEDBACK_ENABLED === 'true';

        const templateData = {
          date: runDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          weekday: runDate.toLocaleDateString('en-US', { weekday: 'long' }),
          sections: digestResult.sections,
          prefsUrl: tokens.prefsUrl,
          pauseUrl: tokens.pauseUrl,
          unsubscribeUrl: tokens.unsubscribeUrl,
          showStrapline,
          ...(feedbackEnabled && {
            feedbackBaseUrl: tokens.feedbackBaseUrl,
            digestId,
          }),
        };

        const html = renderHtml(templateData);
        const text = renderPlainText(templateData);

        // Store digest with pre-generated ID
        await prisma.digest.create({
          data: {
            id: digestId,
            userId: user.id,
            runDate,
            subject,
            html,
            text,
          },
        });

        // Step 6: Send email
        await sendDigestEmail({
          userId: user.id,
          to: user.email,
          subject,
          html,
          text,
          digestId,
        });

        // Step 7: Update next_send_at
        if (user.schedule) {
          const nextSendAt = computeNextSendFromRrule(user.schedule.rrule);
          await prisma.schedule.update({
            where: { id: user.schedule.id },
            data: { nextSendAt },
          });
        }

        log.push(`Sent digest to ${user.email} (${digestResult.totalItems} items)`);
      } catch (err) {
        log.push(
          `Error processing ${user.email}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    console.error('Pipeline error:', err);
    return NextResponse.json(
      { ok: false, error: String(err), log },
      { status: 500 }
    );
  }
}
