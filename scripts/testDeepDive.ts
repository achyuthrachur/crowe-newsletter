/**
 * Manual test script for deep dive functionality.
 *
 * Usage:
 *   npx tsx scripts/testDeepDive.ts <user-email>
 *
 * This creates a test deep dive job and runs it through the state machine.
 * Requires a database with the user already created via /intake.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { deepDiveStep } from '../src/services/deepDive/orchestrator';
import type { DeepDiveState } from '../src/types';

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/testDeepDive.ts <user-email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      interests: true,
      deepDiveTopics: true,
      deepDiveConfig: true,
    },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log(`User: ${user.email} (${user.id})`);
  console.log(`Interests: ${user.interests.map((i) => i.label).join(', ')}`);
  console.log(`Deep dive config: ${JSON.stringify(user.deepDiveConfig)}`);
  console.log(`Deep dive topics: ${user.deepDiveTopics.map((t) => t.interestId).join(', ')}`);

  // Pick topic
  let topicInterestId: string;
  if (user.deepDiveTopics.length > 0) {
    topicInterestId = user.deepDiveTopics[0].interestId;
  } else if (user.interests.length > 0) {
    topicInterestId = user.interests[0].id;
  } else {
    console.error('No interests found. Add interests via /intake first.');
    process.exit(1);
  }

  const interest = user.interests.find((i) => i.id === topicInterestId);
  console.log(`\nCreating test job for topic: ${interest?.label ?? topicInterestId}`);

  // Create test job
  const job = await prisma.deepDiveJob.create({
    data: {
      userId: user.id,
      runWeek: new Date(), // Use today as the run week
      status: 'queued',
      topicInterestId,
      state: { stage: 'DISCOVER' } satisfies DeepDiveState,
    },
  });

  console.log(`Job created: ${job.id}\n`);

  // Run state machine until complete
  let attempts = 0;
  const maxAttempts = 6;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`--- Attempt ${attempts} ---`);

    const before = await prisma.deepDiveJob.findUnique({ where: { id: job.id } });
    const beforeState = before?.state as DeepDiveState;
    console.log(`  Stage: ${beforeState?.stage ?? 'unknown'}, Status: ${before?.status}`);

    await deepDiveStep(job.id, 50_000);

    const after = await prisma.deepDiveJob.findUnique({
      where: { id: job.id },
      include: { report: true, sources: true },
    });
    const afterState = after?.state as DeepDiveState;
    console.log(`  -> Stage: ${afterState?.stage ?? 'unknown'}, Status: ${after?.status}`);
    console.log(`  Sources: ${after?.sources.length ?? 0} (OK: ${after?.sources.filter((s) => s.accessStatus === 'ok').length})`);

    if (['complete', 'partial', 'failed', 'aborted'].includes(after?.status ?? '')) {
      console.log(`\nJob finished with status: ${after?.status}`);
      if (after?.report) {
        console.log(`\nReport subject: ${after.report.subject}`);
        console.log(`Report length: ${after.report.markdown.length} chars`);
        console.log('\n--- REPORT ---');
        console.log(after.report.markdown);
      }
      break;
    }
  }

  if (attempts >= maxAttempts) {
    console.log('\nMax attempts reached. Job may still be in progress.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
