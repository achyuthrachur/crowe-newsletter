import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { hasTimeRemaining } from '@/lib/utils';
import { logDeepDive } from '@/lib/logger';
import { validateReport } from './validators';
import { toJson, fromJson, type DeepDiveState, type DeepDiveReportData } from '@/types';

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYNTHESIS_SYSTEM_PROMPT = `You are a research analyst producing a deep-dive briefing for financial services and consulting professionals at Crowe LLP.

You will receive extracted text from multiple sources about a specific topic. Synthesize them into a structured report.

CRITICAL RULES:
- Use concrete entities (companies, regulators, products, people, dates)
- Ground every claim in the source text provided
- Active voice, confident tone
- No hedging ("may", "might", "could potentially")
- No filler: "fast-changing landscape", "paradigm", "leveraging", "it is important to note", "this article", "the piece", "game-changer", "cutting-edge", "unprecedented"
- Maximum 1 exclamation mark in entire report
- Action prompts must be specific and actionable for a client engagement

OUTPUT FORMAT (strict markdown):
# [Headline — one line, specific]

## What Happened
- [3-6 bullets of key facts with specific details]

## What Changed
- [2-4 bullets on what's different now. If nothing changed, write: "No meaningful change identified."]

## Why It Matters
- [Exactly 3 bullets on implications for financial services / consulting professionals]

## Risks / Watch-outs
- [2-4 bullets on risks or things to monitor]

## Action Prompts
- [Exactly 3 bullets — concrete, client-ready actions a consultant could take this week]

## Sources
- [Numbered list: "1. [Title](URL) — Source Name, Date"]`;

const STRICTER_RETRY_PROMPT = `Your previous synthesis was rejected for quality issues. This time:
- Every bullet MUST reference a specific entity, date, or event from the sources
- Remove ALL filler language
- Ensure every section has the required number of bullets
- Ground EVERY claim in the source text`;

/**
 * SYNTHESIZE stage: Generate deep dive report from extracted sources.
 *
 * Strategy 1 (preferred): Single OpenAI call with all source texts
 * Strategy 2 (fallback): Map-reduce — summarize each source, then synthesize
 *
 * Validates output against anti-slop rules. Retries once if invalid.
 * Falls back to partial report from per-source summaries if both attempts fail.
 */
