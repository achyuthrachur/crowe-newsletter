import { Resend } from 'resend';
import { assertResendSuccess } from '@/lib/email/resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'Newsletter Distribution Agent <no-reply@yourdomain.com>';

  const response = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  assertResendSuccess(response, `send email to ${options.to}`);
}
