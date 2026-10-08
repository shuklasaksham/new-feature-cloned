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
- 2026-06: **Four v2 UI→backend bridges wired (Billing, Connect, Review-Apply, Categories)** —
  backend-tested 100% (testing_agent iteration_75.json, 11/11).
  - **Billing Bridge**: new `/api/v2/billing` GET/PATCH + `/billing/change|cancel|resume|retry`
    in `v2_workspace.py` map the real user plan → the v2 account UI shape (status/plan/currency/
    prices/workspaces/invoices/renews_on). The workspace Settings "Choose a plan" dialog now opens
    the **real Razorpay hosted checkout** (order→popup→verify, reusing `/payments/razorpay/*`) —
    the old fake card form was removed. Currency toggle + cancel/resume/change persist on the user
    doc (`plan_currency`, `billing_canceled_at`, `billing_pending_plan`).
  - **Connect Sources in-app**: the workspace Sources "Add source" now opens the real `ConnectFlow`
    (OAuth popup → pick threads/channels → preview → establish) for Gmail/Slack/Figma/GitHub/Notion,
    via the existing `/api/connect/*` endpoints (OAuth app creds already in backend/.env; gmail/slack/
    figma/github report `available`). Replaced the old v2-stub `candidates/addSource` path + the
    "connects through OAuth" toast.
  - **Live Change-Review Apply**: `POST /api/v2/w/{id}/reviews/{rid}/accept` now takes `{selected,
    edits}` and applies the (edited) proposed text to the exact `project_memory` field — sets
    `title`, status `confirmed`, pushes the old title into `versions[]`+`history`, and stores
    `pre_accept_title` (first accept only). `undo` restores it. `versions[]` is now surfaced in
    `_mem_item` so the Memory detail History pane shows the diff. Stale review id → 409.
  - **Category controls**: `PATCH /categories/{key}` (rename in place, key stable), `POST
    /categories/suggest` (add + force re-map all memory), `POST /categories/{key}/merge` (remap +
    drop). UI: Memory rail menu Rename + a new Merge dialog (pick target), "Suggest a category"
    adds + re-maps. `v2_categories.classify_items` gained a `force` flag.
  NOTE: frontend compiles clean; these screens were backend-verified (not e2e-clicked this pass).
- 2026-06: **Old-Bracket parity in the new UI + DYNAMIC categories (critical)**. The v2 workspace
  endpoints now serve REAL data for real projects while the sandbox keeps the seed showcase:
  - `v2_categories.py`: AI-infers a per-project category set via `ai_engine._run` (Claude), stores
    `v2_categories` + `v2_cat_map` on the project, evolves as content arrives. e.g. the Harbor
    payments project yields Features/Integrations/Decisions/Open Questions/Milestones/Compliance/
    People instead of the fixed Scope/Deliverables. UI shows them under "DISCOVERED CATEGORIES".
  - `v2_real.py`: builds overview/categories/memory/people/timeline/sources/threads/reviews/
    attention/ask/draft from `project_memory`, `source_events`, `source_connections`,
    `notifications`, reusing the existing `answer_project_question` + `suggest_project_reply`.
  - `v2_workspace.py`: `_resolve(wid)` → real (stored project) vs seed (p1/p2 showcase). Mutations
    persist: accept→confirm memory, dismiss→ignore, resolve→clear is_conflict, snooze/dismiss→mark
    notification read, source sync→existing `_sync_connection`.
  - `/api/v2/workspaces` lists the user's real projects + the seed showcases.
  - Real sign-in works via existing `/auth/me` + `/auth/logout`.
  Verified: testing_agent iteration_74.json **100% (22/22)**; dynamic categories render in the UI.
  NOT yet wired (next): the new UI's billing/account/members/files screens still call v2 endpoints
  that map to the old payments/account APIs; real OAuth connect-new-source flow inside the new UI.
