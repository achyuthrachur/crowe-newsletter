# Stage 4 — Feedback Learning + User Controls (Personalization) — PRESCRIPTIVE BUILD SPEC

> **Purpose:** Make the digest *improve over time per person* via explicit feedback (👍/👎/dismiss), per-user controls (weights, excludes, source blocks), and transparent “why you got this” explanations.
>
> **Constraint:** Stage 4 must remain lightweight (rules + weights), not a heavy ML system.

---

## 0) Parallel Development Model (and Dependencies)

### 0.1 What can be built simultaneously with Stages 1–3
Stage 4 can be developed **in parallel** with Stage 1/2/3 if the Stage 1 contracts remain stable:

- Email feedback link construction (can be implemented against token contract)
- New DB tables + migrations
- New APIs for feedback + per-user rules
- UI updates for weights/excludes/blocks
- Ranking adjustments that read from new tables (can be feature-flagged)

### 0.2 What depends on Stage 1 being complete
Stage 4 requires Stage 1 to be merged for:
- tokenized email link pattern
- baseline `/prefs?token=...` pages and the send pipeline

Stage 4 must not merge to main until Stage 1 API/token interface exists.

---

## 1) Stage 4 Scope (ONLY what you want)

### 1.1 Ships
- Per-article feedback actions in every email:
  - 👍 Relevant
  - 👎 Not relevant
  - 🚫 Dismiss / Hide (one-click)
- Per-user controls in preferences:
  - Interest weights (priority)
  - Exclude keywords
  - Block sources (domains)
  - Caps: max items total + max items per section
  - Delivery style: Quick / Standard / Expanded (ties to Stage 2 routing)
- “Why you got this” explanation per item:
  - matched interest(s)
  - ranking reasons (recency, source tier, match type)
- A lightweight learning-to-rank layer:
  - adjusts scores using feedback, weights, excludes, and source blocks
- Hygiene automation:
  - auto-suppress consistently downvoted sources per user
  - prevent repeats of dismissed stories

### 1.2 Explicitly OUT OF SCOPE
Do not implement anything beyond the above (no team sharing, no enterprise admin, no heavy recommender ML).

---

## 2) Data Model Additions — EXACT

> Add these tables/columns. Do not remove Stage 1/2/3 tables.

### 2.1 Modify `profiles`
Add:
- `max_items_total` INT NOT NULL DEFAULT 8
- `max_items_per_section` INT NOT NULL DEFAULT 3

### 2.2 Modify `interests`
Add/activate:
- `weight` INT NOT NULL DEFAULT 100

Range enforcement:
- min 0, max 200 (API must clamp)

### 2.3 New table: `user_keyword_blocks`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `keyword` TEXT NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

Unique:
- `(user_id, keyword)`

Rules:
- keyword compare is case-insensitive
- treat keyword as substring match against title + snippet + extracted text (if available)

### 2.4 New table: `user_source_blocks`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `domain` TEXT NOT NULL  // normalized domain, lowercase, no www
- `created_at` timestamptz NOT NULL DEFAULT now()

Unique:
- `(user_id, domain)`

### 2.5 New table: `feedback_events`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `article_id` UUID FK(articles.id) NOT NULL
- `digest_id` UUID FK(digests.id) NULL
- `interest_id` UUID FK(interests.id) NULL
- `action` TEXT NOT NULL
  Allowed: `upvote | downvote | dismiss | block_source`
- `created_at` timestamptz NOT NULL DEFAULT now()

Indexes:
- `(user_id, created_at DESC)`
- `(user_id, article_id)`

### 2.6 New table: `user_story_suppressions`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `canonical_url` TEXT NOT NULL
- `title_hash` TEXT NOT NULL
- `expires_at` timestamptz NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

Unique:
- `(user_id, canonical_url)`

Rules:
- dismiss action creates a suppression for 14 days by default.

---

## 3) Tokenized Feedback Links (Email) — EXACT

### 3.1 Token strategy
Reuse Stage 1 `auth_tokens` infrastructure. Each email send must generate tokens for:
- `prefs` (existing)
- `pause` (existing)
- `unsubscribe` (existing)
- **NEW:** `feedback` scope (expires 30 days)

Token must be:
- random 32+ bytes base64url
- stored hashed (sha256) as Stage 1 requires

### 3.2 Feedback endpoints use token + payload
Each feedback link must include:
- token
- action
- article_id
- digest_id
- optional interest_id
- optional domain (for block_source)

Example:
`/api/feedback?token=...&action=upvote&articleId=...&digestId=...&interestId=...`

---

## 4) API Contracts — EXACT

Base URL: `/api`

### 4.1 Record feedback
#### `GET /api/feedback`
Query params:
- `token` (required; scope must be `feedback`)
- `action` (required; enum)
- `articleId` (required)
- `digestId` (optional but recommended)
- `interestId` (optional)
- `domain` (required only if action == block_source)

Response:
- Return an HTML confirmation page:
  - “Saved. You can close this tab.”
  - Optionally include a link to `/prefs?token=...` (mint a fresh prefs token)

Rules:
- Insert into `feedback_events`
- If action == `dismiss`:
  - upsert `user_story_suppressions` for 14 days
