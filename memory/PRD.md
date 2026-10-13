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
- 2026-06: **Timeline filters, lighter skeletons, notification bell feed.**
  1. **Timeline filters**: endpoint ignored type/source/range/memory_only/q. Added `filter_timeline()` +
     `timeline_counts()` in v2_real and wired the params in `/w/{wid}/timeline`. Each event is tagged
     (changes/memory/notes/sources) via `_event_type`; filters + counts now agree. Verified via API + UI
     (Changes detected + Last 7 days narrows the list).
  2. **Lighter skeleton shimmer**: `.skeleton` now a soft white sweep over `--bg-surface-raised`
     (rgba 6% highlight), shimmer eased to 1.8s ease-in-out — applies site-wide.
  3. **Notification bell (Toast Center)**: the existing Updates bell was reading an empty `notifications`
     collection. Rebuilt `/api/v2/updates` to aggregate real events — detected/conflict memory (attention)
     + source_events (learned/connected, synced, sent) grouped as attention/memory/system, newest-first.
     Unread tracked via `users.updates_seen_at` (Mark all read bumps it). Verified: bell shows real
     "Change detected / Connected Figma / sent" items with unread dots.
- 2026-06: **Figma search, search loading, notifications, performance.**
  1. **Performance (perceived slowness)**: backend endpoints are already fast (80–260ms); the lag was the
     client refetching + showing a skeleton on every tab switch. Added stale-while-revalidate caching to
     `useResource` (`cacheKey` + module cache in `data.js`) applied to Overview, Memory, Timeline,
     Conversations, Sources, Reviews — revisiting a tab now renders instantly and revalidates in the
     background. Verified: Overview returns with no skeleton flash.
  2. **Search loading**: `SourcePicker` (in-workspace Add source) now shows a spinner in the search box +
     a "Searching…" overlay; onboarding search already had its Loader2.
  3. **Figma search**: widened the team-project scan (12→40) so name search finds more files; when no team
     is configured (Figma has no global file-name search API) the empty state now guides the user to paste
     a team/file link instead of a generic "Nothing found".
  4. **Notifications**: confirmed source add ("Connected — Bracket learned N things"), disconnect/remove,
     sync, note/memory add, and review-accept all raise toasts (already wired).
- 2026-06: **Sidebar disconnect, Overview Sync-all + Review-all, post-review reply, readable conversations.**
  1. **Sidebar hover actions**: each source row now reveals Sync + Disconnect on hover (`SourceTrailing`).
     Disconnect opens a confirm asking keep-vs-delete; backend `POST /sources/{sid}/disconnect` removes the
     connection and either keeps (detaches) or deletes the learned memory. New `/sources/sync-all` too.
  2. **Overview "Sync all"**: header button calls `/sources/sync-all` (synced all connected sources).
  3. **Overview "Review all" (N)**: opens a compact modal listing every pending change with inline
     Accept/Dismiss (`ReviewAllDialog`). `build_reviews` now carries `connection_id`/`to`/`provider`.
  4. **Post-review reply popup** (`ReplyDialog`): after accepting, auto-drafts a reply summarising the
     accepted changes, pre-addressed to the thread sender; editable, "Rewrite with AI" (re-calls draft),
     Send via `/threads/{tid}/send`. Prefers gmail/slack targets; disabled for non-sendable (Figma).
  5. **Conversation readability**: `_clean_body` strips quoted reply chains ("On … wrote:", `>` lines) and
     lone bullet dashes, collapses blank runs; frontend renders real paragraphs at a comfortable width.
     Verified: thread reads like an email, 0 quoted tails.
  Verified in-browser on the real "Acme Finance" workspace (Sync all, Review all modal with 20 items,
  accept→reply popup pre-addressed to sender, cleaned conversation). Test review-accept was undone to
  leave data unchanged.
