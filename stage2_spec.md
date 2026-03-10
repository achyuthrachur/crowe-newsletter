# Stage 2 — Web Search Research Layer + Quality Gates (MVP+) — PRESCRIPTIVE BUILD SPEC

> **Purpose:** Expand beyond RSS allowlists by adding an agentic **Web Search** capability that discovers open-web articles and produces a higher-quality daily digest—while enforcing strict anti-slop + paywall avoidance rules.
>
> **Key constraint:** Stage 2 is **targeted browsing**, not “hundreds of sources synthesis.” (That is Stage 3.)

---

## 0) Parallel Development Model (and Dependencies)

### 0.1 What can be built simultaneously with Stage 1
Stage 2 can be developed **in parallel** with Stage 1, provided that Stage 1’s DB tables and user preference model are treated as the contract (same `users`, `profiles`, `interests`, `schedules`, `digests`).

Parallelizable now:
- Web search tool integration (collector v2)
- Source quality scoring + allow/deny rules
- Capability harness (RSS-only vs WebSearch vs later DeepResearch)
- UI enhancements to add “source controls” and “depth level” (flagged-only in Stage 2)

### 0.2 What depends on Stage 1 being complete
Stage 2 requires Stage 1 to be merged for:
- tokenized preferences link flows (intake/prefs)
- scheduled send infrastructure (`job:send_due_emails`)
- baseline digest assembly + email template variables

If Stage 1 isn’t merged yet, Stage 2 must:
- compile and run in isolation with mocks, but
- not merge to main until Stage 1 interfaces exist.

---

## 1) Stage 2 Scope (What ships / what does not)

### 1.1 Ships
- Web Search based article discovery per user
- Strict source/access filtering (paywall avoidance)
- Stronger dedupe + cluster detection
- Multi-source corroboration rule (optional but recommended)
- Quality gates (anti-slop and grounding enforcement)
- Capability harness report generator

### 1.2 Does NOT ship
- Thumbs up/down personalization training (Stage 4)
- “Deep research” mode using deep-research models (Stage 3)
- Complex NER/entity linking beyond interest label matching

---

## 2) Architecture Changes (Add WebSearch Path)

### 2.1 New pipeline concept
Stage 2 adds a second candidate stream:

- **Stream A:** RSS allowlist candidates (Stage 1)
- **Stream B:** WebSearch candidates (Stage 2)

Both streams converge into:
- paywall/access check
- dedupe/cluster
- scoring/ranking
- summary generation
- digest assembly + email send

### 2.2 Routing rules (when to use WebSearch)
For each user digest build:
- Always run Stream A (RSS) first.
- Run Stream B (WebSearch) only if **any** are true:
  1) total eligible items from Stream A < 6, OR
  2) at least 1 section has zero items, OR
  3) user has set `depth_level` to `standard` or `expanded` (Stage 2 UI flag)

---

## 3) Data Model Additions — EXACT

> Add the following tables/columns. Do not modify Stage 1 tables except where specified.

### 3.1 Modify `profiles`
Add:
- `depth_level` TEXT NOT NULL DEFAULT 'quick'  
  Allowed values: `'quick' | 'standard' | 'expanded'`

### 3.2 Modify `sources`
Add:
- `quality_tier` INT NOT NULL DEFAULT 2  
  Allowed values: `1` (highest), `2` (good), `3` (allowed), `9` (blocked)

### 3.3 New table: `source_rules`
- `id` UUID PK
- `pattern` TEXT NOT NULL  // domain or regex pattern
- `action` TEXT NOT NULL   // 'allow' | 'block'
- `reason` TEXT NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

Rules:
- Apply in order of creation time (oldest first).
- First match wins.

### 3.4 New table: `search_queries`
- `id` UUID PK
- `user_id` UUID FK(users.id) NOT NULL
- `run_date` DATE NOT NULL
- `query` TEXT NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

### 3.5 New table: `search_results`
- `id` UUID PK
- `search_query_id` UUID FK(search_queries.id) NOT NULL
- `rank` INT NOT NULL
- `title` TEXT NOT NULL
- `url` TEXT NOT NULL
- `snippet` TEXT NULL
- `source_name` TEXT NULL
- `published_at` timestamptz NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

