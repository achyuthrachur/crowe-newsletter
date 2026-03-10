import { prisma } from './db';

const PAYWALL_MARKERS = [
  'subscribe to continue',
  'sign in to read',
  'create a free account',
  'this content is for subscribers',
  'premium content',
  'paywall',
  'subscription required',
  'register to read',
  'log in to access',
  'members only',
];

export async function checkPaywall(articleId: string, url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsDigest/1.0)',
      },
    });

    clearTimeout(timeout);

    // 401/403 = paywalled
    if (response.status === 401 || response.status === 403) {
      await prisma.article.update({
        where: { id: articleId },
        data: { accessStatus: 'paywalled' },
      });
      return 'paywalled';
    }

    // Check for login redirects
    const finalUrl = response.url;
    if (
      finalUrl.includes('/login') ||
      finalUrl.includes('/signin') ||
      finalUrl.includes('/subscribe') ||
      finalUrl.includes('/registration')
    ) {
      await prisma.article.update({
        where: { id: articleId },
        data: { accessStatus: 'paywalled' },
      });
      return 'paywalled';
    }

    // If HEAD succeeded, do a GET to check content
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) < 5000) {
      // Small content — do a GET to check for paywall markers
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsDigest/1.0)',
        },
      });
      const body = await getResponse.text();
      const bodyLower = body.toLowerCase();

      if (PAYWALL_MARKERS.some((marker) => bodyLower.includes(marker))) {
        await prisma.article.update({
          where: { id: articleId },
          data: { accessStatus: 'paywalled' },
        });
        return 'paywalled';
      }
    }

    // Mark as OK
    await prisma.article.update({
      where: { id: articleId },
      data: { accessStatus: 'ok' },
    });
    return 'ok';
  } catch {
    // On timeout or network error, mark as blocked
    await prisma.article.update({
      where: { id: articleId },
      data: { accessStatus: 'blocked' },
    });
    return 'blocked';
  }
}