- 2026-06: **Compose "Not Found", source "0 threads/0 messages", sidebar sync** — all fixed.
  1. **Compose New message → "Not Found"**: `POST /w/{wid}/messages` and `GET /w/{wid}/message-templates`
     didn't exist. Added both: compose now sends for real via Gmail/Slack (`send_gmail_reply` returns the
     new threadId), creates a source_connection so the sent message becomes a readable conversation, and
     returns its id to open. 3 starter templates. Validates empty body / missing recipient (400). Verified:
     real self-send → `{ok:true}` + navigable conversation.
  2. **Source detail "0 threads · 0 messages"**: `build_sources` never returned the per-thread array the
     SourceDetail page reads. Now returns `threads`/`channels`/`notes` with real message counts (parsed
     from `content_cache`), top-level `messages`, and a `from` label (fixes "undefined · 19 msgs").
     Verified: real Gmail source shows "1 thread · 19 messages", 65 memories.
  3. **Sidebar source sync on hover**: each source row in the sidebar now reveals a RefreshCw button on
     hover (`SourceTrailing` in AppShell) that calls `syncSource` + `refreshAll`. Verified present.
- 2026-06: **Real conversation dates + real message send** (replaced import-time stamps and a no-op send stub).
  1. **Dates**: added `parse_digest_messages()` / `digest_last_at()` in connectors to recover real
     messages+dates from the stored `content_cache`. `build_threads` now renders the actual thread
     messages with their real sent dates; extraction stamps memory `occurred_at` (and connection
     `last_activity_at`) with the real conversation date. Backfilled existing data (5 connections,
     132 memory items). Verified: Conversations shows the real 15-msg Sep thread; Timeline items moved
     from import-time (Oct 13) to the real date (Sep 23).
     Limitation: all items from one thread share that thread's latest message date (the LLM doesn't map
     each extracted item to a specific message); the conversation view shows each message's own date.
  2. **Send**: `/api/v2/w/{wid}/threads/{tid}/send` was a stub returning `{ok:true}` — no mail sent. Now
     resolves the source connection and sends for real via new `send_gmail_reply()` (threaded reply) /
     `send_slack_message()` helpers. Verified: empty body → 400; real self-send → 200 and delivered.
- 2026-06: **Demo projects leaked into every account + Timeline only showed the connect event** — both fixed.
  1. **Seed projects for everyone**: `/api/v2/workspaces` always prepended two synthetic demo workspaces
     (`p1` Fintech Landing Page Redesign, `p2` Spring '26 polo order) — so real new users saw 3 projects.
     Now gated to demo accounts only via `SEED_VIEWER_EMAILS` (default fresh/solo/pro@use-bracket.com,
     env-overridable). Verified: a fresh OTP user gets an empty list; demo accounts still see the showcase.
  2. **Timeline = thread history**: `v2_real.build_timeline` now merges source events with one event per
     extracted `project_memory` item (Requirements/Decisions/Deliverables/Commitments/…), newest-first,
     so Timeline shows everything learned inside connected threads — not just "Connected Gmail". Also added
     a `detail{}` object to every timeline event (fixes a latent EventDetail crash: `d.heading` on undefined).
     Verified in-browser: real "Acme Finance" project shows 31 events; clicking one opens the detail panel.
  3. **Doubled source name** ("Website redesign for FlowdeskWebsite redesign for Flowdesk"): added
     `_collapse_repeat()` guard at write-time in `extract_sources_into_project`, and cleaned existing DB rows
     (4 connections, 132 memory labels, 32 events). Chip now reads a single "Website redesign for Flowdesk".
- 2026-06: **Ask Bracket & Draft reply crashes fixed** ("Cannot read properties of undefined (reading 'memories')").
  Backend/frontend contract mismatch: `v2_real.ask` returned `{answer, confidence, sources}` (no `basis`,
  `lead`, numbered sources) but `AskTurn` read `a.basis.memories`/`a.lead`; `v2_real.draft` returned
  `{draft, to}` but `DraftComposer` read `draft.body`/`draft.via`. Fix: both real + demo `ask` now return
  `lead`, `answer`, `basis{memories,sources}`, numbered `sources[]` (+`no_answer` status when memory empty);
  both `draft` now return `body`, `via`, `based_on`, `note`, `to`. Frontend also guards `a.basis`/`a.lead`
  and falls back to source index. Verified in-browser (demo p1): Ask renders answer + "5 memories and 2
  sources" + citations; Draft renders body + Send via Gmail. No runtime overlay.
- 2026-06: **Onboarding read-nothing bug fixed** (Choose → Start learning → Ready all 0s → empty overview).
  Root cause: `_run_onboarding` re-listed `gmail_list_sources(account, "")` (default **12** inbox threads)
  and intersected the user's picked ids against it — so any thread picked via **search** (not in the
  default 12) was dropped, extraction got an empty `picked`, and 0 memory was created. Fix:
  pass the user's chosen ids straight to `extract_sources_into_project` (it fetches each by id anyway);
  Gmail labels resolved via new `gmail_threads_meta()`, Slack via the full channel listing; Figma/GitHub
  unchanged (most-recent). Verified by harness that a searched/non-default thread id now reaches extraction.
