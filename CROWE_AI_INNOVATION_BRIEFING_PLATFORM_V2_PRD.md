# Crowe AI Innovation Team — Intelligence Briefing Platform V2
## Newsletter Redesign: The "WOW Newspaper" Upgrade

**Project:** Intelligence Briefing Platform (existing Vercel deployment, formerly "Newsletter")  
**Team:** Crowe AI Innovation Team  
**Owner:** Achyuth Rachur, Staff Consultant, IRM  
**PRD Version:** 1.2 | March 2026  
**Claude Code Target:** Phased execution — read PRD, build phase, verify checklist, confirm before next phase  

---

## 0. Situation Assessment (What Exists + What's Broken)

### What's working
- Full backend pipeline: Stages 1–3 live (RSS collection, web search, deep dive state machine, Resend email delivery)
- Prisma schema, token-based auth, personalization tables from Stage 4 spec
- Correct Crowe color tokens in `globals.css`
- anime.js already in `package.json`

### What's missing / weak
- **Landing page (`/`)** is a centered card with one CTA. No value proposition, no preview, no WOW.
- **Intake form (`/intake`)** is a functional but sterile accordion. No progressive disclosure, no personality, no animated interest selection.
- **Email template** is a plain table. No masthead, no column layout, no editorial feel. Looks like a transactional alert, not a briefing.
- **No web reader view** — users can only see their digest in email. No `/reader` or `/digest/[id]` to view in browser.
- **No prefs dashboard** — `/prefs` is raw form fields with no digest history, no feedback UX, no personalization preview.
- **shadcn/ui not installed**, framer-motion not installed, React Bits not installed.
- Stage 4 backend tables exist in schema but frontend never wires feedback, weights, or blocks.

---

## 1. North Star

Every person who lands on this product should feel in the first 10 seconds:

> "This is a real, polished intelligence product built by people who understand my work."

The visual language is **Financial Times meets a modern SaaS product** — editorial typography, controlled ink-dark/amber palette, confident layout — layered with micro-interactions that reward attention without being gratuitous.

---

## 2. Tech Stack Additions (What to Install)

Add to `package.json` — agent must run these installs at the start of each relevant phase:

```bash
npm install framer-motion @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
npx shadcn@latest init   # follow interactive prompts: TypeScript, App Router, Tailwind CSS, src/
```

> **Note:** Do NOT install any `@21st-sdk/*` packages (`@21st-sdk/agent`, `@21st-sdk/react`, etc.). Those are the 21st Agents SDK — a separate product for building AI agent backends — completely unrelated to UI components. 21st.dev components are accessed via the Magic MCP server (see Section 11).

shadcn components to add during init or individually:
```bash
npx shadcn@latest add button card badge progress slider switch tabs dialog separator tooltip scroll-area
```

**Do NOT install React Bits or 21st.dev as packages** — copy relevant component source directly into `src/components/ui/` per the Component Procurement Checklist in Section 5.

Keep existing: `animejs@4.3.5`, `next@16.1.6`, `tailwindcss@4`, Prisma, Resend, OpenAI.

---

## 3. Design System Constraints (from Crowe brand skill)

| Token | Value | Use |
|---|---|---|
| `crowe-indigo-dark` | `#011E41` | Primary dark BG, headers, nav |
| `crowe-indigo` | `#002E62` | Section headers, titles on light |
| `crowe-amber` | `#F5A800` | Primary CTA, links, accents |
| `crowe-amber-bright` | `#FFD231` | Hover states, highlights |
| `crowe-teal` | `#05AB8C` | Success, positive signals |
| `crowe-coral` | `#E5376B` | Destructive, downvote |
| `tint-900` | `#333333` | Body text |
| `tint-500` | `#828282` | Meta, captions |
| `tint-100` | `#E0E0E0` | Borders, dividers |

Typography: `'Helvetica Now Display'` for H1/H2 (with fallback `Arial`), body uses `'Helvetica Now Text'`. Both already in `globals.css`.

Motion rules (must enforce throughout):
- All durations: 120–280ms
- Easing: `easeOutQuad` or `easeOutCubic` (anime.js) / `[0.25, 0.1, 0.25, 1]` (framer-motion)
- No large background shape animations
- No animating during form submit (user is waiting on async)

