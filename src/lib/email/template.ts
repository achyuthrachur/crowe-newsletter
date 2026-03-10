interface DigestItem {
  title: string;
  url: string;
  summary: string;
  whyItMatters: string;
  sourceName: string;
  publishedAt: Date | null;
  whyYouGotThis?: string;
  articleId?: string;
  interestId?: string;
}

interface DigestSection {
  name: string;
  items: DigestItem[];
}

interface TemplateData {
  date: string;
  weekday: string;
  sections: DigestSection[];
  prefsUrl: string;
  pauseUrl: string;
  unsubscribeUrl: string;
  showStrapline: boolean;
  feedbackBaseUrl?: string;
  digestId?: string;
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFeedbackUrl(
  baseUrl: string,
  action: string,
  articleId: string,
  digestId?: string,
  interestId?: string
): string {
  let url = `${baseUrl}&action=${action}&articleId=${articleId}`;
  if (digestId) url += `&digestId=${digestId}`;
  if (interestId) url += `&interestId=${interestId}`;
  return url;
}

function renderFeedbackButtons(
  item: DigestItem,
  feedbackBaseUrl: string,
  digestId?: string
): string {
  const upvoteUrl = buildFeedbackUrl(feedbackBaseUrl, 'upvote', item.articleId!, digestId, item.interestId);
  const downvoteUrl = buildFeedbackUrl(feedbackBaseUrl, 'downvote', item.articleId!, digestId, item.interestId);
  const dismissUrl = buildFeedbackUrl(feedbackBaseUrl, 'dismiss', item.articleId!);

  return `
              <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 8px;">
                <tr>
                  <td style="padding-right: 6px;">
                    <a href="${escapeHtml(upvoteUrl)}" style="display: inline-block; padding: 4px 10px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #4F4F4F; background-color: #f7f7f7; border: 1px solid #E0E0E0; border-radius: 4px; text-decoration: none; line-height: 1.4;">&#128077; Relevant</a>
                  </td>
                  <td style="padding-right: 6px;">
                    <a href="${escapeHtml(downvoteUrl)}" style="display: inline-block; padding: 4px 10px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #4F4F4F; background-color: #f7f7f7; border: 1px solid #E0E0E0; border-radius: 4px; text-decoration: none; line-height: 1.4;">&#128078; Not relevant</a>
                  </td>
                  <td>
                    <a href="${escapeHtml(dismissUrl)}" style="display: inline-block; padding: 4px 10px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #4F4F4F; background-color: #f7f7f7; border: 1px solid #E0E0E0; border-radius: 4px; text-decoration: none; line-height: 1.4;">&#128683; Hide this</a>
                  </td>
                </tr>
              </table>`;
}

export function renderHtml(data: TemplateData): string {
  const hasFeedback = !!data.feedbackBaseUrl;

  const itemsHtml = data.sections
    .map(
      (section) => `
    <tr>
      <td style="padding: 24px 32px 8px 32px;">
        <h2 style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #002D62; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #FDB913; padding-bottom: 8px;">
          ${escapeHtml(section.name)}
        </h2>
      </td>
    </tr>
    ${section.items
      .map(
        (item) => `
    <tr>
      <td style="padding: 12px 32px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding: 16px; background-color: #f7f7f7; border-radius: 8px;">
              <a href="${escapeHtml(item.url)}" style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #002D62; text-decoration: none; line-height: 1.4;">
                ${escapeHtml(item.title)}
              </a>
              <p style="margin: 8px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; line-height: 1.5;">
                ${escapeHtml(item.summary)}
              </p>
              <p style="margin: 8px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #4F4F4F; line-height: 1.5;">
                <strong style="color: #002D62;">Why it matters:</strong> ${escapeHtml(item.whyItMatters)}
              </p>${item.whyYouGotThis ? `
              <p style="margin: 6px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #828282; font-style: italic;">
                ${escapeHtml(item.whyYouGotThis)}
              </p>` : ''}
              <p style="margin: 8px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #828282;">
                ${escapeHtml(item.sourceName)}${item.publishedAt ? ` &middot; ${formatDate(item.publishedAt)}` : ''}
              </p>${hasFeedback && item.articleId ? renderFeedbackButtons(item, data.feedbackBaseUrl!, data.digestId) : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
      )
      .join('')}`
    )
    .join('');

  const strapline = data.showStrapline
    ? `<tr>
        <td style="padding: 16px 32px 0 32px; text-align: center;">
          <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #002D62;">
            Smart decisions. Lasting value.
          </p>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Briefing — ${data.weekday}, ${data.date}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f0f0; -webkit-font-smoothing: antialiased;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f0f0;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #011E41; padding: 24px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: #ffffff;">
                    Your Briefing
                  </td>
                  <td align="right" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #BDBDBD;">
                    ${escapeHtml(data.weekday)}, ${escapeHtml(data.date)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          ${itemsHtml}

          ${strapline}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #E0E0E0; margin-top: 16px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #828282; line-height: 1.6;">
                    <a href="${escapeHtml(data.prefsUrl)}" style="color: #FDB913; text-decoration: underline;">Update preferences</a>
                    &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                    <a href="${escapeHtml(data.pauseUrl)}" style="color: #FDB913; text-decoration: underline;">Pause emails</a>
                    &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                    <a href="${escapeHtml(data.unsubscribeUrl)}" style="color: #FDB913; text-decoration: underline;">Unsubscribe</a>
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

export function renderPlainText(data: TemplateData): string {
  const hasFeedback = !!data.feedbackBaseUrl;

  let text = `YOUR BRIEFING — ${data.weekday}, ${data.date}\n`;
  text += '='.repeat(50) + '\n\n';

  for (const section of data.sections) {
    text += `${section.name.toUpperCase()}\n`;
    text += '-'.repeat(30) + '\n\n';

    for (const item of section.items) {
      text += `${item.title}\n`;
      text += `${item.url}\n\n`;
      text += `${item.summary}\n\n`;
      text += `Why it matters: ${item.whyItMatters}\n\n`;
      if (item.whyYouGotThis) {
        text += `Why you got this: ${item.whyYouGotThis}\n\n`;
      }
      text += `${item.sourceName}${item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ''}\n`;

      if (hasFeedback && item.articleId) {
        const upvoteUrl = buildFeedbackUrl(data.feedbackBaseUrl!, 'upvote', item.articleId, data.digestId, item.interestId);
        const downvoteUrl = buildFeedbackUrl(data.feedbackBaseUrl!, 'downvote', item.articleId, data.digestId, item.interestId);
        const dismissUrl = buildFeedbackUrl(data.feedbackBaseUrl!, 'dismiss', item.articleId);
        text += `  [Relevant] ${upvoteUrl}\n`;
        text += `  [Not relevant] ${downvoteUrl}\n`;
        text += `  [Hide this] ${dismissUrl}\n`;
      }

      text += '\n';
    }
  }

  if (data.showStrapline) {
    text += 'Smart decisions. Lasting value.\n\n';
  }

  text += '-'.repeat(50) + '\n';
  text += `Update preferences: ${data.prefsUrl}\n`;
  text += `Pause emails: ${data.pauseUrl}\n`;
  text += `Unsubscribe: ${data.unsubscribeUrl}\n`;

  return text;
}

export function buildSubject(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  return `Your Briefing — ${weekday}, ${month} ${day}`;
}