export async function synthesizeReport(
  jobId: string,
  maxDuration: number
): Promise<void> {
  const startTime = Date.now();
  const maxSynthesisSources = parseInt(process.env.DEEP_DIVE_MAX_SYNTHESIS_SOURCES || '8');
  const maxTokens = parseInt(process.env.DEEP_DIVE_OUTPUT_TOKENS || '1200');

  const job = await prisma.deepDiveJob.findUniqueOrThrow({
    where: { id: jobId },
  });
  const state = fromJson(job.state);

  // Get OK sources
  const sources = await prisma.deepDiveSource.findMany({
    where: { jobId, accessStatus: 'ok', extractedText: { not: null } },
    take: maxSynthesisSources,
  });

  if (sources.length === 0) {
    // No sources to synthesize — create a minimal report
    await createMinimalReport(jobId, job.userId);
    return;
  }

  // Get topic interest label
  const interest = await prisma.interest.findUnique({
    where: { id: job.topicInterestId },
  });
  const topicLabel = interest?.label ?? 'Unknown Topic';

  const strategy = state.synthesis?.strategy ?? 'deep-research';
  const retryCount = state.synthesis?.retryCount ?? 0;

  logDeepDive({
    jobId,
    userId: job.userId,
    stage: 'SYNTHESIZE',
    strategy,
    sourcesOk: sources.length,
  });

  let markdown: string | null = null;

  try {
    if (strategy === 'deep-research' && hasTimeRemaining(startTime, maxDuration, 15000)) {
      markdown = await synthesizeDirect(sources, topicLabel, maxTokens, retryCount > 0);
    }

    if (!markdown && hasTimeRemaining(startTime, maxDuration, 15000)) {
      markdown = await synthesizeMapReduce(sources, topicLabel, maxTokens);
    }
  } catch (error) {
    logDeepDive({
      jobId,
      userId: job.userId,
      stage: 'SYNTHESIZE',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  if (!markdown) {
    // Last resort: generate from source titles only
    markdown = generateFallbackReport(sources, topicLabel);
  }

  // Parse and validate
  const report = parseReportMarkdown(markdown);
  const sourceTexts = sources.map((s) => s.extractedText ?? '');
  const validation = validateReport(report, sourceTexts);

  if (!validation.valid && retryCount === 0 && hasTimeRemaining(startTime, maxDuration, 15000)) {
    // Retry once with stricter prompt
    logDeepDive({
      jobId,
      userId: job.userId,
      stage: 'SYNTHESIZE',
      status: 'retry',
      error: validation.errors.join('; '),
    });

    const newState: DeepDiveState = {
      ...state,
      stage: 'SYNTHESIZE',
      synthesis: { strategy, retryCount: 1 },
    };
    await prisma.deepDiveJob.update({
      where: { id: jobId },
      data: { state: toJson(newState) },
    });

    // Retry immediately within this invocation
    const retryMarkdown = await synthesizeDirect(sources, topicLabel, maxTokens, true);
    if (retryMarkdown) {
      const retryReport = parseReportMarkdown(retryMarkdown);
      const retryValidation = validateReport(retryReport, sourceTexts);
      if (retryValidation.valid) {
        markdown = retryMarkdown;
      }
    }
  }

  // Store the report markdown in state and transition to PUBLISH
  const finalState: DeepDiveState = {
    ...state,
    stage: 'PUBLISH',
    synthesis: {
      strategy,
      retryCount,
      partialMarkdown: markdown,
    },
  };

  await prisma.deepDiveJob.update({
    where: { id: jobId },
    data: {
      state: toJson(finalState),
      status: validation.valid ? job.status : 'partial',
    },
  });

  logDeepDive({
    jobId,
    userId: job.userId,
    stage: 'SYNTHESIZE',
    status: 'complete',
    strategy,
    partial: !validation.valid,
  });
}

/**
 * Strategy 1: Single direct synthesis call.
 */
async function synthesizeDirect(
  sources: Array<{ url: string; title: string | null; extractedText: string | null; sourceName: string | null }>,
  topic: string,
  maxTokens: number,
  strict: boolean
): Promise<string | null> {
  const sourceBlocks = sources
    .map(
      (s, i) =>
        `--- SOURCE ${i + 1} ---\nTitle: ${s.title ?? 'Unknown'}\nURL: ${s.url}\nSource: ${s.sourceName ?? 'Unknown'}\n\n${(s.extractedText ?? '').slice(0, 3000)}\n`
    )
    .join('\n');

  const userPrompt = `Topic: "${topic}"\n\n${strict ? STRICTER_RETRY_PROMPT + '\n\n' : ''}${sourceBlocks}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000); // 35s hard timeout

  try {
    const completion = await getOpenAI().chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);
    return completion.choices[0]?.message?.content ?? null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Strategy 2: Map-reduce — summarize each source, then synthesize.
 */
async function synthesizeMapReduce(
  sources: Array<{ url: string; title: string | null; extractedText: string | null; sourceName: string | null }>,
  topic: string,
  maxTokens: number
): Promise<string | null> {
  // Map: summarize each source individually (parallel)
  const summaryPromises = sources.map(async (source) => {
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize this article in 3-4 sentences. Focus on concrete facts, entities, and events. No filler.',
          },
          {
            role: 'user',
            content: `Title: ${source.title}\nURL: ${source.url}\n\n${(source.extractedText ?? '').slice(0, 2000)}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.2,
      });
      return {
        url: source.url,
        title: source.title,
        sourceName: source.sourceName,
        summary: completion.choices[0]?.message?.content ?? '',
      };
    } catch {
      return {
        url: source.url,
        title: source.title,
        sourceName: source.sourceName,
        summary: source.title ?? '',
      };
    }
  });

  const summaries = await Promise.all(summaryPromises);

  // Reduce: synthesize all summaries into final report
  const summaryBlocks = summaries
    .map(
      (s, i) =>
        `${i + 1}. "${s.title}" (${s.sourceName ?? 'Unknown'})\nURL: ${s.url}\nSummary: ${s.summary}\n`
    )
    .join('\n');

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Topic: "${topic}"\n\nSynthesize these article summaries into a deep dive report:\n\n${summaryBlocks}`,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/**
 * Last-resort fallback: generate a bare-bones report from source metadata.
 */
function generateFallbackReport(
  sources: Array<{ url: string; title: string | null; sourceName: string | null }>,
  topic: string
): string {
  const sourceList = sources
    .map((s, i) => `${i + 1}. [${s.title ?? 'Source'}](${s.url}) — ${s.sourceName ?? 'Unknown'}`)
    .join('\n');

  return `# ${topic} — Weekly Overview