---

## 4. Pages + Components — Full Inventory

### 4.1 `/` — Landing Page (New)

**Goal:** Convert a cold visitor (Crowe professional) in < 10 seconds. Show what the product does. Link to `/intake`.

**Layout:**
```
[Nav: Logo left | "Sign Up" CTA right]
[Hero: Large headline + animated tagline + email capture quick-start]
[Feature strip: 3 animated stat counters — sources, interests, delivery speed]
[Live digest preview: Newspaper-style mock section showing what a real briefing looks like]
[How it works: 3-step horizontal timeline]
[CTA footer: "Start your briefing" button]
```

**Wow elements:**
- **Hero headline** uses a `TextReveal` component (stagger per word, opacity+translateY, 280ms, anime.js) — see Section 5, C1
- **Stat counters** use anime.js `countUp` on scroll enter — "50+ sources", "8 curated articles", "delivered by 7am"
- **Live digest preview** is a static newspaper-style card with amber left border accent, simulated article cards — framer-motion hover lifts the card 4px, shadow deepens
- No live API calls on landing page. All preview content is static data from `/src/data/landing-preview.ts`

**Files:**
- `src/app/page.tsx` — replace current
- `src/components/landing/hero.tsx`
- `src/components/landing/digest-preview-card.tsx`
- `src/components/landing/feature-strip.tsx`
- `src/components/landing/how-it-works.tsx`
- `src/data/landing-preview.ts` — static mock digest data

---

### 4.2 `/intake` — Signup Wizard (Redesign)

**Goal:** Onboard a Crowe professional in < 2 minutes. Progressive disclosure — not a single long form.

**Layout:** Multi-step wizard with progress bar at top. 4 steps:

1. **Step 1 — Identity**: Email, Name, Role, Industry Focus. Clean 2-column grid.
2. **Step 2 — Interests**: Animated chip selector. Pre-seeded categories (AI, BSA/AML, Credit Risk, MRM, FP&A, Audit, Cybersecurity, Regulatory, Tax). User clicks to select chips, can also add custom. Each chip: framer-motion scale(1.05) on hover, spring scale(0.95) on select. Selected chips get amber background, indigo text.
3. **Step 3 — Schedule**: Day-of-week pill toggles + time selector. Depth level radio (Quick/Standard/Expanded). Deep dive toggle (from Stage 3).
4. **Step 4 — Preview**: Shows a simulated "your first digest" card based on selected interests. Static preview interpolated from `/src/data/landing-preview.ts` — no live API call. Submit button: "Start My Briefing →"

**Progress bar:** Amber fill, transitions with framer-motion `layoutId`.

**Step transitions:** framer-motion `AnimatePresence` with `x: [20, 0]` slide + opacity enter, `x: [0, -20]` exit. Each step is a separate component.

**Wow elements:**
- Chips animate in on mount — anime.js stagger(40ms), translateY(8→0), opacity(0→1)
- Selected interests appear in a "preview strip" at bottom of step 2 showing how sections will group
- Step 4 digest preview uses real section labels from the user's selected interests injected into the static mock

**Files:**
- `src/app/intake/page.tsx` — replace with wizard shell
- `src/components/intake/wizard-shell.tsx`
- `src/components/intake/step-identity.tsx`
- `src/components/intake/step-interests.tsx`
- `src/components/intake/step-schedule.tsx`
- `src/components/intake/step-preview.tsx`
- `src/components/intake/progress-bar.tsx`
- `src/components/intake/interest-chip.tsx`
- `src/data/interest-catalog.ts` — pre-seeded interests per section

---

### 4.3 `/prefs` — Personalization Dashboard (Redesign)

**Goal:** Not just a settings form. Show the user what their digest looks like, what's working, what they can tune.

**Layout:** Two-column on desktop, single column on mobile.

**Left column — Controls:**
- Profile section (name, role — editable inline with framer-motion expand)
- Schedule section (compact, same pill toggles)
- Interests: grouped by section. Each section is an accordion (shadcn Accordion). Within each: chips with weight slider (shadcn Slider, 0–200). Preset buttons: Low / Normal / High / Critical.
- Keyword blocks: chip add/remove input
- Source blocks: domain chip add/remove
- Caps: max items total + per section (shadcn Slider)
- Deep dive: enable toggle + day selector + topic selector

