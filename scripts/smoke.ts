/**
 * Smoke test — validates DB connectivity, feature flags, user CRUD, tokens, sources.
 *
 * Usage:  npm run smoke          (requires DATABASE_URL in .env or environment)
 *         npx tsx scripts/smoke.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient({ log: ['error'] });

const TEST_EMAIL = `smoke-test-${Date.now()}@test.local`;
let pass = 0;
let fail = 0;

function ok(label: string) {
  pass++;
  console.log(`  [PASS] ${label}`);
}

function bad(label: string, err: unknown) {
  fail++;
  console.error(`  [FAIL] ${label}:`, err instanceof Error ? err.message : err);
}

async function main() {
  console.log('Smoke test starting...\n');

  // 1. DB connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    ok('DB connectivity');
  } catch (e) {
    bad('DB connectivity', e);
    console.error('\nCannot reach database — aborting.');
    process.exit(1);
  }

  // 2. Feature flags evaluate without error
  try {
    const flags = {
      websearch: process.env.WEBSEARCH_ENABLED === 'true',
      deepResearch: process.env.DEEP_RESEARCH_ENABLED === 'true',
      feedback: process.env.FEEDBACK_ENABLED === 'true',
      personalization: process.env.PERSONALIZATION_ENABLED === 'true',
    };
    console.log(`  Flags: ${JSON.stringify(flags)}`);
    ok('Feature flag evaluation');
  } catch (e) {
    bad('Feature flag evaluation', e);
  }

  // 3. User creation
  let userId: string | null = null;
  try {
    const user = await prisma.user.create({
      data: { email: TEST_EMAIL },
    });
    userId = user.id;
    ok(`User created (${user.id})`);
  } catch (e) {
    bad('User creation', e);
  }

  // 4. Token generation
  if (userId) {
    try {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      await prisma.authToken.create({
        data: { userId, tokenHash, scope: 'prefs', expiresAt },
      });

      const found = await prisma.authToken.findUnique({ where: { tokenHash } });
      if (found && found.scope === 'prefs') {
        ok('Token create + lookup');
      } else {
        bad('Token create + lookup', 'Token not found after creation');
      }
    } catch (e) {
      bad('Token generation', e);
    }
  }

  // 5. Source count
  try {
    const count = await prisma.source.count();
    console.log(`  Sources in DB: ${count}`);
    ok('Source count query');
  } catch (e) {
    bad('Source count query', e);
  }

  // 6. Cleanup test user (cascades tokens)
  if (userId) {
    try {
      await prisma.user.delete({ where: { id: userId } });
      ok('Test user cleanup');
    } catch (e) {
      bad('Test user cleanup', e);
    }
  }

  // Summary
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error('Smoke test crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
