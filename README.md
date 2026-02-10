# Crowe Newsletter

AI-powered newsletter platform that delivers personalized daily digests and weekly deep-dive reports to Crowe professionals. Built on Next.js, Neon PostgreSQL, OpenAI, and Resend.

## Stage Status

| Stage | Description | Status |
|-------|-------------|--------|
| 1 | Daily digest (RSS, preferences, email) | Placeholders in `dailyTick.ts` |
| 2 | Web search expansion | Schema only, logic not implemented |
| 3 | Deep dive weekly reports | Fully implemented |
| 4 | Feedback & personalization | Not started |

## Prerequisites

- Node.js 20+
- Neon PostgreSQL database (free tier)
- Resend API key
- OpenAI API key

## Local Setup

```bash
# Install dependencies
npm install

# Copy environment variables and fill in values
cp .env.example .env

# Push schema to database
npm run db:push

# Seed RSS sources
npm run db:seed

# Run smoke test
npm run smoke

# Start dev server
npm run dev
```

## Feature Flags

All flags default to `false`. Set to `"true"` in environment variables to enable.

| Flag | Stage | Description |
|------|-------|-------------|
| `WEBSEARCH_ENABLED` | 2 | Web search expansion for digests |
| `DEEP_RESEARCH_ENABLED` | 3 | Deep dive weekly reports |
| `NEXT_PUBLIC_DEEP_RESEARCH_ENABLED` | 3 | Client-side deep dive UI |
| `FEEDBACK_ENABLED` | 4 | User feedback collection |
| `PERSONALIZATION_ENABLED` | 4 | Personalized content ranking |

## API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/intake` | POST | User signup |
| `/api/prefs` | GET/POST | User preferences |
| `/api/pause` | POST | Pause subscription |
| `/api/unsubscribe` | POST | Unsubscribe |
| `/api/cron/daily` | GET | Daily cron (Vercel-triggered) |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/intake` | Signup form |
| `/prefs` | Preference editor (token-authenticated) |

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run smoke        # Smoke test (DB, flags, user CRUD, tokens)
npm run db:push      # Push Prisma schema to database
npm run db:seed      # Seed RSS sources
```

## Vercel Hobby Deployment

1. Push to GitHub
2. Import repo in Vercel dashboard (vercel.com > Add New Project)
3. Framework: Next.js (auto-detected)
4. Set environment variables (see `.env.example`)
5. Deploy

### Constraints (Hobby Tier)

- **1 cron job/day** within a 1-hour window — configured at `0 10 * * *` UTC
- **60s max function duration** — `dailyTick.ts` uses a 55s budget with priority ordering
- Deep dive uses a resumable state machine (`DISCOVER -> FETCH -> SYNTHESIZE -> PUBLISH`) so each cron invocation advances jobs incrementally

### Cron

The daily cron is configured in `vercel.json` and hits `/api/cron/daily` at 10:00 UTC. Vercel auto-registers it from the config.

## Architecture

```
src/
  app/              Next.js App Router pages and API routes
  components/       React components
  jobs/             Cron job orchestration (dailyTick, deep dive scheduling)
  lib/              Shared utilities (db, auth, flags, logger)
  services/         Business logic
    deepDive/       Stage 3 deep dive state machine
  types/            TypeScript types
prisma/
  schema.prisma     Database schema (Stages 1-3)
  seed.ts           RSS source seeding
scripts/
  smoke.ts          Smoke test
  testDeepDive.ts   Manual deep dive testing
```
