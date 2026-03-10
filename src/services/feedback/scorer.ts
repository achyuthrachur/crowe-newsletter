import { prisma } from '@/lib/db';

const LOOKBACK_DAYS = parseInt(process.env.FEEDBACK_LOOKBACK_DAYS ?? '30', 10);

/**
 * Compute per-interest feedback adjustments for a user.
 * Per Stage 4 spec §5.6:
 * - upvoted domain >= 3 in last 30d → +10
 * - downvoted domain >= 3 in last 30d → -25
 * - downvoted matched interest >= 3 in last 30d → -20 (per interest)
 */
export async function computeFeedbackAdjustments(
  userId: string
): Promise<{ domainBoosts: Map<string, number>; interestPenalties: Map<string, number> }> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const events = await prisma.feedbackEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    include: { article: { select: { canonicalUrl: true } } },
  });

  const domainUp = new Map<string, number>();
  const domainDown = new Map<string, number>();
  const interestDown = new Map<string, number>();

  for (const e of events) {
    const domain = extractDomain(e.article.canonicalUrl);
    if (e.action === 'upvote') {
      domainUp.set(domain, (domainUp.get(domain) ?? 0) + 1);
    } else if (e.action === 'downvote') {
      domainDown.set(domain, (domainDown.get(domain) ?? 0) + 1);
      if (e.interestId) {
        interestDown.set(e.interestId, (interestDown.get(e.interestId) ?? 0) + 1);
      }
    }
  }

  const domainBoosts = new Map<string, number>();
  for (const [domain, count] of domainUp) {
    if (count >= 3) domainBoosts.set(domain, 10);
  }
  for (const [domain, count] of domainDown) {
    if (count >= 3) domainBoosts.set(domain, -25);
  }

  const interestPenalties = new Map<string, number>();
  for (const [interestId, count] of interestDown) {
    if (count >= 3) interestPenalties.set(interestId, -20);
  }

  return { domainBoosts, interestPenalties };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
