# Stage 3 — Deep Research Escalation + Long-Form Briefing (Vercel Hobby-Compatible) — PRESCRIPTIVE BUILD SPEC

> **Purpose:** Add a “Deep Research” capability that can synthesize across multiple sources (with citations/links) to produce **weekly deep dives** or **escalated deep dives** on high-signal topics—WITHOUT breaking the Stage 1/2 daily digest reliability.
>
> **Hard platform constraint:** Deployment must run on **Vercel Hobby (free tier)**.
> - **Cron on Hobby can run only once per day**, and invocation time is not precise (hour window). citeturn0search0  
> - **Vercel Function maximum duration on Hobby** is **10s default, configurable up to 60s**. citeturn0search1  
>
> **Implication:** Stage 3 MUST be designed so no single serverless invocation requires >60s and must tolerate cron timing drift.

---

## 0) Parallel Development Model (and Dependencies)

### 0.1 What can be built simultaneously with Stage 1/2
Stage 3 can be developed **in parallel** with Stages 1 and 2, as long as it:
- does not change Stage 1 email/prefs token behavior,
- treats Stage 1/2 data model as the contract,
- gates all new behavior behind `DEEP_RESEARCH_ENABLED=true`.

Parallelizable now:
- Deep research orchestrator module
- Research prompt contracts + validators
- Report generator + email template extension (deep dive email)
- Storage for research artifacts (DB tables + migrations)
- UI toggle for deep-dive cadence and topics

### 0.2 What depends on Stage 2 being complete
Stage 3 assumes Stage 2’s:
- canonical URL normalization
- access/paywall filter robustness
- source rules/tiers
- websearch candidate stream (or equivalent discovery layer)

If Stage 2 is not merged, Stage 3 must fall back to RSS-only discovery but still keep the same research interface.

---

## 1) Stage 3 Scope (What ships / what does not)

### 1.1 Ships
- Deep research “escalation” path that produces a **Deep Dive Report** (markdown + email)
- Weekly deep dive schedule (per user) OR “triggered escalation” on major events
- Multi-source synthesis with:
  - citations as links (URLs)
  - explicit “What changed” / “Key facts” / “Implications”
- Strict runtime controls to fit Vercel Hobby limits
- Resume-able research jobs (stateful) to avoid >60s invocations

### 1.2 Does NOT ship
- Personalized training from thumbs up/down (Stage 4)
- Real-time/live coverage
- Hourly sends (not possible on Hobby cron; daily only) citeturn0search0

---

## 2) Product Behavior (User Experience) — EXACT

### 2.1 Two email types (separate)
1) **Daily Digest** (Stage 1/2): short, 3–8 links, 1–2 sentence summaries.
2) **Deep Dive** (Stage 3): long-form synthesis for 1 topic area, **sent at most weekly** by default.

### 2.2 Deep Dive triggering modes (choose one default; implement both if time permits)
- **Mode A (Default): Weekly deep dive**
  - Each user selects:
    - Day of week (e.g., Friday)
    - Topic(s) eligible for deep dive (1–3 interests)
  - System generates one deep dive per week.

- **Mode B: Escalation deep dive**
  - Trigger deep dive when:
    - A high-quality tier 1/2 source indicates a major event (rule/regulatory action, acquisition, significant incident), AND
    - story cluster has >= 3 independent sources, AND
    - user has that interest in profile.

### 2.3 Vercel Hobby scheduling reality (hard constraints)
- Cron will trigger within an hour window on Hobby. citeturn0search0
- Stage 3 must NOT promise “6:00am sharp” deep dive sends.
- Stage 3 must compute “should we send today?” internally based on user timezone and configured day-of-week.

---

## 3) Architecture (Deep Research Orchestrator)

### 3.1 High-level modules
- **Discovery**: choose candidate URLs for the deep dive (from Stage 2 results)
- **Evidence Extractor**: fetch + extract text from each URL (respect access filter)
- **Synthesizer**: produce report with citations + “why it matters”
- **Publisher**: email deep dive + store artifact

### 3.2 Runtime strategy (MUST fit 60s function max)
Because Hobby functions can be configured up to 60s max. citeturn0search1  
Stage 3 MUST implement a **resume-able research job** that can be continued across multiple daily cron runs if needed.

Rule:
- Any deep dive generation must finish in **<= 3 invocations** (3 days worst-case), otherwise abort and send a “partial” deep dive with what was gathered.

---

## 4) Data Model Additions — EXACT

### 4.1 New table: `deep_dive_configs`
- `id` UUID PK
- `user_id` UUID UNIQUE FK(users.id) NOT NULL
- `enabled` BOOLEAN NOT NULL DEFAULT false
- `day_of_week` TEXT NOT NULL DEFAULT 'FR'  // 'MO'...'SU'
- `max_sources` INT NOT NULL DEFAULT 12
- `max_sections` INT NOT NULL DEFAULT 6
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

