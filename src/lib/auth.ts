import { createHash, randomBytes } from 'crypto';
import { prisma } from './db';

export async function createAuthToken(
  userId: string,
  scope: 'prefs' | 'pause' | 'unsubscribe'
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const expiresAt = new Date();
  if (scope === 'unsubscribe') {
    expiresAt.setDate(expiresAt.getDate() + 90);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 14);
  }

  await prisma.authToken.create({
    data: { userId, tokenHash, scope, expiresAt },
  });

  return token;
}

export async function createTokenSet(
  userId: string
): Promise<{ prefs: string; pause: string; unsubscribe: string }> {
  const [prefs, pause, unsubscribe] = await Promise.all([
    createAuthToken(userId, 'prefs'),
    createAuthToken(userId, 'pause'),
    createAuthToken(userId, 'unsubscribe'),
  ]);
  return { prefs, pause, unsubscribe };
}

export async function validateAuthToken(
  token: string,
  requiredScope: string
): Promise<string | null> {
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const authToken = await prisma.authToken.findUnique({
    where: { tokenHash },
  });

  if (!authToken) return null;
  if (authToken.scope !== requiredScope) return null;
  if (authToken.expiresAt < new Date()) return null;

  return authToken.userId;
}
