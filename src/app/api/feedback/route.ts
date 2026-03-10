import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAuthToken } from '@/lib/auth';

const VALID_ACTIONS = ['upvote', 'downvote', 'dismiss', 'block_source'] as const;
type FeedbackAction = typeof VALID_ACTIONS[number];

const SUPPRESSION_DAYS = parseInt(process.env.SUPPRESSION_DAYS_DEFAULT ?? '14', 10);

/**
 * GET /api/feedback?token=...&action=upvote|downvote|dismiss|block_source
 *   &articleId=...&digestId=...&interestId=...&domain=...
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const token = sp.get('token');
  const action = sp.get('action') as FeedbackAction | null;
  const articleId = sp.get('articleId');
  const digestId = sp.get('digestId') ?? undefined;
  const interestId = sp.get('interestId') ?? undefined;
  const domain = sp.get('domain') ?? undefined;

  if (!token || !action || !articleId) {
    return html('Missing required parameters.', false, 400);
  }
  if (!VALID_ACTIONS.includes(action)) {
    return html('Invalid action.', false, 400);
  }
  if (action === 'block_source' && !domain) {
    return html('domain required for block_source action.', false, 400);
  }

  const userId = await validateAuthToken(token, 'prefs');
  if (!userId) {
    return html('Invalid or expired link.', false, 401);
  }

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    return html('Article not found.', false, 404);
  }

  // Record feedback event
  await prisma.feedbackEvent.create({
    data: { userId, articleId, digestId, interestId, action },
  });

  // Side effects
  if (action === 'dismiss') {
    const expiresAt = new Date(Date.now() + SUPPRESSION_DAYS * 24 * 60 * 60 * 1000);
    const titleHash = Buffer.from(article.title).toString('base64').slice(0, 32);
    await prisma.userStorySuppression.upsert({
      where: { userId_canonicalUrl: { userId, canonicalUrl: article.canonicalUrl } },
      create: { userId, canonicalUrl: article.canonicalUrl, titleHash, expiresAt },
      update: { expiresAt },
    });
  }

  if (action === 'block_source' && domain) {
    await prisma.userSourceBlock.upsert({
      where: { userId_domain: { userId, domain } },
      create: { userId, domain },
      update: {},
    });
  }

  const messages: Record<FeedbackAction, string> = {
    upvote: "Marked as relevant. We'll show you more like this.",
    downvote: "Got it. We'll adjust your recommendations.",
    dismiss: 'Story hidden for 14 days.',
    block_source: `${domain} blocked. You won't see articles from this source.`,
  };

  return html(messages[action], true, 200);
}

function html(message: string, success: boolean, status: number): Response {
  const color = success ? '#05AB8C' : '#E5376B';
  const icon = success ? '✅' : '⚠️';
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Feedback</title></head>
<body style="margin:0;padding:0;background:#F7F7F7;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="background:#fff;padding:48px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.06);text-align:center;max-width:400px;">
<div style="font-size:48px;margin-bottom:16px;">${icon}</div>
<p style="font-size:18px;color:${color};font-weight:bold;margin:0 0 8px;">${escHtml(message)}</p>
<p style="font-size:14px;color:#828282;margin:0;">You can close this tab.</p>
</div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  );
}

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