### 4.2 New table: `deep_dive_topics`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `interest_id` UUID FK(interests.id) NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

Unique:
- `(user_id, interest_id)`

### 4.3 New table: `deep_dive_jobs`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `run_week` DATE NOT NULL  // Monday of the week in user TZ
- `status` TEXT NOT NULL DEFAULT 'queued'
  Allowed: `queued | running | partial | complete | failed | aborted`
- `topic_interest_id` UUID FK(interests.id) NOT NULL
- `attempt` INT NOT NULL DEFAULT 0
- `state` JSONB NOT NULL DEFAULT '{}'  // resume state machine
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

Unique:
- `(user_id, run_week)`

### 4.4 New table: `deep_dive_sources`
- `id` UUID PK
- `job_id` UUID FK(deep_dive_jobs.id) NOT NULL
- `url` TEXT NOT NULL
- `title` TEXT NULL
- `source_name` TEXT NULL
- `published_at` timestamptz NULL
- `access_status` TEXT NOT NULL DEFAULT 'unknown' // 'ok' | 'paywalled' | 'blocked' | 'unknown'
- `extracted_text` TEXT NULL  // store truncated text (max 20k chars)
- `created_at` timestamptz NOT NULL DEFAULT now()

Unique:
- `(job_id, url)`

### 4.5 New table: `deep_dive_reports`
- `id` UUID PK
- `job_id` UUID UNIQUE FK(deep_dive_jobs.id) NOT NULL
- `subject` TEXT NOT NULL
- `markdown` TEXT NOT NULL
- `html` TEXT NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

---

## 5) Jobs (Worker) — EXACT (Vercel Hobby Cron-Compatible)

### 5.1 Cron constraints
On Hobby, cron jobs can only run once per day and timing is not precise. citeturn0search0  
Therefore Stage 3 uses **one** daily cron to progress jobs.

### 5.2 Job names
- `job:daily_tick` (runs once per day via Vercel cron)
- `job:deep_dive_step` (invoked by `job:daily_tick` internally, NOT a separate cron)

### 5.3 `job:daily_tick` behavior
Runs daily and does:
1) Stage 1/2 due-email send (existing logic)
2) Deep dive scheduling check:
   - For each user with deep dive enabled:
     - determine local date/day-of-week in user timezone
     - if matches configured day and no job exists for this week:
       - create `deep_dive_jobs` row with status `queued`
3) Advance up to **N** deep dive jobs (N default 3) by calling `deep_dive_step(job_id)` sequentially.

### 5.4 `deep_dive_step(job_id)` state machine (MUST be resume-able)
State stored in `deep_dive_jobs.state`.

States:
- `DISCOVER` → `FETCH` → `SYNTHESIZE` → `PUBLISH`

Rules:
- Each invocation may advance only one state OR a bounded batch within a state.
- Hard stop if `remaining_time_ms < 8000` (keep buffer to finish writes).

Abort rules:
- If `attempt >= 3` and status not `complete`, set `status='partial'` and proceed to `PUBLISH` with partial data.

---

## 6) Discovery (Deep Dive Candidate Selection) — EXACT

Input:
- user’s selected deep dive topic interest (`deep_dive_topics`)
- recent Stage 2 candidates (last 7 days) OR Stage 1 articles if Stage 2 absent

Rules:
- Build candidate set of URLs:
  - prefer tier 1 and tier 2 domains (from `sources.quality_tier`)
  - must pass access filter checks (or marked unknown until fetch)
  - avoid duplicates using canonical_url
- Select up to `deep_dive_configs.max_sources` (default 12)
- Persist into `deep_dive_sources` with `access_status='unknown'`
- Set job state → `FETCH`

---

## 7) Fetch + Extract (Evidence Extractor) — EXACT

### 7.1 Batching to fit 60s
Because Hobby functions can run up to 60s max. citeturn0search1  
Per invocation:
- Fetch/extract at most **4 sources** (hard cap)

### 7.2 Access rules
Use Stage 2 access filter logic:
- drop paywalled/blocked
- require extracted readable text >= 1200 chars
- store truncated extracted text at max 20k chars

When finished:
- if at least 4 sources are `ok`, proceed to `SYNTHESIZE`
- else:
  - if more sources remain unfetched, continue `FETCH` next invocation
  - if exhausted, mark `partial` and proceed to `SYNTHESIZE` with what you have

---

## 8) Synthesis (Deep Research) — EXACT

### 8.1 Model selection policy
Stage 3 must support two synthesis strategies:

