import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Stage 1: Seed RSS sources with quality tiers
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

  for (const source of sources) {
    await prisma.source.upsert({
      where: { url: source.url },
      update: { qualityTier: source.qualityTier },
      create: source,
    });
  }

  console.log(`Seeded ${sources.length} RSS sources`);

  // Stage 2: Seed source block rules
  const blockRules = [
    { pattern: 'medium.com', action: 'block', reason: 'User-generated content, quality inconsistent' },
    { pattern: 'substack.com', action: 'block', reason: 'User-generated content, quality inconsistent' },
    { pattern: 'reddit.com', action: 'block', reason: 'Link aggregator' },
    { pattern: 'twitter.com', action: 'block', reason: 'Social media, not primary source' },
    { pattern: 'x.com', action: 'block', reason: 'Social media, not primary source' },
    { pattern: 'linkedin.com', action: 'block', reason: 'Social media, not primary source' },
    { pattern: 'facebook.com', action: 'block', reason: 'Social media, not primary source' },
  ];

  for (const rule of blockRules) {
    const existing = await prisma.sourceRule.findFirst({
      where: { pattern: rule.pattern },
    });
    if (!existing) {
      await prisma.sourceRule.create({ data: rule });
    }
  }

  console.log(`Seeded ${blockRules.length} source block rules`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
