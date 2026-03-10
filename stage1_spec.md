# Stage 1 — Preference-Driven Email Digest (MVP) — PRESCRIPTIVE BUILD SPEC

> **Purpose:** Deliver a reliable, brand-compliant, preference-driven email digest on a user-defined schedule, with an **“Update preferences”** link in every email that lands the user in a lightweight preferences UI.
>
> **Key constraint:** Stage 1 is **NOT** “deep research.” Stage 1 is *collection + filtering + light summarization + email delivery*.

---

## 0) Program Execution Model (Parallel Agents + Consolidation)

### 0.1 Workstreams (develop simultaneously)
Run Stage 1 development as **four parallel agents**, each producing code in a dedicated folder and opening a PR:

1. **Agent A — Backend Core**  
   DB schema, APIs, auth tokens, preference CRUD

2. **Agent B — Scheduler + Email**  
   Email template, send pipeline, cron/queue, unsubscribe/pause

3. **Agent C — Collector + Ranking v0**  
   Source ingestion, paywall filter, dedupe, relevance scoring

4. **Agent D — Frontend UI**  
   Intake/preferences page with Crowe styling + motion

### 0.2 Consolidator Agent (single merge authority)
**Agent Z (Consolidator)** pulls the four PRs, resolves conflicts, and ensures:

- All acceptance criteria pass
- A single `.env.example` is valid
- Migrations run clean
- A single `docker compose up` launches the system
- A single `README.md` exists with exact run steps

### 0.3 Contract between agents (DO NOT deviate)
Each agent must implement **exactly** the interfaces defined in sections **4–7**:

- DB tables + columns
- API routes + request/response shapes
- Scheduled job names + expected behavior
- Email HTML variables
- UI endpoints

If you must change an interface, you must:

1) update this spec in `docs/specs/stage1.md`  
2) add an entry in `docs/specs/CHANGELOG.md`  
3) coordinate across agents before merging

---

## 1) Non-Negotiables (Crowe brand + “no slop”)

### 1.1 Typography + layout
- UI and email must use **Arial** or **Helvetica** only.
- Email typography must be safe for Outlook/Gmail:  
  `font-family: Arial, Helvetica, sans-serif;`

### 1.2 Color (Stage 1 strict)
- Use Crowe primary colors as the palette basis:
  - Indigo: `#002D62`
  - Amber: `#FDB913`
- Stage 1: do **not** use gradients.
- Keep palette simple (avoid mixing 3+ accent colors).

### 1.3 Voice constraints (“no AI slop”)
All generated summaries must adhere to:

- **Focused:** short sentences, scannable, avoid filler/jargon.
- **Approachable:** conversational, avoid buzzwords.
- **Active:** active verbs; always include “Why it matters.”
- **Confident:** plain statements backed by evidence; avoid hedging.

### 1.4 Motion (anime.js “Apple-like”)
- Motion is allowed only in the web UI (NOT in email).
- Allowed transitions:
  - `opacity` + `translateY` entry animations
  - hover micro-interactions on chips/buttons
- Hard constraints:
  - total animation duration per interaction: **120–280ms**
  - easing: `easeOutQuad` or `easeOutCubic`
  - do not animate large background shapes in Stage 1

---

## 2) Stage 1 Scope (What ships / what does not)

### 2.1 Ships
- Intake page (create profile)
- Preferences page (edit interests, schedule, pause/unpause)
- Scheduled email sends based on user preference
- RSS-based (or allowlisted URL-based) collection
- Paywall/blocked detection (basic)
- Deduplication
- Light summarization (1–2 sentences + “Why it matters”)
- Email footer contains:
  - update preferences link
  - pause link
  - unsubscribe link

### 2.2 Does NOT ship
- Thumbs up/down relevance training
- Deep research browsing across hundreds of sources
- Complex entity resolution (tickers, fuzzy org matching)
- Multi-tenant enterprise SSO
- User-to-user sharing
- Admin dashboard (optional in Stage 1.1 only)

---

## 3) Tech Stack (Pinned)

### 3.1 Backend
- Node.js 20+
- TypeScript
- PostgreSQL 15+
- Prisma ORM (required)
- Redis (required if using a queue; if cron-only, Redis optional)

### 3.2 Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- anime.js for UI animation

### 3.3 Email
- Provider: Resend OR SendGrid (pick one; Stage 1 default: Resend)
- Templating: Hand-rolled HTML (Stage 1 default)

---

## 4) Data Model (Postgres + Prisma) — EXACT

> **All IDs are UUID v4.**  
> **All timestamps are UTC** (`timestamptz`).

### 4.1 Tables

