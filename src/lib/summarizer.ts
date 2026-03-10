import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
}

const SLOP_PHRASES = [
  "in today's fast-changing landscape",
  "it is important to note",
  "this article discusses",
  "in an ever-evolving",
  "in today's rapidly",
  "it's worth noting",
  "the landscape of",
  "a game-changer",
  "revolutionize",
  "paradigm shift",
  "cutting-edge",
  "groundbreaking",
  "at the end of the day",
  "moving forward",
  "navigate the complexities",
  "harness the power",
  "delve into",
  "dive deep",
  "unpack",
  "let's explore",
];

interface SummaryResult {
  summary: string;
  whyItMatters: string;
  usedFallback: boolean;
}

function hasProperNounOrEvent(text: string): boolean {
  // Check for capitalized words that aren't at the start of sentences
  const words = text.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const word = words[i].replace(/[^a-zA-Z]/g, '');
    if (word.length > 1 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
      return true;
    }
  }
  // Check for concrete event words
  const eventWords = ['launch', 'acquire', 'file', 'rule', 'outage', 'report', 'announce', 'release', 'settle', 'fine', 'merge', 'ban', 'approve', 'reject', 'sue', 'invest', 'raise', 'cut', 'hire', 'fire'];
  const textLower = text.toLowerCase();
  return eventWords.some((w) => textLower.includes(w));
}

function containsSlop(text: string): boolean {
  const lower = text.toLowerCase();
  return SLOP_PHRASES.some((phrase) => lower.includes(phrase));
}

function buildPrompt(title: string, snippet: string | null, strict: boolean): string {
  const strictClause = strict
    ? '\nIMPORTANT: Your previous attempt was rejected for vagueness or filler. Be extremely specific. Name the exact organization, product, or event. Avoid any generic phrasing.'
    : '';

  return `You are a concise news analyst for professionals. Given this article, write:
1. Summary (1-2 sentences): What happened, who is involved, and what changed. Use specific names, numbers, and facts.
2. Why it matters (1 sentence): The concrete impact on business, regulation, or industry.

Rules:
- Use active voice
- Include at least one proper noun (org, person, product, regulation)
- Include at least one concrete event (launched, acquired, filed, announced, etc.)
- No filler phrases like "it is important to note" or "in today's fast-changing landscape"
- No hedging ("may", "could potentially", "might")
- Be direct and factual${strictClause}

Title: ${title}
${snippet ? `Snippet: ${snippet.substring(0, 500)}` : ''}

Respond in this exact format:
Summary: [your summary]
Why it matters: [your why it matters]`;
}

async function callLLM(prompt: string): Promise<{ summary: string; whyItMatters: string } | null> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return null;

    const summaryMatch = text.match(/Summary:\s*(.+?)(?=Why it matters:|$)/s);
    const whyMatch = text.match(/Why it matters:\s*(.+)/s);

    if (!summaryMatch || !whyMatch) return null;

    return {
      summary: summaryMatch[1].trim(),
      whyItMatters: whyMatch[1].trim(),
    };
  } catch (err) {
    console.error('LLM call failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

function fallbackSummary(title: string, snippet: string | null): SummaryResult {
  const cleanSnippet = snippet
    ? snippet.substring(0, 150).replace(/\n/g, ' ').trim()
    : '';

  return {
    summary: cleanSnippet ? `${title}. ${cleanSnippet}` : title,
    whyItMatters: 'Read the full article for details.',
    usedFallback: true,
  };
}

export async function summarizeArticle(
  title: string,
  snippet: string | null
): Promise<SummaryResult> {
  // First attempt
  const prompt1 = buildPrompt(title, snippet, false);
  const result1 = await callLLM(prompt1);

  if (result1) {
    const combined = `${result1.summary} ${result1.whyItMatters}`;
    if (!containsSlop(combined) && hasProperNounOrEvent(combined)) {
      return { ...result1, usedFallback: false };
    }
  }

  // Retry with strict prompt
  const prompt2 = buildPrompt(title, snippet, true);
  const result2 = await callLLM(prompt2);

  if (result2) {
    const combined = `${result2.summary} ${result2.whyItMatters}`;
    if (!containsSlop(combined) && hasProperNounOrEvent(combined)) {
      return { ...result2, usedFallback: false };
    }
  }

  // Fallback: title + snippet rewrite
  return fallbackSummary(title, snippet);
}