**Right column — Digest Activity:**
- "Your last briefing" card: Shows the last digest sent (date, article count, sections covered). Pulled from `/api/prefs` which now returns `lastDigest` summary.
- Feedback history: Small table showing recent 👍/👎 signals. "No feedback yet" state with ghost illustration.
- "Tune your digest" tips — contextual recommendations based on interest count (static rules, not AI-generated):
  - < 3 interests: "Add more interests to fill your digest"
  - 0 feedback: "Rate articles in your emails to improve relevance"
  - weight all at 100: "Try setting a Critical weight on your primary focus area"

**Wow elements:**
- Interest chips have a weight "heat bar" — thin amber underline that grows with weight (CSS width = weight/200 * 100%)
- Saving changes triggers a framer-motion success toast (shadcn Toast equivalent, custom) that slides in from bottom-right
- Accordion open/close uses framer-motion height animation, not CSS transition

**Files:**
- `src/app/prefs/page.tsx` — replace
- `src/components/prefs/controls-panel.tsx`
- `src/components/prefs/activity-panel.tsx`
- `src/components/prefs/interest-section-accordion.tsx`
- `src/components/prefs/weighted-chip.tsx`
- `src/components/prefs/feedback-history.tsx`
- `src/components/prefs/save-toast.tsx`

**API change needed:** `GET /api/prefs?token=...` must return `lastDigest: { date, articleCount, sections }` — add this to the API route handler.

---

### 4.4 `/reader` — Web Digest Reader (New Page)

**Goal:** Users can read their digest in a browser instead of email. Token-authenticated. Newspaper-style layout.

**Route:** `/reader?token=...` (uses prefs token; reuse auth infrastructure)

**Layout:**
```
[Masthead: "Crowe Intelligence Briefing" | Date | Edition number]
[Lead section: Top article styled as feature story — large title, summary, source badge]
[Content grid: 2-column newspaper layout on desktop, single on mobile]
  [Each article: Card with amber left-border accent, section label badge, title, summary, "Why it matters", source + date]
[Footer: Update preferences | Feedback links | Unsubscribe]
```

**Newspaper masthead design:**
- Font: Helvetica Now Display Bold, 32px, all-caps "CROWE INTELLIGENCE"
- Thin horizontal rule above and below masthead
- Date/edition in small caps right-aligned
- Amber rule separator under masthead, 2px

**Article cards:** Each card has:
- Section badge (shadcn Badge, amber background, indigo text)
- Title as link (opens original article in new tab)
- Summary paragraph
- "Why it matters:" line in italic indigo
- Source name + published date in tint-500
- If Stage 4 enabled: 👍 / 👎 / 🚫 icon buttons that call `/api/feedback`

**Wow elements:**
- Masthead appears with opacity+translateY reveal (anime.js, 280ms)
- Article cards stagger in with anime.js stagger(60ms)
- Hovering a card: framer-motion whileHover scale(1.01), shadow transition
- "Why it matters" line has a subtle amber left-border (2px, 80% height)

**Files:**
- `src/app/reader/page.tsx`
- `src/components/reader/masthead.tsx`
- `src/components/reader/article-card.tsx`
- `src/components/reader/lead-article.tsx`
- `src/components/reader/reader-footer.tsx`

**API change needed:**
- `GET /api/reader?token=...` — returns most recent digest html/data for the user, or a list if `?digest=<id>` param provided. Returns structured `DigestData` (not HTML blob).

---

### 4.5 Email Template (Redesign)

**Goal:** Look like a real editorial publication, not a transactional alert. Newspaper masthead, editorial typography, column structure where email clients allow it.

**Keep:** Table-based HTML, inline styles only, Arial/Helvetica fallback.

**New structure:**

