import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sources = [
  // Tech / AI
  { name: 'MIT Technology Review', type: 'rss', url: 'https://www.technologyreview.com/feed/' },
  { name: 'The Verge', type: 'rss', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', type: 'rss', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'TechCrunch AI', type: 'rss', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'VentureBeat', type: 'rss', url: 'https://venturebeat.com/feed/' },

  // Finance / Business
  { name: 'Reuters Business', type: 'rss', url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best' },
  { name: 'Financial Times', type: 'rss', url: 'https://www.ft.com/rss/home' },
  { name: 'MarketWatch', type: 'rss', url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },

  // Accounting / Consulting
  { name: 'Journal of Accountancy', type: 'rss', url: 'https://www.journalofaccountancy.com/rss/all-news.xml' },
  { name: 'Accounting Today', type: 'rss', url: 'https://www.accountingtoday.com/feed' },
  { name: 'CFO Dive', type: 'rss', url: 'https://www.cfodive.com/feeds/news/' },

  // Regulatory / Compliance
  { name: 'SEC Press Releases', type: 'rss', url: 'https://www.sec.gov/news/pressreleases.rss' },
  { name: 'PCAOB News', type: 'rss', url: 'https://pcaobus.org/news-events/rss' },
  { name: 'FinCEN News', type: 'rss', url: 'https://www.fincen.gov/news/rss.xml' },

  // General Tech News
  { name: 'Hacker News', type: 'rss', url: 'https://hnrss.org/frontpage' },
  { name: 'Wired', type: 'rss', url: 'https://www.wired.com/feed/rss' },
];

async function main() {
  console.log('Seeding sources...');

  for (const source of sources) {
    await prisma.source.upsert({
      where: { url: source.url },
      update: { name: source.name },
      create: source,
    });
  }

  console.log(`Seeded ${sources.length} sources.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
