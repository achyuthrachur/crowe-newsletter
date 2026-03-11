import type { AuthTokenSet, DigestData } from '@/types';
import { flags } from '@/lib/flags';
import { buildEmailUrls } from '@/lib/tokens';

/**
 * Render the daily digest email as inline-styled HTML.
 * Editorial newspaper format — masthead strip, feature article, section dividers.
 * All styles are inline for email client compatibility.
 */
export function renderDigestEmail(
  digest: DigestData,
  tokens: AuthTokenSet,
  appHost: string,
  subject: string,
  greeting?: string
): string {
  const { prefsUrl, pauseUrl, unsubscribeUrl, readerUrl } = buildEmailUrls(appHost, tokens);

  const greetingLine = digest.greeting ?? greeting ?? '';
  const allArticles = digest.sections.flatMap((s) => s.articles);
  const leadArticle = allArticles[0];
  const restSections = digest.sections
    .map((sec, si) => ({
      ...sec,
      articles: si === 0 ? sec.articles.slice(1) : sec.articles,
    }))
    .filter((sec) => sec.articles.length > 0);

  const leadHtml = leadArticle
    ? renderLeadArticle(leadArticle, tokens.prefs, appHost)
    : '';

  const sectionsHtml = restSections
    .map((section) => renderSection(section, tokens, appHost))
    .join('');

  // Preheader text (hidden preview text)
  const preheader = `Your Crowe Intelligence Briefing — ${digest.dateLabel}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F8FA; font-family: Arial, Helvetica, sans-serif;">

  <!-- Preheader (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; color: #F7F8FA; line-height: 1px;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F7F8FA;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" style="max-width: 680px;">

          <!-- ═══ MASTHEAD ═══ -->
          <tr>
            <td style="background-color: #011E41; padding: 0;">
              <!-- Top amber rule -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="height: 3px; background-color: #F5A800; font-size: 0; line-height: 0;">&nbsp;</td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 18px 32px 6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td>
                          <span style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #F5A800; letter-spacing: 0.25em; text-transform: uppercase;">CROWE INTELLIGENCE</span>
                        </td>
                        <td align="right">
                          <span style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #828282;">${escapeHtml(digest.dateLabel)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="height: 1px; background-color: rgba(245,168,0,0.4); font-size: 0; line-height: 0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
                ${greetingLine ? `
                <tr>
                  <td style="padding: 8px 32px 18px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #BDBDBD; font-style: italic;">${escapeHtml(greetingLine)}</p>
                  </td>
                </tr>` : `<tr><td style="height: 18px;"></td></tr>`}
              </table>
            </td>
          </tr>

          <!-- ═══ CONTENT ═══ -->
          <tr>
            <td style="background-color: #FFFFFF; border-radius: 0 0 12px 12px; overflow: hidden; border: 1px solid #E0E0E0; border-top: none;">

              <!-- Lead article -->
              ${leadHtml}

              <!-- Rest sections -->
              ${sectionsHtml}

              <!-- View in browser link -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 8px 32px 24px; text-align: center;">
                    <a href="${escapeHtml(readerUrl)}" style="font-family: Arial; font-size: 12px; color: #828282; text-decoration: none;">
                      View this briefing in your browser →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ═══ FOOTER ═══ -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td style="height: 1px; background-color: #E0E0E0; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 32px; text-align: center;">
                    <p style="margin: 0 0 10px; font-family: Arial; font-size: 12px; color: #828282;">
                      <a href="${escapeHtml(prefsUrl)}" style="color: #F5A800; text-decoration: none; font-weight: bold;">Update preferences</a>
                      &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                      <a href="${escapeHtml(pauseUrl)}" style="color: #828282; text-decoration: none;">Pause emails</a>
                      &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                      <a href="${escapeHtml(unsubscribeUrl)}" style="color: #828282; text-decoration: none;">Unsubscribe</a>
                    </p>
                    <p style="margin: 0; font-family: Arial; font-size: 11px; color: #BDBDBD;">
                      Smart decisions. Lasting value. &nbsp;&middot;&nbsp; Crowe LLP AI Innovation Team
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderLeadArticle(
  article: { articleId: string; title: string; url: string; sourceName: string; snippet: string; whyItMatters?: string; interestSection?: string },
  prefsToken: string,
  appHost: string
): string {
  const whyItMattersHtml = article.whyItMatters
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 10px;">
                    <tr>
                      <td style="border-left: 3px solid #F5A800; padding-left: 10px;">
                        <p style="margin: 0; font-family: Arial; font-size: 13px; color: #002E62; font-style: italic; line-height: 1.5;">
                          <strong style="font-style: normal;">Why it matters:</strong> ${escapeHtml(article.whyItMatters)}
                        </p>
                      </td>
                    </tr>
                  </table>`
    : '';

  const feedbackHtml = flags.feedbackEnabled
    ? renderFeedbackLinks(article.articleId, prefsToken, appHost)
    : '';

  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 28px 32px 20px; border-left: 5px solid #F5A800;">
                    ${article.interestSection ? `<p style="margin: 0 0 8px; font-family: Arial; font-size: 10px; font-weight: bold; color: #011E41; text-transform: uppercase; letter-spacing: 0.2em; background-color: #F5A800; padding: 3px 8px; display: inline-block; border-radius: 3px;">${escapeHtml(article.interestSection)}</p>` : ''}
                    <h2 style="margin: 0 0 6px; font-family: Arial; font-size: 20px; font-weight: bold; line-height: 1.3;">
                      <a href="${escapeHtml(article.url)}" style="color: #002E62; text-decoration: none;">${escapeHtml(article.title)}</a>
                    </h2>
                    <p style="margin: 0 0 8px; font-family: Arial; font-size: 12px; color: #828282;">${escapeHtml(article.sourceName)}</p>
                    ${article.snippet ? `<p style="margin: 0; font-family: Arial; font-size: 14px; color: #4F4F4F; line-height: 1.6;">${escapeHtml(article.snippet)}</p>` : ''}
                    ${whyItMattersHtml}
                    ${feedbackHtml}
                  </td>
                </tr>
              </table>`;
}

function renderSection(
  section: { section: string; articles: Array<{ articleId: string; title: string; url: string; sourceName: string; snippet: string; score: number; whyItMatters?: string }> },
  tokens: AuthTokenSet,
  appHost: string
): string {
  if (section.articles.length === 0) return '';

  const articlesHtml = section.articles
    .map((article) => renderArticle(article, tokens, appHost))
    .join('');

  return `
              <!-- Section divider: ${escapeHtml(section.section)} -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 20px 32px 4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="border-top: 1px solid #E0E0E0; padding-top: 16px; text-align: center;">
                          <span style="font-family: Arial; font-size: 10px; font-weight: bold; color: #828282; text-transform: uppercase; letter-spacing: 0.18em;">&mdash;&nbsp; ${escapeHtml(section.section)} &nbsp;&mdash;</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${articlesHtml}`;
}

function renderArticle(
  article: { articleId: string; title: string; url: string; sourceName: string; snippet: string; whyItMatters?: string },
  tokens: AuthTokenSet,
  appHost: string
): string {
  const feedbackHtml = flags.feedbackEnabled
    ? renderFeedbackLinks(article.articleId, tokens.prefs, appHost)
    : '';

  const whyItMattersHtml = article.whyItMatters
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 8px;">
                      <tr>
                        <td style="border-left: 2px solid rgba(245,168,0,0.6); padding-left: 8px;">
                          <p style="margin: 0; font-family: Arial; font-size: 13px; color: #002E62; font-style: italic; line-height: 1.5;">
                            <strong style="font-style: normal;">Why it matters:</strong> ${escapeHtml(article.whyItMatters)}
                          </p>
                        </td>
                      </tr>
                    </table>`
    : '';

  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 14px 32px;">
                    <h3 style="margin: 0 0 4px; font-family: Arial; font-size: 16px; font-weight: bold; line-height: 1.35;">
                      <a href="${escapeHtml(article.url)}" style="color: #002E62; text-decoration: none;">${escapeHtml(article.title)}</a>
                    </h3>
                    <p style="margin: 0 0 6px; font-family: Arial; font-size: 12px; color: #828282;">${escapeHtml(article.sourceName)}</p>
                    ${article.snippet ? `<p style="margin: 0; font-family: Arial; font-size: 14px; color: #4F4F4F; line-height: 1.55;">${escapeHtml(article.snippet)}</p>` : ''}
                    ${whyItMattersHtml}
                    ${feedbackHtml}
                  </td>
                </tr>
              </table>`;
}

function renderFeedbackLinks(articleId: string, prefsToken: string, appHost: string): string {
  const upUrl = `${appHost}/api/feedback?token=${prefsToken}&action=upvote&articleId=${articleId}`;
  const downUrl = `${appHost}/api/feedback?token=${prefsToken}&action=downvote&articleId=${articleId}`;
  const dismissUrl = `${appHost}/api/feedback?token=${prefsToken}&action=dismiss&articleId=${articleId}`;

  return `
                    <p style="margin: 8px 0 0; font-family: Arial; font-size: 12px;">
                      <a href="${escapeHtml(upUrl)}" style="color: #05AB8C; text-decoration: none; margin-right: 14px;">&#x1F44D; Helpful</a>
                      <a href="${escapeHtml(downUrl)}" style="color: #828282; text-decoration: none; margin-right: 14px;">&#x1F44E; Not relevant</a>
                      <a href="${escapeHtml(dismissUrl)}" style="color: #828282; text-decoration: none;">&#x1F6AB; Hide this</a>
                    </p>`;
}

/**
 * Render a plain-text version of the digest.
 */
export function renderDigestText(digest: DigestData, greeting?: string): string {
  const lines: string[] = [];
  lines.push('CROWE INTELLIGENCE');
  lines.push(`${digest.dateLabel}`);
  lines.push('─'.repeat(48));

  const greetingLine = digest.greeting ?? greeting;
  if (greetingLine) {
    lines.push(`\n${greetingLine}\n`);
  }

  for (const section of digest.sections) {
    lines.push(`\n── ${section.section} ──────────────────────────\n`);
    for (const article of section.articles) {
      lines.push(`${article.title}`);
      lines.push(`${article.sourceName} | ${article.url}`);
      if (article.snippet) lines.push(article.snippet);
      if (article.whyItMatters) lines.push(`Why it matters: ${article.whyItMatters}`);
      lines.push('');
    }
  }

  lines.push('\n─'.repeat(48));
  lines.push('Smart decisions. Lasting value. · Crowe LLP AI Innovation Team');

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