```
[Preheader: "Your Crowe Intelligence Briefing — Wednesday, March 11"]

[Masthead strip: Indigo BG]
  CROWE INTELLIGENCE             March 11, 2026
  ─────────────────────────────────────────────  ← thin amber rule
  [Greeting: "Good morning, Achyuth."]

[Feature article (first/highest scored item)]
  [Amber left-border 4px | SECTION BADGE]
  Title (large, 20px bold)
  Summary paragraph
  Why it matters: (italic)
  Source • Date

[Section divider: "── AI ──────────────────────────────"]

[Article cards: standard items]
  [Title as link | Source chip | Date]
  [Summary]
  [Why it matters:]
  [If Stage 4: 👍 Helpful   👎 Not relevant   🚫 Hide]

[Deep Dive CTA (if enabled)]
  Amber bordered box:
  "📊 Your weekly Deep Dive is ready →"

[Footer]
  Crowe logo text (text approximation, not image — for email compat)
  Update preferences  ·  Pause emails  ·  Unsubscribe
  "Smart decisions. Lasting value."
```

**Typography rules (email-safe):**
- Masthead: Arial Bold, 14px, letter-spacing: 4px, ALL CAPS
- Section headers: Arial Bold, 13px, ALL CAPS, tint-500, letter-spacing: 2px
- Article titles: Arial Bold, 17px, #002D62
- Body: Arial Regular, 14px, #333333, line-height: 1.6
- Meta (source/date): Arial, 12px, #828282

**Files:**
- `src/services/email/templates/digest.ts` — replace entire renderDigestEmail function
- `src/services/email/templates/deepDive.ts` — update masthead to match
- `src/types/index.ts` — ensure DigestData has all fields needed (greeting, section, articles with whyItMatters field)

---

## 5. Component Procurement Checklist

These 4 components must be sourced by Achyuth from 21st.dev, React Bits, or any comparable library **before Claude Code reaches the phase that needs them**. Each entry describes what the component should do — not a specific URL — so you have freedom to pick the version you like visually.

**How this works:**
1. Browse 21st.dev or reactbits.dev, find what you like, install it via `npx shadcn@latest add [url]` or copy-paste the source
2. Save the file at the exact path listed below
3. Mark the item ☑ in this PRD before kicking off the dependent phase
4. Claude Code will check for the file at that path. If found, it wires it in. If not found, it inserts a clearly-labelled `<PlaceholderComponent />` div and moves on — it never blocks

**Crowe color adaptation rule (applies to ALL components):**
After placing any component file, do a find-and-replace before Claude Code runs:
- Any hardcoded blue/purple → `#011E41` (crowe-indigo-dark)
- Any hardcoded orange/yellow accent → `#F5A800` (crowe-amber)
- Any hardcoded green → `#05AB8C` (crowe-teal)
- Any hardcoded white text → keep as `#FFFFFF`
- Any animation keyframe colors → match the above

Claude Code will also do a second pass to replace remaining hardcoded hex values with Crowe CSS variables from `globals.css`.

---

### C1 — Hero Text Reveal
**Status:** ☐ PENDING  
**Drop path:** `src/components/ui/text-reveal.tsx`  
**Needed by:** Phase 2, Task 2.3 (Hero section)  
**What to look for:** A component that takes a string, splits it into individual words, and staggers their entrance — each word fading/blurring in with a short delay between them. Should trigger on mount. 120–280ms per word, stagger ~40ms apart. React + TypeScript.  
**Good search terms:** "blur in text animation", "word stagger reveal", "text split animation"  
**Usage in project:** Applied to the main hero headline on the landing page. Single use.

---

### C2 — Animated Hero Background
**Status:** ☐ PENDING  
**Drop path:** `src/components/ui/animated-bg.tsx`  
**Needed by:** Phase 2, Task 2.3 (Hero section)  
**What to look for:** A `'use client'` background component that creates a slow-moving gradient or aurora effect — soft, ambient, not distracting. Must work as an absolutely-positioned layer behind content. CSS or canvas, no Three.js. Should accept color props or have colors easily editable in source.  
**Good search terms:** "aurora background", "animated gradient background", "mesh gradient animation", "noise gradient"  
**Usage in project:** Hero section BG only. Will be constrained to 10–15% opacity and re-coloured to indigo/amber/teal range.

---

### C3 — Tilt Card (Mouse Parallax)
**Status:** ☐ PENDING  
**Drop path:** `src/components/ui/tilt-card.tsx`  
**Needed by:** Phase 2, Task 2.2 (Digest preview card)  
**What to look for:** A wrapper component that applies a CSS `perspective` + `rotateX/rotateY` tilt effect tracking the mouse position. Should work as a drop-in wrapper (`<TiltCard>children</TiltCard>`). Vanilla JS + CSS transforms — no Three.js, no WebGL. Max tilt should be configurable; we'll set it to 6–8 degrees.  
**Good search terms:** "tilt card", "3d card hover", "mouse parallax card", "perspective card"  
**Usage in project:** Wraps the static digest preview card on the landing page only. Single use.