Unique:
- `(search_query_id, url)`

---

## 4) Jobs (Worker) — EXACT

### 4.1 New job name
- `job:websearch_candidates` (runs every 30 minutes)

### 4.2 Update existing job
- `job:build_digests` now consumes WebSearch candidates in addition to RSS.

---

## 5) Web Search Integration — EXACT

### 5.1 Tooling constraint
Stage 2 uses the OpenAI API with:
- **Responses API**
- **Web Search tool** for discovery

Implementation must support:
- configuring max tool calls per digest build
- limiting total fetched results per query

### 5.2 Query generation rules (per user, per section)
For each user section:
1) Build 1 query per interest label (cap 2 per section).
2) Query format:
   - `"<interest label>" AND (bank OR financial services OR consulting OR regulation OR technology)`  
   - If type == `entity`, query becomes:
     - `"<entity label>" AND (press release OR earnings OR regulatory OR partnership OR acquisition OR lawsuit)`
3) Always include time recency:
   - `past 7 days` bias (implementation via tool parameter or query phrase; choose one and standardize)

### 5.3 Limits (hard)
Per user digest build:
- Max queries: **8**
- Max results per query: **5**
- Max total candidate URLs: **40**
- Max OpenAI tool calls: **12** (including summarization calls)

If limits are exceeded:
- Stop WebSearch and proceed with available candidates.

### 5.4 Persist search artifacts
- Write each generated query into `search_queries`.
- Write each returned result into `search_results`.
- Do not insert into `articles` until it passes access checks.

---

## 6) Source Filtering Rules — EXACT

### 6.1 Domain extraction
Extract domain from candidate URL.
- Normalize: lowercase, remove `www.` prefix.

### 6.2 Apply `source_rules`
- If any `source_rules.pattern` matches domain (substring match by default):
  - action `block` => drop candidate
  - action `allow` => allow (continue checks)

### 6.3 Hard-block list (Stage 2 seed)
Seed `source_rules` with action `block` for:
- medium.com (unless org-owned subdomain)
- substack.com (unless org-owned domain)
- link aggregators / scraped mirrors (engineering must list a starting set)

### 6.4 Quality tiers
If domain exists in `sources` table and has `quality_tier=9`, drop.
If domain not in `sources`, treat as tier `3` and allow only if access check succeeds and summary can be grounded.

---

## 7) Access / Paywall Detection (Stricter than Stage 1)

For each candidate URL:
1) Perform `GET` with a real user-agent.
2) If 401/403 or redirect chain contains `/subscribe`, `/login`, `/paywall`, `/register` => drop.
3) If HTML contains high-confidence paywall markers:
   - “subscribe to continue”
   - “sign in to read”
   - “metered paywall”
   => drop.
4) If page text extraction yields < 1200 characters of readable text => drop.
5) Otherwise: mark `articles.access_status='ok'` and persist into `articles`.

---

## 8) Dedupe + Clustering — EXACT

### 8.1 Canonicalization
Compute `canonical_url`:
- strip UTM params
- normalize trailing slashes
- follow canonical link tag if present

### 8.2 Title similarity dedupe
If cosine similarity of normalized titles > 0.92:
- keep the higher-quality tier source
- else keep earlier-published item

### 8.3 Story clustering (Stage 2 optional but required if time permits)
If 3+ articles share:
- same named entities (simple token overlap), AND
- similar title similarity > 0.85
Then treat as a cluster:
- choose 1 primary link
- add “Also covered by:” with up to 2 secondary links

---

## 9) Ranking v1 (Stage 2) — EXACT

Score each candidate per user:
- Interest match score (from Stage 1) +
- Source tier bonus:
  - tier 1: +30
  - tier 2: +15
  - tier 3: +0
- Recency bonus:
  - published < 24h: +25
  - 24–72h: +10
  - 72h–7d: +0
- Penalties:
  - if snippet/title is clickbait (contains “shocking”, “you won’t believe”, “top 10”): -40
  - if domain not in allowlist and has no clear publisher identity: -20

