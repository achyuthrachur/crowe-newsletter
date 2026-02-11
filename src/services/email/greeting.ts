import OpenAI from 'openai';

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const FALLBACK_GREETINGS = [
  "Here's your daily dose of what's moving the needle — grab your coffee and dig in!",
  "The world didn't slow down overnight. Here's what you need to know today.",
  "Fresh intel, zero fluff — your morning briefing is served.",
  "Another day, another batch of insights curated just for you. Let's get into it!",
  "Your personalized digest just dropped — consider it brain fuel for the day ahead.",
  "We read the internet so you don't have to. Here are today's highlights!",
  "Rise, shine, and stay informed — here's what's worth your attention today.",
  "Today's top stories, handpicked for your interests. No filler, all signal.",
];

/**
 * Generate a dynamic, fun-yet-professional greeting for the digest email.
 * Falls back to a random static greeting if the API call fails.
 */
export async function generateGreeting(displayName?: string | null): Promise<string> {
  const name = displayName?.trim();

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 80,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content:
            'You write short, catchy email greetings for a professional newsletter digest. ' +
            'Keep it to 1-2 sentences. Be warm, witty, and energizing — like a smart colleague ' +
            'handing you the morning paper. Never use emojis. Never be cheesy or cliché. ' +
            'Vary your style: sometimes punchy, sometimes clever, sometimes dry humor. ' +
            'Do NOT include a subject line — just the greeting text.',
        },
        {
          role: 'user',
          content: name
            ? `Write a greeting for ${name}'s daily newsletter digest.`
            : `Write a greeting for a daily newsletter digest.`,
        },
      ],
    });

    const greeting = completion.choices[0]?.message?.content?.trim();
    if (greeting && greeting.length > 10) return greeting;
  } catch {
    // Fall through to static fallback
  }

  const base = FALLBACK_GREETINGS[Math.floor(Math.random() * FALLBACK_GREETINGS.length)];
  return name ? `Hi ${name}, ${base.charAt(0).toLowerCase()}${base.slice(1)}` : base;
}
