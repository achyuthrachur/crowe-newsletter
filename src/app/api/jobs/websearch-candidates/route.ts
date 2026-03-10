/**
 * POST /api/jobs/websearch-candidates
 *
 * Job: websearch_candidates
 * Triggered by Vercel Cron daily at 9:00 UTC (~4:00 AM ET) + on-demand.
 *
 * Pre-fetches web search results for all eligible users.
 * Processes users in batches to stay within Vercel free tier 10s timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getStage2Config } from '@/lib/stage2/config';
import { generateQueries } from '@/lib/websearch/query-generator';
import { runWebSearch } from '@/lib/websearch/search-client';
import type { Stage1Interest } from '@/lib/stage2/contracts';

const prisma = new PrismaClient();

/** Max users to process per invocation (stay within 10s) */
const BATCH_SIZE = 2;

export async function POST(request: NextRequest) {
  const config = getStage2Config();

  if (!config.webSearchEnabled) {
    return NextResponse.json({
      ok: true,
      message: 'Web search is disabled',
      processed: 0,
    });
  }

  // Support pagination via offset query param
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  try {
    // Get eligible users (email_enabled, not paused, depth != 'quick')
    const users = await prisma.user.findMany({
      where: {
        profile: {
          emailEnabled: true,
          paused: false,
          depthLevel: { not: 'quick' },
        },
      },
      include: {
        profile: true,
        interests: true,
      },
      skip: offset,
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    if (users.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No more users to process',
        processed: 0,
        offset,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    let totalQueries = 0;
    let totalResults = 0;

    for (const user of users) {
      // Check if we already ran for this user today
      const existingRun = await prisma.searchQuery.findFirst({
        where: {
          userId: user.id,
          runDate: new Date(today),
        },
      });

      if (existingRun) {
        console.log(
          `[websearch] Skipping user ${user.id} — already processed today`
        );
        continue;
      }

      // Generate queries from interests
      const interests: Stage1Interest[] = user.interests.map((i) => ({
        id: i.id,
        userId: i.userId,
        section: i.section,
        label: i.label,
        type: i.type as 'topic' | 'industry' | 'entity',
        weight: i.weight,
      }));

      const queries = generateQueries(interests, config.maxQueriesPerUser);

      if (queries.length === 0) continue;

      // Execute web searches
      const { results, metrics } = await runWebSearch(queries);

      // Persist search queries and results
      for (const result of results) {
        const searchQuery = await prisma.searchQuery.create({
          data: {
            userId: user.id,
            runDate: new Date(today),
            query: result.query,
          },
        });

        for (const sr of result.results) {
          await prisma.searchResult.create({
            data: {
              searchQueryId: searchQuery.id,
              rank: sr.rank,
              title: sr.title,
              url: sr.url,
              snippet: sr.snippet,
              sourceName: sr.sourceName,
              publishedAt: sr.publishedAt,
            },
          });
        }
      }

      totalQueries += metrics.queriesIssued;
      totalResults += metrics.totalResults;

      console.log(
        `[websearch] User ${user.id}: ${metrics.queriesIssued} queries, ${metrics.totalResults} results, ${metrics.toolCallsUsed} tool calls`
      );
    }

    // Check if there are more users to process
    const hasMore = users.length === BATCH_SIZE;

    return NextResponse.json({
      ok: true,
      processed: users.length,
      totalQueries,
      totalResults,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + BATCH_SIZE : null,
    });
  } catch (err) {
    console.error('[websearch] Job failed:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
