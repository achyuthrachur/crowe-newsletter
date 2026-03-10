# Consolidation Agent (Agent Z) — Stages 1–4 Merge + Release Orchestrator — PRESCRIPTIVE BUILD SPEC

> **Purpose:** Agent Z is the *single merge authority* that consolidates the parallel workstreams for Stages 1–4 into a single deployable Vercel Hobby (free tier) application, ensuring interface compatibility, quality gates, migrations, and release readiness.

---

## 0) Agent Z Operating Rules (Non-Negotiable)

1) **Agent Z is the only entity allowed to merge to `main`.**  
2) Agent Z must not “re-design” features. It must **enforce the existing specs** and resolve inconsistencies by:
   - picking the spec as source of truth, then
   - updating code to match the spec (preferred), or
   - updating the spec ONLY if all impacted agents agree and change is documented.
3) Agent Z must keep Stage 1 stable at all times. Stages 2–4 must be **feature-flagged**.
4) Agent Z must ensure Vercel Hobby constraints are respected:
   - one daily cron path for anything that must run on Hobby
   - no single serverless function exceeds configured max duration
5) Agent Z must produce a single, runnable “golden path”:
   - `pnpm install`
   - `pnpm db:migrate`
   - `pnpm dev`
   - `pnpm test`
   - `pnpm run send:test` (or equivalent)

---

## 1) Inputs (What Agent Z Receives)

Agent Z receives **four PRs per stage** (or fewer if combined), named:

- `stage1-agentA-backend-core`
- `stage1-agentB-scheduler-email`
- `stage1-agentC-collector-ranking`
- `stage1-agentD-frontend-ui`

…and similarly for stage2/3/4.

Each PR must include:
- code changes
- migration(s) if schema touched
- tests for new behavior
- updated `.env.example` fields (when required)
- a short PR note describing:
  - what is implemented
  - how to run it locally
  - what feature flags are required

---

## 2) Consolidation Strategy (Merge Order)

Agent Z must merge in this strict order:

### 2.1 Stage 1 (foundation)
1) Backend Core (DB + APIs)
2) Scheduler + Email
3) Collector + Ranking v0
4) Frontend UI

Only after Stage 1 is passing locally:
- proceed to Stage 2.

### 2.2 Stage 2
1) Schema additions + source rules
2) WebSearch candidates pipeline + stricter access checks
3) Ranking v1 + summarization v2 validators
4) UI depth control
5) Capability harness

### 2.3 Stage 3 (Vercel Hobby compatibility focus)
1) Schema additions for deep dive jobs/reports
2) Deep-dive step machine module
3) Daily tick integration
4) UI weekly deep dive controls
5) Deep-dive email template

### 2.4 Stage 4
1) Schema additions for feedback/blocks/suppressions
2) Feedback endpoint + token scope
3) Preference UI extensions
4) Ranking v2 personalization
5) Email feedback links

---

## 3) Shared Contract Enforcement (Interfaces Agent Z Must Verify)

Agent Z must verify the following **do not drift** across PRs:

### 3.1 Database contract
- Prisma schema matches Stage specs:
  - Stage 1 core tables
  - Stage 2 additions (depth_level, source_rules, search_queries/results)
  - Stage 3 additions (deep dive configs/jobs/sources/reports)
  - Stage 4 additions (feedback, blocks, suppressions, caps)

### 3.2 API contract
Must exist and match spec routes:
- `POST /api/intake`
- `GET /api/prefs?token=...`
- `PUT /api/prefs?token=...`
- `POST /api/pause?token=...`
- `POST /api/unsubscribe?token=...`
- Stage 4: `GET /api/feedback?token=...&action=...`

### 3.3 Worker job contract
Must exist and match spec names (even if implementations change):
- Stage 1:
  - `job:collect_sources`
  - `job:build_digests`
  - `job:send_due_emails`
  - `job:cleanup_tokens`
- Stage 2:
  - `job:websearch_candidates`
- Stage 3:
  - `job:daily_tick` (single daily cron driver)
  - deep dive step runner invoked by daily_tick
- Stage 4:
  - no new jobs required; extends build_digests + cleanup

### 3.4 Email template variables
Agent Z must ensure email rendering uses a consistent set of variables and no PR introduces incompatible template assumptions.

---

## 4) Feature Flag System (Required)

Agent Z must enforce that Stage 2–4 behavior is gated behind env flags:

### 4.1 Required flags
- `WEBSEARCH_ENABLED` (Stage 2)
- `DEEP_RESEARCH_ENABLED` (Stage 3)
- `FEEDBACK_ENABLED` (Stage 4)
- `PERSONALIZATION_ENABLED` (Stage 4)

### 4.2 Default behavior
- If a flag is absent or false:
  - Stage 1 must still run end-to-end without errors.
  - Code must not crash on missing optional tables/fields (but migrations will exist—so tables should exist; still code must not assume enabled).

### 4.3 Flag evaluation policy
- Flags must be evaluated in a single module:
  - `packages/config/flags.ts`
- No direct `process.env.FLAG` checks scattered in code.

---

## 5) Repository Structure (Single Standard)

Agent Z must enforce and adjust to the following structure:

- `apps/web` — Next.js app (UI + API routes if using Next API)
- `apps/worker` — background jobs runner (can be a Next route invoked by cron, but keep logic here)
- `packages/db` — Prisma + DB helpers
- `packages/email` — email template + send adapter
- `packages/core` — shared domain logic (scoring, filters, validators)
- `docs/specs/` — stage specs + changelog
- `scripts/` — harness scripts
- `reports/` — committed example outputs (redacted)

