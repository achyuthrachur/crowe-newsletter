import type { DeepDiveReportData, AuthTokenSet } from '@/types';

/**
 * Render the deep dive email as inline-styled HTML.
 * - Font: Arial/Helvetica only (email-safe)
 * - Colors: Crowe Indigo #002D62, Amber #FDB913
 * - Inline styles only (no external CSS)
 */
export function renderDeepDiveEmail(
  report: DeepDiveReportData,
  tokens: AuthTokenSet,
  appHost: string,
  subject: string,
  dateLabel: string
): string {
  const prefsUrl = `${appHost}/prefs?token=${tokens.prefs}`;
  const pauseUrl = `${appHost}/api/pause?token=${tokens.pause}`;
  const unsubscribeUrl = `${appHost}/api/unsubscribe?token=${tokens.unsubscribe}`;

  const bulletList = (items: string[]) =>
    items
      .map(
        (item) =>
          `<li style="margin-bottom: 10px; line-height: 1.6; color: #333333;">${escapeHtml(item)}</li>`
      )
      .join('');

  const sourcesList = report.sources
    .map(
      (s, i) =>
        `<li style="margin-bottom: 10px; line-height: 1.6;">
          <a href="${escapeHtml(s.url)}" style="color: #FDB913; text-decoration: none; font-weight: bold;">${escapeHtml(s.title)}</a>
          <span style="color: #828282; font-size: 13px;"> &mdash; ${escapeHtml(s.source)}${s.date ? `, ${escapeHtml(s.date)}` : ''}</span>
        </li>`
    )
    .join('');

  const strapline = process.env.EMAIL_SHOW_STRAPLINE === 'true'
    ? `<p style="margin: 0 0 24px; font-size: 14px; color: #4F4F4F; font-style: italic;">Smart decisions. Lasting value.</p>`
    : '';

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
              <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: bold; line-height: 1.3;">${escapeHtml(report.headline)}</h1>
              <p style="margin: 8px 0 0; color: #BDBDBD; font-size: 14px;">Deep Dive &mdash; ${escapeHtml(dateLabel)}</p>
            </td>
          </tr>

          ${strapline ? `<tr><td style="padding: 24px 40px 0;">${strapline}</td></tr>` : ''}

          <!-- What Happened -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <h2 style="margin: 0 0 16px; color: #002D62; font-size: 20px; font-weight: bold; border-bottom: 2px solid #FDB913; padding-bottom: 8px;">What Happened</h2>
              <ul style="margin: 0; padding-left: 24px;">
                ${bulletList(report.whatHappened)}
              </ul>
            </td>
          </tr>

          <!-- What Changed -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <h2 style="margin: 0 0 16px; color: #002D62; font-size: 20px; font-weight: bold; border-bottom: 2px solid #FDB913; padding-bottom: 8px;">What Changed</h2>
              <ul style="margin: 0; padding-left: 24px;">
                ${bulletList(report.whatChanged)}
              </ul>
            </td>
          </tr>

          <!-- Why It Matters -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFF9E6; border-radius: 6px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px; color: #002D62; font-size: 20px; font-weight: bold;">Why It Matters</h2>
                    <ul style="margin: 0; padding-left: 24px;">
                      ${bulletList(report.whyItMatters)}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Risks / Watch-outs -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <h2 style="margin: 0 0 16px; color: #002D62; font-size: 20px; font-weight: bold; border-bottom: 2px solid #FDB913; padding-bottom: 8px;">Risks / Watch-outs</h2>
              <ul style="margin: 0; padding-left: 24px;">
                ${bulletList(report.risks)}
              </ul>
            </td>
          </tr>

          <!-- Action Prompts -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #002D62; border-radius: 6px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 16px; color: #FDB913; font-size: 20px; font-weight: bold;">Action Prompts</h2>
                    <ul style="margin: 0; padding-left: 24px;">
                      ${report.actionPrompts
                        .map(
                          (item) =>
                            `<li style="margin-bottom: 10px; line-height: 1.6; color: #FFFFFF;">${escapeHtml(item)}</li>`
                        )
                        .join('')}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sources -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <h2 style="margin: 0 0 16px; color: #002D62; font-size: 20px; font-weight: bold; border-bottom: 2px solid #E0E0E0; padding-bottom: 8px;">Sources</h2>
              <ol style="margin: 0; padding-left: 24px;">
                ${sourcesList}
              </ol>
            </td>
          </tr>

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
                You're receiving this because you enabled weekly deep dives.
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
