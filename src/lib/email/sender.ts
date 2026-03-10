import { Resend } from 'resend';
import { prisma } from '../db';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendEmailOptions {
  userId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  digestId: string;
}

export async function sendDigestEmail(options: SendEmailOptions): Promise<boolean> {
  const from = process.env.EMAIL_FROM || 'Your Briefing <briefing@yourdomain.com>';

  try {
    await getResend().emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    await prisma.emailEvent.create({
      data: {
        userId: options.userId,
        digestId: options.digestId,
        type: 'sent',
      },
    });

    return true;
  } catch (err) {
    console.error(
      `Failed to send email to ${options.to}:`,
      err instanceof Error ? err.message : err
    );

    await prisma.emailEvent.create({
      data: {
        userId: options.userId,
        digestId: options.digestId,
        type: 'bounced',
        payload: { error: err instanceof Error ? err.message : String(err) },
      },
    });

    return false;
  }
}
