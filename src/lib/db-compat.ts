import { prisma } from './db';

let profileCapsColumnsReady: Promise<void> | null = null;

/**
 * Production is currently behind the Prisma schema on the Stage 4 profile caps
 * columns. Add them lazily so routes can recover without a manual migration
 * step from this environment.
 */
export async function ensureProfileCapsColumns(): Promise<void> {
  if (!profileCapsColumnsReady) {
    profileCapsColumnsReady = (async () => {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_items_total INTEGER DEFAULT 8'
      );
      await prisma.$executeRawUnsafe(
        'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_items_per_section INTEGER DEFAULT 3'
      );
    })().catch((error) => {
      profileCapsColumnsReady = null;
      throw error;
    });
  }

  await profileCapsColumnsReady;
}
