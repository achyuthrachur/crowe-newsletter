/**
 * Stage 2 Seed: Hard-block list for source_rules
 *
 * Run with: npx tsx prisma/seed-stage2.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HARD_BLOCK_RULES = [
  {
    pattern: 'medium.com',
    action: 'block' as const,
    reason: 'UGC aggregator — unreliable sourcing',
  },
  {
    pattern: 'substack.com',
    action: 'block' as const,
    reason: 'Newsletter aggregator — often paywalled',
  },
  {
    pattern: 'news.ycombinator.com',
    action: 'block' as const,
    reason: 'Link aggregator — not primary source',
  },
  {
    pattern: 'reddit.com',
    action: 'block' as const,
    reason: 'Link aggregator — not primary source',
  },
  {
    pattern: 'digg.com',
    action: 'block' as const,
    reason: 'Link aggregator — not primary source',
  },
  {
    pattern: 'flipboard.com',
    action: 'block' as const,
    reason: 'Link aggregator — not primary source',
  },
];

async function main() {
  console.log('Seeding Stage 2 source_rules...');

  for (const rule of HARD_BLOCK_RULES) {
    const existing = await prisma.sourceRule.findFirst({
      where: { pattern: rule.pattern },
    });

    if (existing) {
      console.log(`  Skipping "${rule.pattern}" — already exists`);
      continue;
    }

    await prisma.sourceRule.create({ data: rule });
    console.log(`  Created block rule: ${rule.pattern}`);
  }

  console.log('Stage 2 seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