- **Strategy 1 (Preferred): Deep Research model**
  - Use OpenAI “deep research” capable model when enabled.

- **Strategy 2 (Fallback): Standard model map-reduce**
  - Summarize each source individually, then synthesize.

Reason: ensure completion within Vercel time limits even if deep research runs long.

### 8.2 Runtime controls (non-negotiable)
Within a single invocation:
- max sources passed into synthesis: **8**
- max tokens output: **1200** for markdown report
- hard timeout: stop and persist partial draft if nearing function limit

### 8.3 Required report structure (markdown)
Report must follow exactly:

1) **Headline** (one line)
2) **What happened** (3–6 bullets)
3) **What changed** (2–4 bullets; if nothing, say “No meaningful change identified.”)
4) **Why it matters** (3 bullets)
5) **Risks / watch-outs** (2–4 bullets)
6) **Action prompts** (3 bullets; concrete, client-ready)
7) **Sources** (numbered list of links with publication + date if known)

### 8.4 Grounding + anti-slop validators (must enforce)
Reject and retry synthesis once if:
- any section is empty (except “What changed” allowed to be a single “No meaningful change…” line)
- more than 20% of sentences contain vague filler (“leveraging”, “paradigm”, “fast-changing landscape”)
- report makes claims not supported by source text (basic check: named entities must appear in at least one extracted source)

Retry policy:
- 1 retry with stricter prompt
- if fails: set status `partial` and produce report from per-source summaries only

---

## 9) Publishing (Email + Storage) — EXACT

### 9.1 Storage
- Create `deep_dive_reports` with:
  - subject: `Deep Dive — <Topic> — <Month> <Day>`
  - markdown: exact structure above
  - html: rendered markdown (safe HTML)

### 9.2 Email send
- Email is separate from daily digest.
- Footer must include:
  - Update preferences
  - Pause emails
  - Unsubscribe

### 9.3 Caps
- Send at most **1 deep dive email per user per week**.

---

## 10) UI Changes (Preferences) — EXACT

Add to `/prefs` and `/intake`:

### 10.1 Deep dive toggle
- checkbox: “Enable weekly deep dive”
- day-of-week selector
- max sources (slider 6–12; default 12)

### 10.2 Topic selector
- choose 1–3 interests from existing list for deep dive eligibility

If user has <1 interest:
- disable deep dive controls.

---

## 11) Observability (Required)

Log per deep dive job:
- job id, user id (hashed), topic
- state transitions
- number of sources attempted / ok / dropped
- total elapsed time per invocation
- synthesis strategy used (deep research vs fallback)
- whether report is complete/partial

---

## 12) Environment Variables — EXACT

Add to `.env.example`:

- `DEEP_RESEARCH_ENABLED=false`
- `DEEP_DIVE_MAX_USERS_PER_TICK=3`
- `DEEP_DIVE_MAX_FETCH_PER_INVOCATION=4`
- `DEEP_DIVE_MAX_SOURCES=12`
- `DEEP_DIVE_MAX_SYNTHESIS_SOURCES=8`
- `DEEP_DIVE_OUTPUT_TOKENS=1200`

---

## 13) Acceptance Criteria (Definition of Done)

### 13.1 Functional
- Users can enable weekly deep dive and select a day + topic(s).
- System creates at most one job per user per week and sends at most one deep dive email.
- Deep dive completes within Vercel Hobby constraints by using resume-able steps.

### 13.2 Platform compliance (Vercel Hobby)
- Only **once-per-day cron** is used. citeturn0search0
- No function invocation requires >60 seconds. citeturn0search1
- If a job cannot complete in time, it produces a **partial** deep dive and does not block daily digests.

### 13.3 Quality
- Report includes citations/links for every major claim.
- No banned filler phrases.
- Action prompts are specific and usable.

---

## 14) Deliverables (Files that MUST exist)

- `docs/specs/stage3.md` (this file)
- Prisma migration for Stage 3 schema additions
- Worker changes: `job:daily_tick` extended to drive deep dive steps
- `services/deepDive/*` module:
  - `discover.ts`
  - `fetchExtract.ts`
  - `synthesize.ts`
  - `publish.ts`
  - `validators.ts`
- Example deep dive report committed to `reports/` (redact if needed)

---

## 15) Notes on Cron Precision + “6:00am” Expectation

On Vercel Hobby, cron timing is not guaranteed to be exact and can trigger within an hour window. citeturn0search0  
Therefore:
- Daily digest scheduling MUST compute “send day” internally and tolerate drift.
- UI copy must avoid implying exact send times on the free tier.
- If exact 6:00am is required later, plan upgrade is required (out of scope).

---
