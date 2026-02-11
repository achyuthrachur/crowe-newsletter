import type { AuthTokenSet, DigestData } from '@/types';
import { flags } from '@/lib/flags';

/**
 * Render the daily digest email as inline-styled HTML.
 * Follows the same pattern as deepDive.ts: table layout, inline CSS, Crowe branding.
 */
export function renderDigestEmail(
  digest: DigestData,
  tokens: AuthTokenSet,
  appHost: string,
  subject: string
): string {
  const prefsUrl = `${appHost}/prefs?token=${tokens.prefs}`;
  const pauseUrl = `${appHost}/api/pause?token=${tokens.pause}`;
  const unsubscribeUrl = `${appHost}/api/unsubscribe?token=${tokens.unsubscribe}`;

  const strapline = process.env.EMAIL_SHOW_STRAPLINE === 'true'
    ? `<p style="margin: 0 0 24px; font-size: 14px; color: #4F4F4F; font-style: italic;">Smart decisions. Lasting value.</p>`
    : '';

  const sectionsHtml = digest.sections
    .map((section) => renderSection(section, tokens, appHost))
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F7F7; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F7F7F7;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" style="max-width: 680px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #002D62;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: bold; line-height: 1.3;">Your Daily Briefing</h1>
              <p style="margin: 8px 0 0; color: #BDBDBD; font-size: 14px;">${escapeHtml(digest.dateLabel)} &mdash; ${digest.totalArticles} article${digest.totalArticles !== 1 ? 's' : ''}</p>
            </td>
          </tr>

          ${strapline ? `<tr><td style="padding: 24px 40px 0;">${strapline}</td></tr>` : ''}

          <!-- Sections -->
          ${sectionsHtml}

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #828282;">
                <a href="${escapeHtml(prefsUrl)}" style="color: #FDB913; text-decoration: none;">Update preferences</a>
                &nbsp;&bull;&nbsp;
                <a href="${escapeHtml(pauseUrl)}" style="color: #FDB913; text-decoration: none;">Pause emails</a>
                &nbsp;&bull;&nbsp;
                <a href="${escapeHtml(unsubscribeUrl)}" style="color: #FDB913; text-decoration: none;">Unsubscribe</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #BDBDBD;">
                You're receiving this because you subscribed to daily briefings.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderSection(
  section: { section: string; articles: Array<{ articleId: string; title: string; url: string; sourceName: string; snippet: string; score: number }> },
  tokens: AuthTokenSet,
  appHost: string
): string {
  const articlesHtml = section.articles
    .map((article) => renderArticle(article, tokens, appHost))
    .join('');

  return `
          <tr>
            <td style="padding: 32px 40px 8px;">
              <h2 style="margin: 0 0 16px; color: #002D62; font-size: 20px; font-weight: bold; border-bottom: 2px solid #FDB913; padding-bottom: 8px;">${escapeHtml(section.section)}</h2>
            </td>
          </tr>
          ${articlesHtml}`;
}

function renderArticle(
  article: { articleId: string; title: string; url: string; sourceName: string; snippet: string },
  tokens: AuthTokenSet,
  appHost: string
): string {
  const feedbackHtml = flags.feedbackEnabled
    ? renderFeedbackLinks(article.articleId, tokens.prefs, appHost)
    : '';

  return `
          <tr>
            <td style="padding: 0 40px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <a href="${escapeHtml(article.url)}" style="color: #002D62; text-decoration: none; font-size: 16px; font-weight: bold; line-height: 1.4;">${escapeHtml(article.title)}</a>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #828282;">${escapeHtml(article.sourceName)}</p>
                    ${article.snippet ? `<p style="margin: 8px 0 0; font-size: 14px; color: #333333; line-height: 1.5;">${escapeHtml(article.snippet)}</p>` : ''}
                    ${feedbackHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function renderFeedbackLinks(articleId: string, prefsToken: string, appHost: string): string {
  const upUrl = `${appHost}/api/feedback?token=${prefsToken}&articleId=${articleId}&rating=up`;
  const downUrl = `${appHost}/api/feedback?token=${prefsToken}&articleId=${articleId}&rating=down`;

  return `
                    <p style="margin: 8px 0 0; font-size: 12px;">
                      <a href="${escapeHtml(upUrl)}" style="color: #05AB8C; text-decoration: none; margin-right: 12px;">&#x1F44D; Helpful</a>
                      <a href="${escapeHtml(downUrl)}" style="color: #E5376B; text-decoration: none;">&#x1F44E; Not relevant</a>
                    </p>`;
}

/**
 * Render a plain-text version of the digest.
 */
export function renderDigestText(digest: DigestData): string {
  const lines: string[] = [];
  lines.push(`Your Daily Briefing - ${digest.dateLabel}`);
  lines.push(`${digest.totalArticles} articles\n`);

  for (const section of digest.sections) {
    lines.push(`--- ${section.section} ---\n`);
    for (const article of section.articles) {
      lines.push(`${article.title}`);
      lines.push(`${article.sourceName} | ${article.url}`);
      if (article.snippet) lines.push(article.snippet);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
