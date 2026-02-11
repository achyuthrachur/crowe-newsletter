/**
 * Seed script using pg driver directly (workaround for Prisma engine
 * TLS issue with Neon c-4 region on corporate networks).
 *
 * Usage:  npx tsx scripts/seed-pg.ts
 */

import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const sources = [
  // Tier 1 — Highest quality
  { name: 'Reuters', type: 'rss', url: 'https://www.reutersagency.com/feed/', qualityTier: 1 },
  { name: 'Associated Press', type: 'rss', url: 'https://rsshub.app/apnews/topics/business', qualityTier: 1 },
  { name: 'Wall Street Journal', type: 'rss', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', qualityTier: 1 },
  { name: 'Financial Times', type: 'rss', url: 'https://www.ft.com/rss/home', qualityTier: 1 },

  // Tier 2 — Good quality
  { name: 'TechCrunch', type: 'rss', url: 'https://techcrunch.com/feed/', qualityTier: 2 },
  { name: 'Ars Technica', type: 'rss', url: 'https://feeds.arstechnica.com/arstechnica/index', qualityTier: 2 },
  { name: 'The Verge', type: 'rss', url: 'https://www.theverge.com/rss/index.xml', qualityTier: 2 },
  { name: 'MIT Technology Review', type: 'rss', url: 'https://www.technologyreview.com/feed/', qualityTier: 2 },
  { name: 'Harvard Business Review', type: 'rss', url: 'https://hbr.org/rss', qualityTier: 2 },
  { name: 'Accounting Today', type: 'rss', url: 'https://www.accountingtoday.com/feed', qualityTier: 2 },

  // Tier 3 — Allowed
  { name: 'Hacker News', type: 'rss', url: 'https://hnrss.org/frontpage', qualityTier: 3 },
  { name: 'The Register', type: 'rss', url: 'https://www.theregister.com/headlines.atom', qualityTier: 3 },
  { name: 'InfoSecurity Magazine', type: 'rss', url: 'https://www.infosecurity-magazine.com/rss/news/', qualityTier: 3 },
  { name: 'CFO Dive', type: 'rss', url: 'https://www.cfodive.com/feeds/news/', qualityTier: 3 },
  { name: 'Compliance Week', type: 'rss', url: 'https://www.complianceweek.com/rss', qualityTier: 3 },
];

const blockRules = [
  { pattern: 'medium.com', action: 'block', reason: 'User-generated content, quality inconsistent' },
  { pattern: 'substack.com', action: 'block', reason: 'User-generated content, quality inconsistent' },
  { pattern: 'reddit.com', action: 'block', reason: 'Link aggregator' },
  { pattern: 'twitter.com', action: 'block', reason: 'Social media, not primary source' },
  { pattern: 'x.com', action: 'block', reason: 'Social media, not primary source' },
  { pattern: 'linkedin.com', action: 'block', reason: 'Social media, not primary source' },
  { pattern: 'facebook.com', action: 'block', reason: 'Social media, not primary source' },
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  await client.connect();
  console.log('Connected to database.\n');

  // Upsert sources (insert or update quality_tier on conflict)
  let inserted = 0;
  let updated = 0;
  for (const s of sources) {
    const res = await client.query(
      `INSERT INTO sources (id, name, type, url, quality_tier, enabled)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (url) DO UPDATE SET quality_tier = $5
       RETURNING (xmax = 0) AS is_insert`,
      [randomUUID(), s.name, s.type, s.url, s.qualityTier]
    );
    if (res.rows[0].is_insert) inserted++;
    else updated++;
  }
  console.log(`Sources: ${inserted} inserted, ${updated} updated (${sources.length} total)`);

  // Upsert block rules (insert if pattern doesn't exist)
  let rulesInserted = 0;
  for (const r of blockRules) {
    const existing = await client.query(
      'SELECT id FROM source_rules WHERE pattern = $1',
      [r.pattern]
    );
    if (existing.rows.length === 0) {
      await client.query(
        'INSERT INTO source_rules (id, pattern, action, reason, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [randomUUID(), r.pattern, r.action, r.reason]
      );
      rulesInserted++;
    }
  }
  console.log(`Block rules: ${rulesInserted} inserted (${blockRules.length - rulesInserted} already existed)`);

  // Verify
  const sourceCount = await client.query('SELECT COUNT(*) as count FROM sources');
  const ruleCount = await client.query('SELECT COUNT(*) as count FROM source_rules');
  console.log(`\nDatabase totals: ${sourceCount.rows[0].count} sources, ${ruleCount.rows[0].count} block rules`);

  await client.end();
}

main().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