---

### C4 — Scroll Reveal (Viewport Entrance)
**Status:** ☐ PENDING  
**Drop path:** `src/components/ui/scroll-reveal.tsx`  
**Needed by:** Phase 2, Task 2.3 (How it works section); Phase 5, Task 5.2 (Reader article cards)  
**What to look for:** A wrapper component that hides its children until they enter the viewport, then animates them in (fade + slight translateY). Should use IntersectionObserver. Accepts a `delay` prop for staggering multiple instances. React + TypeScript.  
**Good search terms:** "scroll reveal", "intersection observer animation", "fade in on scroll", "viewport entrance"  
**Usage in project:** Wraps the 3-step "How it works" timeline items on landing page, and article cards on the reader page.

---

## 6. Data Layer Spec

All content configuration lives in `/src/data/`. Components are dumb (props only).

### `src/data/landing-preview.ts`
```typescript
export const LANDING_PREVIEW_DIGEST = {
  date: "Wednesday, March 11",
  greeting: "Good morning. Here's what matters today.",
  sections: [
    {
      section: "AI",
      articles: [
        {
          title: "OCC Issues Guidance on AI Model Risk in Credit Decisions",
          source: "American Banker",
          publishedAt: "Today, 6:45am",
          summary: "The OCC released supplemental guidance clarifying SR 11-7 application to large language models used in credit underwriting, requiring institutions to document training data governance and benchmark testing against traditional scorecards.",
          whyItMatters: "Any bank using AI in credit decisions faces new documentation requirements — MRM teams will need updated validation templates before the next examination cycle.",
          section: "AI"
        },
        {
          title: "Fed Examiners Flag LLM Hallucination Risk in Model Validation Programs",
          source: "Risk.net",
          publishedAt: "Today, 5:20am",
          summary: "Federal Reserve examiners have begun questioning whether existing model validation frameworks adequately address hallucination and confabulation risks in large language models used for internal analysis and customer-facing applications.",
          whyItMatters: "MRM teams that haven't updated their SR 11-7 validation templates to address generative AI outputs are likely to receive findings in the next examination cycle.",
          section: "AI"
        },
        {
          title: "FDIC Proposes AI Transparency Standards for Consumer Lending",
          source: "Banking Dive",
          publishedAt: "Yesterday, 4:15pm",
          summary: "The FDIC issued a proposed rule requiring institutions using AI in consumer lending decisions to provide plain-language explanations of adverse action reasons, with specific disclosure requirements for model-driven denials.",
          whyItMatters: "Institutions using AI scorecards or hybrid models for credit decisions will need updated adverse action notice workflows before the comment period closes.",
          section: "AI"
        }
      ]
    },
    {
      section: "BSA / AML",
      articles: [
        {
          title: "FinCEN Issues Alert on Deepfake-Enabled Identity Fraud in Account Opening",
          source: "FinCEN.gov",
          publishedAt: "Today, 7:00am",
          summary: "FinCEN issued a financial trend analysis alert warning that deepfake technology is increasingly being used to defeat video-based KYC verification at account opening, with a notable increase in suspicious activity reports from digital banks.",
          whyItMatters: "BSA/AML programs relying solely on video verification for CDD will need to layer additional controls — this alert signals examiner scrutiny is coming.",
          section: "BSA / AML"
        },
        {
          title: "OCC Examination Findings Show Transaction Monitoring Tuning Gaps at Mid-Size Banks",
          source: "American Banker",
          publishedAt: "Yesterday, 2:30pm",
          summary: "OCC examination findings released for Q1 2026 show that mid-size banks continue to struggle with documented tuning methodology for transaction monitoring systems, with 34% of institutions receiving observations related to alert threshold justification.",
          whyItMatters: "If your TMS tuning documentation doesn't include a backtesting methodology and documented threshold rationale, it's a likely finding in your next BSA exam.",
          section: "BSA / AML"
        }
      ]
    },
    {
      section: "Model Risk Management",
      articles: [
        {
          title: "SR 11-7 Guidance Expansion Expected to Cover Third-Party AI Models",
          source: "Reuters",
          publishedAt: "Today, 6:00am",
          summary: "Federal regulators are expected to issue expanded guidance extending SR 11-7 model risk management principles to third-party AI and machine learning models, closing a gap that allowed many vendor-supplied models to bypass independent validation requirements.",
          whyItMatters: "Institutions using vendor AI models for credit, fraud, or compliance decisions without formal validation will face new documentation and oversight requirements under the proposed guidance.",
          section: "Model Risk Management"
        }
      ]
    }
  ]
}
```

