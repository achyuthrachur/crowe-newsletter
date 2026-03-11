import { Resend } from 'resend';
import { prisma } from '../db';
import { assertResendSuccess, getResendErrorMessage } from './resend';

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
    const response = await getResend().emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    assertResendSuccess(response, `send digest email to ${options.to}`);

    await prisma.emailEvent.create({
      data: {
        userId: options.userId,
        digestId: options.digestId,
        type: 'sent',
      },
    });

    return true;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : getResendErrorMessage(null);

    console.error(
      `Failed to send email to ${options.to}:`,
      message
    );

    await prisma.emailEvent.create({
      data: {
        userId: options.userId,
        digestId: options.digestId,
        type: 'bounced',
        payload: { error: message },
      },
    });

    return false;
  }
}