- 2026-06: **4 more reported bugs fixed** (testing_agent iteration_77 confirmed #1 & #2; #3/#4 are code-level, need a live Gmail to observe in-browser).
  1. **Sandbox runtime crash on conversations/pages** ('RangeError: Invalid time value') → added `safeFmt()`
     in `Conversations.jsx`; all `format(new Date(...))` guard invalid/missing dates. Verified via screenshot.
  2. **Leaving sandbox logged user out / went to landing** → `sandbox.jsx leave()` now targets `/plan`. Verified.
  3. **Pre-selected threads on step 3** → backend `onboarding_state` sets thread `selected: False` always.
  4. **Read step stuck on blank 'Starting…' / minutes** → Learning shows a clear spinner + 'Reading your
     sources…', per-source fetch+analyze already concurrent, sources capped at 8, and the step
     **auto-advances to the summary when done** so it can't hang.
  - **Also fixed (found during test):** visiting `/welcome?step=3` with no workspace fired
    `GET /w/null/onboarding` → unhandled 404 overlay. Onboarding now forces step 1 (or resumes the draft)
    whenever there's no workspace id, so workspace-dependent steps never mount with a null id. Verified.
- 2026-06: **7 reported bugs fixed (sandbox, onboarding, speed, in-app connect).** Verified by
  testing_agent iteration_76.json (5/7 e2e; #3 & #4 need live Gmail OAuth, not headless-testable).
  1. **Sandbox hang** → `demo.py _seed` now pre-seeds `v2_categories` + `v2_cat_map` so the sandbox
     Overview renders in ~2-4s (was stuck on skeletons while LLM-inferring categories). `demo_simulate`
     keeps the map in sync so each played beat stays instant.
  2. **Save & Exit removed** from the onboarding header.
  3/4. **Connect state / pre-selected threads** — step 2 now fetches a lightweight `?status=1`
     (connected-only, no live mailbox fetch) so going back shows connected instantly; step 3 pre-selects
     5 threads and re-queries the server on search (needs live Gmail to fully see).
  5. **Step 4 renamed** 'Learn' → 'Read'; Learning extraction now runs per-source fetch+analyze
     **concurrently** (`asyncio.gather` in `extract_sources_into_project`) so it finishes in ~slowest-source
     time instead of the sum.
  6. **Speed** — fixed `/api/v2/updates` 404 (added `GET /v2/updates` + `POST /v2/updates/read` backing
     the notifications bell), lightweight onboarding status, concurrent extraction, pre-seeded sandbox.
  7. **OAuth popup shifted the background to /sources** → the sidebar 'Connect a source' / '+ Add source'
     now open an in-place `AddSourceDialog` + `ConnectFlow` overlay in `AppShell.jsx Sidebar()`; the
     background URL no longer changes. testids: `sidebar-add-source`, `sidebar-connect-source`, `connect-{provider}`.
- 2026-06: **FIX — signup flow had no plan gate, no sandbox, no resumable draft (regression from UI swap).**
  - **Plan gate**: `routeAfterAuth` now sends any new or no-plan user to `/plan` (was dumping
    everyone straight into `/welcome`). `/plan` route now renders the real `Plan()` screen (was a
    redirect to billing). `/welcome` self-guards: no `user.plan` → `/plan`.
  - **Choose-a-plan screen**: real Razorpay Monthly (₹999)/Per-project (₹199) + the "Launch offer:
    first project free 14 days, no card" claim (`/payments/ph-activate` → plan `ph_launch`). After
    pay/claim → `/welcome`.
  - **Sandbox in-flow**: Plan screen now offers "Explore a sample project first — no card, nothing
    connected" → `/sandbox` for people who want to try before trusting/paying.
  - **Resumable drafts**: onboarding workspaces are `status:in_progress` until finished; step is
    persisted (`onboarding.step` via `POST /w/{id}/onboarding/step`). "Save & exit" → `/app`; returning
    to `/welcome` calls `GET /v2/onboarding/draft` and resumes at the saved step. `finish` flips the
    project to `active` so it stops being a draft. Verified: create→step3→draft resumes at 3→finish→draft null.
- 2026-06: **FIX — onboarding Gmail/Slack search was client-side only** (filtered 12 cached rows).
  Now `GET /w/{id}/onboarding?q=` runs a real server-side mailbox/workspace search; step 3 re-queries
  the backend as you type (debounced, with spinner + empty state). Verified against a live Gmail account.
- 2026-06: **FIX — Figma & GitHub missing from onboarding Connect step.** Added both (real OAuth);
  backend `_run_onboarding` auto-extracts connected Figma files / GitHub repos; Learning screen renders
  any provider generically.
- 2026-06: **FIX — first-run onboarding wizard was 405/404 (critical).** The v2 UI's `/welcome`
  wizard called `POST /v2/workspaces` + `GET/POST /v2/w/{id}/onboarding*` which were never wired
  on the backend (only `GET /workspaces` existed → "Method Not Allowed"). Added the missing
  adapters in v2_workspace.py over the EXISTING real stack (no rebuild): `POST /v2/workspaces`
  (real project create + plan-limit 402 `{code:plan_limit}`), `GET /onboarding` (real linked
  providers + live Gmail threads / Slack channels), `POST /sources/connect` (real OAuth auth-url),
  `POST /onboarding/connect` (persist connect state), `POST /onboarding/start` (background real
  extraction), `GET /onboarding/progress` (live counts), `POST /onboarding/finish` (real category
  counts + first attention). Reuses a new `extract_sources_into_project()` in connectors.py that
  mirrors the proven `establish_connection` loop (fetch→analyze→persist). Verified via curl
  (create, state, auth-url=accounts.google.com, finish) + UI: step 1 now creates a workspace and
  advances to step 2. OAuth popup + live extraction need a real linked Gmail/Slack to fully exercise.
- 2026-06: **Admin: permanent account deletion (irreversible, GDPR-grade)** — new
  `POST /api/v2/admin/users/{uid}/delete` (admin_v2.py) hard-erases a user and ALL their data
  across every collection via `_cascade_delete_users` (projects, project_memory, source_connections,
  source_events, notifications, files, knowledge_items, click_events, v2_attention_state, sessions,
  oauth_states, payment_transactions, email_otps, …). Guarded by a required audit reason + typed
  email confirmation (422 otherwise), signs the user out everywhere first, and writes an
  `admin_audit` entry. UI: "Delete forever" button + confirmation dialog in admin UserDetail.jsx
  (testids admin-delete-user-btn / -confirm / -reason / -confirm-email). Runs against whichever
  environment's DB the instance is bound to — so it erases prod data when run from the prod admin
  console, preview data from preview. Verified via curl (full cascade, guard rejections) + UI screenshot.
  NOTE added `v2_attention_state` to `_CASCADE_BY_PROJECT` so snooze/save state is also erased.
- 2026-06: **Snoozed/Saved attention (real), category hide/pin/delete, plan-limit upgrade nudge.**
  `v2_attention_state` collection persists snooze(+until)/save; `?view=later` returns real lists;
  elapsed snooze auto-returns to active. Category menu Hide/Pin persist flags (rail filters hidden),
  "Not a real category" deletes + re-maps memory to nearest. WorkspaceBanner shows a dismissible
  "using all N of N projects" nudge → real Razorpay checkout. Backend curl-verified.
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