### `src/data/interest-catalog.ts`
```typescript
export const INTEREST_CATALOG: Record<string, string[]> = {
  "AI": [
    "AI in financial services",
    "AI model risk",
    "Generative AI in audit",
    "Machine learning regulation",
    "AI governance frameworks"
  ],
  "BSA / AML": [
    "Transaction monitoring",
    "SAR filing trends",
    "KYC/CDD compliance",
    "FinCEN guidance",
    "BSA examination findings"
  ],
  "Model Risk Management": [
    "SR 11-7 compliance",
    "Model validation",
    "CECL model performance",
    "Vendor model assessment",
    "Model inventory management"
  ],
  "Credit Risk": [
    "CECL forecasting",
    "PD/LGD modeling",
    "Loan-level reconciliation",
    "Credit stress testing",
    "Consumer credit trends"
  ],
  "Regulatory": [
    "Federal Reserve guidance",
    "OCC examinations",
    "FFIEC updates",
    "MRA remediation",
    "Basel IV implementation"
  ],
  "Audit": [
    "Internal audit AI",
    "Statistical sampling",
    "Workpaper standards",
    "Risk-based audit planning",
    "SOX compliance"
  ],
  "FP&A": [
    "Rolling forecast methodology",
    "Variance analysis",
    "Cash flow monitoring",
    "Scenario modeling",
    "CFO reporting"
  ],
  "Cybersecurity": [
    "Bank cybersecurity regulation",
    "Third-party risk",
    "Incident response",
    "CISA advisories",
    "Ransomware in financial services"
  ]
}
```

---

## 7. API Changes Required (Backend)

### 7.1 `GET /api/prefs?token=...` — extend response
Add to response:
```typescript
lastDigest: {
  id: string;
  date: string;       // formatted "Wednesday, March 11"
  articleCount: number;
  sections: string[]; // ["AI", "BSA / AML", "Credit Risk"]
  sentAt: string;     // ISO
} | null;
recentFeedback: Array<{
  articleTitle: string;
  action: 'upvote' | 'downvote' | 'dismiss';
  date: string;
}>;
```

Query: Join `digests` + `email_events` + `feedback_events` for this user.

### 7.2 `GET /api/reader?token=...` — new endpoint
- Validates prefs token
- Returns most recent `DigestData` for user (structured, not HTML)
- Optional: `?digestId=<uuid>` to fetch a specific past digest
- Returns 404 if no digest exists yet (frontend shows "Your first briefing hasn't been sent yet" state)

---

## 8. Phased Build Plan

Execute these as sequential atomic tasks. Start each task with a fresh context read of this PRD. Run `npm run build` after each task before proceeding.

---

### Phase 0 — Install + Config (1 task)
**Task 0.1 — Dependencies + shadcn init**
```
Install framer-motion, lucide-react, class-variance-authority, clsx, tailwind-merge.
Run shadcn init for App Router + Tailwind CSS 4.
Add shadcn components: button, card, badge, progress, slider, switch, tabs, dialog, separator, tooltip, scroll-area.
Verify globals.css Crowe tokens are preserved after shadcn init (shadcn may overwrite — restore from spec).
Run npm run build — must pass before any UI work.
```

---

