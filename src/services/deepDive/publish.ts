import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { prisma } from '@/lib/db';
import { createTokenSet } from '@/lib/auth';
import { logDeepDive } from '@/lib/logger';
import { renderDeepDiveEmail } from '@/services/email/templates/deepDive';
import { sendEmail } from '@/services/email/sender';
import { parseReportMarkdown } from './synthesize';
import { toJson, fromJson, type DeepDiveState } from '@/types';

/**
 * PUBLISH stage: Save report to DB and send email.
 *
 * 1. Get the synthesized markdown from job state
 * 2. Convert to safe HTML
 * 3. Create deep_dive_reports record
 * 4. Generate auth tokens for email footer links
 * 5. Build and send email via Resend
 * 6. Update job status to complete
 */
export async function publishReport(jobId: string): Promise<void> {
  const job = await prisma.deepDiveJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      user: {
        include: { profile: true },
      },
      report: true,
    },
  });

  // Skip if report already published
  if (job.report) {
    await prisma.deepDiveJob.update({
      where: { id: jobId },
      data: { status: 'complete' },
    });
    return;
  }

  const state = fromJson(job.state);
  const markdown = state.synthesis?.partialMarkdown;

  if (!markdown) {
    await prisma.deepDiveJob.update({
      where: { id: jobId },
      data: { status: 'failed' },
    });
    logDeepDive({
      jobId,
      userId: job.userId,
      stage: 'PUBLISH',
      status: 'failed',
      error: 'No markdown in state',
    });
    return;
  }

  // Check weekly cap: max 1 deep dive per user per week
  const interest = await prisma.interest.findUnique({
    where: { id: job.topicInterestId },
  });
  const topicLabel = interest?.label ?? 'Deep Dive';

  // Build subject line
  const now = new Date();
  const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const subject = `Deep Dive — ${topicLabel} — ${monthDay}`;

  // Convert markdown to safe HTML
  const rawHtml = await marked(markdown);
  const safeHtml = DOMPurify.sanitize(rawHtml);

  // Create report record
  const report = await prisma.deepDiveReport.create({
    data: {
      jobId,
      subject,
      markdown,
      html: safeHtml,
    },
  });

  // Generate auth tokens for email footer
  const tokens = await createTokenSet(job.userId);
  const appHost = process.env.APP_HOST || 'http://localhost:3000';

  // Parse report for email template
  const reportData = parseReportMarkdown(markdown);

  // Build email HTML
  const emailHtml = renderDeepDiveEmail(reportData, tokens, appHost, subject, monthDay);

  // Send email
  const user = job.user;
  if (user.profile?.emailEnabled && !user.profile?.paused) {
    try {
      await sendEmail({
        to: user.email,
        subject,
        html: emailHtml,
      });

      await prisma.emailEvent.create({
        data: {
          userId: user.id,
          type: 'sent',
          payload: { type: 'deep_dive', reportId: report.id },
        },
      });

      logDeepDive({
        jobId,
        userId: job.userId,
        stage: 'PUBLISH',
        status: 'sent',
      });
    } catch (error) {
      logDeepDive({
        jobId,
        userId: job.userId,
        stage: 'PUBLISH',
        status: 'send_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update job status
  const finalStatus = job.status === 'partial' ? 'partial' : 'complete';
  const finalState: DeepDiveState = {
    ...state,
    publish: { reportId: report.id, emailSent: true },
  };

  await prisma.deepDiveJob.update({
    where: { id: jobId },
    data: { status: finalStatus, state: toJson(finalState) },
  });
}