Take top:
- 8 total items (same Stage 1 cap)
- max 3 items per section

---

## 10) Summarization v2 (Grounded, No-Slop) — EXACT

### 10.1 Inputs
Summarizer must receive:
- title
- source
- publish date (if known)
- extracted text (first 1500–2500 chars)
- matched interest label + section

### 10.2 Output format (must match)
For each item:
- `Summary:` 1–2 sentences, concrete facts first
- `Why it matters:` 1 sentence, explicitly ties to the matched interest

### 10.3 Hard validators (must enforce)
Reject if any:
- contains banned filler phrases (Stage 1 list) OR
- contains “This article” / “The piece” / “The post” OR
- includes more than 1 exclamation mark OR
- contains purely generic statements without a named entity/event OR
- contradicts the extracted text (basic check: mentions an entity not in text)

Retry policy:
- 1 retry with stricter prompt
- if still fails, fallback to:
  - title + rewritten snippet + “Why it matters” generated from interest only (no extra claims)

---

## 11) Email Template Changes (Minimal)

Stage 2 email remains identical to Stage 1 *except*:
- optional “Also covered by:” secondary links for clustered stories
- optional “Coverage note” line at bottom:
  - “Coverage includes open sources from the last 7 days.”

No other changes to keep Stage 1 stable.

---

## 12) UI Changes (Preferences) — EXACT

### 12.1 Add “Depth” control (Stage 2)
On `/prefs` and `/intake`, add:
- Depth radio buttons:
  - Quick (RSS-first, minimal browsing)
  - Standard (RSS + targeted web search)
  - Expanded (more web search, within Stage 2 limits)

Persist to `profiles.depth_level`.

### 12.2 Add “Blocked sources” (Stage 2, optional UI)
- A text input list of domains to block for that user
- Stored as user-specific rules in a new table `user_source_rules` (if implemented)
- If not implemented, omit UI and keep global `source_rules` only.

---

## 13) Capability Harness (Required)

### 13.1 What it does
Create a script that can run for a test profile and output:
- RSS-only digest (Stage 1 path)
- RSS + WebSearch digest (Stage 2 path)

### 13.2 Output artifact
Write a markdown report to:
- `reports/capability_<date>_<profile>.md`

Report must include:
- number of candidates from RSS
- number of candidates from WebSearch
- number excluded due to paywall
- final selected items by section
- token/tool call counts (if available)
- cost estimate (rough, from token usage)

---

## 14) Environment Variables — EXACT

Add to `.env.example`:

- `WEBSEARCH_ENABLED=true`
- `WEBSEARCH_MAX_QUERIES_PER_USER=8`
- `WEBSEARCH_RESULTS_PER_QUERY=5`
- `WEBSEARCH_MAX_TOOL_CALLS=12`

---

## 15) Acceptance Criteria (Definition of Done)

### 15.1 Functional
- Stage 2 pipeline runs end-to-end without breaking Stage 1.
- When RSS yields insufficient content, WebSearch fills gaps.
- Paywalled articles are excluded reliably (no “subscribe” links in email).
- Digest still respects caps (8 total, 3 per section).

### 15.2 Quality
- No banned filler phrases.
- Every item has Summary + Why it matters with at least 1 concrete detail.
- Cluster behavior works (when applicable) without duplication.

### 15.3 Observability
- Logs show:
  - queries issued
  - candidate counts
  - exclusions by reason
  - tool call counts

---

## 16) Deliverables (Files that MUST exist)

- `docs/specs/stage2.md` (this file)
- Prisma migration for Stage 2 schema changes
- Worker job: `job:websearch_candidates`
- Updated `job:build_digests` consuming WebSearch stream
- Capability harness script in `scripts/run_capability_harness.ts`
- `reports/` folder with one example report committed (redact URLs if needed)

---

## 17) Handoff Notes for Stage 3
Stage 3 will add:
- deep-research models for long-form synthesis
- escalation policy (weekly deep dive or triggered deep research)
- stronger citation formats

Stage 2 must keep interfaces clean so Stage 3 can swap in a “researcher” module without touching scheduling/email basics.