### Phase 1 — Data Layer (1 task)
**Task 1.1 — Create /src/data/**
Create `landing-preview.ts` and `interest-catalog.ts` with full content as specified in Section 6. No components yet — data only.

---

### Phase 2 — Landing Page (3 tasks)
**Task 2.1 — Landing layout shell**
Create `src/app/page.tsx` with the full layout structure, nav, and section scaffolding. Static only — no animations yet, no subcomponents. Just the semantic HTML + Crowe styling.

**Task 2.2 — Digest preview card**
Build `src/components/landing/digest-preview-card.tsx` consuming `LANDING_PREVIEW_DIGEST`. Newspaper style: amber left border on feature article, section dividers, article cards with summary + "Why it matters". Framer-motion hover lift.  
**C3 dependency:** Check if `src/components/ui/tilt-card.tsx` exists. If yes, wrap the preview card in `<TiltCard maxTilt={7}>`. If no, wrap in a `<div data-placeholder="tilt-card">` with a `// TODO: replace with TiltCard when C3 is provided` comment.

**Task 2.3 — Hero + feature strip + how it works**
Build stat counters with anime.js countUp on scroll enter. Build 3-step horizontal timeline.  
**C1 dependency:** Check if `src/components/ui/text-reveal.tsx` exists. If yes, use `<TextReveal>` for the hero headline. If no, implement an inline word-stagger using anime.js directly with a `// TODO: replace with TextReveal when C1 is provided` comment.  
**C2 dependency:** Check if `src/components/ui/animated-bg.tsx` exists. If yes, render it as an absolute-positioned layer in the hero section at 12% opacity. If no, use a static CSS radial gradient in indigo/amber tones as placeholder.  
**C4 dependency:** Check if `src/components/ui/scroll-reveal.tsx` exists. If yes, wrap each "How it works" step in `<ScrollReveal delay={index * 100}>`. If no, use a plain framer-motion `whileInView` fade as placeholder.

---

### Phase 3 — Intake Wizard (4 tasks)
**Task 3.1 — Wizard shell + progress bar**
Build `wizard-shell.tsx` with 4-step state machine, framer-motion AnimatePresence for step transitions, progress bar with amber fill.

**Task 3.2 — Steps 1 and 3 (Identity + Schedule)**
Build `step-identity.tsx` and `step-schedule.tsx`. Reuse logic from existing intake form. Pill toggles for days, time select, depth level radios, deep dive toggle.

**Task 3.3 — Step 2 (Interest chip selector)**
Build `step-interests.tsx` and `interest-chip.tsx`. Render chips from `interest-catalog.ts` grouped by section. Anime.js stagger entrance. Framer-motion scale on select. Selected chips strip at bottom. Custom interest add flow.

**Task 3.4 — Step 4 (Preview) + wire submission**
Build `step-preview.tsx` — inject user's selected interest sections into `LANDING_PREVIEW_DIGEST` to generate a simulated preview. Wire `handleSubmit` to `/api/intake`. Preserve demo mode behavior from existing code.

---

### Phase 4 — Prefs Dashboard (3 tasks)
**Task 4.1 — Layout + controls panel scaffold**
Build `src/app/prefs/page.tsx` two-column layout. `controls-panel.tsx` shell with section placeholders.

**Task 4.2 — Interest section accordion + weighted chips**
Build `interest-section-accordion.tsx` (framer-motion height animation), `weighted-chip.tsx` with amber weight heat bar underline. Weight slider (shadcn Slider). Presets buttons.

**Task 4.3 — Activity panel + save flow**
Build `activity-panel.tsx` consuming `lastDigest` + `recentFeedback` from GET /api/prefs response. `feedback-history.tsx`. Save flow with framer-motion success toast. Wire PUT /api/prefs with full Stage 4 payload (weights, keywordBlocks, sourceBlocks, caps).

---

### Phase 5 — Web Reader (2 tasks)
**Task 5.1 — Reader API endpoint**
Build `src/app/api/reader/route.ts`. Validate prefs token, query most recent digest for user, return structured DigestData. Handle no-digest-yet case with 404.

**Task 5.2 — Reader page**
Build `src/app/reader/page.tsx`, `masthead.tsx`, `lead-article.tsx`, `article-card.tsx`, `reader-footer.tsx`. Newspaper masthead design. 2-col grid layout. Article card hover animations. If Stage 4 enabled, wire feedback icon buttons.  
**C4 dependency:** Check if `src/components/ui/scroll-reveal.tsx` exists. If yes, wrap each article card in `<ScrollReveal delay={index * 60}>`. If no, use anime.js stagger(60ms) on mount as fallback.

---

### Phase 6 — Email Template Redesign (1 task)
**Task 6.1 — Rebuild digest.ts template**
Replace `renderDigestEmail` in `src/services/email/templates/digest.ts` with the new masthead + editorial structure. All inline styles. Test with `npm run smoke` or a manual send to a test address. Must pass existing email_events recording.

---

### Phase 7 — Polish + QA (1 task)
**Task 7.1 — Final QA pass**
- `npm run build` must pass (zero TypeScript errors)
- `npm run lint` clean
- Lighthouse > 90 on landing page
- Mobile responsive: all pages must not break on 375px viewport
- Verify existing API routes (`/api/intake`, `/api/prefs`, `/api/cron/daily`) still function — no regressions
- Test demo mode on `/intake?demo=true`

---

## 9. Out of Scope

- New backend data pipeline changes (RSS, OpenAI, Resend logic unchanged)
- Database schema changes (Stage 4 tables exist; only wiring them in UI)
- Auth system changes (token model unchanged)
- Admin dashboard
- Real-time updates / websockets
- Dark mode toggle (always dark indigo on data viz surfaces; light on content surfaces — per brand)
- New Vercel infra changes

---

## 10. Kickoff Prompt (Paste This to Claude Code)

```
Read CROWE_AI_INNOVATION_BRIEFING_PLATFORM_V2_PRD.md in full before touching any code.
Load .claude/skills/branding/SKILL.md and .claude/skills/frontend/SKILL.md.

You are rebuilding the UI layer of an existing Next.js 16 / Tailwind CSS 4 newsletter
application. The backend (Prisma, API routes, email service, cron jobs) is stable and
must not be modified except where the PRD explicitly specifies backend changes
(Sections 7 and Phase 5, Task 5.1).

COMPONENT CHECKLIST RULE (Section 5):
Before each phase, check whether the required component files (C1–C4) exist at their
specified paths in src/components/ui/.
- If a file EXISTS: import and wire it in exactly as specified in the phase task.
- If a file is MISSING: insert a clearly-labelled placeholder div and a
  // TODO: replace with [ComponentName] when [CX] is provided
  comment at that location. Never block or halt — always keep building.

Do NOT attempt to generate or approximate the C1–C4 components yourself.
Do NOT spawn subagents. Do NOT rewrite entire files for small changes — make targeted edits.

Start with Phase 0, Task 0.1. After each task verify npm run build passes before proceeding.
Fix build errors before moving on. Flag only genuine ambiguity requiring an architectural
decision not covered in this PRD.

Design tokens are in src/app/globals.css. Do not deviate from Section 3 color/motion constraints.
```

---

## 11. Component Procurement Workflow

### Your process (Achyuth) before kicking off each phase

**Before Phase 2 (Landing Page):** You need C1, C2, C3, C4  
**Before Phase 5 (Reader):** You need C4 (if not already done)

For each component:

1. **Browse** — 21st.dev, reactbits.dev, or any source. The descriptions in Section 5 tell you what it needs to do, not where to get it specifically.

2. **Install** — Either:
   ```bash
   # If the site gives you a shadcn install command:
   npx shadcn@latest add "https://21st.dev/r/[author]/[component]"

   # Or just copy-paste the source code directly into the file path listed
   ```

3. **Adapt colors** — Before handing to Claude Code, do a quick find-and-replace in the file:
   - Primary accent colors → `#F5A800` (amber) or `var(--color-crowe-amber)`
   - Dark background colors → `#011E41` (indigo-dark) or `var(--color-crowe-indigo-dark)`
   - Secondary accent → `#05AB8C` (teal) or `var(--color-crowe-teal)`

4. **Mark it off** — Change `☐ PENDING` to `☑ PROVIDED` in Section 5 of this PRD

5. **Claude Code does the rest** — It will detect the file, import it, and wire it into the correct location per the phase task instructions

### If you can't find a good version

That's fine — leave it as `☐ PENDING` and Claude Code will build a functional animated placeholder using anime.js or framer-motion inline. You can swap in the real component later without touching any other code (it's a drop-in at the exact file path).

---

*PRD v1.2 | Crowe AI Innovation Team | March 2026*  
*Use alongside Crowe Brand SKILL.md for all visual decisions*
