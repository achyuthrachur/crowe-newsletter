interface EmailActionPageOptions {
  title: string;
  message: string;
  tone?: 'success' | 'error';
}

export function renderEmailActionPage(options: EmailActionPageOptions): string {
  const tone = options.tone ?? 'success';
  const accent = tone === 'success' ? '#F5A800' : '#9F2D20';
  const body = tone === 'success' ? '#011E41' : '#3D1F1B';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F8FA; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="min-height: 100vh; background-color: #F7F8FA;">
    <tr>
      <td align="center" style="padding: 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E0E0E0;">
          <tr>
            <td style="background-color: ${body}; padding: 28px 36px;">
              <p style="margin: 0; font-size: 11px; font-weight: bold; letter-spacing: 0.24em; text-transform: uppercase; color: ${accent};">
                Crowe Intelligence
              </p>
              <h1 style="margin: 12px 0 0; font-size: 28px; line-height: 1.2; color: #FFFFFF;">
                ${escapeHtml(options.title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #4F4F4F;">
                ${escapeHtml(options.message)}
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