## What Happened
- Multiple sources reported on developments related to ${topic}
- Coverage spans ${sources.length} sources from the past week
- Full synthesis was not possible due to processing constraints

## What Changed
- No meaningful change identified.

## Why It Matters
- Developments in ${topic} may affect client advisory and compliance strategies
- Multiple independent sources indicate sustained activity in this area
- Monitoring recommended for emerging regulatory or market signals

## Risks / Watch-outs
- Limited source availability may indicate early-stage developments
- Follow up with primary source review recommended

## Action Prompts
- Review the linked sources below for detailed coverage
- Flag any client-relevant developments for team discussion
- Schedule a follow-up deep dive for next week if warranted

## Sources
${sourceList}`;
}

/**
 * Create a minimal report when no sources are available.
 */
async function createMinimalReport(jobId: string, userId: string): Promise<void> {
  const job = await prisma.deepDiveJob.findUniqueOrThrow({
    where: { id: jobId },
  });
  const interest = await prisma.interest.findUnique({
    where: { id: job.topicInterestId },
  });

  const markdown = `# ${interest?.label ?? 'Topic'} — No Coverage Available

## What Happened
- No accessible sources were found for this topic in the past week

## What Changed
- No meaningful change identified.

## Why It Matters
- Absence of coverage may indicate a quiet period for this topic
- Consider broadening search terms or adding related interests
- Regular monitoring will capture emerging developments

## Risks / Watch-outs
- Low coverage does not necessarily mean low activity
- Manual research may be warranted for time-sensitive topics

## Action Prompts
- Review your deep dive topic settings to ensure they match current priorities
- Consider adding related interests to broaden coverage
- Check back next week for updated coverage

## Sources
- No sources available for this period`;

  const state = fromJson(job.state);
  await prisma.deepDiveJob.update({
    where: { id: jobId },
    data: {
      status: 'partial',
      state: toJson({
        ...state,
        stage: 'PUBLISH',
        synthesis: { strategy: 'map-reduce', retryCount: 0, partialMarkdown: markdown },
      } satisfies DeepDiveState),
    },
  });
}

/**
 * Parse markdown report into structured DeepDiveReportData.
 */
export function parseReportMarkdown(markdown: string): DeepDiveReportData {
  const sections: Record<string, string[]> = {};
  let currentSection = '';
  let headline = '';

  const lines = markdown.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      headline = trimmed.replace(/^#\s+/, '');
      continue;
    }

    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace(/^##\s+/, '').toLowerCase();
      sections[currentSection] = [];
      continue;
    }

    if (trimmed.startsWith('- ') && currentSection) {
      sections[currentSection].push(trimmed.replace(/^-\s+/, ''));
    }
    // Handle numbered lists in Sources
    if (/^\d+\.\s/.test(trimmed) && currentSection === 'sources') {
      sections[currentSection].push(trimmed.replace(/^\d+\.\s+/, ''));
    }
  }

  // Parse source citations
  const sourceCitations = (sections['sources'] || []).map((s) => {
    const linkMatch = s.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const afterLink = s.replace(/\[([^\]]+)\]\(([^)]+)\)/, '').trim();
    const parts = afterLink.split('—').map((p) => p.trim()).filter(Boolean);

    return {
      title: linkMatch?.[1] ?? s,
      url: linkMatch?.[2] ?? '',
      source: parts[0] ?? '',
      date: parts[1],
    };
  });

  return {
    headline,
    whatHappened: sections['what happened'] || [],
    whatChanged: sections['what changed'] || [],
    whyItMatters: sections['why it matters'] || [],
    risks: sections['risks / watch-outs'] || sections['risks'] || [],
    actionPrompts: sections['action prompts'] || [],
    sources: sourceCitations,
  };
}
