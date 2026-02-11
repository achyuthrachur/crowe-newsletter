/**
 * Seed demo articles for live demo mode.
 * Inserts 7 articles covering the intake form's interest sections so that
 * most interest combinations produce matches.
 *
 * Uses raw pg client (same pattern as seed-pg.ts — Prisma engine SNI issue
 * with Neon on Windows).
 *
 * Usage:  npx tsx scripts/seed-demo-articles.ts
 */

import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const demoArticles = [
  {
    title: 'SEC Proposes New AI Disclosure Rules for Financial Advisors',
    sourceName: 'Reuters',
    canonicalUrl: 'https://reuters.com/technology/sec-ai-disclosure-rules-2026',
    snippet:
      'The Securities and Exchange Commission unveiled proposed rules that would require financial advisors to disclose their use of artificial intelligence tools when making investment recommendations, marking a significant regulatory shift for the financial services industry.',
  },
  {
    title: 'Big Four Firms Race to Integrate AI Into Audit Workflows',
    sourceName: 'Accounting Today',
    canonicalUrl: 'https://accountingtoday.com/news/big-four-ai-audit-workflows',
    snippet:
      'Major accounting firms are accelerating their adoption of AI-powered audit tools, using machine learning to analyze large data sets, detect anomalies, and improve audit quality while reducing manual testing procedures.',
  },
  {
    title: 'IRS Finalizes Digital Asset Tax Reporting Requirements for 2026',
    sourceName: 'Wall Street Journal',
    canonicalUrl: 'https://wsj.com/articles/irs-digital-asset-tax-reporting-2026',
    snippet:
      'The Internal Revenue Service finalized regulations requiring brokers and exchanges to report digital asset transactions, creating new compliance obligations for tax professionals and financial institutions starting in the 2026 filing season.',
  },
  {
    title: 'Cybersecurity Spending Hits Record as Financial Firms Face Rising Threats',
    sourceName: 'InfoSecurity Magazine',
    canonicalUrl: 'https://infosecurity-magazine.com/news/cybersecurity-spending-record-financial',
    snippet:
      'Global cybersecurity spending by financial services firms reached an all-time high as institutions respond to increasingly sophisticated cyber threats, with ransomware and supply chain attacks topping the list of concerns.',
  },
  {
    title: 'Advisory Firms Adopt AI-Powered Risk Assessment Tools',
    sourceName: 'Harvard Business Review',
    canonicalUrl: 'https://hbr.org/2026/02/advisory-firms-ai-risk-assessment',
    snippet:
      'Leading advisory and consulting firms are deploying AI-powered risk assessment platforms that analyze market data, regulatory changes, and geopolitical events to provide clients with real-time strategic recommendations.',
  },
  {
    title: 'New PCAOB Standards Target Audit Quality in AI-Assisted Engagements',
    sourceName: 'Compliance Week',
    canonicalUrl: 'https://complianceweek.com/pcaob-standards-ai-audit-quality',
    snippet:
      'The Public Company Accounting Oversight Board issued new standards addressing how auditors should evaluate and document the use of AI tools in audit engagements, aiming to maintain audit quality as automation expands across the regulatory landscape.',
  },
  {
    title: 'Global Tax Reform: OECD Pillar Two Implementation Accelerates',
    sourceName: 'Financial Times',
    canonicalUrl: 'https://ft.com/content/oecd-pillar-two-global-tax-reform',
    snippet:
      'Countries around the world are accelerating their adoption of the OECD Pillar Two global minimum tax framework, creating new compliance challenges for multinational financial services companies and their tax advisors.',
  },
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  await client.connect();
  console.log('Connected to database.\n');

  let inserted = 0;
  let skipped = 0;

  for (const article of demoArticles) {
    const res = await client.query(
      `INSERT INTO articles (id, canonical_url, title, source_name, fetched_at, snippet, access_status)
       VALUES ($1, $2, $3, $4, NOW(), $5, 'ok')
       ON CONFLICT (canonical_url) DO NOTHING
       RETURNING id`,
      [randomUUID(), article.canonicalUrl, article.title, article.sourceName, article.snippet]
    );

    if (res.rowCount && res.rowCount > 0) {
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`Demo articles: ${inserted} inserted, ${skipped} already existed`);

  const total = await client.query('SELECT COUNT(*) as count FROM articles');
  console.log(`Total articles in database: ${total.rows[0].count}`);

  await client.end();
}

main().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
