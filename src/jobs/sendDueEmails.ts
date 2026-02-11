import { prisma } from '@/lib/db';
import { createTokenSet } from '@/lib/auth';
import { hasTimeRemaining } from '@/lib/utils';
import { logDailyTick } from '@/lib/logger';
import { sendEmail } from '@/services/email/sender';
import { computeNextSendFromRrule } from '@/lib/rrule';
import type { SendEmailsResult } from '@/types';

/**
 * Send digest emails to users whose schedule says it's time.
 * Finds the most recent unsent digest for each due user and sends it.
 */
export async function sendDueEmails(opts: {
  maxDuration: number;
}): Promise<SendEmailsResult> {
  const startTime = Date.now();
  const { maxDuration } = opts;
  let emailsSent = 0;
  let errors = 0;

  const now = new Date();

  // Find users due for email delivery
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
      schedule: true,
    },
  });

  for (const user of dueUsers) {
    if (!hasTimeRemaining(startTime, maxDuration, 3000)) break;

    try {
      // Find most recent digest that hasn't been sent
      const digest = await prisma.digest.findFirst({
        where: {
          userId: user.id,
          emailEvents: {
            none: { type: 'sent' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!digest) {
        // No unsent digest, just advance the schedule
        if (user.schedule) {
          const nextSendAt = computeNextSendFromRrule(user.schedule.rrule);
          await prisma.schedule.update({
            where: { id: user.schedule.id },
            data: { nextSendAt },
          });
        }
        continue;
      }

      // Generate fresh auth tokens for email links
      const tokens = await createTokenSet(user.id);
      void tokens; // Tokens are already embedded in the digest HTML at build time

      // Send the email
      await sendEmail({
        to: user.email,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      });

      // Record sent event
      await prisma.emailEvent.create({
        data: {
          userId: user.id,
          digestId: digest.id,
          type: 'sent',
        },
      });

      emailsSent++;

      // Advance nextSendAt
      if (user.schedule) {
        const nextSendAt = computeNextSendFromRrule(user.schedule.rrule);
        await prisma.schedule.update({
          where: { id: user.schedule.id },
          data: { nextSendAt },
        });
      }
    } catch (error) {
      errors++;
      logDailyTick('send_email_error', {
        userId: user.id.slice(0, 8),
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  return {
    emailsSent,
    errors,
    elapsed: Date.now() - startTime,
  };
}