If a PR deviates, Agent Z must refactor during consolidation.

---

## 6) Vercel Hobby Deployment Constraints (Agent Z Must Enforce)

### 6.1 Cron strategy
- Only **one daily Vercel cron** is assumed reliable on Hobby.
- Agent Z must ensure:
  - Stage 1 “schedule” logic works even when cron is daily (drift-tolerant).
  - Stage 3 deep dives are advanced via the daily tick.
- If Stage 1 uses frequent worker loops locally, production must degrade gracefully:
  - daily cron triggers “catch-up” processing.

### 6.2 Function runtime
- Ensure functions finish within configured max duration.
- Any long operations must be:
  - batched
  - persisted
  - resume-able (Stage 3 deep dives)

### 6.3 Storage
- Use Postgres (Neon/Supabase/etc.) external DB; do NOT rely on filesystem for persistence.
- Vercel filesystem is ephemeral.

---

## 7) Consolidation Checklist (Step-by-Step)

Agent Z must perform these steps in order:

### 7.1 Pre-merge prep
1) Create consolidation branch: `consolidation/stages1-4`
2) Pull latest `main`
3) Apply each PR in the merge order (Section 2) using:
   - `git merge --no-ff` where possible
   - resolve conflicts with spec-first policy

### 7.2 Schema + migrations
1) Ensure every schema change has a migration.
2) Ensure migrations apply cleanly in order:
   - `pnpm db:reset` (local dev only)
   - `pnpm db:migrate`
3) Ensure Prisma client regeneration is included (or scripted).

### 7.3 API smoke tests (manual, required)
Using curl/Postman:
1) Intake creates user + returns prefsUrl
2) GET prefs loads profile
3) PUT prefs updates interests, schedule, blocks (Stage 4)
4) Pause toggles paused
5) Unsubscribe disables email
6) Feedback click records event + confirmation page

### 7.4 Worker smoke tests (manual, required)
1) Run source collection once and verify articles inserted.
2) Build digest once and verify digests created.
3) Send due emails once and verify email_events recorded.
4) If WEBSEARCH_ENABLED:
   - verify search_queries/results populated.
5) If DEEP_RESEARCH_ENABLED:
   - create a deep dive config and verify deep_dive_jobs advance state.
6) If FEEDBACK_ENABLED:
   - feedback actions affect subsequent ranking.

### 7.5 Automated test suite (required)
Run:
- `pnpm test`
- Must include:
  - token hashing/validation tests
  - scoring tests
  - block/suppression enforcement tests
  - deep dive state machine tests (can be mocked)

---

## 8) Conflict Resolution Policy (How Agent Z Must Decide)

When PRs conflict:

### 8.1 Priority order
1) **Stage spec docs** (docs/specs/stageN.md)
2) Shared contracts (DB/API/job names)
3) Brand and “no slop” constraints
4) Performance + Vercel limits
5) Code style consistency

### 8.2 If specs conflict with each other
Agent Z must:
1) create a single reconciliation note in `docs/specs/CHANGELOG.md`
2) update both impacted specs to align
3) apply code changes to match the reconciled spec

---

## 9) “No Slop” Enforcement (Agent Z Responsibilities)

Agent Z must ensure summarization validators are actually wired in:
- Stage 1 banned phrases
- Stage 2 grounding checks
- Stage 3 deep dive report structure validators
- Stage 4 “why you got this” must be deterministic, no model calls

Agent Z must add a centralized validator module if PRs implement ad-hoc rules:
- `packages/core/validators/*`

---

## 10) Release Packaging (Vercel Hobby Ready)

### 10.1 Final `.env.example` must include
Stage 1 + 2 + 3 + 4 variables, with safe defaults:
- `WEBSEARCH_ENABLED=false`
- `DEEP_RESEARCH_ENABLED=false`
- `FEEDBACK_ENABLED=false`
- `PERSONALIZATION_ENABLED=false`

### 10.2 README (single, exact)
README must include:
- local dev prerequisites
- DB setup
- running web + worker
- seeding sources
- running capability harness
- deploying to Vercel Hobby:
  - environment vars
  - cron setup
  - DB provisioning notes

### 10.3 One-command smoke script
Add:
- `scripts/smoke.ts` that:
  - seeds one test user + interests
  - runs one collection/build/send cycle (in dry-run mode if provider not configured)

---

## 11) Acceptance Criteria (Definition of Done for Agent Z)

Agent Z is done only when:

1) The consolidated branch builds and runs locally.
2) All migrations apply cleanly.
3) Stage 1 works with all flags disabled.
4) Stage 2 works when WEBSEARCH_ENABLED=true.
5) Stage 3 works on a daily tick model without blocking Stage 1.
6) Stage 4 works (feedback/blocks/suppressions) without breaking Stage 1/2/3.
7) Vercel Hobby deployment is viable:
   - single daily cron supported
   - no long-running function assumptions
8) A single PR to `main` is ready with:
   - summary of features per stage
   - list of env vars and defaults
   - known limitations on free tier (cron timing)

---

## 12) Deliverables (Files Agent Z Must Produce)

- `docs/specs/consolidation_agent_z.md` (this file)
- Updated `docs/specs/CHANGELOG.md` with reconciliation notes if any
- Unified `.env.example`
- Unified `README.md`
- `scripts/smoke.ts`
- A final PR: `release/stages1-4`

---
