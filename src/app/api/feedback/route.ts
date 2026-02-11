import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { validateAuthToken } from '@/lib/auth';
import type { FeedbackRating } from '@/types';

const VALID_RATINGS: FeedbackRating[] = ['up', 'down'];

/**
 * GET /api/feedback?token=...&articleId=...&rating=up|down
 * For email link clicks (emails can't POST).
 * Returns a minimal HTML "Thanks" page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const articleId = request.nextUrl.searchParams.get('articleId');
  const rating = request.nextUrl.searchParams.get('rating') as FeedbackRating | null;

  if (!token || !articleId || !rating) {
    return new Response(renderPage('Missing required parameters.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!VALID_RATINGS.includes(rating)) {
    return new Response(renderPage('Invalid rating. Use "up" or "down".', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const userId = await validateAuthToken(token, 'prefs');
  if (!userId) {
    return new Response(renderPage('Invalid or expired link.', false), {
      status: 401,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Verify article exists
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });
  if (!article) {
    return new Response(renderPage('Article not found.', false), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Upsert feedback (idempotent)
  await prisma.articleFeedback.upsert({
    where: { userId_articleId: { userId, articleId } },
    create: { userId, articleId, rating },
    update: { rating },
  });

  const message = rating === 'up'
    ? 'Thanks! We\'ll show you more like this.'
    : 'Got it. We\'ll adjust your recommendations.';

  return new Response(renderPage(message, true), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * POST /api/feedback — JSON API for future web UI.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const userId = await validateAuthToken(token, 'prefs');
  if (!userId) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const body = await request.json();
  const { articleId, rating } = body;

  if (!articleId || !rating || !VALID_RATINGS.includes(rating)) {
    return Response.json({ error: 'articleId and rating (up|down) required' }, { status: 400 });
  }

  await prisma.articleFeedback.upsert({
    where: { userId_articleId: { userId, articleId } },
    create: { userId, articleId, rating },
    update: { rating },
  });

  return Response.json({ ok: true, rating });
}

function renderPage(message: string, success: boolean): string {
  const color = success ? '#05AB8C' : '#E5376B';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F7F7; font-family: Arial, Helvetica, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
  <div style="background: #FFFFFF; padding: 48px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center; max-width: 400px;">
    <div style="font-size: 48px; margin-bottom: 16px;">${success ? '&#x2705;' : '&#x26A0;&#xFE0F;'}</div>
    <p style="font-size: 18px; color: ${color}; font-weight: bold; margin: 0 0 8px;">${escapeHtml(message)}</p>
    <p style="font-size: 14px; color: #828282; margin: 0;">You can close this tab.</p>
  </div>
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