#### `users`
- `id` UUID PK
- `email` TEXT UNIQUE NOT NULL
- `timezone` TEXT NOT NULL DEFAULT `'America/Indiana/Indianapolis'`
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

#### `profiles`
- `id` UUID PK
- `user_id` UUID UNIQUE FK(users.id) NOT NULL
- `display_name` TEXT NULL
- `role_title` TEXT NULL
- `industry_focus` TEXT NULL
- `email_enabled` BOOLEAN NOT NULL DEFAULT true
- `paused` BOOLEAN NOT NULL DEFAULT false
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

#### `interests`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `section` TEXT NOT NULL  // e.g., "AI", "Expertise", "Clients & Prospects"
- `label` TEXT NOT NULL    // e.g., "AI in financial services"
- `type` TEXT NOT NULL     // 'topic' | 'industry' | 'entity'
- `weight` INT NOT NULL DEFAULT 100  // Stage 1 constant; reserved for later
- `created_at` timestamptz NOT NULL DEFAULT now()

Indexes:
- `(user_id, section)`
- `(user_id, label)`

#### `schedules`
- `id` UUID PK
- `user_id` UUID UNIQUE FK(users.id) NOT NULL
- `rrule` TEXT NOT NULL  // e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=6;BYMINUTE=0;BYSECOND=0"
- `next_send_at` timestamptz NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

#### `sources`
- `id` UUID PK
- `name` TEXT NOT NULL
- `type` TEXT NOT NULL // 'rss'
- `url` TEXT NOT NULL UNIQUE
- `enabled` BOOLEAN NOT NULL DEFAULT true

Seed Stage 1 with 10–20 RSS feeds (engineering-owned; stored in migration seed).

#### `articles`
- `id` UUID PK
- `canonical_url` TEXT UNIQUE NOT NULL
- `title` TEXT NOT NULL
- `source_name` TEXT NOT NULL
- `published_at` timestamptz NULL
- `fetched_at` timestamptz NOT NULL DEFAULT now()
- `snippet` TEXT NULL
- `access_status` TEXT NOT NULL DEFAULT 'unknown' // 'ok' | 'paywalled' | 'blocked' | 'unknown'
- `content_hash` TEXT NULL

#### `article_matches`
- `id` UUID PK
- `article_id` UUID FK(articles.id) NOT NULL
- `user_id` UUID FK(users.id) NOT NULL
- `interest_id` UUID FK(interests.id) NOT NULL
- `score` INT NOT NULL
- `reason` TEXT NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

Indexes:
- `(user_id, article_id)`
- `(user_id, score DESC)`

#### `digests`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `run_date` DATE NOT NULL  // date in user's timezone
- `subject` TEXT NOT NULL
- `html` TEXT NOT NULL
- `text` TEXT NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

Unique:
- `(user_id, run_date)`

#### `email_events`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `digest_id` UUID FK(digests.id) NULL
- `type` TEXT NOT NULL // 'sent' | 'bounced' | 'complaint' | 'unsubscribed'
- `payload` JSONB NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

#### `auth_tokens`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `token_hash` TEXT UNIQUE NOT NULL
- `scope` TEXT NOT NULL // 'prefs' | 'unsubscribe' | 'pause'
- `expires_at` timestamptz NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

---

## 5) API Contracts (Backend Core) — EXACT

Base URL: `/api`

### 5.1 Intake
#### `POST /api/intake`
Request:
```json
{
  "email": "user@domain.com",
  "timezone": "America/Indiana/Indianapolis",
  "displayName": "First Last",
  "roleTitle": "Financial Services Consultant",
  "industryFocus": "Financial Services",
  "schedule": {
    "days": ["MO", "WE", "FR"],
    "hour": 6,
    "minute": 0
  },
  "interests": [
    { "section": "AI", "label": "AI in Consulting", "type": "topic" },
    { "section": "Expertise", "label": "Anti-Money Laundering", "type": "topic" }
  ]
}
```

Response `200`:
```json
{ "ok": true, "prefsUrl": "https://APP_HOST/prefs?token=..." }
```

Rules:
- Create `users`, `profiles`, `schedules`, `interests`.
- Compute RRULE exactly:
  - `FREQ=WEEKLY;BYDAY=<daysCSV>;BYHOUR=<hour>;BYMINUTE=<minute>;BYSECOND=0`
- Set `next_send_at` to the next occurrence in the user timezone, stored in UTC.

### 5.2 Preferences retrieval
#### `GET /api/prefs?token=...`
Response `200`:
```json
{
  "email": "user@domain.com",
  "timezone": "...",
  "profile": { "displayName": "...", "roleTitle": "...", "industryFocus": "...", "paused": false },
  "schedule": { "days": ["MO","WE","FR"], "hour": 6, "minute": 0 },
  "interests": [
    { "id": "...", "section": "AI", "label": "AI in Consulting", "type": "topic" }
  ]
}
```