- If action == `block_source`:
  - upsert `user_source_blocks`

### 4.2 Preferences update (extend Stage 1)
#### `PUT /api/prefs?token=...`
Add fields to request:
```json
{
  "profile": {
    "displayName": "...",
    "roleTitle": "...",
    "industryFocus": "...",
    "paused": false,
    "maxItemsTotal": 8,
    "maxItemsPerSection": 3
  },
  "schedule": { "days": ["MO","WE","FR"], "hour": 6, "minute": 0 },
  "interests": [
    { "section": "AI", "label": "AI in financial services", "type": "topic", "weight": 140 }
  ],
  "keywordBlocks": ["crypto", "venture capital"],
  "sourceBlocks": ["example.com", "anotherdomain.org"]
}
```

Rules:
- Replace interests entirely (delete all then insert), including `weight`.
- Replace keywordBlocks entirely.
- Replace sourceBlocks entirely.
- Clamp:
  - weight: 0..200
  - maxItemsTotal: 1..12
  - maxItemsPerSection: 1..5

---

## 5) Ranking v2 (Personalized) — EXACT

Stage 4 modifies scoring in `job:build_digests`:

### 5.1 Base score
Start from Stage 2 score (or Stage 1 score if Stage 2 absent).

### 5.2 Apply interest weights
Multiply interest match component by `(weight / 100)`.

### 5.3 Apply keyword excludes
If any blocked keyword matches title/snippet/text:
- Drop candidate (hard exclude)

### 5.4 Apply source blocks
If candidate domain is blocked:
- Drop candidate (hard exclude)

### 5.5 Apply story suppressions
If candidate canonical_url suppressed and not expired:
- Drop candidate

### 5.6 Feedback learning adjustments (lightweight)
- If upvoted domain >= 3 in last 30 days: +10
- If downvoted domain >= 3 in last 30 days: -25
- If downvoted matched interest >= 3 in last 30 days: -20 (only that interest)

Guardrail:
- feedback never overrides hard excludes.

---

## 6) Digest Assembly Changes — EXACT

Use per-user caps:
- total items = `profiles.max_items_total`
- max per section = `profiles.max_items_per_section`

---

## 7) “Why you got this” Explanations — EXACT

Add a deterministic reason line per item:

`Why you got this: <InterestLabel> • <MatchType> • <Recency> • <SourceTier>`

- MatchType ∈ {Title match, Snippet match, Keyword match}
- Recency ∈ {<24h, 1–3d, 3–7d}
- SourceTier ∈ {Tier 1, Tier 2, Tier 3}

No model call allowed.

---

## 8) Email Template Changes — EXACT

### 8.1 Add feedback buttons per item
Under each item card:
- 👍 Relevant
- 👎 Not relevant
- 🚫 Hide this

These must be email-safe links styled as buttons.

### 8.2 Footer unchanged
Keep Stage 1 footer links; Update preferences now includes blocks/weights/caps UI.

---

## 9) UI Changes (Preferences) — EXACT

### 9.1 Interest weights
- slider 0..200, default 100
- presets: Low (70), Normal (100), High (140), Critical (180)

### 9.2 Keyword blocks
- add/remove keyword chips

### 9.3 Source blocks
- add/remove domain chips (normalize and validate)

### 9.4 Caps
- Max total items (1..12)
- Max items per section (1..5)

### 9.5 Motion
Keep anime.js constraints:
- 120–280ms
- easeOutQuad/easeOutCubic
- subtle only

---

## 10) Worker Jobs — EXACT

No new cron jobs required.

Update:
- `job:build_digests` reads:
  - interests weights
  - keyword blocks
  - source blocks
  - suppressions
  - last-30d feedback aggregates

Extend cleanup:
- `job:cleanup_tokens` also deletes expired suppressions:
  - `DELETE FROM user_story_suppressions WHERE expires_at < now()`

---

## 11) Observability (Required)

Log per digest build:
- candidates before personalization
- dropped counts by reason:
  - keyword blocks
  - source blocks
  - suppressions
  - paywall
- final selected counts per section
- top 5 domains selected

No PII in logs (hash identifiers).

---

## 12) Environment Variables — EXACT

Add:
- `FEEDBACK_ENABLED=true`
- `PERSONALIZATION_ENABLED=true`
- `SUPPRESSION_DAYS_DEFAULT=14`
- `FEEDBACK_LOOKBACK_DAYS=30`

---

## 13) Acceptance Criteria (Definition of Done)

- Email feedback clicks record events successfully.
- Blocking a source or keyword prevents future inclusion.
- Dismiss suppresses a story for 14 days.
- Digest respects caps and weights.
- “Why you got this” appears for every item.
- No increase in generic filler in summaries.

---

## 14) Deliverables (Files that MUST exist)

- `docs/specs/stage4.md` (this file)
- Prisma migration(s)
- `/api/feedback` endpoint
- extended `/api/prefs` endpoint
- Updated email template with feedback links
- Updated `/prefs` UI with weights/blocks/caps
- Tests:
  - feedback recording
  - enforcement of blocks/suppressions
  - caps enforcement

---