- 2026-06: **v2 Workspace API** (`v2_workspace.py`) — seed showcase + per-workspace reads.
  seeded workspace ("Fintech Landing Page Redesign" fixture, ported from the repo mock `seed.js`)
  so the new UI's Overview/Memory/Attention/Timeline/Sources/Reviews/Threads/Ask screens are fully
  populated and clickable. Endpoints: `/workspaces` (seed + the user's real projects),
  `/w/{wid}` `/overview` `/attention` `/conflicts/{id}` `/categories` `/memory(+/{id})`
  `/people(+/{id})` `/timeline(+/{id})` `/sources(+/{id})` `/reviews(+/{id})` `/threads(+/{id})`
  `/ask` `/ask/history` `/threads/{id}/draft` `/send` + action stubs (seen/snooze/dismiss/
  accept/resolve/sync). The per-workspace reads return the fixture for ANY wid (so the sandbox
  workspace renders). Verified: testing_agent iteration_73.json **100% (31/31)**; UI Overview,
  Memory and Timeline render with no errors.
  Real sign-in confirmed working via existing `/auth/me` + `/auth/logout` (AuthContext).
  NOTE (intentional this phase): workspace reads serve a fixed seed fixture, not live DB data;
  `ask`/`draft` text is canned. Next: derive these from each project's real memory/events.
- 2026-06: **v2 backend wiring — admin + sandbox + auth** (step 1 of connecting the swapped UI).
  Ported the repo's `admin_v2.py` (owner panel `/api/v2/admin/*`) and `sandbox_v2.py`
  (`/api/v2/sandbox/*`, reusing our `demo.py` seed) into the backend and mounted them via
  `install(app)` in `server.py`. Set `ADMIN_USERNAME=admin` + bcrypt `ADMIN_PASSWORD_HASH`
  (pw `Bracket@Admin2026`) in backend/.env. **FIXED the reported "cannot login to admin" bug** —
  the repo admin UI (`/admin/login`) now authenticates against `/api/v2/admin/login` and the
  Overview dashboard renders with real data. Verified by testing_agent iteration_72.json (15/15).
  Sandbox session start/next/reset/leave + the account-lock middleware all work.
  STILL MISSING for a fully interactive product workspace: the `/api/v2/w/:id/*` read API
  (overview, memory, attention, conflicts, reviews, threads, ask, timeline, sources) — the repo
  frontend's workspace screens call these and they are not implemented yet (only in the JS mock).
  So "Open the sandbox" starts a guest + seeds the demo project, but the workspace screens 404 until
  that API is built next.
- 2026-06: **FULL FRONTEND SWAP to the bracket-v2 repo UI** (backend untouched, per user).
  Replaced all of `/app/frontend/src` and `/app/frontend/public` with the repo
  (github.com/shuklasaksham/bracket-v2) frontend verbatim. Copied repo `tailwind.config.js`,
  `postcss.config.js`, `jsconfig.json`, `components.json`, and `craco.config.js` (the repo craco
  has a `DISABLE_VISUAL_EDITS` guard). Set `DISABLE_VISUAL_EDITS=true` in `/app/frontend/.env`
  (REACT_APP_BACKEND_URL preserved) because the Emergent visual-edits babel plugin stack-overflows
  on the repo's large JSX (e.g. `v2/shell/CommandPalette.jsx`). Removed `src/setupProxy.js`
  (it defaulted to the node mock on :4300; the k8s ingress already routes `/api`→8001).
  Deps were already identical — no installs. Old UI backed up at `/app/frontend/_v1_backup/`.
  STATUS: all presentational routes render in the new look (landing, pricing, how-it-works,
  use-cases, auth, sandbox intro, app shell/components). **Data screens are NOT wired**: the repo
  frontend calls a `/api/v2/...` contract the current backend does not implement, so the workspace,
  "Open the sandbox", and real sign-in return 404 / "Not Found" until the v2 backend is built.
  NEXT (explicitly deferred by user): implement the `/api/v2` backend contract to match the mock in
  the repo's `mock/server.js` + `docs/API_V2.md`. The old `/api/projects|connect|demo` endpoints
  still exist, untouched.
- 2026-06: (superseded by the full swap above) prior incremental v2 restyle — marketing port,
  Urbanist typography, command palette, contact inbox, auth reskin. Reference only.
- 2026-06: **Bracket 2.0 overhaul — Phase 2** (backend unchanged):
  - **Typography overhaul**: swapped the whole app's sans from Geist → **Urbanist** (`index.css`
    sans refs + `tailwind.config` display/body; Geist Mono kept). The workspace, auth and
    onboarding now match the marketing site's type; the dark palette already matched v2.
  - **Command Palette (⌘K / Ctrl+K)**: new global `src/components/CommandPalette.jsx` mounted in
    `App.js`; searches projects (from `/projects`) + nav actions (Home/Connect/Activity/Settings),
    arrow-key + enter navigation. Styled with `.bk` v2 tokens.
  - **Contact Inbox**: admin console "Contact" tab (`AdminDashboard.jsx`) backed by new
    `GET /api/admin/contact-messages` (admin-only) listing marketing contact-form submissions.
  - Auth (`/login`, `/signup`) **fully reskinned** to the v2 marketing look (`Login.jsx` rewritten
    with v2 `AuthLayout` + primitives; logic/testids preserved; `/signup` opens in sign-up mode;
    DeviceGate now allows `/login` `/signup` on mobile). OTP code flow verified end-to-end.
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