Rules:
- Validate token scope is `prefs` and token is not expired.

### 5.3 Preferences update
#### `PUT /api/prefs?token=...`
Request:
```json
{
  "profile": { "displayName": "...", "roleTitle": "...", "industryFocus": "...", "paused": false },
  "schedule": { "days": ["MO","WE","FR"], "hour": 6, "minute": 0 },
  "interests": [
    { "section": "AI", "label": "AI in financial services", "type": "topic" }
  ]
}
```

Response `200`:
```json
{ "ok": true }
```

Rules:
- Replace interests entirely (delete all user interests, then insert).
- Update schedule RRULE + recompute `next_send_at`.
- Preserve user id + email.

### 5.4 Pause/Unpause
#### `POST /api/pause?token=...`
Body: `{ "paused": true }` or `{ "paused": false }`  
Response: `{ "ok": true }`

Token scope must be `pause`.

### 5.5 Unsubscribe
#### `POST /api/unsubscribe?token=...`
Response: `{ "ok": true }`

Rules:
- Set `profiles.email_enabled = false`
- Create `email_events.type='unsubscribed'`

Token scope must be `unsubscribe`.

---

## 6) Scheduler + Digest Pipeline — EXACT

### 6.1 Jobs (names must match)
- `job:collect_sources` (runs hourly)
- `job:build_digests` (runs every 15 minutes)
- `job:send_due_emails` (runs every 5 minutes)
- `job:cleanup_tokens` (runs daily)

### 6.2 `job:collect_sources`
Steps:
1. For each enabled `sources` row:
2. Fetch RSS (max 20 items per feed).
3. For each item:
   - Normalize URL → `canonical_url`
   - Upsert into `articles`
   - Store `title`, `source_name`, `published_at`, `snippet` (description if present)
4. Do NOT summarize here.

### 6.3 Paywall/blocked check (Stage 1 basic)
In `job:build_digests` (not in collector):
- For each candidate article being considered for a user:
  - `HEAD` request on `canonical_url`
  - If `401/403` or redirect to login/subscription → set `access_status='paywalled'` or `'blocked'` and exclude
  - If response OK but content-length very small (< 5KB) AND snippet contains “subscribe/sign in” markers → mark as paywalled and exclude
- Store decision back to `articles.access_status`

### 6.4 Matching + scoring v0
For each user with `profiles.email_enabled=true` and not paused:
1. Pull interests grouped by `section`.
2. Pull recent articles from the last 72 hours with `access_status != 'paywalled'`.
3. Score:
   - Exact case-insensitive match of `interest.label` in `title` → +100
   - Match in `snippet` → +60
   - Word overlap (>=2 distinct tokens) in title/snippet → +30
4. Create `article_matches` records for top 50 scored per user.

### 6.5 Digest assembly (per user per send date)
Rules:
- Max **8 total items** across all sections.
- Max **3 items** per section.
- If a section has 0 matches, omit the section entirely.
- Dedupe:
  - same `canonical_url` only once
  - same title similarity > 0.92 only once

### 6.6 Summarization (Stage 1)
For each included article:
- Generate:
  - `Summary` (1–2 sentences)
  - `Why it matters` (1 sentence)
- Hard checks:
  - Reject output if it contains any of:
    - “in today’s fast-changing landscape”
    - “it is important to note”
    - “this article discusses”
  - Reject output if it contains fewer than **1 concrete proper noun** (organization/regulator/product) OR **1 concrete event** (launch, rule, acquisition, outage, filing).
  - If rejected, retry once with stricter prompt; if rejected again, fall back to: use title + snippet rewrite (no model call).

### 6.7 `job:send_due_emails`
- For each user where `next_send_at <= now()` AND `email_enabled=true` AND not paused:
  1) Build digest if not already built for `run_date` (user timezone date)
  2) Send email
  3) Record `email_events.type='sent'`
  4) Compute next `next_send_at` from RRULE and update `schedules.next_send_at`

---

## 7) Email Template (HTML) — EXACT

### 7.1 Subject format
`Your Briefing — <Weekday>, <Month> <Day>`

Example:
`Your Briefing — Wednesday, February 11`

### 7.2 Header
- Left: “Your Briefing”
- Right (small): date

### 7.3 Section format
For each section:
- Section title (Indigo text)
- Items as cards:
  - Title (link)
  - Summary (1–2 sentences)
  - Why it matters (1 sentence, begins with “Why it matters:”)
  - Source + date (muted)

