# Bracket — PRD

## Product
Bracket is a minimal, Linear-grade dark-themed Client OS centered around "Project Memory".
Positioning: **The memory layer for your business** — connects the tools where work happens,
detects when something important changes, and answers anything you ask about your projects.

Aesthetic: flat dark (#0a0a0a/#111111), Geist font, pill CTAs, fixed 100dvh desktop-only shell.

## Stack
React + FastAPI + MongoDB. Live syncing with Gmail, Slack, Figma, GitHub.
LLM extraction via Claude (Emergent LLM key). Payments: Razorpay. Emails: Resend. Auth: Google + OTP.

## Implemented (recent)
- 2026-06: **Bracket 2.0 overhaul — Phase 2** (backend unchanged):
  - **Typography overhaul**: swapped the whole app's sans from Geist → **Urbanist** (`index.css`
    sans refs + `tailwind.config` display/body; Geist Mono kept). The workspace, auth and
    onboarding now match the marketing site's type; the dark palette already matched v2.
  - **Command Palette (⌘K / Ctrl+K)**: new global `src/components/CommandPalette.jsx` mounted in
    `App.js`; searches projects (from `/projects`) + nav actions (Home/Connect/Activity/Settings),
    arrow-key + enter navigation. Styled with `.bk` v2 tokens.
  - **Contact Inbox**: admin console "Contact" tab (`AdminDashboard.jsx`) backed by new
    `GET /api/admin/contact-messages` (admin-only) listing marketing contact-form submissions.
  - Auth (`/login`, `/admin/login`) now render in the new type; white primary button already
    matches v2 `primary=inverse`. (Deeper per-component workspace parity remains for a later pass.)
- 2026-06: **Bracket 2.0 overhaul — Phase 1** (marketing site + design foundation). See below.
  Ported the repo (github.com/shuklasaksham/bracket-v2) frontend's public marketing site and
  design system into the current app, **backend unchanged**. Added v2 design tokens (Urbanist +
  JetBrains Mono, `#08090a` palette, `.bk` scoped base, status/fg/line tokens) into
  `tailwind.config.js` + `index.css` additively (legacy tokens preserved so existing screens still
  work). New pages under `src/v2/` (ui/primitives, ui/motion, shell/Logo+Seo, pages/marketing/
  Layout+Landing+Pages+More) wired to routes `/ /pricing /privacy /terms /security /use-cases
  /changelog /about /contact` + a branded 404. Marketing is fully responsive and allowed on mobile
  (DeviceGate now bypasses public marketing paths). New backend endpoint `POST /api/contact`
  (stores to `contact_messages`, best-effort Resend email to support) — a v2 feature v1.9 lacked.
  Verified via screenshots (desktop + mobile) and curl. Existing login/workspace/demo untouched.
  PENDING PHASES (not yet done): auth screens, onboarding, and the whole workspace UI
  (Overview/Memory/Timeline/Conversations/Ask/Sources/Settings) still use the old look — these
  must be restyled to v2 tokens while keeping the current `/api/projects|connect|demo` contract.
- 2026-06: Demo Workspace (sandbox) — "Harbor — Payments App Launch" (see /app/backend/demo.py).
  "Harbor — Payments App Launch" that shows Bracket's full loop before connecting anything.
  Backend `/app/backend/demo.py` (router `/api/demo`): `open` (idempotent seed; unique index on
  owner+demo_tag), `project`, `simulate/next` (5 beats through the real change-detection engine +
  curated safety net, incl. a sourced Gmail-vs-Figma launch-date conflict), `send-email` (no real
  email), `client-reply` (Sarah confirms Oct 27, resolves conflict), `reset`, `track` (funnel →
  `demo_funnel`). Reuses existing Ask + suggest-reply endpoints. Demo bypasses the paywall and is
  excluded from quota, the poller and manual sync. Frontend `DemoDock.jsx` (banner + live dock +
  composer + conversion); entry points on `/welcome`, `/plan`, and the sidebar switcher;
  `/project/:id` relaxed to ProtectedRoute with an in-page paywall for non-demo projects.
  Verified 100% by testing agent (iteration_71.json).
- 2026-06: Product Hunt "Featured" badge in homepage hero (dark theme, post_id 1258620), below CTAs.
- 2026-06: **Homepage marketing rebuild** — `/app/frontend/src/pages/Landing.jsx` rewritten with
  clearer positioning and full story structure:
  Hero (new copy) → Integrations strip (Gmail/Slack/Figma/GitHub/Notion + more) → Problem →
  How it works (3 pillars: Connect/Detect/Ask) → Benefits → Product visual → FAQ (accordion) → Final CTA.
  CSS added in `/app/frontend/src/index.css` (`.lp-integrations`, `.lp-prose`, `.lp-pillars`,
  `.lp-benefits`, `.lp-faq*`). Slack logo rendered as inline white SVG (removed from simpleicons CDN).
  Retained: launch ribbon, 14-day free offer, Product Hunt badge. No backend/pricing/auth changes.
- Prior session: 1366x768 CSS zoom scaling, Figma paste-link + rate-limit handling, DeviceGate
  (mobile block), manual "Sync now" + health badge, clickjacking defense, OTP throttle.

## Backlog
- P0: Notion / Microsoft Teams / WhatsApp OAuth wiring (currently mocked). Playbooks fetched
  (Notion OAuth, WhatsApp via Baileys). Use integration_expert per provider.
- P1: Apple Sign-In OAuth on Login page.
- P2: User-configurable digest hour in Settings.
- P2: Weekly summary email.
- Phase 2 marketing: testimonials/customer logos, optional demo clip in hero/how-it-works.
- Phase 3 marketing: per-integration explainer pages, security/privacy page, real usage numbers.

## Key files
- `/app/frontend/src/pages/Landing.jsx` — public marketing homepage.
- `/app/frontend/src/index.css` — `.lp-*` design system for landing.
- `/app/backend/connectors.py` — sync, OAuth, manual sync endpoint (>2600 lines, bloated).
- `/app/backend/server.py` — auth, payments, security headers, OTP throttle, `/public/*` endpoints.

## Credentials
Admin: support@use-bracket.com / Bracket@123 (see /app/memory/test_credentials.md)