### 7.4 Footer links (must exist)
- `Update preferences` → signed prefs token
- `Pause emails` → signed pause token
- `Unsubscribe` → signed unsubscribe token

### 7.5 Styling constraints
- Font: Arial/Helvetica only
- Color usage:
  - Indigo `#002D62` for headings/structure
  - Amber `#FDB913` for links/accents
- No external CSS; inline styles only.

### 7.6 Optional strapline
If enabled via env var `EMAIL_SHOW_STRAPLINE=true`, add:
`Smart decisions. Lasting value.` (exact punctuation/case)

Plain text only; Helvetica Bold or Arial Bold.

---

## 8) Frontend UI (Intake + Preferences) — EXACT

Routes:
- `/intake` — first-time setup
- `/prefs?token=...` — preferences editor (token required)

### 8.1 Intake form fields
Required:
- Email
- Timezone (default America/Indiana/Indianapolis)
- Schedule: days + time
- At least 1 interest

Optional:
- Display name
- Role title
- Industry focus

### 8.2 Interests editor
- UI is a list of sections.
- Each section contains chips.
- Add interest:
  - user chooses section name (free text OR selects existing)
  - enters label
  - selects type (topic/industry/entity)
- Remove interest: “x” on chip

### 8.3 Motion requirements (anime.js)
- Chip add/remove animation:
  - add: fade+slide in (200ms)
  - remove: fade+shrink (160ms)
- Save button:
  - subtle press animation on click (120ms)

### 8.4 Visual rules
- Typography must be Arial/Helvetica
- Use generous whitespace
- Avoid clutter; do not show “AI generated” labels.

---

## 9) Security + Tokens — EXACT

### 9.1 Token creation rules
When sending an email, create 3 tokens per user:
- prefs token: scope `prefs`, expires in 14 days
- pause token: scope `pause`, expires in 14 days
- unsubscribe token: scope `unsubscribe`, expires in 90 days

Token must be:
- 32+ bytes random, base64url encoded
- stored hashed in DB (store `sha256(token)`; never store raw)

### 9.2 Token validation
- Compare sha256(token) to stored hash
- Enforce scope
- Enforce expires_at

---

## 10) Environment Variables — EXACT

Create `.env.example` containing:

- `DATABASE_URL=postgresql://...`
- `APP_HOST=https://localhost:3000`
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=...`
- `EMAIL_FROM="Crowe Briefing <no-reply@yourdomain.com>"`
- `EMAIL_SHOW_STRAPLINE=false`
- `OPENAI_API_KEY=...` (summarization only; Stage 1)
- `OPENAI_MODEL=gpt-4.1-mini` (or equivalent small model)
- `CRON_ENABLED=true`

---

## 11) Acceptance Criteria (Definition of Done)

### 11.1 Functional
- A user completes `/intake` and receives `prefsUrl`.
- On next scheduled run, user receives an email with:
  - sections derived from their interests,
  - working links,
  - working Update preferences / Pause / Unsubscribe links.
- User clicks Update preferences and can:
  - add/remove interests,
  - change schedule,
  - save successfully.
- Pause stops future emails; Unsubscribe stops future emails permanently.

### 11.2 Quality
- Email contains none of the banned filler phrases.
- Each item has Summary + Why it matters.
- Max 8 items total.

### 11.3 Brand compliance
- Email and UI use Arial/Helvetica only
- Indigo/Amber used as primary colors
- Voice adheres to Focused/Approachable/Active/Confident constraints

---

## 12) Deliverables (Files that MUST exist)

- `docs/specs/stage1.md` (this file)
- `docs/specs/CHANGELOG.md`
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `apps/web` (Next.js)
- `apps/api` (Node/TS)
- `apps/worker` (jobs)
- `README.md` with:
  - setup steps
  - seed steps
  - run steps
  - test send instructions

---

## 13) Test Plan (Must be automated)

### 13.1 Unit tests
- RRULE generation from schedule input
- Next send time computation
- Token hashing/validation
- Paywall detection heuristics

### 13.2 Integration tests
- Intake → schedule set → digest created → email sent
- Prefs update → schedule recalculated
- Pause/unsubscribe flows

---

## 14) Stage 1 Output Example (Structure Only)

Sections:
- AI  
  - [Title](link)  
    - Summary: ...  
    - Why it matters: ...  
    - Source | Date
- Expertise  
  - ...

Footer:
- Update preferences | Pause emails | Unsubscribe

---

## 15) Handoff Notes for Stage 2+
- Feedback (thumbs up/down) will attach to `article_matches` and adjust weights.
- “Deep research” will be a separate job path and must NOT affect Stage 1 reliability.
