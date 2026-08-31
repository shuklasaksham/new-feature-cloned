## Changelog — 2026-06 (pricing update + INR/USD toggle on Pricing & Checkout)
- **New pricing**: Monthly **₹999/$12** (was ₹2,499/$29), Per-project **₹199/$2** (was ₹749/$9). Limits/features unchanged (Monthly: up to 10 active projects; Per-project: 1 project, 60 days). Updated server-side `PLANS` in `server.py` (source of truth for LIVE Razorpay order amounts) + all user-facing copy: `Pricing.jsx`, `ChoosePlan.jsx`, `PlanModal.jsx`, `Terms.jsx`.
- **INR/USD currency toggle** added to the public Pricing page (`/pricing`) and the checkout page (`/plan` → `ChoosePlan.jsx`), matching the existing `PlanModal` toggle. `ChoosePlan` now passes the selected `currency` to `POST /api/payments/razorpay/order` so USD actually charges. (USD requires Razorpay International Payments enabled — user confirmed enabled/in review.)
- Verified: Pricing toggle switches ₹999/₹199 ↔ $12/$2 (asserted live); backend restarted clean. ChoosePlan uses identical verified pattern.


## Changelog — 2026-06 (favicon/OG, live showcase, onboarding tour, global search)
- **Favicon + social image**: generated a monochrome app icon (dark tile + white hexagon mark) and an OG share image (mark + "Bracket" + tagline) from the real logo → `public/bracket-favicon.jpg` + `public/bracket-og.jpg`; wired into `index.html` (favicon/apple-touch + og/twitter image) and `Seo.jsx`. Served 200.
- **Live homepage showcase**: new public `GET /api/public/showcase` (server.py) returns a REAL sample project's live snapshot — name, memory counts by category, newest item as the "needs attention" highlight, and a "+N more". `Landing.jsx` fetches it so the showcase is always current. **Made non-clickable** (reverted the Link/"Open Bracket" hover per user).
- **Onboarding tour** (`components/OnboardingTour.jsx`): a 3-step guided first-run shown once (localStorage `bracket_tour_done_v1`) on the `/welcome` first-project page — Welcome → Connect → It keeps up, ending with a "Connect a source" CTA that dismisses to the connect cards. Skip/Next + step dots.
- **Global memory search** (`GlobalSearch` in `ProjectMemory.jsx`): a ⌘K / Ctrl+K palette (also a "Search" item at the top of the sidebar nav) that searches every memory item (scope/deliverables/requirements/decisions/deadlines/questions) by title, detail, category and source — live results with category icon + tag. Esc/overlay closes.
- Verified via screenshots: homepage showcase (real data, not clickable), search returning 10 results for "brand", onboarding stepping to "Connect a source"; favicon/OG/showcase endpoints all 200.



- **Reverted the logo swap** (user did not want a new logo): removed `BracketLogo.jsx`; restored the original hexagon/cube PNG in the Navbar (42px), Footer (34px) and the homepage product-visual sidebar. **Enhanced** it with `filter: brightness(0) invert(1)` so the previously-faint light logo renders crisp pure-white on the dark UI, and enlarged it for visibility.
- **Homepage product showcase is now clickable**: the Overview recreation is wrapped in a `<Link>` to the app (`/app` when signed in, else `/login`), with an "Open Bracket →" hover affordance + lift on the window bar. Still a faithful monochrome copy of the real tool (sidebar docked-tab geometry, Needs-attention card, memory counts).
- Verified via screenshots (nav/footer logo visible; showcase hover + link).



- **New logo** (`components/BracketLogo.jsx`): crisp monochrome `[ ]` bracket mark + "Bracket" wordmark (SVG, `currentColor`, sharp at any size). Replaced the faint hexagon PNG in the Navbar and Footer. Also neutralized the Navbar's scroll-accent from blue/amber → monochrome greys.
- **Homepage rebuilt** (`pages/Landing.jsx` + `.lp-*` CSS): pure black/charcoal/white, static dot-grid texture (no particle animation), large editorial type, generous negative space. Six sections exactly per brief: minimal nav; hero ("PROJECT MEMORY FOR CLIENT WORK" / "Your client changed something. Bracket already knows." + verbatim copy + Get started / See pricing); a faithful in-browser recreation of the new Bracket Overview (real DOM sidebar with the docked-tab concave-fillet geometry, "SaaS Dashboard Redesign · Updated just now", a "Needs your attention → Mobile screens requested / Sarah…" card with Review → +2 more, and quiet Scope 8 · Deliverables 4 · Requirements 7 · Decisions 2 counts — NOT an image); a 3-step editorial "How it works" (01/02/03, thin separators, no heavy cards); a minimal final CTA ("YOUR PROJECT, REMEMBERED" / "Stop reconstructing your projects from messages."); minimal footer (logo · Privacy · Terms · © 2026 Bracket).
- Removed the old dashboard PNG visual + gradient headline; no testimonials/logo walls/feature grids/stats. Positioning holds: Bracket = a project memory layer for client work (never called a PM tool / CRM / AI assistant). Blueprint from `design_agent` (`/app/design_guidelines.json`).
- Verified via screenshots (hero, product visual, how-it-works, final CTA, footer) at desktop width. Frontend-only.



- **Plan limits reworked** (`connectors.py`): Monthly ($29) → **up to 10 ACTIVE (non-archived) projects, unlimited archived**; Per-project ($9) → **1 active project for 60 days**. `PLAN_PROJECT_LIMITS = {monthly:10, project:1}`. Quota now counts active only and returns `archived`, `plan_expires_at`, `plan_expired`. Create/establish gating counts active projects.
- **Project Archive / Unarchive** (server.py `POST /projects/{id}/archive` + `/unarchive`; `/projects` list now returns `archived`): archived projects don't count toward the active limit; unarchive is blocked (402) if already at the active cap or plan expired. UI: project switcher splits **Active** vs an **Archived · N** section, with hover archive icon on active items and a restore icon on archived (`ProjectSidebar.jsx`, `onProjectsChanged`).
- **60-day access lock** ($9 plan): after 60 days the project goes **read-only** — a lock banner ("Your 60-day project access has ended · Renew or upgrade") shows in the workspace (`ProjectMemory.jsx`, driven by `/project-quota.plan_expired`), and 7 write endpoints (suggest-reply, send-slack, send-email, update build/approve/undo, memory create + establish) return **402** via `_owned_project(..., require_write=True)` / `_assert_not_expired`. Reads stay 200. Verified end-to-end.
- **Legal pages replaced** with the client-provided text, reviewer notes stripped, dated **August 31, 2026**, operated by Saksham Shukla (India): `Privacy.jsx` (16 sections, incl. Gmail/Google Limited Use) + `Terms.jsx` (23 sections, incl. plan/60-day/refund). Route label now "Terms of Use".
- **Pricing** copy already matched (10 active / 60 days); fixed the FAQ "never used to train AI models" absolute claim → careful new wording. **Footer** ("main website links") consolidated to Pricing · Privacy · Terms.
- Verified: quota for all 3 accounts, archive/unarchive (curl + UI), lock banner + 402 write-guard (backdated test, then restored), Privacy page render. Demo data left clean (solo/pro restored).



- **Settings no longer dumps into the old dashboard shell**: `Settings.jsx` gained an `embedded`/`onBack` mode; the project sidebar's Settings button (and the user-menu Settings) now set an in-workspace `view === "settings"` instead of navigating to `/settings` (which was wrapped in the legacy `AppShell` with Dashboard/Activity/Connect Work). Renders inside `.project-view` with an internal scroll (`.settings-embed`/`.settings-embed-main`) so the fixed viewport rule holds.
- **Help is in-layout too**: new `HelpPanel` (FAQ + support email) renders as `view === "help"` in the project workspace — no more redirect to `/pricing`/marketing.
- **Disconnect / reconnect anytime**: each source row in `ProjectSidebar` now has hover actions — Disconnect (confirm dialog → `DELETE /connect/connections/{id}` → refresh) and, when a source is unhealthy (red), Reconnect (opens the inline Add-Source dialog). Reuses `useDialog`. New CSS `.psb-source-actions/.psb-src-btn`, `.help-faq/.help-q/.help-a`.
- Verified via screenshots on the pro account: Settings + Help render inside the project shell (sidebar intact, footer tab active), billing shows the plan; disconnect button visible on source hover.
- STILL PENDING (requested, not yet built): **Onboarding Tour** (guided first-run for fresh accounts) and **Global Memory Search** (one search box across decisions/requirements/scope/messages).



- **Collapsed sidebar was broken** (user report): opening the project switcher (or user menu) while the rail was collapsed rendered the dropdown at `left:0/right:0` inside the 76px rail, so its text wrapped vertically into an unreadable column. Fixed by popping both menus OUT to the right at a proper width when collapsed: `.project-sidebar.is-collapsed .psb-switch-menu { left:calc(100%+10px); right:auto; width:264px; top:0 }` and `.psb-user-menu { …; width:200px; bottom:0 }`. Verified: switcher + user menu both pop out cleanly.
- **Demo sources showed "Reconnect"** (misleading on seeded demo accounts with no real OAuth token → red health). Flagged the 5 seeded `source_connections` with `is_demo:true` so `/connections` returns green health → sidebar now shows "Connected". Verified.



- **Full data wipe**: deleted ALL user-generated collections (users, sessions, projects, project_memory, source_connections, source_events, project_updates, integration_accounts, workspaces, notifications, payments, files, clients, playbooks, knowledge_items, j* collections, click_events, etc.). Preserved only global config: `admin_config`, `counters`, `geoip_cache`. Hidden admin (`support@use-bracket.com`) auto-re-seeds from env on backend restart.
- **3 demo accounts** (password `Bracket@2026`, see `/app/memory/test_credentials.md`): `fresh@use-bracket.com` (no plan, 0 projects → lands on Choose-plan), `solo@use-bracket.com` ($9 `project` plan, 1 project, switcher shows "Upgrade to add projects · 1 of 1"), `pro@use-bracket.com` ($29 `monthly` plan, 2 projects, unlimited). Plans set directly (test env, no Stripe charge).
- Projects built via the REAL connect+AI pipeline (built-in demo Gmail sources) so each has genuine extracted memory; AI-duplicate names renamed to distinct realistic ones ("Website Redesign — Final Scope", "Mobile App Redesign", "Brand Identity + Landing Page"). Seed script kept at `/app/scripts/seed_demo.py`.
- **Verified as a real user (desktop)**: all 3 logins OK; Home dashboard / Conversations / Timeline render with real data; `/payments/billing` + `/project-quota` correct per plan; plan-limit gating enforced. App is desktop-only — verified at 1920-wide; no mobile screen added (per user).



- **Sidebar tab switch is smooth now**: added transitions to the docked active nav item (background/color/radius/padding/margin) + a fade on the concave fillets, and wrapped Home/Conversations/Timeline content in a keyed `motion.div.project-view` so switching fades/slides in (ProjectMemory.jsx).
- **Collapsed rail redesigned** (was broken/off-center): collapsed active tab drops the dock margin/fillets and renders a clean centered 46px rounded highlight; nav/foot/add-button centered; switcher name hidden. Added **hover tooltips** in collapsed mode via `data-tip` + CSS `::after`; fixed the sidebar clipping them by setting `.project-sidebar.is-collapsed { overflow: visible }` (was `overflow-y:auto` which forced overflow-x clip).
- **Home/Overview → richer animated dashboard** (user: "lifeless"): monochrome, fixed-viewport, no page scroll. Header now has a live **"Synced …" pulse** + **connected-source chips**; an **at-a-glance stats row** (4 clickable tiles: Scope/Deliverables/Requirements/Decisions → open category modal); **NEEDS ATTENTION** card; **UP NEXT** next-deadline panel; **RECENT ACTIVITY** list (newest 5, click → category modal). framer-motion staggered entrance. New CSS `.ov-meta/.ov-live/.ov-chips/.ov-dash/.ov-stats/.ov-stat/.ov-grid/.ov-panel/.ov-deadline/.ov-recent`.
- **Add source no longer navigates away** (user: "should not be redirected to any other page"): new `components/AddSourceDialog.jsx` — click "+" → dialog lists providers → clicking a connected tool opens an **inline picker** (search + multi-select) OR, if not linked, starts an **inline OAuth popup** — then attaches to THIS project via `/connect/preview` + `/connect/establish` (mode=existing), staying on `/project/:id`. Partial-failure aware toast ("X attached, Y failed"). ProjectSidebar renders it and refreshes connections via `onSourcesChanged={load}`. Old `/app/connect` deep-link + inline sidebar dialog removed.
- Verified: testing agent iteration_54 = 100% frontend, 14/14 flows pass (dashboard, stat/recent modals, no-doc-scroll on all 3 tabs, tab-switch, collapse+tooltip, inline Gmail picker → select → attach → URL stays → sidebar refresh, back/close). No bugs.



- **Header bell/··· now functional** (were static): shared `HeaderActions` in ProjectMemory.jsx renders a notifications popover (pending change → Review + View timeline) and an options menu (Home/Timeline/Refresh). Threaded via `headerActions` prop into Home/Conversations/Timeline. CSS `.ha-pop/.ha-menu-item`.
- **Removed legacy page on add-source**: `/app/connect` route no longer wrapped in `<AppShell>` (App.js) — renders standalone, no old Dashboard/Activity/Pricing sidebar. Sources "+" dialog still deep-links `/app/connect?project=&tool=`.
- **Post-review send prompt**: after approve, ProjectUpdateReview transitions to a compose step (AI draft via /suggest-reply summarizing kept changes) → Send (send-targets + send-email/send-slack) or Skip.
- **Undo Accept**: approve now stores `applied{confirmed_ids,added_ids,event_id}` on project_updates + returns update_id; new `POST /projects/{id}/update/{uid}/undo` reverts confirmed→detected, deletes added memory + the CHANGE_ACCEPTED event, reopens the snapshot. Toast shows an "Undo" action. Verified: build→approve(confirmed 8/added 4/impact)→history event→undo ok.
- NOT DONE — "Requested by Sarah" author: memory items don't capture the message sender in the sync/extraction pipeline, so there is no name to display without a backend/data change (no fabrication). Flagged as backlog.


## Changelog — 2026-06 (Project Change review: one request = one review, partial-accept)
- Backend `/update/{id}/approve` now accepts optional body `{exclude_direct:[ids], exclude_downstream:["cat|title"]}` for PARTIAL acceptance — excluded direct items → ignored, excluded downstream → skipped. Writes ONE grouped `source_events` `CHANGE_ACCEPTED` (summary + impact `Scope +1 · Deliverables +2 …`) counting only KEPT parts; `/history` now surfaces `event.detail`.
- `ProjectUpdateReview.jsx` rebuilt into a large, roomy centered dialog (`.pu-modal` min(94vw,860px), 92vh, 2-column `.pu-cats`) — monochrome, mono CTAs, with per-item keep/remove checkboxes (`.pu-item/.pu-check`). Accept button reads "Accept N changes" reflecting kept items. Footer: View conversation | Not part of project | Accept changes.
- Overview NEEDS ATTENTION shows ONE consolidated Project Change card (driven by `detectedCount`) → opens the single review. Scope/Deliverables/Requirements/Decisions dialogs remain read-only current-state views (no re-approval). Accepting logs the grouped change to Timeline history.
- Verified live: seeded pending items → build → 2-col toggle dialog rendered (Scope/Requirements/Decisions/Timeline) → unchecking one flipped the CTA to "Accept 11 changes".


## Changelog — 2026-06 (monochrome fix, full-width content, mono CTAs, Timeline redesign)
- **Monochrome**: set all `MEMORY_CATEGORIES` colors + `STATUS_META` colors to greys (memoryCategories.js) so every category icon/status renders monochrome app-wide (removed violet/teal/green/etc.).
- **Empty right space fixed**: `.project-main-inner` max-width → `none` (fills the workspace); stream/timeline rows now push meta to the far-right, Ask Bracket spans full width.
- **CTA font = design-system mono**: added `font-family: var(--font-mono, ui-monospace,…)` to all CTAs/labels (attn-review, ask-chip, view-older/earlier/all, stream-orig2, section metas, deadline due, history eyebrow/who/time).
- **Timeline redesigned to reference**: header + APPROACHING DEADLINES row (calendar cards w/ dividers, "View all deadlines →", graceful empty state) + PROJECT HISTORY rail (date eyebrow + title + desc + right meta `provider · time · View original`) + "View earlier history →" (opens full-history modal) + full-width **ASK BRACKET** history Q&A wired to real `POST /projects/{id}/ask` (returns {answer}) with suggestion chips + "More examples". `no-page-scroll` preserved.
- New CSS: `.tl-sec-head/.tl-deadlines/.tl-dl*/.tl-hist/.tl-h-*`, `.ask-search`. New components: `AskBracketHistory`, answer modal; `TimelineHistoryModal` signature dropped `colorFor`.
- Verified via screenshots (Timeline + Conversations): monochrome icons, full-width layout, mono CTAs, no page scroll; `/ask` returns grounded answers.


# Bracket — PRD

## Changelog — 2026-06 (Home + Conversations redesign to reference, faster sync, Sources dialog)
- **Home** rebuilt to the provided mockup: large project title + "Updated {timeAgo}" indicator; NEEDS ATTENTION featured item (ring icon + title + description + "Review →" + "+N more"); PROJECT MEMORY underlined tab row (Scope · Deliverables · Requirements · Decisions with counts + dividers) opening the existing CategoryModal. (`OverviewView` in ProjectMemory.jsx; CSS `.attn-*`, `.mem-*`.)
- **Conversations** rebuilt to the mockup: header "Conversations" + "Bracket compresses client messages and helps you respond."; "What your client said" 2-line compressed stream (icon | title+summary | timestamp | View original↗) capped to 4 with a "View older" toggle inside the fixed scroll region; Ask Bracket docked as a bottom composer (`AskBracketBar`) with input + suggestion chips + "More suggestions". Generating a reply opens `DraftReviewModal` (editable draft + recipient checklist + Send) — full Ask→Draft→Review→Select→Send, reusing suggest-reply/send-targets/send-email/send-slack. Old right-column SuggestedReplyChat no longer used here. CSS `.stream-row2`, `.conv-stream-region`, `.ask-bar*`.
- **Faster realtime**: memory/connections polling interval reduced 10s → 5s (still visibility-gated + focus refresh); added `updatedAt` state → Home "Updated just now".
- **Sources "+" dialog**: sidebar "+" now opens a dialog (`/connect/providers`) listing every source Bracket supports with Connect (Gmail/Slack/Figma/GitHub) or "Soon" (WhatsApp/Teams/Adobe/GDrive/Notion/Dropbox); Connect navigates to `/app/connect?project=<id>&tool=<key>` to add another source to the SAME project. (ProjectSidebar.jsx; CSS `.src-dialog-*`.)
- Verified via screenshots on demo: Home + Conversations match refs, `no-page-scroll: True` on both, chip → real LLM draft → Review & send modal with 3 Gmail recipients. Note: real push (Gmail webhook) not wired — near-real-time via 5s polling.


## Changelog — 2026-06 (Fixed-viewport app shell — no page scroll)
- Reworked the workspace into a fixed application surface. `.project-shell` = `height:100dvh; overflow:hidden`. `.project-main` = `height:calc(100dvh - 32px); overflow:hidden; display:flex; flex-direction:column` (never grows with content). `.project-main-inner` = flex column, `min-height:0; overflow:hidden`.
- Verified via DOM measurement that Home/Conversations/Timeline all yield an IDENTICAL fixed workspace rect (top 16, left 288, width 1616, height 1048) and `pageScrollable:false` on every screen and with modals open — switching tabs never moves/resizes it.
- Did NOT blanket `overflow-y:auto` the workspace. Instead reshaped density per screen: Home stays minimal; Conversations caps to 10 recent messages in a contained list column beside a full-height Ask Bracket panel (`.conv2-col`, `.stream { flex:1; min-height:0; overflow-y:auto }`, SuggestedReplyChat now `h-full` with thread `flex-1 min-h-0`); Timeline shows Upcoming + 6 recent history rows inside `.tl-body-region` (overflow hidden) plus a "View full history (N)" button → `TimelineHistoryModal` (scrolls inside the modal only).
- Mobile (≤900px) restores normal document flow/scroll (shell/main height auto, overflow visible).
- Visual language, sidebar, colors, typography, navigation and docked-tab styling unchanged.


## Changelog — 2026-06 (Simplicity-first IA redesign — Home / Conversations / Timeline)
- **Sidebar nav reduced to 3**: Home (renamed from Overview), Conversations, Timeline. Scope/Deliverables/Requirements/Decisions/Deadlines/History are no longer separate pages. Sources/Settings/Help unchanged. (`ProjectSidebar.jsx` NAV array.)
- **Home** (`OverviewView` in `ProjectMemory.jsx`): lightweight — "Needs your attention" (dynamic: detected/review/scope-change items, else calm "all caught up"), optional next-deadline "Upcoming" card, and a "Project details" chip row (Scope · Deliverables · Requirements · Decisions) where each chip opens a read-only drill-in modal (`CategoryModal`) listing that category's memory items. Nothing heavy shown by default.
- **Conversations** (`ConversationsStream`): compressed chronological stream of project-relevant client messages built from deduped memory items (title — detail · timeAgo · provider · "View original ↗"). "View original" opens `ViewOriginalModal` which fetches the source conversation via `/connections/{conn_id}/content`. Retains the existing Ask Bracket panel (`SuggestedReplyChat`: Ask→Draft→Review→select recipients→Send). Removed the old 3-pane inbox layout.
- **Timeline** (`TimelineView`): one chronological page combining upcoming deadlines (parsed) + a History feed (decisions, requirements, scope changes, deadlines + `/history` events), newest-first. Folds in old Deadlines + History.
- Static `ScopeView.jsx` / `ConversationsView.jsx` no longer imported (dynamic replacements used). New CSS: `.home-cats/.home-cat`, `.conv2-grid/.stream-*`, `.bkt-modal*/.drill-*`, `.tl-*` in `index.css`. Design language + docked-tab styling unchanged.
- Verified by testing agent (iteration_53): frontend 100%, no issues — nav, all 4 drill-in modals, 15-item stream + View original modal, Ask Bracket generate, 19-row Timeline history all working.


## Changelog — 2026-06 (workspace panel rebuild — RESOLVED "entire plot" blocker)
- Reworked the project workspace to match the reference mockup exactly. Shell bg now pure black `#0a0a0a`; sidebar bg `#0a0a0a` (border removed); `.project-main` is now a **floating rounded panel** — surface `#151515`, `margin:16px 16px 0 0` (black gutter top+right), `border-radius:20px 20px 0 0`, `min-height:calc(100vh - 16px)`. This fixes the flat/empty "entire plot" look the user rejected.
- **Active-tab docking redone (replaced the rejected concave `::before/::after` curve hack)**: active nav item now shares the panel surface `#151515`, `border-radius:12px 0 0 12px`, `margin-right:-16px` so its flat right edge sits flush against the panel's left edge → seamless dock. Concave fillets re-added via `mask: radial-gradient(circle 14px …)` on `::before`(top)/`::after`(bottom) so the joint curves smoothly top+bottom (user feedback: "no curve in the joint / bad from bottom"). Inactive hover bumped to `#171717`. Applied to ALL tabs.
- User choices for this change: NO grain texture (kept clean flat surface); apply to ALL tabs.
- `.project-main-inner` → `max-width:1100px; padding:36px 52px 72px`. Sidebar width `288px`.
- Verified live (demo account) on Overview + Scope tabs via screenshots — panel + docked tab render correctly, no layout breakage.


## Changelog — 2026-06 (connected-tab polish + Overview whitespace fix)
- **Sidebar↔workspace connection** made pronounced like the reference: sidebar darkened to `#070707`, workspace panel lightened to `#0f0f10`, active nav item now shares the panel colour, uses `24px` left radius, extends flush to the boundary, and larger `18px` concave `::before/::after` corner curves carve into the sidebar — so the active tab visibly docks into the content panel.
- **Overview whitespace**: `.project-main-inner` now `max-width:1160px; margin:0 auto` and `.ov-wrap` `max-width:880px; margin:0 auto`, so content is centred with balanced margins (removed the ugly one-sided right void) and cards are wider. Verified live.


## Changelog — 2026-06 (Overview / Scope / Conversations → exact spec content)
- **Overview** trimmed to exactly the spec: header (PROJECT · title · subtitle · "Gmail connected" pill + bell-with-dot + menu), **Right now** (single "Scope may have changed" card + Review), **Upcoming** (single "Homepage concepts due Sep 4 · 3 days left"), **Latest** (3 items: Additional landing page requested 12m ago / Homepage deadline confirmed Yesterday / Option B selected for homepage Aug 28). Removed the connected-sources block from the Overview body.
- **Scope** — new `components/ScopeView.jsx` matching the mockup 1:1: Target header, 4 stat cards (12/9/2/1), filter tabs + "Add scope item", 6-row table (exact titles/descriptions + In-scope violet / Needs-clarification amber / Out-of-scope grey tags, drag handles, row menus), "Show 6 of 12 items", right rail = Scope insights (75% violet donut + "Clear scope · 9 of 12…"), Needs your attention (2 items), Recent scope activity (3 items, coloured icons), View scope history.
- **Conversations** — new `components/ConversationsView.jsx` (self-contained, replaces the dynamic one which is kept as `ConversationsViewLegacy`): 4 linked-email threads, full chat thread with left/right bubbles + avatars + timestamps (exact copy), reply bar, and the Ask Bracket panel (prompt chip, Bracket's draft, copy/regen/edit, Send-to checkboxes for Sarah + Alex, "Send to 2 linked emails" pill, "Send only to Sarah"). Content is curated/static per the spec; copy/send actions give toasts.
- CSS added for chat bubbles, Ask-Bracket panel, and the full Scope view. Verified live — all three match the mockups.


## Changelog — 2026-06 (Overview + Conversations redesign + connected sidebar tab)
- **Connected active tab**: the active sidebar nav item now docks into the workspace — its background matches the main surface (`--bg`), rounds only on the left, and uses concave `::before/::after` corner notches (box-shadow trick) so sidebar + content read as one continuous surface. Removed the sidebar right border / main left border.
- **Overview redesigned** (`OverviewView`): per-view header (PROJECT eyebrow, large title, "Here's what's happening…" + top-right source pill / bell / menu) then **Right now** (scope-change / needs-action cards with amber flag + Review), **Upcoming** (deadline cards, "N days left", chevron), **Latest** (activity dots + relative time), and the connected-sources manager. Shared topbar now hidden for Overview & Conversations (each renders its own header).
- **Conversations 3-pane** (`ConversationsView`): left "Linked emails" (search + thread list w/ avatars, subject, time, provider glyph) · middle thread (clean reading view of stored content + locally-appended sent replies + functional reply bar: emoji/attach/zap + input + white send pill) · right "Ask Bracket" (`SuggestedReplyChat`). Reply bar and Ask-Bracket "Send" call the existing real **`POST /projects/{id}/send-email`** (Gmail send scope already granted) with graceful demo fallback (no token → saved locally).
- New CSS: `.psb-nav-item[data-active]` connected-tab, `.ov-*` overview, `.cv-*` conversations.
- Verified live: Overview, Conversations, and the docked active tab all render per the mockups.


## Changelog — 2026-06 (full alignment to login design language)
- **Inputs now match `.login-input`** (the login page's pill fields): `.input-line`/`.input-linear`/`.input-brut`/`.dashboard-search-input`/`.psb-switch-search` all set to `border-radius: 9999px`, height ~46px, monospace, `#0b0b0b` bg, `#262626` border, neutral `#4a4a4a` focus (no violet glow). No textareas use these classes, so multi-line stays rectangular.
- Confirms the earlier `full → 9999px` Tailwind fix (pills) + monochrome token retune. Cards/panels intentionally keep 6px (same as the login error panel). Status colours (green/amber/red) preserved.
- Verified live: Settings (pill inputs + white-pill CTAs), Connect Work (pill search + pill status tags), project view + switcher — all consistent with Login / Plan.


## Changelog — 2026-06 (fix: CTAs were rectangular — restore real pills)
- **Root cause**: `tailwind.config.js` had `borderRadius.full = "6px"` (and `--radius-full: 6px` in `index.css`), so every `rounded-full` CTA rendered as a 6px rectangle instead of a pill.
- **Fix**: `full → 9999px` in both the Tailwind config and the `--radius-full` token; `.btn-primary` set to `border-radius: 9999px`. Card/input radii (`sm/md/lg/xl/2xl/3xl` = 6px) unchanged, matching the login page's rounded-rectangle fields/cards.
- Result: all CTAs are now pills site-wide (Settings Save/Change-plan, project History/Generate, Ask-Bracket suggestion chips, source chips + Disconnect, nav pills). Required a frontend restart to rebuild Tailwind. Verified live (Settings + project view).


## Changelog — 2026-06 (full monochrome sweep + Settings polish + sidebar search)
- **Site-wide monochrome (matches Login / Plan).** Retuned base theme tokens in `index.css`: brand `--accent`→`#E4E4E7`, `--accent-2`→`#fff`, soft/glow/border → white-translucent; `--info`→neutral; **CTA `--primary-bg`→`#fff` / `--primary-fg`→`#000`** (white pill). Darkened surfaces: `--bg`→`#080808`, `--surface`→`#0e0e0e`, `--surface-2`→`#171717`. **Status colours kept** (`--success` green, `--warning` amber, `--danger` red). `.btn-primary` now a rounded-full white pill. This flips every `var(--accent)/--primary` element app-wide (Review/Generate/Send buttons, active nav, focus rings, links).
- **Hardcoded violet purged** from routed pages via sweep: translucent `rgba(129,132,196,α)`→`rgba(255,255,255,α)` and `#989BE0`→`#fff` across Activity, ConnectWork, ProjectMemory/Flow/Document/Overview, ClientReview, ClaimProjects, GlobalAskModal, AutoBuild/ApplyingChanges overlays; solid violet pills `#8184C4`→`#2E2E2E` (locked/selected) and `#8184C4`→`#E4E4E7` for `providersMeta` glyphs + PaymentSuccess spinner. (Admin analytics + unrouted marketing pages left untouched.)
- **Settings & Billing** now render flat-black with white-pill CTAs (inherit tokens; `.btn-primary` pill). Verified.
- **Sidebar project search** (`ProjectSidebar.jsx`): a "Search projects" input appears atop the switcher dropdown once >6 projects; filters the list live; list scrolls; resets on select. New CSS `.psb-switch-search/.psb-switch-scroll`.
- Verified live: project view (no blue), switcher search present + quota action, Settings monochrome.


## Changelog — 2026-06 (old dashboard removed + plan-gated project creation)
- **Old projects-grid dashboard removed.** `/app` and `/app/new` now render `AppEntry.jsx`, which redirects into the most recent project (`/project/{id}`) or `/welcome` when the user has none. The project workspace is the new home. `Dashboard.jsx` no longer routed (file kept, import dropped from `App.js`).
- **Plan-gated "New project" in the project switcher dropdown** (`ProjectSidebar.jsx`): replaced "All projects" with a create action. When the plan allows more (monthly = unlimited) → "New project" → `/welcome`. When at limit (single-`project` plan = 1) → "Upgrade to add projects" → `/pricing`, plus a "{used} of {limit} projects on your plan" hint.
- **Backend**: new `GET /api/project-quota` → `{plan, limit, used, can_create}` (`PLAN_PROJECT_LIMITS = {monthly: None(unlimited), project: 1}`, default 1). Enforced in `POST /connect/establish` for `mode:"new"` → **402** when the plan limit is reached (BuildingProject shows the error state). Route named `/project-quota` (not `/projects/quota`) to avoid the `/projects/{id}` param collision.
- Verified live: `/app` redirects into the latest project; switcher lists all projects with current checked; demo (`project` plan, used 23) shows the Upgrade action.


## Changelog — 2026-06 (global app shell → new flat-black aesthetic)
- **Global sidebar (`AppSidebar.jsx`) rebranded to match the project sidebar**: new cube logo + "bracket." wordmark (was `BracketMark` `<>` glyph), pure-black `#0a0a0a` bg, rounded pill nav (active = filled `#1c1c1c`, no accent bar), monospace WORKSPACE/ACCOUNT labels, bordered user card at bottom, collapse toggle. Expanded width 240→280px, collapsed 64→76px. CSS overrides added under the project-shell block in `index.css` (`.app-shell*`, `.app-sidebar*`, dashboard surfaces/filters).
- **Dashboard**: `.app-shell-main` now `#080808`, stat/project/composer cards flat `#0b0b0b` w/ `#1c1c1c` borders; **white pill CTAs** — "Start a new project" (solid white), "Ask Bracket" (outlined white) in `NewProjectComposer.jsx`; filter tabs monochrome (active = light pill); stat-card accents neutralized (were `#989BE0`/`#8184C4`). **Status tags kept colored** (green accepted / amber awaiting, etc.) per request.
- **`FirstRunChecklist.jsx`** neutralized: white progress bar, white step-check (black tick), white "Open a project"/CTA pill (were violet `--accent`/`--primary-bg`).
- Connect Work / Activity / Settings now render on the new black shell. Verified live (demo): Dashboard, Connect Work, checklist all consistent with auth + project views.


## Changelog — 2026-06 (project workspace → left-sidebar shell)
- **Project view (`/project/:id`) rebuilt** around a project-scoped left sidebar (`components/ProjectSidebar.jsx`) replacing the global `AppShell` + top boxed-tabs. Route no longer wrapped in `AppShell`. Sidebar: "bracket." wordmark + collapse toggle (icon-rail at ≤76px), **project switcher dropdown** (lists all `/projects`, switches via navigate), nav (Overview, Conversations, Scope, Deliverables, Timeline, Requirements, Decisions, Deadlines — active pill + per-category count badges), **Sources** section (read-only connected list w/ health dot + "+" → opens Conversations where the existing connect+attach chips live), Settings/Help, and a user card (name/email + logout).
- **New "Conversations" tab** (`ConversationsView` in `ProjectMemory.jsx`): read-only thread list → click loads cached content via new `GET /projects/{id}/connections/{conn_id}/content`; plus the existing `ConnectedSourcesCompact` (add/disconnect) and the `SuggestedReplyChat` "Ask Bracket" panel.
- `ProjectMemory.jsx`: kept `OverviewView`/`CategoryView`/`SuggestedReplyChat`/`ConnectedSourcesCompact` intact; swapped only the outer chrome. `view` state now driven by the sidebar (adds `conversations`). Top bar keeps title + LIVE + History/Review changes.
- **CSS**: new `.project-shell` / `.project-sidebar` (`.psb-*`) block in `index.css`; responsive stack ≤900px.
- Verified live (demo account): Overview, Conversations (with reader), and Scope tabs render; nav/switcher/sources/user card all present; reached via "Open Project" from the ready screen.


## Changelog — 2026-06 ("Building your project" → "ready" transition)
- **New `BuildingProject.jsx`** (route `/welcome/building`, protected): after "Add to Bracket", `SelectSource` now navigates here with `{provider, sources}` in router state instead of doing the work inline. This screen runs `POST /connect/preview` → `POST /connect/establish` (mode "new") while showing an animated checklist (Reading conversations → Finding project details → Organizing your project; spinner → green check) over the halftone `ParticleField` (image variant, right-biased, gradient-faded to black on the left).
- **"Your project is ready." state** (same component, framer-motion crossfade): a card with the AI project name, `N {conversations|channels|files|repositories} · Added just now`, `{deliverables} · {requirements} · {decisions}` counts (from preview), and an "Open Project →" white pill → `/project/{id}`.
- **Smoother transitions**: entrance fades/slides via framer-motion + `.page-enter`; min 2.4s dwell on the checklist so it never flashes; final step ties to the real establish completion. Verified E2E (select → building → ready → project).


## Changelog — 2026-06 (post-connect "Select a source" picker)
- **New full-page source picker** (`SelectSource.jsx`, route `/welcome/select?tool={provider}`, protected) in the auth aesthetic (pure black, split layout): left = logo + adaptive heading + connected-account card (green check + email + edit→`/welcome`) + privacy card + Back; right = bordered panel with search, a table (checkbox · Conversation/Channel/File/Repository · Messages/Members/Issues · Last Activity), footer "Add to Bracket" white pill + selected count.
- **Provider-adaptive labels**: gmail→"Select a conversation"/"Search emails"/Messages; slack→"Select a channel"/"Search channels"/Members; figma→"Select a file" (no count col); github→"Select a repository"/Issues. Config in `SelectSource.jsx` `CFG`.
- **Flow**: after OAuth completes in `FirstProject.jsx` (`/welcome`), it now routes to `/welcome/select?tool={key}` (was `/app/connect`). Picker fetches `GET /connect/{provider}/sources?q=` (debounced search), multi-select capped at 5, then `POST /connect/preview` → `POST /connect/establish` (mode `"new"`, always creates a NEW project) → navigates to `/project/{id}`. First-time-user flow only.
- **Backend demo fallback** (`connectors.py`): `list_sources` returns realistic `_demo_sources(provider)` when the user has no real connected account (i.e. the demo account); `_fetch_digest` returns a coherent `_demo_digest` for `demo-*` ids; `preview_sources` tolerates a missing account when all sources are demo. Real connected accounts always hit the live provider adapters. Lets the demo account run the whole picker → project-creation flow (verified E2E: created "Acme Corp Website + Dashboard Redesign" with AI-extracted memory).
- **Shared brand glyphs** extracted to `components/BrandGlyphs.jsx` (Gmail/Slack/Figma/GitHub SVGs).
- Verified via screenshots + a full click-through (gmail + slack variants, 2-select → Add to Bracket → project page).
- NOTE: user will supply the post-"Add to Bracket" screen next; currently lands on the existing `/project/{id}` memory view.


## Changelog — 2026-06 (marketing pages → auth aesthetic)
- **All 4 public pages (Home, Pricing, Privacy, Terms) restyled to match Login/ChoosePlan**: pure-black `#000` canvas, full-bleed animated particle hero, monospace labels, monochrome accents. Screenshot-verified on `/`, `/pricing`, `/privacy`.
- **`ParticleField.jsx`**: added `variant="fill"` — a uniform, sparse, full-bleed flow-field (no image dependency) used as the hero background. Image variant (skull) unchanged for auth pages.
- **`HeroParticles.jsx`** (new): wrapper = `<ParticleField variant="fill" .../>` + radial `.marketing-hero-scrim` for text legibility. Dropped `.hero-ambient` in each marketing hero (scoped `display:none` under `.marketing-shell` only — authenticated app's `hero-ambient--dashboard` untouched).
- **White pill CTAs everywhere**: `.landing-cta-primary`/`.cinema-cta-pill` overridden to white pill (mirror `.login-submit`).
- **Navbar + Footer**: pure black bg, monospace links, scroll-accent removed. **Logo swapped** from `BracketMark` SVG to the auth-page logo PNG (`jl2k3bid_new-logo-1.png`).
- **Monochrome sweep**: violet checkmarks/POPULAR badge/step icons/legal bullets/`link-accent` neutralized to white/gray on marketing pages.
- Files: `ParticleField.jsx`, `HeroParticles.jsx`, `Landing.jsx`, `Pricing.jsx`, `Privacy.jsx`, `Terms.jsx`, `Navbar.jsx`, `Footer.jsx`, `MarketingLayout.jsx` (root gains `marketing-shell`), `index.css` (marketing→auth block).


## Changelog — 2026-08 (plan selection + Stripe test payments)
- **New login redesign** (`Login.jsx`): split dark layout, custom logo + halftone image, Google/Apple/email-password, monospace styling. Google → real Emergent auth; Apple → "coming soon" toast (not wired); Create Account/Forgot Password → real email-code flow.
- **"Choose your plan" page** (`/plan`, `ChoosePlan.jsx`): shown after sign-in/sign-up when the user has no `plan`. Two plans — $29/month, $9/project. Matches reference.
- **Stripe test payment flow** (Flow B, shared sandbox key `sk_test_emergent` — Flow A claimable sandbox unavailable because the account country is IN/unsupported): `POST /api/payments/checkout` (fixed server-side pricing), `GET /api/payments/status/{session_id}` (with inline Stripe fallback), webhook at `POST /api/webhook/stripe`. On paid, sets `users.plan`. Success/cancel pages at `/payment/success` and `/payment/cancel`. Test card 4242 4242 4242 4242. Verified: checkout session creation + redirect to Stripe + status polling.


## Changelog — 2026-06 (Project Update: glance-and-decide)
- **Simplified the Project Update review** (was overwhelming — 6-line paragraph + 6 impacts + 12 changes dumped at once). Default now shows only: a ONE-sentence bottom line (AI prompt updated in `connect_ai.py::build_project_update`), a tiny meta line (`N changes · biggest risk: …`), and Approve / Reject. Full impacts + all changes + downstream collapse behind a "See what's inside" toggle (`ProjectUpdateReview.jsx`, data-testid `project-update-details-toggle`). Decide in ~5 seconds; detail on demand. Backend flow unchanged.


## Changelog — 2026-06 (consolidated approval + Today's Focus)
- **Consolidated "Project Update" approval (fixes the endless approval chain)**: New backend flow bundles ALL pending changes into ONE snapshot with an AI pass that computes downstream impacts across every category. Endpoints (connectors.py): `POST /projects/{id}/update/build`, `.../update/{update_id}/approve`, `.../update/{update_id}/reject`; AI in `connect_ai.py::build_project_update`. Approve confirms all direct items + inserts downstream items (provider 'bracket') atomically; reject discards all (ignored). 409 guard on double-resolve; ownership enforced. New drawer `ProjectUpdateReview.jsx`. Per-item Confirm removed from `ChangeActionDrawer` (now routes to consolidated review). Verified 9/9 backend + UI.
- **"Today's Focus" overview redesign**: `ProjectMemory.jsx` OverviewView now shows only 3 sections — Needs Your Action, What Changed Since Last Visit, Coming Up (next 7 days, free-text date parsing) — capped ~5-7 items, "You're all caught up" empty state. Total-items badge removed from header. 6 category tabs unchanged.
- **Per-account last-visit tracking**: `POST /projects/{id}/seen` returns previous visit timestamp and updates `project.last_seen_at`; powers "What Changed".


## Changelog — 2026-06 (fork: concise memory + email fix)
- **Email subject encoding fixed**: `send-email` now builds the MIME message via stdlib `EmailMessage` (connectors.py ~line 1274), so non-ASCII in the Subject (em-dash etc.) is RFC-2047 encoded instead of rendering as mojibake ("Ã¢Â€Â"). Verified via round-trip decode. Threading (In-Reply-To/References/threadId) preserved.
- **Shorter, human replies**: `suggest_project_reply` prompt (connect_ai.py) now defaults to 2-3 sentences, natural tone, no throat-clearing openers. Verified live: ~174 chars / 3 sentences.
- **Concise extraction**: `analyze_connected_source` + `detect_source_updates` prompts now skip greetings/small talk and cap titles (<6 words) / details (one clause).
- **Overview summary line**: ProjectMemory.jsx OverviewView now leads with a concise 2-3 line "what's happening now" banner (`MemorySummaryLine`, data-testid `overview-summary`): item count across sources, latest activity, scope-change flag.


## Original problem statement
Build "Bracket" — an AI decision operating system for designers. Not another tool. A senior-designer brain between input and output. Positioned against Notion / Figma plugins / AI writing tools.

Brand promise: "Designers don't need more tools. They need better decisions."

## Current mode (Feb 2026, post auth pivot)
**Authenticated SaaS, free during early access.** Sign-in via Email OTP or Emergent-managed Google OAuth. Onboarding captures name, designation, avatar. Dashboard lists the user's projects; clicking one reopens the 5-step flow. A back-and-forth client-review loop is wired: clients can accept-with-signature or reject-with-AI-suggestions; the owner can reply to a rejection and bounce the document back for re-review.

## Users / personas
1. **Freelancers** — clarity + confidence; scope creep, pricing anxiety.
2. **Agencies** — consistency across designers; juniors defer calls to founders.
3. **Product designers** — structured thinking that survives stakeholders.
4. **Junior designers** — a senior brain sitting next to them.

## Architecture (current)
- **Backend** — FastAPI + MongoDB (Motor). Files: `server.py` (~1120 lines), `auth.py`, `ai_engine.py`, `models.py`, `emailer.py`.
- **Auth** — JWT sessions via httpOnly `session_token` cookie. Sources: Email OTP (`bcrypt`-hashed code, 10-min TTL), Emergent Google session exchange, optional password.
- **AI engine** — `emergentintegrations.llm.chat.LlmChat` wrapping Claude Sonnet 4.5 (default) and GPT-5.2 (alternate). Strict JSON-output prompts per step.
- **Email** — Resend. OTP delivery + "thanks for trying" + client review outcome notifications.
- **Frontend** — React 19 + React Router 7 + Tailwind + custom Swiss/brutalist design system. Cabinet Grotesk + Manrope + JetBrains Mono.
- **Design aesthetic** — #F4F4F0 paper, pure black ink, electric blue #0033FF signal, sharp corners, brutalist shadow.

## DB collections
- `users` — `{user_id, email, name, designation, avatar, picture, password_hash, created_at, updated_at}`
- `user_sessions` — `{user_id, session_token, expires_at, created_at}`
- `email_otps` — `{email, code_hash, expires_at, attempts, issued_at}`
- `projects` — `{id, owner_user_id, creator_name, creator_email, name, engine, status, step, situation_input, framing, context_input, context, decision_input, decision, artifacts, locked_at, feedback, share_token, share_status, share_review, owner_replies, created_at, updated_at}`

## API surface (current)

### Auth
- `POST /api/auth/google/exchange` — body `{session_id}` → exchange Emergent fragment for httpOnly cookie.
- `POST /api/auth/otp/request` — body `{email, name?}` → emails 6-digit code. **OTP_TEST_MODE=1 returns the code as `dev_code` in the response (tests only).**
- `POST /api/auth/otp/verify` — body `{email, code, name?, designation?, avatar?}` → sets cookie, returns `{user, is_new}`.
- `POST /api/auth/login` — body `{email, password}` → returns user + sets cookie.
- `POST /api/auth/password/set` — body `{password}` (auth required).
- `GET /api/auth/me` — returns public user (with correct `has_password` flag, never leaks `password_hash`).
- `PATCH /api/auth/me` — body `{name?, designation?, avatar?}`.
- `POST /api/auth/logout` — clears cookie + invalidates session.
- `GET /api/auth/claimable` — list anonymous projects matching the user's email.
- `POST /api/auth/claim` — body `{keep_ids:[], delete_ids:[]}` → per-project Keep/Delete.

### Projects (auth required)
- `POST /api/projects` — body `{project_name, engine?}` → creates owned project.
- `GET /api/projects` — list owned projects.
- `GET /api/projects/{id}` — fetch (public for client review).
- `PATCH /api/projects/{id}` — body `{name}` (rename, owner only).
- `DELETE /api/projects/{id}` — owner only.
- `POST /api/projects/{id}/unlock` — owner only.
- `POST /api/projects/{id}/reply` — body `{text}` → appends owner reply, flips share_status `rejected → awaiting_reply`.
- `POST /api/projects/{id}/situation|context|decision|artifacts|lock` — the 5-step AI flow.
- `GET /api/projects/{id}/export.md|export.pdf` — exports.
- `POST /api/projects/{id}/feedback` — post-lock thumbs.

### Share / client review (public, token-gated)
- `POST /api/projects/{id}/share` — mint token.
- `GET /api/share/{token}` — public read.
- `POST /api/share/{token}/accept` — `{acceptances, signature_name, role}`.
- `POST /api/share/{token}/reject/preview` — `{concerns}` → AI suggestions (no mutation).
- `POST /api/share/{token}/reject/confirm` — `{concerns, signature_name, role, ai_suggestions}` → finalize.

## Routes (current)
- Marketing (public): `/` `/how-it-works` `/use-cases` `/pricing` `/case-studies`.
- Auth: `/login` (`/signup` → `/login`), `/auth/callback`, `/onboarding`, `/claim` (all protected except login).
- Tool (auth required): `/app` (Dashboard), `/app/new`, `/settings`, `/project/:id` (5-step flow), `/project/:id/document` (sign-off viewer).
- Public client review: `/r/:token`.
- `/start` → redirects to `/app`. Catch-all `*` → `/`.

## Changelog (recent)
- 2026-06 (multi-thread Gmail + multi-recipient threaded send + simplified project view) —
  - **#1 Multiple Gmail threads**: "Add a source" chips always show all providers (gmail/slack/figma/github) so users can attach additional Gmail threads anytime; the picker still hides already-attached individual sources.
  - **#1/#2 Send checklist + threading**: reply actions replaced with a single "Send reply" → modal **checklist** of every connected client thread/channel (from `GET /send-targets`, now one entry per Gmail thread with editable recipient + one per Slack channel). Tick who to send to; sends to multiple at once. `POST /send-email` now accepts `{targets:[{to,thread_id}], body}` and **threads each reply into the original Gmail conversation** (fetches last Message-ID → In-Reply-To/References, Re: subject, `threadId`). Slack posts to the channel (already threaded).
  - **#3 Simplified view**: categories default to a **Simple** mode — one plain sentence per item + a small status dot + a plain-English summary line ("N decisions · all confirmed" / "M need your review"). All dense controls (filter, columns, saved views, density, status pills, extra columns) are hidden behind a **Details** toggle (persisted in `bracket.simpleView`).
  - Verified: checklist modal shows both Gmail + Slack targets with prefilled `anna@nordwind.co`; simple rows + summary render; all 4 add-source chips present; backend endpoints validated. Live delivery still needs a real connected Gmail (send scope) / Slack (chat:write).

- 2026-06 (Figma — re-enabled; real cause identified as a Figma-side "draft/private app" setting) — reverted the coming-soon gate (impl back to `oauth`, re-added to add-source chips; status `available`, auth-url 200). Root cause per Figma docs + confirmed by data: the only connected Figma accounts are both the owner's (`shuklasaksham01@gmail.com`), and Figma OAuth apps are **private/draft until published** — a draft app only works for the owner/admin, so other users get the misleading "OAuth app with client id … doesn't exist". Credentials are valid (that's why the owner works). FIX IS ON THE USER'S FIGMA SIDE: at https://www.figma.com/developers/apps → open the app → ensure redirect URI includes `…/api/connect/figma/callback` → **Publish** the app (private apps are limited to their team/org; broad public use may need Figma review for granular scopes). No code/credential change needed once published.

- 2026-06 (fix — Figma OAuth error hitting ALL users; gated off until valid creds) — the "works on my PC not theirs" report was actually the Figma connect error (`OAuth app with client id qB2MZrWiGwN4vqOjjzQMXo doesn't exist`) — the configured Figma OAuth app is invalid/deleted, so every user hitting "Connect Figma" got it. Since valid Figma creds can only come from the user, gated Figma off as a stopgap: set `PROVIDERS["figma"].impl = "soon"` (Connect Work now shows Figma "COMING SOON", non-clickable), added an `impl == "soon"` guard in `/connect/{provider}/auth-url` (returns 400), and removed `figma` from the project "Add a source" chips. **To re-enable:** user provides a valid Figma Client ID + Secret (callback `…/api/connect/figma/callback`) → set env + revert `impl` to `"oauth"` + re-add `figma` to the add-source array. Verified: figma auth-url → 400, providers status `coming_soon`, card disabled.

- 2026-06 (fix — hide already-attached providers from "Add a source") — restored the provider-level filter in `ConnectedSourcesCompact`: chips only show providers with no active source_connection on this project (block hides entirely when all are attached). Kept the searchable picker + no-reauth for the remaining providers. Verified: demo project (Gmail+Slack attached) shows only Figma+GitHub.

- 2026-06 (fix — Send email pre-filled the user's OWN address instead of the client) —
  - Root cause: `_gmail_client_email` read `account.get("account_label")` but the connected Gmail address is stored under `label`, so the "exclude my own address" filter always no-op'd and returned the first address in the thread (often the user's own inbox). `establish` also compared against `user["email"]` (Bracket signup) not the Gmail address.
  - Fixes (connectors.py): `_gmail_client_email` now uses `account.get("label")`; `establish` derives `own_gmail` from the Gmail account label when computing/storing `client_email`; `GET /send-targets` now guards — it will never return the connected account's own address, clearing a bad stored value and re-deriving live (or leaving TO empty). Demo unaffected (still `anna@nordwind.co`).

- 2026-06 (design v21 — account-level source reuse + picker search + client-email prefill) —
  - **Source picker search box**: the inline source picker now has a debounced search input that re-queries `GET /connect/{provider}/sources?q=` — users filter their chats/files/emails instead of scanning a flat list. Already-attached sources are filtered out of the list.
  - **No re-auth when the account is already linked**: "Add a source" chips now call `openSourcePicker` which lists the account's sources directly (account-level). OAuth only fires if the account isn't connected yet (`/sources` → 400 → connect). Connecting an account associates it with the Bracket account (integration_account); attaching to a project is a separate step. All four provider chips are always shown so users can add more sources.
  - **Send-email TO pre-populated with the extracted client email**: at attach time we persist `client_email` on the Gmail `source_connection` (`_extract_client_email` from the digest); `GET /send-targets` returns it so the Send modal's TO is pre-filled (verified on demo: `anna@nordwind.co`). Falls back to a live thread lookup when not stored.
  - NOTE: the picker+search and no-reauth flows need a live connected account to demo end-to-end (the demo account has seeded sources but no real OAuth token, so listing correctly falls back to OAuth). Verified via code + endpoints; TO prefill verified visually.

- 2026-06 (design v20 — add-source filter + Ask Bracket textbox + channel-aware direct send) —
  - **Add a source shows only unconnected providers**: `ConnectedSourcesCompact` filters the quick-connect chips against the project's active connections; the whole "ADD A SOURCE" block hides when everything is connected.
  - **Ask Bracket input looks like a real textbox**: wrapped the composer in a bordered `.ask-input-box` (surface-2, 6px, accent focus-within ring).
  - **Channel-aware direct send** (per user: 1a + Slack real post + skip WhatsApp): the reply now renders one send CTA per channel connected to THIS project — driven by new `GET /api/projects/{id}/send-targets`. Gmail → **Send email** (opens a modal styled like the connect-source "Attach sources" dialog, with the client email **pre-populated** from the connected thread via `_gmail_client_email`, + subject + message preview) posting to `POST /send-email`. Slack → **Send to #channel** (modal with channel + message preview) posting to new `POST /api/projects/{id}/send-slack` (Slack `chat.postMessage`; scope now includes `chat:write`). If only Gmail is connected, only one CTA shows. Removed the old duplicate Gmail-web/mailto/Slack-redirect links.
  - NOTE: existing Slack connections were authorized read-only — users must reconnect Slack to grant `chat:write` (endpoint returns a clear "reconnect Slack" message on `missing_scope`). Client-email prefill needs a live Gmail token (empty on the demo account, which has no real tokens).

- 2026-06 (design v19 — composer CTA cleanup + direct Gmail send + provider-icon polish) —
  - **Composer CTAs de-duped**: removed the redundant "Connect work" button (it opened the same `/app/connect` as "Start a new project"). Dashboard composer now has just **Ask Bracket** (accent-tinted) + **Start a new project**.
  - **Ask Bracket reply — one mail action, direct send**: removed the duplicate mail options (Gmail-web + mailto) and the Slack redirect. A single **Send email** button now opens an inline compose form (To + subject) and sends the reply **directly through the user's connected Gmail** — no redirect. New backend endpoint `POST /api/projects/{id}/send-email` (connectors.py) builds an RFC822 message and calls Gmail `users.messages.send`; the Gmail OAuth scope now includes `gmail.send` (was readonly only). Handles 403 (insufficient scope → "reconnect Gmail") and 401 (expired). NOTE: existing Gmail connections were linked with readonly scope — users must disconnect + reconnect Gmail once to grant send permission; Google may require app verification for the send scope in production.
  - **Provider-icon polish**: `ProviderIcon` gained a `bare` mode (glyph only, no bordered box); the "ADD A SOURCE" chips now use bare brand marks and a cleaner `.quick-connect-chip` (30px, 6px radius) — fixes the ugly box-in-box icons.

- 2026-06 (design v18 — subtle dashboard composer + project-card cleanup + app legal links) —
  - **Subtle composer**: `NewProjectComposer.jsx` rewritten from the loud rounded/glowing hero into a quiet flat bar (6px, hairline, no shadow/orb, smaller title, small squared tool chips). **"Ask Bracket" now presented well** — an accent-tinted violet button (accent-soft bg + brand border) so the AI action reads clearly alongside "Connect work" and the primary "Start a new project".
  - **Project card cleanup**: removed the legacy "Step X / 5" text and the orphaned step progress bar from dashboard project cards (`Dashboard.jsx ProjectCard`) — cards now show just name · stage · date.
  - **App legal links**: added quiet "Privacy · Terms" links to the authenticated `AppSidebar` footer (marketing footer already had them). testids `sidebar-privacy-link` / `sidebar-terms-link`.
  - **GitHub OAuth (NOT a code bug)**: `redirect_uri` is correctly derived as `https://design-decided.preview.emergentagent.com/api/connect/github/callback` (client_id Ov23liQ0loWVWZjDmrlI). GitHub rejects it because that callback URL isn't registered on the OAuth app (GitHub allows only ONE). Requires user to register the preview callback URL on that app, or create a separate preview GitHub OAuth app and set its GITHUB_CLIENT_ID/SECRET.

- 2026-06 (design v17 — LINEAR-EXACT dark redesign, app-wide + Connect Work disconnect fix; testing agent iteration_51 100% frontend, no console errors) —
  - **New design system (Linear-exact)**: rewrote `index.css` `:root` tokens to near-black `--bg #111111` / `--surface #181818` / `--surface-2 #222222`, single muted-violet accent `--accent #8184C4` (+ `#989BE0` hover), text `#F4F4F5/#A1A1AA/#71717A`, muted semantics (success `#52A874`, warning `#D4A72C`, danger `#D95757`). Radius tokens capped at 6px; elevation tokens set to `none`. Blueprint saved to `/app/design_guidelines.json`.
  - **No pills / no shadows / no gradients / no grain**: `tailwind.config.js` borderRadius scale (incl. `full`) all ≤6px, and boxShadow/dropShadow scales set to `none` — kills pills + shadow utilities app-wide (incl. shadcn `components/ui/*`). CSS swept: pill radii `999px→6px`, decorative box-shadows → `none` (kept `0 0 0` focus rings), removed body ambient gradient + film grain, neutralized `hero-ambient`/`landing-page-bg`/`hero-ambient--dashboard` glows, converted white primary CTAs (`.btn-primary`, `.landing-cta-primary`, `.cinema-cta-pill`) and hero brand-gradient text to the solid violet accent.
  - **Global recolor**: all legacy blue/cyan hexes + rgba (`#3B82F6`, `#5E6AD2`, `#7C5CFF`, `#60A5FA`, `#7CD5FF`, `59,130,246`, `94,106,210`, `124,213,255`, …) → violet, across `index.css` and every `pages/*.jsx` + `components/*.jsx`. Brand mark (`BracketMark.jsx`) diamond recolored violet; sidebar now uses the SVG mark (was blue PNG).
  - **Sidebar** tightened to 30px rows / 6px radius / 13px, left-accent active bar (violet), 240px width.
  - **Connect Work disconnect overlap FIXED**: `ConnectWork.jsx` `AppCard` refactored to a flex-column card with the Disconnect button in its own bordered footer row (data-testid `connect-disconnect-{key}`) — no more absolute positioning over the CONNECTED chip.
  - Verified: landing, /login, dashboard, /app/connect, project memory (6 tabs + density toggle + saved views + calendar day panel), activity, settings, FAQ all render cleanly in the new theme; 100% of tested frontend flows pass.
  - Minor residual: a few marketing bento/feature cards keep very faint internal radial tints (subtle, on-brand) — can be flattened further on request.

- 2026-06 (design v16 — row density toggle + saved views + calendar day panel; self-verified) —
  - **Row density toggle (global)**: category tables have a compact/comfortable toggle (`jira-density-toggle`) beside Columns/Views; compact tightens row padding + icon size. Persisted per-user in `localStorage bracket.density` (applies across all categories since one category view is mounted at a time).
  - **Saved views (per category)**: a "Views" dropdown (`jira-views-btn`) saves the current status filter + visible columns + sort as a named view (dialog prompt), lists saved views with apply + delete, and shows a count badge. Persisted per category in `localStorage bracket.views.{cat.key}`. Verified: save → apply restores filter/cols/sort → persists across reload → delete.
  - **Calendar day panel**: clicking any day with events in the Timeline calendar swaps the right-side list to show ONLY that day's events inline, with a dated header ("SUN, AUG 2 · N") and a BACK button to return to the range list (THIS MONTH/WEEK). Kept the existing hover popover + range list.
  - Files: `ProjectMemory.jsx` (CategoryView density/views state + toolbar controls, TimelineCalendar clickDay/panel header), `index.css` (`.density-toggle`, `.jira-table[data-density="compact"]`).

- 2026-06 (design v15 — decluttered tables + multi-source attach + column config + calendar popover; testing agent iteration_50 100% frontend, no console errors) —
  - **Decluttered category tables**: memory rows now show a single-line title only (detail moved to the drawer), and scope-creep is a small red dot instead of a text badge — far less overwhelming.
  - **Multi-source attach**: the inline connect picker has checkboxes to select several sources at once, an "Attach N" button, and per-source sync status (spinner → check/error). (Only reachable after real OAuth — verified up to the popup opening.)
  - **Column config + persistence**: category tables have a "Columns" menu to show/hide Status/Source/Updated; the chosen sort and visible columns persist per category in localStorage across reloads. Grid stays aligned via a computed `gridTemplateColumns`.
  - **Calendar day popover**: hovering a day with events shows a popover listing that day's event titles (works alongside the month/week toggle and multi-event click-to-select).

## Changelog (archive)
- 2026-06 (design v14 — inline one-click connect + JIRA table sort/filter + calendar week view; testing agent iteration_49 100% frontend, no console errors) —
  - **Inline one-click connect**: the "ADD A SOURCE" chips in the project's Connected Sources are now buttons that start OAuth in a popup right from the project view (user-gesture safe) — they no longer navigate to `/app/connect`. After OAuth returns (`bracket-oauth:{key}:ok`), an inline source-picker modal lets you attach a source to this project via `/connect/preview` + `/connect/establish`. Popup shows a "Opening secure sign-in…" placeholder instead of about:blank.
  - **JIRA table sort + filter**: category tables have clickable sortable headers (Summary / Status / Source / Updated, asc/desc arrow) and a live text filter input (title/detail/source), with a no-match message.
  - **Timeline calendar week view**: month/week toggle + prev/next range nav; multi-event days show stacked dots and, when clicked, expand that day's events in the side list ("SELECTED DAY · N" + Clear); single-event days open the item directly.
  - Note: real OAuth completion isn't testable headlessly; the inline flow uses the existing verified connect endpoints.

## Changelog (prior)
- 2026-06 (design v13 — Project Memory Overview restructure + JIRA tables + Timeline calendar + review-flow cleanup; testing agent iteration_48 95%→fixed) —
  - **Removed redundant snapshot grid** from the Overview (the boxed tabs already cover the 6 categories).
  - **Ask Bracket → subtle right sidebar** (~340px, no longer full-width) that PERSISTS the conversation per project in localStorage (previous interactions survive navigation), with compact styling and quick-prompts.
  - **Overview left column** now shows a clean RECENT ACTIVITY feed (newest items across all categories).
  - **One-click connect chips** in the sources panel (Gmail/Slack/Figma/GitHub) deep-link to `/app/connect?project=…&tool=…`; the connect page now highlights + scrolls to that provider (OAuth popup needs a user gesture, so auto-launch would be popup-blocked).
  - **JIRA-style category tables** for Deliverables/Scope/Requirements/Decisions/Deadlines — columns Summary / Status / Source / Updated, type icon + status pill, hover rows opening the review drawer.
  - **Timeline tab = month calendar** marking dates with events (dots) + prev/next month nav + an "events this month" list with date & time; clicking a marked day opens the item.
  - **Removed the SUGGESTED RESPONSE block** from the change-review drawer (global replies now come only from Ask Bracket) — drawer keeps "what changed" + memory updates + confirm/dismiss.

## Changelog (earlier)
- 2026-06 (design v12 — boxed folder tabs + Activity redesign + first-run checklist + Activity filters; testing agent iteration_47 100% frontend, no console errors) —
  - **Boxed (JIRA folder) tabs**: Project Memory category nav restyled from underline tabs to BOXED folder tabs — each tab a bordered box with rounded top corners; the active tab gets a blue top accent strip, shares the content background and "breaks" the divider line to connect to the panel below (`.memory-tabs`/`.memory-tab` in index.css; PillTab markup in ProjectMemory.jsx).
  - **Activity page redesign**: full rebuild into a cinematic timeline feed — hero count header ("N changes across M projects", blue number), 24h/7d window toggle, scope-alert banner, six clickable category counter tiles, and a vertical timeline of change cards with node dots (`.activity-feed`/`.activity-card`).
  - **Activity filters**: filter the feed by project (dropdown), by tool (provider chips), and by change type (counter tiles), with an "x of y shown" count, a Clear reset, and a "No changes match" state. Digest items cap raised 12→60 (connectors.py) for a richer feed.
  - **First-run checklist**: dismissible 3-step Dashboard guide (connect a tool → see your first memory → draft a reply) with a progress bar; "connect" derives from real connections, the other two from milestone flags set by ProjectMemory (memory loaded / reply drafted) via a `bracket-firstrun-update` event. Auto-hides when complete or dismissed (localStorage).

## Changelog (history)
- 2026-06 (design v11 — disconnect UX + JIRA tabs + activity badge + copy + reduced-motion; testing agent iteration_46 100% frontend, no console errors) —
  - **Disconnect UX**: each connected source now shows an ALWAYS-VISIBLE "Disconnect" button (Unplug icon + label, `.disconnect-btn`, danger-on-hover) instead of a hover-only trash icon. Multiple sources per project are independently disconnectable (verified with 2 sources).
  - **JIRA-style category tabs**: Project Memory nav restyled from pills to tabs — label + count chip badge + animated blue accent underline on the active tab; added `role=tablist`/`role=tab`/`aria-selected` a11y.
  - **Sidebar Activity badge**: `NavItem` gained a `badge` prop; sidebar polls `/connect/digest?window=7d` and shows an unread count vs `localStorage bracket.activity.seenTotal`. Opening `/app/activity` marks seen (dispatches `activity-seen`) and clears the badge. Collapsed sidebar shows a dot.
  - **Marketing copy**: FAQ 'Pricing & billing' section replaced with a single 'Cost' Q&A so the story flows without the removed Pricing page (How-it-works / Use-cases had no pricing refs).
  - **Reduced-motion**: wrapped app in `<MotionConfig reducedMotion="user">` (framer-motion) + added a global `prefers-reduced-motion` CSS catch-all covering the new interactive elements.

## Changelog (recent-history)
- 2026-06 (design v10 — Pricing removal + self-hosted icons + empty-state set; testing agent iteration_45 100% frontend, console clean) —
  - **Pricing removed entirely**: deleted `pages/Pricing.jsx`, the `/pricing` route + import (App.js), the NAV_LINKS entry (constants.js), the footer link, and the Landing `<PricingSection/>` + `PricingCard` defs + `PRICING` import. `/pricing` now falls through the catch-all to `/`.
  - **Self-hosted brand icons**: `ProviderIcon` no longer calls `cdn.simpleicons.org` (was the source of console 404s for slack/adobe). Brand marks are bundled as inline SVG paths in `lib/brandIcons.js` (simple-icons) and rendered inline — verified 0 external icon requests.
  - **Illustrated empty-state set**: new shared `components/EmptyState.jsx` (dark line-art illustration + title/description/CTA) now powers Dashboard (`dashboard-empty`), Activity (`activity-empty`), and Project Memory zero-connections (`overview-empty-state`) — one consistent first-run visual language across the app.
  - Marketing How-it-works / Use-cases / FAQ / Case-studies inherit the global Geist + blue-accent + card system; verified consistent with no console errors.

## Changelog (recent-oldest)
- 2026-06 (design v9 — marketing + connect/activity + auth polish + theme unification; testing agent iteration_44 100% frontend, no console errors) —
  - **Theme consistency (key fix)**: Settings, ProjectFlow, ProjectDocument, ProjectOverview, AdminDashboard and ConnectWork were painting a near-black `#08090A` gradient background while Dashboard/Project Memory/Activity used `#191919`. All authenticated app pages now unified to `var(--bg)` `#191919` — no more jarring bg shift when navigating (this was a real part of the earlier "mismatch" report).
  - **Marketing**: bento feature cards moved from translucent gradients to solid `var(--surface)` with inset top-highlight + cinematic hover lift; hero + bento now read Linear-grade on Geist.
  - **Connect Work / Activity**: removed the near-black overlay so they match the app; elevated card treatment via shared `card-linear`.
  - **Auth**: Login + Onboarding already use the shared elevated `card-linear` / `input-line` (accent focus ring) — now on Geist + unified blue; OnboardingWelcome modal dark surface fixed earlier.
  - Note: two console 404s remain from external `cdn.simpleicons.org/slack` and `/adobe` provider-icon endpoints (harmless, lucide fallback renders). Self-hosting provider SVGs is backlog.

## Changelog (recent-older)
- 2026-06 (design v8 — Linear-grade polish, STEP 1 of full redesign; testing agent iteration_43 95%, no console errors, Geist loaded, cohesive dark) — per user: elevate the whole product to Notion/Linear-grade, keep dark theme, preserve brand mark + 6 memory categories.
  - **Font**: entire app + marketing switched from Poppins/JetBrains Mono to **Geist Sans + Geist Mono** (index.css @import, tailwind.config, index.html). Cleaner, technical, premium — kills the template look.
  - **Accent unified**: swept 87 legacy violet refs in index.css (plus all JSX earlier) to the single blue accent `#3B82F6`. Only remaining "violet" is Figma's official brand-logo color on its provider tile (intentional brand exception).
  - **Depth/motion**: subtle global film-grain overlay (`body::after`, ~1.8% opacity), `--ease-cinematic` cubic-bezier(0.22,1,0.36,1) token, inset top-highlight on dashboard stat/project cards, refined hover lift.
  - **Sidebar**: Linear-style active item — filled `surface-2` pill + animated blue left accent bar + colored active icon (replaced the old bottom underline).
  - **Project Memory (core screen)**: memory rows redesigned as a **ledger** (single bordered container, hairline row dividers, hover-fill, typography-first, right-aligned source+timestamp) instead of separate Kanban-like cards. "Ask Bracket" assistant turns restyled as a **terminal** (transparent bg + left accent border) rather than chat bubbles.
  - Blueprint saved at `/app/design_guidelines.json`. Remaining redesign steps (backlog): Activity feed, Connect Work picker, Settings, Login/Onboarding, 5-step flow, Client Review, and the full marketing site (Landing hero/bento, Pricing, etc.).

## Changelog (older-recent)
- 2026-06 (iteration_42) — **Dashboard/theme consistency fixes (testing agent 95%, remainder fixed after)**:
  - **White components removed** — `NewProjectComposer` (dashboard) and `OnboardingWelcome` modal were rendering a WHITE gradient background with light `var(--text)` text (effectively invisible). Both switched to `var(--surface)` dark cards.
  - **Accent unified to blue** — replaced all legacy violet (`#5E6AD2` / `#8B95E8` / `#7C5CFF` / `rgba(94,106,210)`) with the blue accent (`#3B82F6` / `#60A5FA` / `var(--accent)`) across every app-surface file (Dashboard, composer, ChangeDigestPanel, ConnectedWorkPanel, ProjectFlow/Overview/Document, ConnectWork, modals, providersMeta Linear tile).
  - **Change Digest moved off the dashboard** — per user request, the "what changed" roll-up now lives on a dedicated **Activity** page (`/app/activity`, new `Activity.jsx`) reachable via a new sidebar nav item (`sidebar-nav-activity`). Dashboard no longer renders `ChangeDigestPanel`. Panel gained a `showEmptyState` prop so the Activity page shows a quiet empty note instead of collapsing to null.

## Changelog (older)
- 2026-06 (iteration_41) — **Client OS UX batch VERIFIED (testing agent 100%: backend 6/6, frontend all pass)**:
  - **Chat-style suggested reply** — replaced the unprompted auto-reply with an on-demand "Ask Bracket" thread on the Project Memory Overview tab (`SuggestedReplyChat` in `ProjectMemory.jsx`). User types an instruction (or picks a quick-prompt); each turn POSTs `/api/projects/{id}/suggest-reply` `{instruction, history}` → grounded draft with Copy/Edit/Regenerate/Gmail/Mail/Slack actions. "New thread" resets. Bracket never auto-replies or sends.
  - **Zero-connections empty state** — `overview-empty-state` with SVG illustration + "Connect your first tool" CTA (→ `/app/connect?project={id}`) shows when a project has no active sources.
  - **Disconnect a source from the UI** — hover a row in `ConnectedSourcesCompact` → trash button → confirm dialog → `DELETE /api/connect/connections/{id}` (marks status=disconnected, drops from connections list, logs SOURCE_DISCONNECTED event). "Manage connections" link added.
  - **Refreshed Landing copy** — hero "Your client work. Remembered.", updated showcase/bento tiles matching the Client OS pivot. Route note: Project Memory renders on `/project/{id}` (not `/project/{id}/memory`).
- 2026-08-12 (fix) — **Gmail redirect_uri_mismatch resolved**: ingress rewrites Host to internal cluster domain; `_redirect_uri` now prefers `x-forwarded-host` (public domain), skipping cluster/localhost hosts, fallback PUBLIC_BASE_URL. Browser-verified: Gmail popup reaches real Google sign-in ("continue to design-decided.preview.emergentagent.com"); Figma/Slack/GitHub also reach their logins. User has registered preview+production callback URLs in all provider apps (GitHub allows only one → production URL registered; preview GitHub may need a second OAuth app).
- 2026-08-12 (later) — **OAuth credentials activated for Figma (new keys), Gmail (Google), Slack, GitHub** in backend/.env. providers now: gmail/slack/figma/github = available, notion = setup_required (no creds yet). Browser-verified popups: GitHub + Figma + Slack reach real provider logins; Gmail shows redirect_uri_mismatch on PREVIEW (user must add https://design-decided.preview.emergentagent.com/api/connect/gmail/callback in Google Console; production use-bracket.com URI presumed registered). Full account logins not completable by agent (requires user's provider accounts).
- 2026-08-12 — **Legal pages** (screenshot-verified): `/privacy` + `/terms` added to the public marketing layout (Privacy.jsx, Terms.jsx). Privacy covers the source-level integration boundary (Gmail/Figma/GitHub/Notion/Slack), no-AI-training commitment, encrypted token storage, retention/deletion, and the **Google API Services Limited Use disclosure** (required for Gmail OAuth verification). Terms cover connected-source responsibilities, read-only access, AI-output disclaimers, acceptable use, liability. Footer now links Privacy + Terms (footer-privacy-link / footer-terms-link).
- 2026-08-10 (later) — **One-click OAuth rework + Figma ACTIVATED** (testing agent iteration_37: 18/18 backend + frontend, 100%):
  - Token-paste UI removed entirely; end users only sign in with the provider (popup → callback → postMessage → source modal). OAuth app creds are admin env vars: FIGMA_/GITHUB_/NOTION_/SLACK_CLIENT_ID+SECRET, GOOGLE_OAUTH_CLIENT_ID/SECRET. Unconfigured providers show SETUP REQUIRED. Guide: /app/OAUTH_SETUP.md.
  - **Figma credentials configured in preview .env — figma:available, popup reaches figma.com/login.** Redirect URI derives from request host (preview + production both work if both URIs registered in the provider app).
  - Multi-select sources (up to 5) in a searchable modal; preview analyzes all in parallel; establish creates one connection per source. Figma team-link browsing (projects→files) + file-link paste; Slack adapter (channels/DMs via user-token scopes) built and env-gated.
  - Real brand logos via simple-icons CDN with lucide fallback (providersMeta.js).
  - WhatsApp: no consumer OAuth exists (Meta policy) — stays Coming Soon pending user's decision on WhatsApp Business Platform.
- 2026-08-10 — **CONNECT WORK (Phase 1-3) — contextual integrations layer** (testing agent: 18/18 backend + frontend E2E, 100%):
  - New `/app/connect` directory (11 providers, 4 categories, search, honest statuses: figma/github/notion=available, gmail=setup_required until GOOGLE_OAUTH_CLIENT_ID/SECRET env, rest coming_soon). Sidebar "Connect Work" nav + dashboard "Connect work" button.
  - Universal flow: choose app → token connect (Fernet-encrypted in `integration_accounts`, key CONNECT_TOKEN_KEY in .env) → select specific source (Figma: paste file URL; GitHub: repo list; Notion: page search; Gmail: OAuth + thread list, ready when creds exist) → AI preview (counts + suggested project + existing-project match ≥55% confidence) → create new project OR attach to existing.
  - Backend: `connectors.py` (adapters + endpoints + 5-min background poller syncing stale connections, max 4/cycle) + `connect_ai.py` (Haiku: analyze_connected_source, detect_source_updates, answer_project_question — confirmed vs detected discipline, no hallucinated approvals). Collections: integration_accounts, source_connections, project_memory, source_events, connect_previews, oauth_states.
  - Project overview: `ConnectedWorkPanel` — Connected Sources (status dot, sync now, disconnect), Project Memory (category filters, Confirm/Keep-as-context/Ignore on detected items), Live Activity stream, Ask Bracket (grounded answers with source citations; 422 when no sources connected).
  - Key endpoints: GET /api/connect/providers, POST /api/connect/accounts, GET /api/connect/{provider}/sources, POST /api/connect/preview, POST /api/connect/establish, GET /api/projects/{id}/connections|memory|activity, POST /api/connect/memory/{id}/action, POST /api/projects/{id}/ask, POST /api/connect/connections/{id}/sync, DELETE /api/connect/connections/{id}.
- 2026-07-21 — **Product Hunt embeds on homepage** (screenshot-verified): official PH featured badge (dark theme) added below the hero CTA row (`hero-producthunt-badge`); PH embed card restyled as a Bracket-native dark lifted card (`ProductHuntCard`, testids `producthunt-card` / `producthunt-card-cta`) placed in the FinalCTA section — glass surface, white/8% border, PH-orange pill CTA, "LIVE ON PRODUCT HUNT" mono tag.
- 2026-07-20 — **Full backend regression (iteration 35 report) + tail-latency hardening** (tested: 22/22 pytest cases pass, twice):
  - Testing agent ran a complete backend sweep: auth (OTP/password/guest), full 5-step lifecycle (situation → context → decision → artifacts → lock), upload-brief, /suggest, unlock/reset (200 unshared / 409 shared), share + public token view, export.md/.pdf, error hygiene (404/422, no raw 500s), 10-concurrent burst. ALL PASS, zero unhandled tracebacks.
  - Found + fixed the last rare-502 risk: `auto_build_from_brief`'s `_call` had an outer retry stacked on `_run`'s built-in retry → worst-case wall time ~113s > Cloudflare's ~100s edge timeout. Fixes: (a) dropped the outer retry in ai_engine.py; (b) step_situation one-shot now hard-capped at 60s via asyncio.wait_for; (c) framing fallback capped to the remaining budget (90s total) — on exhaustion raises AIBackpressureError → clean 503 `ai_backpressure` that the frontend axios interceptor silently retries. Endpoint can no longer exceed the edge timeout.
  - Reusable regression suite: `/app/backend/tests/test_iteration_35_step_regression.py` (~2m25s).
- 2026-07-15 — **Favicon updated to the new mark**: generated favicon.svg + favicon.ico + favicon-32/logo192/logo512/apple-touch-icon PNGs (dark rounded square, white chevrons, blue gradient diamond — drawn from the BracketMark polygons via PIL). index.html icon links updated (SVG first, ICO/PNG fallbacks); og:image (logo512) refreshed too. All assets verified serving 200.
- 2026-07-15 — **Iteration 39 — ≤30s full auto-build + "thinking out loud" arrival effect** (self-tested: timed curl runs small 21s / big 26s + full UI e2e at 21.8s):
  - `auto_build_from_brief` (ai_engine.py) replaces the 5-call chain: TWO parallel Haiku 4.5 calls (throughput ~50 tok/s so output tokens dominate) — call A: inputs + framing + context_out; call B: decision_out + artifacts_out. Brief capped at 9k chars, one retry per call, MODEL_MAP gained "haiku". Whole document (step 5, advanced) in 21-26s for small AND big docs.
  - Sufficiency now judges OUTPUT completeness (was blocking short briefs lacking explicit trade-offs). Fallback artifacts call retained if call B returns no scope_doc.
  - **Deadlock fix**: the auto-advance poll was gated on `dirtyRef`, which Step1 sets whenever raw_paste exists without framing (= the uploaded-brief state) → banner never cleared. Poll no longer gates on dirtyRef (step form state is local, no clobber risk).
  - Shimmer arrival: `.ai-arrive` (index.css) — blur-fade entrance + diagonal light sweep + staggered child reveal, applied to the step panel (keyed per step) while auto_advance_status==='pending'; reduced-motion safe.
- 2026-07-15 — **Iteration 38 — Upload-brief speed fix** (self-tested: curl timing + full UI e2e):
  - **Root causes**: (a) Dashboard blocked the user for up to 3 min polling before navigating; (b) synchronous title generation added 3-6s to the upload response; (c) `extract_full_brief_from_paste` ran with the 8s typing-suggestion timeout — 12k-char briefs frequently timed out silently, killing the auto-advance (project stuck at step 1).
  - **Fixes**: upload-brief responds in ~0.1-0.3s (title gen moved into the background task); Dashboard navigates to the flow IMMEDIATELY; ProjectFlow live-follows the auto-advance (3s poll while `auto_advance_status==='pending'`, pauses when dirtyRef, `auto-advance-banner` shown, completion toasts incl. new 'failed' case); `_run_fast` accepts a timeout param — extraction now uses 35s + one retry.
  - Verified: steps fill in live (step 2 at ~15s, full doc ~2min), AI title lands via poll.
- 2026-07-15 — **Hotfix**: pricing card CTAs unclickable on homepage — FinalCTA's ParallaxGlow (absolute div extending -300px up over the pricing grid) intercepted clicks. ParallaxGlow now always renders `pointer-events-none`. Verified all 6 CTAs click → /login on both pages.
- 2026-07-15 — **Iteration 37 — Free-plan pricing strike-through + rotating logo diamond** (self-tested via screenshots + DOM checks):
  - All plan cards (homepage pricing section + /pricing) show the original price struck-through next to a big ₹0/$0; free tier stays "Free". All three CTAs → "Start Free" (constants.js) and link to /login on both pages (Pricing.jsx was /app).
  - BracketMark rewritten from `<img src=/logo-diamond.png>` to inline SVG (same polygons as PageLoader; white chevrons + blue gradient diamond `.bracket-mark-core`). Navbar hover rotates ONLY the diamond 90° (`.cinema-nav-brand:hover .bracket-mark-core`, transform-box: fill-box). All BracketMark usages (Footer, Login, AppHeader, etc.) now render the crisp SVG.
- 2026-07-15 — **Iteration 36 — Fully automatic "Apply the changes" + what-changed client email** (verified: 7/7 backend tests + full frontend e2e via screenshots):
  - "Apply the changes" no longer sends the owner to edit steps. It kicks off a BACKGROUND pipeline (`_run_apply_changes_pipeline` in server.py): maps all suggestions → steps (clamped 1-3), regenerates affected steps + artifacts with a `[CLIENT-REQUESTED CHANGES]` block injected into the step inputs, re-locks (status=locked, step=5, share_status='sent'), drafts an AI "here's what changed" note (`draft_change_note` in ai_engine.py, stored as `last_change_note`), and emails the client (`send_document_updated_email` in emailer.py) with the note + re-review link.
  - Endpoint POST `/review/apply-changes` returns `{status:'applying'}` IMMEDIATELY (pipeline takes 1-3 min, past proxy timeouts); sets `applying_changes: true` (added to ProjectOut with last_change_note). Frontend: modal navigates straight to `/project/{id}/document` which shows an `applying-changes-banner` and polls (existing 6s poll extended) until done → success toast. Startup hook clears stale `applying_changes` flags after restarts.
  - Manual path: owner edits after concerns → POST `/lock` also emails the client a generic document-updated note when share_status flips rejected/awaiting_reply → sent.
  - **CRITICAL root-cause fix (app-wide)**: emergentintegrations' `send_message` awaits a SYNCHRONOUS `litellm.completion` → every LLM call froze the entire event loop (metrics endpoint measured 61s during pipelines; login hung). All LLM calls in ai_engine.py now run via `asyncio.to_thread(_send_in_thread, ...)` (worker thread + own loop). Verified: /api/public/metrics responds in 5ms while pipelines run.
  - Tests: `/app/backend/tests/test_iteration_34_apply_changes_new_contract.py` updated to async contract (poll mongo until pipeline completes) — 7/7 PASS.
- 2026-07-15 — **Iteration 35 — Revised client-concern flow: single decision + unfreeze on concerns** (verified iteration_33 report, 16/16 backend + frontend PASS):
  - **Unfreeze on concerns**: `_assert_not_shared` now allows editing/unlocking when share_status is 'rejected' or 'awaiting_reply' (frozen only for 'sent'/'accepted'). Frontend gates updated: ProjectOverview `isFrozen` (edit/unlock buttons visible again on rejected), ProjectFlow `guardStepRework` same rule. Re-locking after concern-era edits flips share_status → 'sent' (client re-reviews same link) and clears revising/revision_context.
  - **ONE decision, two paths** in ClientReviewModal (per-suggestion buttons DELETED, old `/review/apply-suggestion` endpoint DELETED): modal-level `crm-apply-changes` ("Apply the changes" → new POST `/projects/{id}/review/apply-changes` maps ALL suggestions to steps via parallel asyncio.gather, sets revising + revision_context{step, items[]}, navigates to earliest step) and `crm-keep-as-is` ("Keep as is & respond" → pre-fills composer with combined what_to_say drafts + focuses).
  - ProjectFlow `revision-banner` now lists all changes with STEP n badges.
  - Testing agent fixed a leftover dead JSX block in the modal (referenced removed identifiers → ReferenceError crash) and replaced stale backend tests (`test_iteration_33_apply_changes.py`, 16 tests).
- 2026-07-15 — **Iteration 34 — Scroll-linked nav accent + footer fixes** (self-tested via screenshots/JS probes on all 6 marketing pages):
  - Navbar: new `--nav-accent` motion value interpolates blue #5E6AD2 → cyan #7CD5FF → amber #FFB84C over `scrollYProgress`; rendered as a soft 2px hairline under the nav (`.cinema-nav-accent`, fades in after 160px scroll) and feeds the link underlines.
  - Fixed "scrolling beyond footer" on all 5 subpages: root cause was `.hero-ambient::before` (fixed 1400px glow) overflowing far past the short final-CTA sections once `overflow-hidden` was removed in iteration 33. New `.hero-ambient--cta` variant (bottom:0, overflow:hidden, ::before height:100%) applied to every subpage final CTA — verified 0px space below footer on /, /pricing, /how-it-works, /use-cases, /case-studies, /faq.
  - Footer made uniform across pages: solid `#08090A` background so page ambients no longer tint it differently.
- 2026-07-15 — **Iteration 33 — Homepage bleed system on all marketing subpages + marquee gap fix** (self-tested via screenshots at 1920/2560/3840):
  - Extracted `SectionBleed` (+ new `GlowWash`) from Landing.jsx into shared `/components/SectionBleed.jsx`; Landing now imports it.
  - Pricing / Use Cases / Product (how-it-works) / Case Studies / FAQ: root gets `landing-page-bg` (fixed radial washes), heroes + final CTAs switched `overflow-hidden` → `overflow-x-clip isolate` so `hero-ambient` bleeds 800px into neighbours, middle sections get `SectionBleed -z-20` + colored `GlowWash -z-10` (case studies cycle blue→cyan→green→amber with bleeds on alternating sections) — backgrounds now blend section-to-section exactly like home.
  - Testimonial marquee: track duplicated 4× (was 2×) + animation 60s→120s — one half-track (4390px) always wider than a 3840px viewport, so the loop never shows blank space (verified max uncovered gap = 20px card spacing at 4K).
- 2026-07-15 — **Iteration 32 — Client-review response actions + drag&drop + repositioning + SEO** (verified iteration_32, 12/12 backend + all frontend flows PASS):
  - **"Apply this change"**: per-suggestion button in `ClientReviewModal.jsx` → `POST /projects/{id}/review/apply-suggestion` {index} → AI maps suggestion to the flow step, sets `revising=true` + `revision_context`, unfreezes the project (`_assert_not_shared` skips when revising), navigates owner to `/project/{id}/flow?step=N` where a `revision-banner` shows the client-requested change. Re-locking clears revising + sets share_status='sent' for client re-review.
  - **"Keep as is & respond"**: per-suggestion button loads the AI draft into the reply composer; Send posts `/projects/{id}/reply` → emails client + share_status='awaiting_reply'.
  - **CRITICAL FIX (by testing agent)**: `ProjectOut` in models.py was missing `revising`/`revision_context` (extra='ignore' stripped them) — added. NOTE: any new project-level flag MUST be declared on ProjectOut or it silently disappears from GET responses.
  - **Dashboard drag & drop**: paste panel (`dashboard-dropzone`) accepts dropped PDF/TXT/PNG/JPEG with blue dashed overlay; removed "⌘↵ to structure" hint → "or drag & drop a file here".
  - **Client "Accept all" CTA**: `/r/{token}` sign-off toggle-all restyled as a solid #5E6AD2 pill with Check icon; ghost "Uncheck all" when all checked.
  - **Marquee hover-pause removed** (pricing `.marquee-track`; testimonial track never paused).
  - **Repositioning — Bracket is for everyone with clients**: all "designers/freelancers" phrasing replaced with "anyone who works with clients / professionals / project owner" across Landing (story, metrics, Seo), FAQ, Pricing, UseCases, CaseStudies, Onboarding, constants.js (USE_CASES: "Consultants & Solo Experts", "In-house Teams"), emailer.py + auth.py footers ("The AI decision workspace for client projects"), server.py PDF/markdown footers, ai_engine.py prompts (persona enums kept). Email templates: `{ }` brand marks → `< >`.
  - **SEO**: index.html rewritten head — title "Bracket — The AI Decision Workspace for Client Projects | Decision OS", meta description/keywords (bracket, AI, client OS, decision engine, decision OS, operating system), canonical, OG/Twitter, JSON-LD (@graph: Organization + WebSite w/ alternateName + SoftwareApplication). Seo.jsx: keywords meta, og:site_name, og:image, title dedupe (no "— Bracket — Bracket"). robots.txt + sitemap.xml already present.
  - **Responsive verified** at 3840×2160, 2560×1080, 1366×768, 1280×600 — no horizontal overflow, hero/sections/footer render cleanly (all requested desktop resolutions are within these bounds).
- 2026-06-XX — **E2E test pass (iteration_31) + polish fixes**: comprehensive testing-agent run — backend 100% pass (auth password/OTP/guest, shared-freeze 409 guards, admin, public share), frontend all critical flows pass (dashboard tags+filters, shared overview freeze, /r/:token accept+reject, landing at 1920/1366 with no seams/no h-scroll/no carousel gap). Fixes applied: (1) accept sign-off checklist now 4 columns at ≥1280px + compact rows below 820px height — 21 items fit at 1366×768 with zero scroll; (2) `GET /api/auth/me` returns 200+null for anonymous visitors (no more console 401 noise on public pages); (3) testability — `bento-{ghost}` testids on bento cards, `review-accept-modal`/`review-reject-modal` on client sign-off panels. INTENTIONALLY KEPT per explicit user requests: 3s page-loader duration, and 'sent' → AWAITING REPLY tag mapping.
- 2026-06-XX — **What's Inside cards redesigned — conceptual visualizations**: all 7 bento ghost illustrations replaced (no more product screenshots; /public/bento/*.jpg deleted). Shared language via `GhostDefs` (panel gradient, radial glow, dot-grid pattern) + motion classes in index.css (`bg-flowdash`, `bg-pulse`, `bg-slowspin`, `bg-progress`, `bg-scan`, `bg-draw`, `bg-type`, `bg-cursor`, `bg-glowpulse`, `bg-sign`, reduced-motion safe). Cards: DASHBOARD = mess→AI-node→workspace flow diagram; SCOPE = structured doc + week timeline; RISKS = highlighted risk row + scan beam; DECISION = branching paths w/ confidence + evidence; MESSAGE = self-typing email; SPEED = 5-step timeline with travelling pulse; LOCK = self-drawing signature + rotating seal. `bento-ghost-wrap--cards` drops the left-edge mask fade on the large tile.
- 2026-06-XX — **Landing section-bleed system (final)**: `SectionBleed` component in Landing.jsx — opaque #08090A backdrop extending 256px past section edges, used by THE FLOW (showcase), FROM THE FIELD (testimonials, `-z-20` under blue wash) and PRICING (`-z-20` under amber wash). Root cause of the recurring "visible line": 8-bit gradient banding in near-black fade zones (whole fade spans ~2 luminance levels). Fix: 17-stop smoothstep alpha ramp + masked noise-dither layer (BLEED_NOISE). FilmGrain gained fadeTop/fadeBottom props (hero: fadeBottom; pricing: both; final CTA: fadeTop). Verified via per-row luminance analysis of screenshots (max jump ≤0.7 in all gap bands).
- 2026-06-XX — **Landing "THE FLOW" cards opaque + stage tags v2 + filters**:
  - `.landing-showcase-card` background now fully opaque `#0E1014` (was translucent gradient + backdrop blur).
  - Dashboard stages now: IN PROGRESS / LOCKED (blue) / AWAITING REPLY (amber, share_status sent or awaiting_reply) / REJECTED (red) / ACCEPTED (green).
  - Dashboard filter pills: All, In progress, Locked, Rejected, Accepted — filter matches `projectStage(p).key` ("Draft" filter removed; awaiting-reply projects appear under All).
- 2026-06-XX — **Shared projects frozen + sign-off footer alignment**:
  - Once a project is shared with a client (share_status != none), steps can no longer be edited or unlocked. Backend: `_assert_not_shared()` raises 409 on `/unlock` and `/reset-from-step` (curl-verified). Frontend: ProjectOverview hides Unlock/Resume/step-edit buttons + shows a "shared" hint; ProjectFlow `guardStepRework` blocks with a toast.
  - Client sign-off modal footer: name/role/email inputs now align on one row (role label made a flex row like the others; footer grid `align-items: start` + 24px padding on the buttons column). Verified all tops equal.
  - After login (password/OTP) users always land on `/app` — `?next=` redirect removed from Login.jsx.
- 2026-06-XX — **Dashboard stage tags + steps-page dead scroll + dark email templates**:
  - Dashboard project cards now show one of 4 stages via `projectStage()` (Dashboard.jsx): `IN PROGRESS` (default, also share_status sent/awaiting_reply — "awaiting a client" counts as in progress per user), `LOCKED` (blue #5E6AD2), `HAVE CONCERNS` (red #EF4444, share_status rejected only), `ACCEPTED` (green #22C55E). testid: `dashboard-stage-{id}`. Old RECENT_STATUS_* maps removed.
  - Steps page (ProjectFlow) dead-scroll fixed — same `.hero-ambient--dashboard::before` 1400px bleed as Dashboard; added `overflow-clip` to page roots of ProjectFlow, Settings, AdminDashboard. Verified: scrollHeight == content bottom (1101px).
  - All 4 email templates (OTP in auth.py; thanks / review-outcome / client-receipt in emailer.py) redesigned to match the dark site design: bg #08090A, card #0F1114 radius 16 border #26282D, Poppins stack, accent #5E6AD2, semantic green/red accents, pill CTA buttons. Demo email sent successfully to support@use-bracket.com (thanks template).
- 2026-06-XX — **Full modal audit — no visible scrollbars** (user request): tested every modal at 1366×768 with real data. Passing already: bracket-dialog (confirm/prompt), owner ClientReviewModal, reject-write, admin reset-pw, admin bulk-delete. Fixed 3 overflowing modals:
  - **Client sign-off accept modal** (`ClientReview.jsx`): checklist was a single scrolling column (1218px in 534px). Now: `review-modal-panel--wide` (min(1360px, 100vw-32px)), checklist flows into CSS columns (2/3/4 at 760/1150/1500px, `break-inside: avoid`), group tag inline with label, signature+role+email+actions in one horizontal `.review-accept-footer` grid row. `review-accept-grid` CSS removed.
  - **Reject-suggestions modal** (`ClientReview.jsx`): single column overflowed 122px. Now `.review-suggest-cols` 2-col grid — suggestions left, signature panel right.
  - **AdminProjectDetailModal**: rewritten with section TABS (Meta / Step 1-5 / Feedback, testid `admin-project-detail-tab-*`), card max-w 1320px, max-h 100dvh-32, INPUT|OUTPUT side-by-side per step (grid 0.9fr/1.1fr), compact FlatValue typography (12.5px, leading-snug) in adminDetailBits.js (`Section` component deleted — unused). Body keeps overflow-y:auto only as a safety net for extreme AI outputs.
  - Note: 2 test projects ("Modal Test Rejected", "Modal Test Clone") were seeded into the demo account for testing — safe to bulk-delete from the dashboard.
- 2026-06-XX — **ClientReviewModal portal fix (final)**: modal rendered inside `.page-enter` whose `pageEnter` animation (fill: both) retains transform/filter → `main` became containing block for position:fixed, truncating the modal. Fixed with `createPortal(document.body)`. RULE: any fixed-overlay rendered under `.page-enter` MUST portal to document.body.
- 2026-02-14 — **Loader v2 — cinematic SVG stroke-draw**: replaced the pulsing PNG logo with an SVG `{ }` composed of two stroked paths. Braces stroke themselves in like a hand-drawn signature (900ms cubic-bezier ease with 120ms + 240ms offsets so the left curl leads the right), a signal-blue underline expands from centre once they land, then the overlay fades. Path `stroke-dasharray` + `stroke-dashoffset` do the reveal — no infinite-loop breathing that made the previous loader feel like a spinner. Total beat ≈ 2.2s.
- 2026-02-14 — **Page loader animation + sticky doc sidebar**:
  - New `<PageLoader />` component mounted at the app root — full-screen dark overlay with the `{ }` bracket logo (drop-shadow signal-blue glow) breathing + floating on a soft radial halo, then a smooth 520ms ease-out fade. Runs ~900ms then fades — total budget ~1.5s. Only fires on hard reload (React remount); SPA navigation never retriggers.
  - Signoff document right-panel now truly sticky. Root cause: `.dashboard-root` had `overflow-x: hidden` which promoted it to a scroll container and confined the sticky context. Switched to `overflow-x: clip` (widely supported, doesn't create a scroll container). Sidebar now sticks 20px from the top of `.app-shell-main` as intended.
- 2026-02-14 — **Top navbar removed from sidebar routes** — inside AppShell (Dashboard / Settings / ProjectOverview / ProjectFlow / ProjectDocument / AdminDashboard), the left sidebar is now the only chrome on screen. Removed the sticky `flow-header` from `ProjectFlow.jsx` and the `DocHeader` from `ProjectDocument.jsx`. Their CTAs (Overview / All projects / Document / Back to flow) now live inline at the top of the page's `<main>` next to the project title. The Simplify → Review journey pipeline in ProjectFlow was demoted from sticky-header to inline-page section, keeping full visibility without duplicating chrome. `handleLogoClick` + the redundant `useNavigate` call removed from ProjectFlow.
- 2026-02-14 — **Frosted-glass navbars** — dialled navbar + sidebar + flow-header from opaque `#08090A` back to a proper glass recipe: `rgba(8, 9, 10, 0.72)` + `backdrop-filter: blur(32px) saturate(180%)`. Content behind is now diffused (unreadable) but the surface still feels translucent/premium instead of a flat wall. Navbar animated opacity range set to `[0.9, 1]` so on-scroll behaviour is imperceptible while remaining glassy at rest.
- 2026-02-14 — **Follow-up polish**: (a) Navbar bg made fully opaque — `.cinema-nav-bg` now solid `#08090A` and Navbar.jsx animated opacity range widened to `[0.88, 1]` so hero titles no longer bleed through. (b) Login card switched to new `.card-linear--solid` variant (solid `#0E0F12`, backdrop-blur off) — dot-grid no longer visible through the sign-in panel. (c) **Every CTA in the app pinned to 40px height** — updated `.btn-primary/.btn-brut/.btn-ghost/.btn-secondary/.clay-signal/.btn-coral/.cinema-cta-pill/.landing-cta-primary/.landing-cta-primary--xl/.landing-cta-ghost/.landing-plan-cta`. Padding switched from vertical `12-22px` to explicit `height: 40px` + `padding: 0 20-22px` on each. Consistent pill geometry across marketing + app.
- 2026-02-14 — **Visual polish batch (CTA + backgrounds + navbar)**:
  - Primary CTA color changed globally to **white pill** (`#FFFFFF` bg, `#08090A` text). Affects `.btn-primary`, `.btn-brut`, `.clay-signal`, `.cinema-cta-pill`, `.landing-cta-primary`. Consistent Apple-style white hero CTA throughout marketing + app.
  - **Go Pro CTA reverted to amber gradient** (`#FFD180 → #FFB84C`) on `.landing-plan-cta--popular` — restores the "featured tier" differentiation lost during the earlier accent-color unification.
  - **Homepage navbar backdrop blur intensified**: `.cinema-nav-bg` opacity dropped from 0.85 → 0.55 with `blur(24px) saturate(160%)`, so hero content now visibly bleeds through the sticky nav on scroll.
  - **App backgrounds unified**: `ProjectFlow`, `AdminDashboard`, and `Settings` now use the same `hero-ambient hero-ambient--dashboard` + `linear-gradient(180deg, #08090A, #06070A, #050506)` stack as `Dashboard`/`ProjectOverview`/`ProjectDocument`. Seamless dot-grid + soft blue glow across all post-login views.
  - **CTA radius unified to pill**: all CTA classes already at 999px; admin utility buttons (`Purge all guests`, `Delete selected`) switched from `rounded-md` → `rounded-full` for consistency.
- 2025-12 — Initial MVP: marketing + JWT + 5-step flow + artifacts + lock-in.
- 2026-01 — Currency toggle, Pricing, Stripe checkout, share/templates/revisions/simulator.
- 2026-02 — **Waitlist pivot** → custom domain use-bracket.com.
- 2026-02 — **Anonymous pivot** (removed auth temporarily for early access).
- 2026-02 — Step 5 polish, fpdf2 PDF export, returning-user resume by email, post-lock feedback.
- 2026-02 — **In-app document viewer + client review** (Accept-with-checkboxes-and-signature OR Reject-with-AI-suggestions).
- 2026-02 — **Auth pivot back to authenticated SaaS** (current): JWT cookies, Email OTP + Emergent Google, Onboarding, Dashboard, per-project Keep/Delete on claim, Owner-reply loop, dashboard inline rename.
- 2026-02 — Backend bug fix: `/auth/me` `has_password` flag (current_user_optional was projecting password_hash out before public_user computed the flag).
- 2026-02 — **Google sign-in removed** + **new ProjectOverview page** at `/project/:id` showing per-step status (DONE / IN PROGRESS / TODO), the live client review state (accepted / rejected / awaiting reply) with the reply composer inline, and an Edit button per step that jumps into the flow at `/project/:id/flow?step=N`. Flow page moved to `/project/:id/flow`.
- 2026-02 — **Claim flow hardened**: case-insensitive email lookup + handles `owner_user_id: null`/missing fields. Required to claim anonymous-mode projects created before the auth pivot.
- 2026-02 — **Production-deploy fix**: startup hook now safely handles legacy `null` user_id/email rows that would otherwise block unique-index creation and crash uvicorn boot. Indexes use `partialFilterExpression` + each `create_index` is wrapped in try/except so it can never crash the app.
- 2026-02 — **Hidden admin console** at `/admin` — gated by `ADMIN_EMAILS` env var. Lists all users with project counts + expand-row to see per-user projects + reset-password modal. `/api/admin/*` returns 404 to non-admins so the surface is invisible. Bootstrap admin seeded from `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` env vars on startup.
- 2026-06 — **Flow polish batch**: suggestion chips below every required field in steps 1-3 (pickable INR-aware keywords like "Budget ₹50,000"); animated `{...}` bracket loader inside the output card during AI generation (consistent across all 5 steps); Step 4 Artifacts auto-runs on entry (no Generate button needed); `&amp;` HTML entity bug fixed on ClientReview Sign & Send CTA; AI system prompt now mandates INR (₹) for all currency output; logo click in flow page → `/app` dashboard with an "unsaved input" `window.confirm` guard; marketing Navbar logo also routes to `/app` for signed-in users.
- 2026-06 — **Output cards unified across all 5 steps**. New `OutputCard` + `OutputSection` + `OutputList` primitives replace per-step JSX. Every AI output now shares: same `card-brut bg-chalk` chrome, same `{ NN · LABEL }` header, same `font-display text-2xl sm:text-3xl` title, same `border-l-2 border-signal italic` blockquote, same `mono-tag text-muted` section labels, and same list item style (numbered / arrow / strike / danger / severity variants). Step 3 went from 4 visually-different cards to 4 identical ones; Step 4 `ArtifactCard` replaced; Step 5 "the stance" card matches too.
- 2026-06 — **Audience widened to designers + freelancers + indie creatives**: AI `SYSTEM_VOICE` updated, Landing + Footer + meta tags copy refreshed.
- 2026-06 — **Whole-site copy sweep for freelancers + designers**: Landing hero now `Designers & freelancers don't need more tools`; marquee `FOR DESIGNERS + FREELANCERS`; UseCases page `For the people who take the call`; USE_CASES expanded from 4 to 6 personas (Freelancers / Independent Designers / Indie Creatives — writers, photo, video, illustration, dev / Small Agencies & Studios / In-house Product Designers / Juniors levelling up); Pricing Pro tier `For designers + freelancers running real work`; ClientReview "designer" → "they/them/the creator"; Dashboard greeting "designer" → "there"; Onboarding placeholder lists `Freelance designer · Copywriter · Founder · Indie dev`; PDF footer `DECISIONS FOR CREATIVE PROS`.
- 2026-06 — **AI-powered autofill suggestions**: replaced static suggestion chips with `AISuggestions` component that calls `POST /api/suggest` (600ms debounce) and renders 0-4 dynamic, context-aware chips below every required field in Steps 1-3. New `run_field_suggestions()` in `ai_engine.py` returns specific, partial-aware completions in <2s.
- 2026-06 — **Guest sign-in**: `POST /api/auth/guest` creates an `is_guest: true` account with no email/password. Frontend "Try it without an account" button on `/login`. Guests can use the full flow.
- 2026-06 — **Guest upgrade banner on Step 5**: when a guest reaches lock-in, a signal-blue "save it for later" card prompts for email + name; submits to `POST /api/auth/me/email` which lifts `is_guest`, validates uniqueness against existing users, and persists. Skip / dismiss available.
- 2026-06 — **ProjectFlow header mobile responsive fix** (`ProjectFlow.jsx`): on viewports < 640px the engine subtitle (`CLAUDE SONNET 4.5`/`GPT-5.2`) is now hidden and the two right-side action buttons (`flow-overview-link`, `flow-new-project-btn`) collapse to icon-only (`Layers` + `FolderOpen` from lucide-react) with `aria-label` and `title` for a11y. Project name now gets the full available header width on mobile (verified 20+ chars visible vs ~5 chars before). On `sm+` viewports the text labels and engine subtitle remain visible — desktop is unchanged. Verified by iteration_6 Playwright report (100% frontend pass).
- 2026-06 — **Code-quality cleanup (iteration_7)**: Verified that all "Critical" automated-review findings (undefined `suggestions` at `server.py:1226`, undefined `user` at `auth.py:180`, missing hook deps in `AuthContext.jsx` / `ProjectFlow.jsx` / `ProjectDocument.jsx`, empty catches in `AdminDashboard.jsx` / `AuthContext.jsx`) are FALSE POSITIVES the actual linters (`ruff`, `eslint`) confirm as clean. Removed 7 now-redundant `// eslint-disable-next-line react-hooks/exhaustive-deps` directives (kept explanatory NOTE comments). Fixed 12 real `react/no-unescaped-entities` ESLint errors across AdminDashboard / Dashboard / Onboarding / ClaimProjects / ProjectOverview / ProjectFlow / ProjectDocument by replacing literal `'`/`"` with `&apos;`/`&quot;` in JSX text. Zero functional changes — regression test (iteration_7.json) confirms 0 user-visible entity leaks, full happy-path passes.
- 2026-06 — **P0 visual + UX upgrade (iteration_8)**:
  - ⚡ **Faster AI suggestions**: `AISuggestions` debounce dropped from 600ms → 220ms; added a module-level 200-entry LRU `_suggestCache` keyed by `(step:field:partial:context)` so re-typing the same prefix is instant (no thinking flash). Same-session re-prompts feel ~3× faster.
  - 🪟 **Glassmorphism utilities** (`index.css`): `.glass`, `.glass-dark`, `.glass-card` with `backdrop-filter: saturate(140%) blur(18px)`. Applied to marketing `Navbar` + in-app `AppHeader` + `ProjectFlow` sticky header.
  - 🌀 **Motion system**: `.stagger-in` (9-child cascading fade-up), `.animate-scale-in` (output card entrance), `.press` (active-scale feedback), `.ai-shimmer` (gradient sweep for thinking states), spring easing (`--ease-out-spring`), full `prefers-reduced-motion` respect.
  - 🧠 **Connected step nav** (`.step-pipeline` / `.step-node` / `.step-connector`): each step is now a pill with a coloured dot; the active step's dot pulses signal-blue via `@keyframes nodePulse`; completed steps + their preceding connectors flip to solid signal-blue (hidden on mobile).
  - 📋 **Contextual actions on `OutputCard`**: new props `copyText`, `onRegenerate`, `onEdit`. Render `Copy` (with 1.2s `Copied` success state via `navigator.clipboard`), `Edit`, `Redo` (`RefreshCw`) buttons. Always-visible on touch (`< 640px`), hover/focus-revealed on desktop. Wired into Step 1 framing, Step 2 context-compression, Step 3 recommendation cards.
  - 🪞 **Dashboard empty state**: replaced the 2-line message with a brutalist split-layout — bold "Nothing decided yet." headline + helper copy + 3 starter chips (`empty-starter-acme/-logo/-pricing`) that pre-fill the new-project input + a monospace ASCII pipeline diagram (`.empty-frame`) on `md+` viewports.
  - 🎯 **AI confidence ribbon** retained + made more prominent on Step 3 (was already there as `ClarityPill` / `CONF · n%`).
  - Verified by iteration_8.json — 100% frontend pass, zero regressions, all new testids working.

- 2026-06 — **P1 visual + microcopy upgrade (iteration_9)**:
  - 🪞 **Skeuomorphic paper-grain** body background (`body::before` with radial caustic + SVG fractal noise), `#root` z-indexed above so it never blocks clicks.
  - 🪟 **Liquid glass + clay + glass system** in `index.css`: `.liquid-glass` for AI output cards (refractive sheen + brutalist drop shadow), `.clay` / `.clay-dark` / `.clay-signal` for primary CTAs (radial gradients, inset highlight, layered shadows), `.glass` already on chrome.
  - 📐 **Typography hierarchy ramp**: `.t-hero` (clamp 2.6→5rem, weight 800), `.t-display`, `.t-section`, `.t-body`, `.t-helper`, `.t-tag`, `.t-numeral` — strict ramp anyone can adhere to.
  - 🧵 **Narrative thread**:
    · `.story-divider` with `{ 0N / 05 }` running counter at the top of each step
    · `.story-rail` "previously ↩" rail under each step's title showing the previous step's key output
    · `.story-rail.is-next` "next ↪" rail at the bottom of each step previewing what's coming
    · Step intros rewritten so they reference the prior step ("You named the problem. Now strip it to bone.")
  - 🎯 **Animated nav underline** `.u-line` (draw-from-left scaleX transform on hover/active) — applied to marketing Navbar links.
  - 📂 **Disclosures**: native `<details class="disc">` with `REASONING ↘` and `WHAT THIS IS BASED ON ↘` collapsibles on every AI OutputCard. Show the AI prompt + the prose explanation.
  - 🏷️ **Confidence ribbon** `.conf-ribbon` displayed prominently on Step 3 recommendation.
  - Verified by iteration_9.json — 100% frontend pass, zero regressions.
- 2026-06 — **Apple/Linear/Notion polish + disabled-state bug fix (iteration_10)**:
  - 🐛 **Bug fix** — Step 2 `Compress` and Step 4 `Generate` CTAs now correctly **disabled** when their mandatory upstream inputs are missing (`!form.requirements.trim()` for Step 2, `!project?.decision?.recommendation?.title` for Step 4). Step 1 and 3 already had this. Disabled state visually unmistakable: light-grey gradient, grey text, cursor:not-allowed, no signal-blue glow.
  - 🟦 **Rounded everywhere** — `.btn-brut` / `.btn-ghost` now 10px radius with glass backdrop, soft inset highlight + layered drop shadow (no more harsh `4px 4px 0px` brutalist offset). `.clay*` 12px. `.card-brut` 14px. `.liquid-glass` 16px. `.textarea-brut` 12px with glass bg + signal-blue 4px focus ring. `.suggest-chip` + `.output-action-btn` pill-shaped (999px).
  - 💎 **Step pipeline** is now pill-shaped (999px radius), active step has a glass background + blue border + soft glow + pulsing dot.
  - 🌀 **`.page-enter`** entrance animation (520ms spring fade-up) wraps every StepShell — content cascades into place rather than popping.
  - 🛠 Fix carried over: Step 2 `source` disclosure now references real `form.inspirations` (was the non-existent `form.audience`). Clipboard catch now `toast.error("Couldn't copy — your browser blocked clipboard access.")` instead of silent failure.
  - Verified by iteration_10.json — 100% frontend pass, zero new regressions, compile is clean (the orphan parse-error block at end-of-file from a botched search/replace was cleaned up before testing).

- 2026-06 — **Linear-light retune + site-wide consistency fix (iterations 11-15)**:
  - 🎨 **Linear-inspired visual system**: replaced heavy frosted-glass / paper-grain noise with Linear's quiet aesthetic — solid white cards with hairline 8% borders, very soft ambient shadows, generous whitespace. Body background is now flat off-white with only two faint colour blobs (was noisy SVG fractal-noise overlay).
  - 🧱 **Surface unification** across Landing / Pricing / Login / Dashboard / ProjectOverview / Footer / Onboarding: dropped every harsh `border border-ink + bg-paper/bg-chalk` slab; replaced with `.card-brut` (solid white + 14px radius + soft shadow) for content tiles, `.clay-dark` (dark gradient + 24px radius) for emphasis sections (studio tier, marquee, CTA, banner), `.liquid-glass` (solid white + refractive sheen on hover) for AI output cards. Glass kept ONLY on sticky chrome.
  - 🟦 **Pastel accent utilities** (`.tint-sky`, `.tint-lime`, `.tint-lilac`, `.tint-peach`) + status-dot system (`.is-risk`, `.is-track`, `.is-wait`, `.is-live`) added for future Linear-style highlight moments / testimonials.
  - 🔢 **Tabular numerals** globally on `.mono-tag` / `.mono-label` / `.t-tag` / `.t-numeral` / `.counter`.
  - 🧰 **Profile dropdown bug fix** — AppHeader popover swapped from `shadow-brut + border-ink` to `.card-brut + animate-scale-in`; trigger pill swapped to `rounded-full glass`.
  - ⚡ **AI suggestions feel instant** — debounce dropped 600 → 220 → 80ms; loading indicator only renders if response > 250ms; cache hits render in 0ms.
  - 📐 **Step CTAs on one line** — `inline-flex items-center justify-center gap-2 whitespace-nowrap` added to all 4 step submit buttons.
  - 🪟 **Focused textarea no longer shows inner white box** — removed the `inset 0 1px 0` highlight that was stacking with the outer focus ring.
  - 🪛 **Tailwind config root-cause fix** (iteration_15) — `borderRadius: { sm:'0', md:'0', lg:'0', xl:'0' }` brutalist override REMOVED and replaced with proper ramp `{ sm:'4px', md:'8px', lg:'10px', xl:'14px', '2xl':'18px' }`. This single line unlocked every `rounded-lg` written in JSX across the entire codebase. Confirmed by iteration_15 testing-agent computed-style probe (100% pass, all dashboard cluster buttons now render at 10px).

- 2026-06 — **Bracket × Linear dark-aesthetic redesign (iterations 16-17)**:
  - 🌒 **Full dark theme** matching the user-provided spec exactly: bg #09090B, surface #111113, surface-2 #16181D, surface-3 #1B1D23, hairline #262A36, text #F3F4F6, text-2 #9CA3AF, text-3 #6B7280, accent #7C5CFF (violet, replacing the old #0033FF blue), success #22C55E, warning #F59E0B, danger #EF4444. Never pure white or pure black.
  - 🔤 **Inter Variable** swapped in as the display + body font (Cabinet Grotesk + Manrope retired). Tight tracking on headings (-0.025em), tabular numerals globally on mono tags.
  - 📐 **Linear spec compliance**: 6px buttons/inputs, 8px cards, 10px modals/output. 36px button + input height. Hairline 1px borders define hierarchy — no big shadows. 8-point spacing throughout.
  - 🧱 **Token-driven swap**: `tailwind.config.js` re-tokenized so every legacy class (`bg-paper` / `bg-chalk` / `bg-ink` / `text-ink` / `border-ink` / `signal` / `danger`) now resolves to dark Linear palette. `index.css` fully rewritten (474 lines, down from 1507) with new `.btn-brut` / `.btn-ghost` / `.card-brut` / `.clay-signal` / `.liquid-glass` / `.glass` / `.textarea-brut` / `.suggest-chip` / `.output-action-btn` / `.icon-tile` / `.step-pipeline` / `.story-divider` / `.story-rail` / `.conf-ribbon` / `.disc` / `.status-dot` / `.tint-*` declarations — zero JSX file changes. Every existing className just works against the new dark spec.
  - 🔉 **Motion**: spring easing `cubic-bezier(0.16, 1, 0.3, 1)` standardized; entrance fades 150-220ms; `.press` scale-on-click; `.stagger-in` cascade fade-up.
  - 🐛 **Critical fix (iteration_17)**: `--accent` was declared twice in `:root` — once as Bracket hex `#7C5CFF`, once as shadcn HSL fragment `253 100% 68%`. Second won → primary CTAs rendered transparent. Resolved by namespacing the shadcn HSL block under `--sc-*` prefix. Verified by iteration_14 testing-agent: `getComputedStyle(html).getPropertyValue('--accent') === '#7C5CFF'`, `.btn-brut` enabled bg = rgb(124,92,255), `.textarea-brut:focus` border = rgb(124,92,255).
  - Verified by iteration_13.json (visual regression) + iteration_14.json (post-fix re-verify, all probes PASS).

- 2026-06 — **Linear calm refinement (iteration_18)**: per user spec — reduced accent usage ~70%, calmed typography, removed decorative graphics from Landing.
  - 🔇 **Landing hero rewritten**: removed the giant decorative `{` `}` brackets bleeding off the page edges; killed the screaming uppercase 112px hero ("YOU / DON'T NEED / MORE TOOLS"); replaced with calm sentence-case "You don't need more tools. / You need better decisions." at 32-48px. Hero CTAs shrunk to compact 36px buttons inline (was full-width stacked). Pitch card moved from purple-tinted to standard `.card-brut` with grayscale bullets.
  - 📐 **Type ramp tightened**: `.t-hero` 2.625rem → 2rem max; `.t-display` 1.75rem → 1.5rem; `.t-section` 1.0625rem → 1rem; `.t-body` 1rem → 0.9375rem. Mono tags letter-spacing 0.06em → 0.04em.
  - 🎨 **Accent discipline (70% reduction)**: `.story-divider .counter` violet → muted gray; `.story-rail` border-left violet stripe REMOVED, now plain hairline border; `.conf-ribbon` violet-bg-violet-text → grayscale pill with white text on the number only. Violet now appears ONLY in: active step pipeline pill, primary CTA, focused input, progress line, profile-menu trigger underline.
  - 🪶 **Card padding reduced** on landing hero & pitch card; section heading scales slightly down.
  - Verified visually via 2-page screenshot smoke (landing + flow) — calm, restrained, Linear-grade.

- 2026-06-30 — **Lifted-card aesthetic (per reference image)**: replaced the blurred glassmorphic card surfaces with a solid deep-black "floating" card matching a Linear-style reference. Changes in `index.css`:
  - `.card-brut`: bg `#0E0F12`, removed `backdrop-filter`, added a `::before` 1px gradient bezel highlight on the top edge (mask-composite ring), and a layered drop-shadow stack `0 12px 32px -16px / 0 24px 64px -24px rgba(0,0,0,0.55)` giving cards a quiet floating presence on pure black backgrounds.
  - `.liquid-glass`: bg `#101116`, same bezel `::before` highlight, deeper ambient violet shadow under the card (`0 28px 72px -28px rgba(124,92,255,0.18)`), refractive sheen `::after` kept and softened. Hover lifts `-2px` with a stronger violet glow.
  - Verified visually via landing, login, and dashboard smoke screenshots.

- 2026-06-30 — **Linear-grade Design v4 (user-aligned)**:
  - Background switched to `#08090A` (warm near-black, not pure black).
  - **All violet/purple removed from text and CTA chrome.** Accent retained ONLY for status dots, icons, and decorative data-viz dots (never on headings, body, buttons).
  - **Primary CTA**: WHITE pill (38px, `#FAFAFA` bg, dark text, fully rounded). **Secondary CTA**: DARK pill (`#1A1B1F` bg, white text, hairline border).
  - **Cards**: Weekly-Pulse reference style — `var(--surface)` bg, hairline border, top-edge bezel highlight, soft layered shadow.
  - **Status pills**: icon + colored text (success/danger/warning use semantic colors), but neutral pills for draft/active/locked use just text + dot.
  - **Marketing header**: 60px, frosted blur 28px @ 55% bg opacity, neutral white underline for active route.
  - **Sidebar**: removed "New project" CTA (quick-create lives on dashboard). Active nav state is neutral surface-2, no violet. Added left accent bar in white. Sidebar alignment fixed.
  - **Step pipeline (ProjectFlow)**: redesigned to numbered circle stepper (22px round, active = white filled, done = gray filled w/ check, pending = hairline ring). Flex connector between nodes.
  - **ScrollToTop**: new `<ScrollToTop />` component added inside `<BrowserRouter>` — scrolls to top on every route change (fixes nav-click landing on previous scroll position).
  - **Step labels**: STEPS constants converted to sentence case ("Situation framing", not "SITUATION FRAMING").
  - **Hero ambient**: violet radial → neutral white radial w/ subtle dot grid.
  - **Quote marks**: violet → muted gray on Landing/CaseStudies hero quotes.
  - Verified visually across Landing, Login, Dashboard, ProjectFlow, Pricing, How It Works, Use Cases.

- 2026-06-30 — **Design v5 — Poppins + illustrative empty state + colored steps**:
  - Switched ENTIRE site font from Inter → **Poppins** (300/400/500/600/700). Tailwind `font-display` / `font-body` remapped to Poppins.
  - Added **coral CTA** (`--coral: #FF7A6B`) — used on Dashboard empty-state "Start a new project" button with soft shadow.
  - Added **new `<EmptyStateIllustration />`** SVG component — two people pointing at a chart with colored bars (green/coral/amber). Used on Dashboard empty state, replacing the ASCII art.
  - Rewrote **`<BracketMark />` as inline SVG** — `{B}` rounded-square boxed glyph (white tile + dark `{` and `B` shapes). Supports `chalk` (dark UI) and `ink` (light UI) variants.
  - **Step indicators now use semantic colors**: active = amber (`#F59E0B`) circle with halo, done = green (`#22C55E`) circle with check, pending = gray hairline ring.
  - Step labels (in both `WALKTHROUGH` constants and `ProjectFlow.STEPS`) converted to sentence case.
  - **Sidebar restructured** — two sections: `Workspace` (Dashboard, Projects, Decisions, Artifacts, Clients) and `Account` (Settings, Help, Admin*). Active nav item uses inset hairline border for definition.
  - Verified visually: Dashboard empty (illustration + coral CTA + sidebar sections), ProjectFlow (Poppins + amber step 3 active + sentence-case labels), Login, etc.

- 2026-06-30 — **Design v6 — Color, FAQ, sidebar cleanup, PNG logo**:
  - `<BracketMark />` now uses the PNG files directly (`/bracket-mark.png` for chalk, `/bracket-mark-ink.png` for ink, `/bracket-logo.png` for wordmark) — exact pixel-for-pixel match to user's brand asset.
  - Sidebar simplified to only real routes: **Workspace** (Dashboard) + **Account** (Settings, FAQ, Admin*). Removed Projects/Decisions/Artifacts/Clients/Help that didn't have backing routes.
  - New **`/faq`** page (`/app/frontend/src/pages/FAQ.jsx`) with 4 categories (Getting started, Workflow, Pricing & billing, Privacy & data) and collapsible accordion items. Wired into App.js routes, NAV_LINKS, and sidebar.
  - Landing page de-blanded — numbered counters now use a 4-color palette (green `#22C55E` / amber `#F59E0B` / coral `#FF7A6B` / violet `#7C5CFF`) on the Problem cards, Three layers cards, and Walkthrough cards.
  - Section-label pill dots switched from neutral gray to coral (`var(--coral)` with soft halo glow) for warmth.
  - FAQ page numbered category headers (01-04) cycle through the same 4-color palette.

- 2026-06-30 — **Design v7 — Official brand assets wired**:
  - Downloaded official assets to `/app/frontend/public/`:
    - `logo-icon1.png` — boxed `{B}` mark (used in collapsed sidebar)
    - `logo-mark1.png` — `{B}racket` wordmark (used in expanded sidebar + top marketing nav + Login/Onboarding/Footer headers)
    - `illustration.svg` — official two-people-presenting-a-chart illustration (used on dashboard empty state)
  - `<BracketMark />` simplified to render the PNG directly — `label={true}` → wordmark, `label={false}` → icon. Removed the inline SVG fallback.
  - `<EmptyStateIllustration />` rewritten to render `/illustration.svg` directly.
  - Updated Navbar / Login / Onboarding / Footer / AppSidebar to use the wordmark in headers (removed the separate `<span>Bracket</span>` text).
  - AppSidebar swaps logo automatically: icon when collapsed, wordmark when expanded.

- 2026-07-01 — **Iteration 16 — reported bug fixes VERIFIED by testing agent**:
  - **Step output text sizes** — `OutputCard` title dropped from `t-display` (36–56px) to `t-h2` (17.5–20px). All `font-display text-xl / text-2xl sm:text-3xl / text-3xl` inside `ProjectFlow.jsx` collapsed to the calm `t-h1 / t-h2 / t-h3` type ramp. Blockquote body 14px. Verified: mobile OutputCard = 324px (fits 375 viewport).
  - **OTP email SPAM triage** — rewrote `send_otp_email` and `_otp_html` in `/app/backend/auth.py`:
    - Removed the OTP code from the subject line (was `"Your Bracket code: 123456"` — a well-known spam signal); now `"Your Bracket sign-in code"`.
    - Rewrote the HTML with a hidden preheader div, minimal transactional-style template (no fonts.googleapis, no exotic monospace), modern rounded-card layout.
    - Added headers: `List-Unsubscribe: <mailto:support@use-bracket.com?subject=unsubscribe>`, `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, `X-Entity-Ref-ID: bracket-otp-{code}`.
    - Added Resend `tags: [category=auth, type=otp]` for deliverability analytics.
    - Fixed empty `reply_to` — now omitted from the params dict when SENDER_EMAIL is unset (previously sent as empty string, another spam signal).
    - Beefed up plain-text body (>100 chars with the code + link + guidance).
  - Testing agent (`iteration_16.json`) verified: 7/7 OTP payload assertions PASS, 20/20 pytest backend PASS, e2e frontend guest→create→step1 output flow PASS. Reported bugs = fixed.
  - Follow-up: added `overflow-x: hidden` safety net on `.app-shell` / `.app-shell-main` to prevent the reported 19px mobile overflow from resurfacing.
  - Updated stale admin email in `/app/memory/test_credentials.md` (was `saksham.shukla@...`; actual seeded admin uses `BOOTSTRAP_ADMIN_EMAIL=support@use-bracket.com`).

- 2026-07-01 — **Iteration 17 — Haiku 4.5 speed + blue accent + copy trim**:
  - **AI speed** — Switched both `DEFAULT_MODEL` and `SUGGEST_MODEL` in `/app/backend/ai_engine.py` to `claude-haiku-4-5-20251001` (Haiku 4.5, ~5-10x faster than Sonnet). Added `_run_fast()` helper with minimal system message. Trimmed the suggest prompt (~1000 → ~300 chars, 80-char field cap). Verified: warm suggest p95 = 1029ms (target ≤1500), situation framing = 4136ms (was ~8-15s).
  - **Frontend UX** — Dropped debounce 80→40ms, char threshold 3→2 chars, loading indicator delay 250→180ms. Result: chip appearance after typing "re" measured at 236ms end-to-end.
  - **Accent color** — Swapped `--accent` from purple `#7C5CFF` to blue `#2E5BFF`. Batch replaced every `#7C5CFF` and `rgba(124,92,255,*)` reference across `index.css`, `Landing.jsx`, `FAQ.jsx`. Grep verified: 0 purple hits remain in `/app/frontend/src/`.
  - **Homepage copy** — Trimmed Landing hero, Problem, Shift, Walkthrough, Artifacts, Use Cases, Final CTA. Hero is now `Decide first. / Ship second.` Subhead 1 line. Problem cards use 2-3 word titles. Every paragraph <120 chars.
  - **Label alignment** — ProjectFlow header shows `Claude Haiku 4.5` (was still showing Sonnet).
  - Testing agent iteration_17.json: **24/24 backend pytest**, all 5 reported issues verified fixed, mobile 375px overflow = 0px, zero purple in runtime computed styles.

- 2026-07-01 — **Iteration 18 — UX polish**:
  - Dashboard empty-state CTA switched from `btn-coral` to `btn-primary` (white pill) — matches marketing hero style.
  - **Avatar system unified** — every user now gets the same light-bg circle with dark first-letter (`#F5F5F7` bg + `#0A0A0C` text). Removed the 12-preset picker from Onboarding and Settings. `AVATARS` export kept for import compatibility but reduced to a single default entry.
  - **Landing copy trimmed further**:
    - Walkthrough cards → title + single sentence (dropped "What/Why/Quote" tri-column layout).
    - Use Cases cards → title + single "win" line (dropped Pain/Win/Example grid).
    - Case Study teaser section on Landing **removed entirely** — the dedicated `/case-studies` page carries this content.
    - Hero, Problem, Shift, Artifacts, Final CTA subheads all one line ≤ 80 chars.
  - Lint clean across Avatar, Landing, Dashboard, Onboarding, Settings.

- 2026-07-01 — **Iteration 19 — 3 user-reported bug fixes** (verified by testing agent):
  - **Bug 1 (P0): Existing users couldn't see their projects.** Root cause: pre-auth-pivot projects were created with only `creator_email` and no `owner_user_id`, but `GET /api/projects` filtered strictly on `owner_user_id`. Fixed by (a) auto-claiming orphan projects on list (`update_many` where `creator_email` matches and owner is missing/empty/null → set `owner_user_id`), (b) `_get_owned_project_or_404` now matches `$or(owner_user_id, creator_email)` with case-insensitive email regex and lazily backfills `owner_user_id` on first access. Files: `/app/backend/server.py` lines 505–560.
  - **Bug 2 (P1): Sidebar was scrolling with the page.** Root cause: `.app-shell` had `overflow-x: hidden` which broke sticky positioning while the whole page scrolled. Fixed with the standard 3-part CSS pattern — `.app-shell { height: 100vh; overflow: hidden }`, `.app-shell-main { overflow-y: auto }`, `.app-sidebar { position: sticky; top: 0; height: 100vh; overflow-y: auto }`. Main content now scrolls in its own container; sidebar stays pinned. File: `/app/frontend/src/index.css` lines 843–889.
  - **Bug 3 (P1): AI suggestion output quality had degraded.** Root cause: previous session swapped step-output generation from Sonnet 4.5 to Haiku 4.5 for speed, which thinned the prose. Fixed by upgrading `DEFAULT_MODEL` back to `claude-sonnet-4-5-20250929` for step outputs while keeping `SUGGEST_MODEL` on `claude-haiku-4-5-20251001` for typing suggestion latency. File: `/app/backend/ai_engine.py`.
  - Verified via `testing_agent_v3_fork` iteration_18 — 6/6 backend pass, sidebar CSS verified, `/api/suggest` warm ~1–3s, step1 framing ~4–6s, admin login OK, guest regression OK.

## Verified status (post iteration_19)
- ✅ Existing users see their legacy `creator_email`-only projects after OTP login.
- ✅ Sidebar pinned when main content scrolls (dashboard, project view, settings).
- ✅ Step-output quality restored via Sonnet 4.5; typing suggestions still fast via Haiku 4.5.

## Backlog (P1)
- Optionally enforce `OTP_RESEND_COOLDOWN_SECONDS` server-side (currently a constant but not enforced).
- ProjectDocument owner-reply UI surface — backend verified, frontend UI exists but not E2E-covered yet.
- ProtectedRoute `?next=` preservation — verify in a future pass.
- Reintroduce paid tiers (Stripe) once early access ends.

## Backlog (P2)
- `step_lock` uses `_get_project_or_404` (not owner-checked) — inconsistent with unlock/reset-from-step; flow-step endpoints share this legacy pattern (guest mode). Tighten ownership across all step endpoints in one pass.
- Split `server.py` (~2850 lines) into `routes_projects.py`, `routes_share.py`, `routes_export.py`.
- Public case study CMS.
- Email-the-PDF on lock-in.
- Dashboard loading skeleton (prevent empty-state flash on first load).

- 2026-07-01 — **Iteration 21 — Admin project drill-down** (verified iteration_20):
  - New endpoint `GET /api/admin/projects/{project_id}` returns the full project document (all 5-step inputs + AI outputs, share status, feedback, replies) plus a lightweight `owner` object. `_id` and `share_token` are stripped. Guarded by `auth_current_admin` — 404 for anon/non-admin.
  - New modal `AdminProjectDetailModal.jsx` renders the entire project in nested Meta / Step 1–4 / Client review / Feedback sections. Uses an iterative flattener (`adminDetailBits.js`, `React.createElement`) to avoid a self-recursion bug in the in-tree `@emergentbase/visual-edits` babel plugin's prop-tracer (`tracePropToSource → getArrayIterationContext`).
  - `AdminDashboard.jsx` — added a **VIEW** button on each project row inside the expanded user list. Opens the modal. ESC / backdrop / X close.
  - Verified via `testing_agent_v3_fork` iteration_20 — 6/6 backend, modal renders 12k+ chars of section content, all 3 close paths work, analytics + users regression clean.

- 2026-07-01 — **Iteration 22 — Admin visual refresh** (verified iteration_21):
  - `/admin` now renders inside the site `AppShell` (Bracket sidebar with Dashboard / Settings / FAQ / Admin) — no more standalone header.
  - Page intro matches the `/app` pattern: `section-label` pill "Admin console" + `t-hero` display heading "Bracket, at a glance." + muted subtitle.
  - Tabs (Analytics / Users) restyled with site tokens — active tab uses `--accent` border-bottom.
  - Analytics KPI cards + chart cards all use `card-brut`; palette pinned to `--surface`, `--hairline`, `--accent`; Poppins throughout; Refresh uses `.btn-ghost`.
  - Users tab list wrapped in `card-brut`; admin badge is an `--accent`-tinted pill; project rows show semantic status pills; Reset PW modal uses `.btn-brut`/`.btn-ghost`.
  - Project detail modal uses `card-brut`, `section-label` header, `--accent` INPUT/AI-OUTPUT labels.
  - Removed the self-serve `SET PW` modal — password change lives on `/settings` (accessible via the sidebar). Removed dead `STATUS_COLOR`/`logout` code.
  - Verified via `testing_agent_v3_fork` iteration_21 — all functional flows pass, backend regression clean, modal close paths (ESC/backdrop/X) all work.

## Next tasks
1. Add Playwright coverage for ProjectDocument owner-reply UI and Claim page (orphan-project setup).
2. Enforce OTP cooldown server-side.
3. Consider breaking `ProjectFlow.jsx` (>1900 lines) into per-step child components.

- 2026-07-05 — **Iteration 28 — All-status-pill contrast + AI-name unification + StepProgress + progressive Steps 3/4**:
  - **`.mono-tag` color override bug** (root cause of most pill invisibility) — `.mono-tag` hardcodes `color: var(--text-3)` (muted grey) which silently overrides any Tailwind text-color utility applied to a pill. Every pill that used `bg-danger text-chalk` / `bg-signal text-chalk` / `bg-ink text-chalk` had *muted grey* text on saturated backgrounds — invisible on red / low-contrast on blue / grey-on-white on light.
  - **Sitewide pill audit + inline-style rewrites**:
    - `StepStatus` (ProjectOverview) — DONE / IN PROGRESS / TODO pills → inline styles with `#FFFFFF` text on `#2E5BFF` blue for DONE; dark surface for IN PROGRESS; transparent with hairline border for TODO. Also replaced `STATUS_PILL` + `SHARE_PILL` constants with `STATUS_STYLE` / `STATUS_LABEL` (and share equivalents) using proper inline-style palette.
    - `SEVERITY_STYLE` for risk-flag pills in both `ProjectDocument.jsx` and `ClientReview.jsx` — HIGH → red + white text; MEDIUM → orange + white text; LOW → transparent + hairline. Fixes the HIGH/MEDIUM invisibility in Step 4 artifacts + client review.
  - **AI model name unified** — The top-of-flow header used to say "Claude Haiku 4.5" everywhere, which was misleading since Haiku is only used for the typing-suggestion fast path; every step output (framing, context, decision, artifacts) runs on Sonnet 4.5. Updated the display string to "Claude Sonnet 4.5" (matches ProjectOverview and PDF footer).
  - **Guest-upgrade banner "×" close button** — Replaced the tiny mono-font `×` character with a proper 32×32 button rendering a lucide `<X size={16} />` icon, with a subtle hover background. Correct target size + visual weight for a modal-dismiss action.
  - **New generic `StepProgress` component** — Extracted `Step1Progress` into a data-driven component that accepts `rows[]` + `estimate[]`. Now used across:
    - Step 1 (framing): detecting → scanning → framing, `~8 / ~6 / ~3`
    - Step 2 (compression): reading → cutting → naming, `~5 / ~4 / 1`
    - Step 3 (decision): weighing → picking → stress, `1 / ~3 / ~4`
    - Step 4 (artifacts): scope → message → risks, `1 / 1 / ~5`
  - Each Step's `run()` now sets an initial phase, schedules two more phase transitions via `setTimeout` (calibrated to that step's typical Sonnet latency), and clears on success/error. Loader takes over the `<OutputPending>` slot while `loading === true`.
  - **Progressive disclosure on Step 3 + Step 4** — Step 3: recommendation card now uses the `progressive` prop with a "Read the rationale" summary reveal; alternatives / trade-offs / risks cards are hidden behind a `disc-btn` "↓ Show alternatives, trade-offs & risks" reveal (state: `showAlternatives`). Step 4: scope + client message always visible first (highest-utility outputs); assumptions + risk flags hidden behind "↓ Show assumptions & risk flags" reveal (state: `revealMore`).
  - Verified in preview: ProjectOverview shows DONE with proper contrast + IN PROGRESS pill readable + Claude Sonnet 4.5 in header. Lint clean.


  - **Step-card hover invisibility (ProjectOverview)** — Each step card had `hover:bg-white/40` which laid a semi-transparent white sheet over the whole item on hover, making the dark-theme text (WHAT / WHO / blockquote / EDIT pill) unreadable. Replaced with `hover:bg-[var(--surface-2)]` + 150 ms color transition — the card lifts to a slightly lighter *dark* surface, all text stays high-contrast.
  - **Full purple → blue accent migration** — Tailwind `signal` was still `#7C5CFF` (violet) while CSS `--accent` was `#2E5BFF` (blue). Every `bg-signal` / `border-signal` / `text-signal` / `ring` utility rendered violet, competing with the blue CSS-variable accents. Retargeted `tailwind.config.js`: `signal = #2E5BFF`, `signalHover = #1E4AEB`, `ring = #2E5BFF`, `accent.DEFAULT = #2E5BFF`. Also removed hardcoded `#7C5CFF` from `AdminAnalytics.jsx` chart palette (`accent2` + `PIE_COLORS[1]` → `#4E7FFF` blue tint).
  - **Guest-upgrade banner + Step 5 spacing** — Banner had blue accent border/glow AND the Locked success card next to it had the *same* accent styling → two blue cards competing for the eye on Step 5. Kept `.guest-upgrade` (the CTA) with the accent glow; downgraded `.step5-locked-card` to a plain `card-brut` (no glow, hairline border). Added `mt-8` between the banner and the content grid so they breathe.
  - **AppHeader profile dropdown hover** — Trigger + menu items used `hover:bg-white/60` / `hover:bg-white/50` (invisible in dark theme). Swapped to `hover:bg-[var(--surface-2)] hover:text-[var(--text)]`. The Sign-out red-danger row keeps its red hover but the text is now `!text-white` (was `text-chalk` = dark = invisible on red).
  - **Buttons that swapped bg-signal + text-chalk / bg-danger + text-chalk** — Same pattern as the earlier ClarityPill contrast bug, applied to interactive buttons across `ProjectDocument.jsx` (Useful / Not-Yet sentiment), `ClaimProjects.jsx` (Keep / Delete), and `ClientReview.jsx` (accepted/concerns final state). All rewritten to inline `style` (bypasses `.mono-tag`'s hardcoded muted color) with proper white text on saturated backgrounds (blue for keep/useful/accept, red for delete/not-yet, muted grey for inactive), and `color: inherit` on child spans so labels pick up the button's ink.
  - **ProjectOverview quick-action buttons** — `bg-paper hover:bg-ink hover:text-chalk` (dark → jarring flip to white on hover) replaced with the standard `.btn-ghost` utility for Rename, Open Document, Unlock-to-edit. Consistent hover with the rest of the app.
  - **ProjectDocument header + share-copy buttons** — Same `bg-paper hover:bg-ink hover:text-chalk` legacy — replaced with `.btn-ghost`; share-URL preview strip switched to `bg-[var(--surface-2)]` with hairline border and rounded corners.
  - Verified in preview: ProjectOverview step cards fully readable on hover; landing page + admin analytics palette all-blue; Step 5 no longer has competing accent glows.


  - **AI suggestions bombardment fixed (frontend)** — `AISuggestions` debounce was 40 ms (the comment said "220 ms" but the code shipped with 40 ms), so every keystroke fired a Haiku call. Backend logs showed 5-10 parallel Haiku calls per fast typist, choking the AI pool and pushing Step 2 compression queue depth into Cloudflare's 100s origin-timeout window. Bumped debounce to **400 ms** + attached an `AbortController` so cancelled requests actually drop their HTTP fetch (previously only the setState was cancelled). Also passed `timeout: 12000` to axios so a runaway suggest call can't hold the connection open forever.
  - **Hard AI timeouts (backend)** — Added `asyncio.wait_for` around `_run` (Sonnet steps: **70 s**) and `_run_fast` (Haiku suggests: **8 s**). Now Cloudflare's 100 s cutoff can never fire — a stuck Anthropic call surfaces as a clean 502 JSON with a "please retry" message instead of CF's "origin returned malformed response" 520 HTML. New `STEP_TIMEOUT_S` + `SUGGEST_TIMEOUT_S` constants at the top of `ai_engine.py`.
  - **`track_session` crash-proofing** — Analytics endpoint used to raise `pymongo.errors.WriteError: "session_id conflict"` under some races (observed twice in prod logs). That 500 was surfaced to the SPA as a hard error. Wrapped the `db.sessions.update_one` in try/except that logs + swallows write failures — analytics loss > 5xx cascade to CF.
  - Verified end-to-end via curl on preview: Step 1 (Sonnet) 10.7 s → HTTP 200, Step 2 Compress (Sonnet) 16.4 s → HTTP 200, Suggest (Haiku) 0.9 s → HTTP 200. Browser smoke test confirmed Step 2 loads cleanly with populated inputs + suggestion chips + pending output card (no CF error page).
  - **⚠️ User must redeploy to push these to production (use-bracket.com).**


  - **Step 1 OutputCard progressive mode** — `<OutputCard>` accepts new `progressive` + `progressiveLabels` + `sourceLabel` props. When `progressive` is true (Step 1 only), the card renders only the title + label on first paint; blockquote is hidden behind a `disc-btn` "↓ Read summary" reveal, tensions (children) hidden behind "↓ Show tensions", and the Copy/Redo action bar is deferred until the summary is revealed. Reasoning + source disclosures stay collapsed as before but the "What this is based on" summary label is renamed to "Show assumptions" in progressive mode. Removes the "opening a wall of 350+ words" first-impression problem — reveals cascade as user pulls them.
  - **AI suggestion chips — sequential pop-in** — Replaced the one-off `.stagger-in` wrapper with a keyed `<div key={items.join('|')}>` around the chips + new `.chips-pop` class + `@keyframes chipPop` (opacity + scale 0.94→1.04→1) at 380ms with 90ms per-chip `animationDelay`. Each fresh set of AI suggestions now re-mounts the chip children so the pop-in fires again — creates the "dopamine moment" every time. Loading label ("BRACKET ↘ thinking…") stays outside the keyed wrapper so it doesn't flash.
  - **Also**: `OutputList` (numbered variant) got `.stagger-in` so tensions bullets cascade in when "Show tensions" is revealed.
  - **Dashboard warmth** — Rewrote the empty-state greeting subtitle from "What are we deciding today?" to "Ready for your next client? Turn a messy brief into a confident decision in under a minute." (warmer, action-oriented, echoes the Step 1 kicker).
  - **Sample project cards on Dashboard** — Replaced the three chip starters ("Acme rebrand · landing" etc.) with three visual `.sample-card`s (Landing Page / Fintech Startup, Checkout Audit / UX Review, Coffee Brand / Brand Strategy). Each card shows `~45 sec demo` meta + arrow icon + `Try →` footer and, on click, creates a new project + navigates to `/project/:id/flow?sample=<key>`. New `.sample-card` CSS: 12px radius, hairline border, translateY(-3px) + accent border + violet glow on hover.
  - **ProjectFlow honours `?sample=<key>`** — Step 1 reads `useSearchParams().get("sample")`; when present + no framing + not loading, `trySample(sampleKey)` runs once (guarded by `sampleAutoRun` ref) → pre-fills all 3 fields with the specific brief matching the key + auto-submits. URL param stays in the address bar; the `!framing` guard prevents accidental re-triggers on refresh. Removes the deep-link "which sample was picked?" randomness from the Dashboard entry point.
  - Verified via preview screenshots: sample-card click → Step 1 progressive card lands with title + red MURKY pill visible + "Read summary" affordance + hidden blockquote/tensions/actions. Clicking Read summary reveals blockquote + Copy/Redo. Clicking Show tensions reveals the 5-item numbered list. Lint clean, no regressions.


  - **Sample banner copy rewritten** — "You're exploring a **sample project**. In about 60 seconds you'll see how Bracket turns a messy brief into structured decisions." (previously "Explore how Bracket thinks — then start your own anytime.")
  - **Social-proof badge** — new `step1-sample-popular-badge` ("Most users start here") sits next to the `sample project` tag in the step meta row when a sample is active.
  - **Removed duplicate CTA** — top-of-banner "Start your own" button removed (was `step1-start-own-btn`). The only "Start yours" CTA is now the post-generation `step1-analyze-own-btn` in the done-banner below the OutputCard.
  - **Dashboard loading skeleton** — replaced the "LOADING…" text on `/app` with 3 shimmer skeleton rows (`dashboard-loading-skeleton`) that mimic the actual project row layout so there's no empty-state flash before projects arrive. Reused `.skeleton-line` shimmer keyframe, added an aliased `.skeleton-bar` utility for flexible height/width usage.
  - Verified visually — sample banner text + badge + missing top CTA all confirmed in preview. Skeleton renders while `/api/projects` is in flight.

- 2026-07-05 — **Iteration 23 — Step 1 UX overhaul ("impossible to fail")** (verified iteration_22):
  - **Guided labels + helper text + realistic placeholders** — Step 1's three textareas rewritten with explicit questions ("What are you building?", "Who is the client (and who are you actually talking to)?", "What feels unclear or off?"), helper caption below each (`Field` extended with `helper` prop), and concrete example placeholders (fintech landing, YC founder, Stripe references).
  - **Value-prop kicker + "under a minute" pill** — StepShell kicker now leads with "Turn a messy client brief into a clear decision in under a minute…"; a `Clock` pill (`step1-timepill`) sits above the form.
  - **Auto-focus first input** — `whatRef` attached to the first textarea; focus scheduled 220ms after mount (respects `page-enter` animation).
  - **Gibberish detection** — `looksLikeGibberish()` heuristic (length < 12, all digits, single-char runs, keyboard-mash tokens). When it fires on `what`, submit stays disabled AND an inline `step1-what-warning` bar appears with a "load a sample project" link (`step1-inline-sample-btn`).
  - **"Try a sample project" — full magical demo** — new `step1-try-sample-btn` CTA below the form. Picks a random brief from `SAMPLE_BRIEFS` (fintech-landing / checkout-redesign / coffee-brand), pre-fills all three textareas AND auto-submits the situation API.
  - **Intermediate progress loader** — during the ~4-6s AI call, a new `Step1Progress` card replaces the `OutputPending` skeleton and animates through 3 sequential checkmarks (`step1-progress-detecting` → `step1-progress-scanning` → `step1-progress-framing`) synced to actual latency via 900ms/2200ms `setTimeout`s + the awaited API resolution. Below the checkmarks, an ESTIMATE tile shows ~8 requirements / ~6 clarifications / ~3 risks.
  - **Sample banners** — while a sample is loaded, a `step1-sample-banner` appears above the form ("This is a sample project…"). After the AI returns for a sample, a second `step1-sample-done-banner` appears next to the OutputCard prompting "Ready to analyze your own project?" with a `step1-analyze-own-btn` that routes to `/app`.
  - **Auto-save draft to localStorage** — form state debounced 500ms to `bracket:step1-draft:{projectId}`; on first mount, if no server-side `situation_input` exists, the draft hydrates the form. Draft is cleared once framing is returned. A small `step1-draft-saved` check-pill blinks for 1.4s after each save.
  - Verified via `testing_agent_v3_fork` iteration_22 — 100% frontend pass, all 8 acceptance criteria (labels + helpers, auto-focus, gibberish disable + inline sample, try-sample CTA, pre-fill + auto-submit, sequential progress loader, sample banners, autosave to localStorage) confirmed on the preview URL.

- 2026-07-01 — **Iteration 20 — Admin analytics dashboard** (verified iteration_19):
  - New endpoint `GET /api/admin/analytics` returns a single aggregated payload: KPIs (total users, new-users-7d, total projects, locked, share-accept rate, avg steps), daily new-user + project series (30 days), status distribution, step-drop-off funnel, cycle-time-per-user scatter data, top-10 leaderboard, share/review funnel, and a 7×24 activity heatmap of project creations over the last 90 days. Guarded by `auth_current_admin` — non-admins receive 404.
  - New page `AdminAnalytics.jsx` renders on the default tab of `/admin` using recharts: area/line charts for daily series, donut for status, bar chart for step funnel + share funnel, jittered scatter for cycle time by user (mirrors reference image), horizontal bar leaderboard, and a custom SVG heatmap. Dark theme (`#0F1014` cards, `#2E5BFF` blue accent, dashed `#1E2230` grid, monospace axes).
  - `AdminDashboard.jsx` now has a tab switcher (`ANALYTICS` default, `USERS` lazy-loaded). All existing user-management features preserved.
  - Verified by `testing_agent_v3_fork` iteration_19 — backend 6/6, frontend all 8 charts + 6 KPIs render with valid SVG (child counts 50–748), tabs work, regression clean, 404 on non-admin access confirmed.


- 2026-07-14 — **Iteration 25 — Phase 2 UX polish (activation nudges + AI-native affordances)** (verified iteration_25, 100% frontend pass):
  - **Milestone tracker** — The step-pipeline in `ProjectFlow.jsx` header is now surfaced as a journey tracker with a new `YOUR JOURNEY` label (`data-testid="milestone-tracker-label"`). Each `STEPS` entry got a `milestone` field alongside its `label`: when a step is done, the node renders the completion verb (`Project understood`, `Signals compressed`, `Decision made`, `Artifacts drafted`, `Locked & signed`); otherwise it shows the task label. Done nodes still get the green ✔ + `is-done` state.
  - **Transformation-story cards (Steps 1/2/3)** — new `TransformationCard` component renders below the OutputCard once AI extraction completes. Shows raw paste `wordCount → N extracted items` in giant display type, with an italic story-note ("You pasted a mess. Bracket returned a reframed problem, a clarity read of 42/100, and 5 tensions worth watching.") Data-testids: `step1-transformation`, `step2-transformation`, `step3-transformation`.
  - **Rename affordances** — On `OutputCard`, the regenerate button label changed from `Redo` → `Challenge this` (title: "Challenge this — ask Bracket to re-argue it"); onEdit label changed from `Edit` → `Refine with AI`. On `ProjectOverview.jsx`, the per-step done button changed from `EDIT` → `REFINE`. In-progress = `CONTINUE`, not-started = `START`.
  - **Empty-state teaching (ProjectOverview)** — `StepSummary` now falls back to an `EMPTY_TEACHING` blurb map when a step has no output (e.g., Step 3: "We'll pick a side (not a menu), stress-test it against risks your client never mentioned…"). Testids: `overview-empty-teaching-{n}`. Overview section heading updated to `{ your journey · five milestones }`.
  - **Empty-state teaching (inside step outputs)** — new `EmptyModuleHint` component renders inside `OutputSection`s in Steps 2 (signals/noise/hidden assumptions) and 3 (alternatives/trade-offs/risks) when the extracted list is empty. Testids like `step3-risks-empty` with a teaching blurb ("Bracket will call out the risks your client never mentioned before they happen…").
  - **Second-project nudge (Step 5 locked)** — On `Step5` after `status === "locked"`, a full-width prominent card appears below the lock-in grid: `{ next client · ready? }` label, `Ready for your next client?` headline, an assured 3-line pitch, and a `Start a new project →` CTA linking to `/app`. Testids: `step5-second-project-nudge`, `step5-new-project-btn`.
  - Verified by `testing_agent_v3_fork` iteration_25 — 8/8 features PASS (milestone tracker, Step 1/2/3 transformation cards, rename affordances, overview empty teaching, overview REFINE rename, Step 5 nudge post-lock, paste-anything Dashboard regression).
  - **⚠️ User must redeploy to push these to production (use-bracket.com).**

- 2026-07-14 — **Iteration 26 — Phase 2b: No-scroll steps, consultant chapters, dopamine cards, AI project titles** (verified via smoke — every step page now has scroll delta 0 at 1440×900):
  - **Consultant chapters**: STEPS renamed to `Understand → Simplify → Strategy → Execution → Review`. Each step page renders `CHAPTER N / 05 · <CHAPTER>` divider. Milestone tracker shows the chapter label (or milestone verb when done).
  - **AI-generated project title**: New `generate_project_title(raw_paste)` in `ai_engine.py` produces a 3–6-word Title-Case name via Haiku. `POST /api/projects` accepts optional `raw_paste` and overrides the heuristic. `PATCH /projects/{id}` sets `name_source="user"` so future step-1 submits don't overwrite a rename. Curl-verified titles: `B2B Analytics Marketing Site Redesign`, `Loop Coffee Brand Launch Kit`, `Treasury Management Landing Redesign`, `Gen-Z Habit Tracking iOS App`.
  - **"NEXT →" strip** (Problem 3): every step above the CTA shows `NEXT → ✓ Reframed problem ✓ Clarity score ✓ Tensions to watch` — sets expectations before the user commits.
  - **Big Celebration card** (Problem 5 — dopamine hit): new `CelebrationCard` component with `linear-gradient` accent tint renders after AI completes. Leads with `✓ CHAPTER N · COMPLETE`, then the milestone verb ("Signals compressed"), then a 3–4-column count strip. Replaced `TransformationCard` usage on Steps 1/2/3.
  - **No-scroll layout** (Problem 7): compacted `StepShell` (t-hero 60px → 36px, kicker text-base → text-[13px], mt-8 → mt-4), reduced main padding (py-10 → py-6), shrunk textareas (rows=12 → rows=6), tightened header, made Step 2's OutputCard progressive so its long insight is hidden behind "Read the insight" until clicked. Truncated `previously` rail at 180 chars.
  - **Copy cut ~30–40%** across every step: kickers, sample banners, helper text, output-pending blurbs.
  - Verified at 1440×900: Step 1 done delta 0, Step 2 done delta 0, Step 3 done delta 0, Step 4 done delta 0. Loading states also delta 0.
  - **⚠️ User must redeploy to push to production (use-bracket.com).**



- 2026-07-14 — **Iteration 27 — P1: Wide 3-col step layout, "Bracket asks" conversational tone, Dashboard hero pivot** (verified via smoke):
  - **Wide 3-col step layout (kills scrolling on all step pages)**: `main` container widened from `max-w-[1100px]` → `max-w-[1440px]`. Steps 1/2/3 switch from 2-col to a 12-col grid when AI output exists: `form (col-4) | OutputCard (col-5) | CelebrationCard (col-3)`. Step 4 uses `artifacts grid (col-9) | Celebration (col-3)`. Fills horizontal space, eliminates vertical stacking. Verified: Step 1/2/3 done all delta 0 at 1440×900.
  - **Conversational AI feel (Problem 4)** — new `ask` prop on `StepShell` renders a `⁺ BRACKET ASKS` mono-tag prefix above the title when the step hasn't been generated yet. Titles rewritten as questions:
    * Step 1: `What did your client send?`
    * Step 2: `What else should Bracket see?`
    * Step 3: `What's your read?`
    Post-output titles remain declarative (`Here's what's actually happening.` / `Here's what actually matters.` / `The call is in.`).
  - **Dashboard hero copy pivot (Problem 1)**: headline changed to `Paste anything your client sent you.` — one direct sentence, no question. Subtitle: `Email · WhatsApp · Meeting notes · Voice transcript · Contract. We'll figure out the rest — scope, deliverables, timeline, risks, docs. The whole client-ready package.`
  - **⚠️ User must redeploy to push to production (use-bracket.com).**


- 2026-07-14 — **Iteration 28 — Cinematic Landing rebuild (Framer Motion + Lenis)**:
  - Full rewrite of `pages/Landing.jsx` — 5 cinematic sections, dark, dramatic, Apple × Awwwards.
  - **Hero**: looping muted video (pixabay abstract loop) + radial gradient scrim (blue signal wash) + film grain + staggered word-reveal on "Paste the mess. / Ship the decision." (second line gradient-tinted #2E5BFF → #7CD5FF → #B7B7FF). Live count-up metrics from `/api/public/metrics`. Magnetic CTA buttons. Scroll cue.
  - **Scroll-pinned horizontal parallax showcase**: 5-chapter card rail, each card colored per accent (blue → sky → amber → violet → mint), radial blur halos, pinned while user scrolls. Falls back to static grid under reduced-motion.
  - **Bento grid**: 6 tiles of varying sizes, radial glow blooms on hover.
  - **Glassmorphic pricing**: 3 tiers, middle PRO card **amber-glowed** (`#FFB84C`) with `Most popular` ribbon, elevated by 6px baseline + lifts to 14px on hover. USD/INR currency toggle. Gold gradient CTA on PRO.
  - **Final CTA band**: near-black bg + radial blue wash + film grain, giant italic serif "Start building." with animated gradient underline (blue→sky→amber shimmer), magnetic XL CTA.
  - **Lenis smooth scroll** wired up in `useEffect`. Disabled under `prefers-reduced-motion`.
  - Framer Motion primitives: `WordReveal`, `MagneticButton`, `CountUp`, `FilmGrain` — all reduced-motion aware.
  - New CSS (appended to `index.css`): `.landing-hero-gradient`, `.landing-cta-primary`, `.landing-showcase-card`, `.bento-card` + `.bento-card-glow`, `.pricing-card--popular` (amber glow halo, ribbon, `::before` bloom), `.landing-underline-fill` shimmer animation, prefers-reduced-motion overrides.
  - Deps added via yarn: `framer-motion@12.42.2`, `@studio-freight/lenis@1.0.42`.
  - **Note**: The prior Workbench primitive (split-screen step layout) was scaffolded but NOT wired into Steps 1/2/3 — still using the previous 3-col layout. Follow-up if you want to migrate.
  - **⚠️ User must redeploy to push to `use-bracket.com`.**

- 2026-07-14 — **Iteration 29 — Cinematic Navbar + Workbench top-bar step layout**:
  - **Cinematic Navbar rewrite (`components/Navbar.jsx`)**: Framer-Motion-driven scroll solidification (bg opacity 0.35 → 0.85 over 0–80px scroll, border 0 → 0.08). Animated gradient underline on hover + active. Glass panel with `backdrop-filter: blur(22px) saturate(150%)`. Gradient white pill CTA with blue-signal box-shadow bloom. Mobile drawer uses AnimatePresence for smooth enter/exit. Auto-closes on route change. Matches Landing design language across the entire marketing site (all pages inheriting `MarketingLayout` get the new nav).
  - **Workbench top-bar step layout (`StepShell` rewrite)**: 
    * Top bar: gradient `01/02/03/04/05` numeral (blue → sky gradient), CHAPTER breadcrumb, `BRACKET ASKS` pill on the left, title inline below.
    * Once AI completes, **celebration chips replace ASKS in the top bar** — the dopamine hit lives in the persistent header now (`✓ Project understood · 128 words · 5 tensions · 42 clarity/100`).
    * `CelebrationCard` in the right column deleted from Steps 1/2/3/4 — celebration moved to top bar.
    * Grid re-proportioned once done: `form (col-5) | output (col-7)` (was `4/5/3` with the celebration col).
    * Step 4 artifacts full-width; sample banner on Step 1 moved to below the grid.
  - New CSS classes: `.cinema-nav*` (nav), `.workbench-topbar`, `.workbench-num` (gradient numeral), `.workbench-celebration` (blue pill).
  - Verified at 1440×900: Step 1 done delta 0, all previous no-scroll invariants preserved.
  - **⚠️ Redeploy needed** to push to `use-bracket.com`.



- 2026-07-14 — **Iteration 30 — Homepage polish + cascade cinematic to marketing sub-pages**:
  - **Showcase blank-scroll fix**: switched horizontal transform from `%` (which acts on the element's own width — ~400vw for the card row, causing massive overshoot) to `vw` units: `["0vw", "-${(cards-1)*80}vw"]`. Container height trimmed from `cards*100vh` → `(cards-1)*85 + 40vh`. Result: last card ("Locked. Signed. Shipped.") stays in view until the pin releases directly into the Bento section. No more dead scroll gap.
  - **Homepage CTAs verified**: hero primary = `Start free`, secondary = `How it works`. Left as intended.
  - **Step cards → ghost-glass**: `.liquid-glass` and `.card-brut/.card-linear` rewritten to match the `landing-cta-ghost` treatment (translucent white 4% + hairline border 8% + `backdrop-filter: blur(10-12px) saturate(140%)`). Cascades to every step OutputCard automatically.
  - **Cinematic cascade to marketing sub-pages**:
    * `.hero-ambient` rewritten to a large blue-signal radial wash + faint dot grid, matching Landing's hero scrim.
    * `.section-label` now a JetBrains-Mono pill in signal-blue with `0.14em` tracking and a blue-glow dot (was Poppins + coral).
    * `.t-display` and `.t-hero` scaled up (`clamp(2.5rem, 6vw, 5.5rem)` / `clamp(1.9rem, 4vw, 3.25rem)`) with tighter tracking (-0.038em / -0.03em) for cinematic weight.
    * `MarketingLayout` rewritten to inject a fixed `.marketing-ambient` (blue-signal + secondary sky wash) + `.marketing-grain` (SVG turbulence, overlay blend) on all sub-pages. Landing is excluded (renders its own hero backdrop).
  - **⚠️ Redeploy needed** to push to `use-bracket.com`.


- 2026-07-14 — **Iteration 31 — Hero image swap, "Start building" scale, bento masonry balance**:
  - **Hero backdrop swapped**: replaced pixabay video (`849620443_large.mp4`) with an Unsplash "Earth from space at night" stock image (`photo-1451187580459-43490279c0fa`). Cinematic, on-brand for a decision OS ("scale + possibility"). Parallax `y` motion preserved.
  - **"Start building." size**: dropped from `text-[64→176px]` to `text-[52→128px]`. Now fits in a single line even on 1440 viewports without truncation. Hero headline `Paste the mess. / Ship the decision.` scaled down (44→112 → 42→96).
  - **Bento masonry rebuild**: 4-col × 3-row grid, **12 cells filled with 7 tiles, zero gaps**:
    * Dashboard (2×2) top-left
    * Scope · Risks top-right (1×1 each)
    * Dashboard cont · Decision (1×2) · Message middle
    * NEW **Speed** (2×1) wide tile bottom-left · Decision cont · Lock bottom-right
    * `grid-flow-dense` added as safety net.
  - Total page height dropped from 8228 → 7608px.
  - **⚠️ Redeploy needed** to push to `use-bracket.com`.

- 2026-07-14 — **Iteration 32 — Flow reduction · Bento imagery · sub-page cinematic pass**:
  - **Flow section cards shrunk**: width `78vw → 55vw` (max 620px), padding `p-16 → p-11`, title `text-[54px] → text-[36px]`, min-height `480px → 360px`, container height `(cards-1)*85+40 → (cards-1)*70+40`. Denser, less "screen-consuming" pinning.
  - **Bento stock images per tile**: every card now has a curated Unsplash photo behind it with a `linear-gradient(rgba(8,9,10,0.4)→rgba(8,9,10,0.95))` scrim so text stays readable. Images: DASHBOARD (analytics), SCOPE (notebook), RISKS (mountain-drama), DECISION (space/decisive), MESSAGE (email), SPEED (motion-blur lights), LOCK (padlock/tech). Opacity 0.40→0.55 on hover.
  - **HowItWorks fully cinematic**: Framer fade-up staggers on 3-layer cards + 5-step rows. Big gradient `01/02/03` and `001/002/003` numerals (blue→sky background-clip text). Radial glow on hover per card. Section headings use signal-blue mono-tag pills.
  - **Pricing rebuilt with landing-style glassmorphic cards**: PRO card amber-glowed with `Most popular` ribbon, `::before` bloom halo, gold gradient CTA. USD/INR toggle uses `.landing-currency-toggle`. Amber radial wash behind the pricing row. `landing-hero-gradient` on the H1 highlight word.
  - **CaseStudies rebuilt**: Big gradient `01/02` case numerals. Before/After cards are now glass with color-coded borders (danger red border for BEFORE with red glow, blue-signal border for AFTER with blue glow). Italic gradient-quote treatment with big display-italic type. Motion fade-up staggers.
  - **⚠️ Redeploy needed** to push to `use-bracket.com`.


- 2026-07-14 — **Iteration 33 — Hero image on-brand + Bento zoom-in hover**:
  - **Hero image swapped** from Earth-from-space (`photo-1451187580459-43490279c0fa`) → moody circuit close-up (`photo-1518770660439-4636190af475`). Reads as "system / operating system / structured logic" — matches "decision OS" thematically. Blue-lit circuit patterns pair with the signal-blue accent.
  - **Bento zoom-in hover**: image now scales `1.0 → 1.10` on hover with `transition-[opacity,transform] duration-[700ms]`, opacity bump `0.40 → 0.70`. `overflow: hidden` on `.bento-card` clips the zoom to the card edge — that clean "peek into the product" feel. Text stays fully readable throughout.
  - **⚠️ Redeploy needed** to push to `use-bracket.com`.


- 2026-07-14 — **Iteration 34 — Cinematic cascade: FAQ, UseCases, Login, Step OutputCards**:
  - **FAQ page rewritten**: cinematic hero (`Questions, answered.` with gradient "answered"), `01/02/03/04` gradient numerals per category, Framer AnimatePresence accordion (chevron rotate + smooth height ease), ghost-glass FaqItem cards, radial hero-ambient wash + final CTA band with gradient headline.
  - **UseCases page rewritten**: cinematic hero (`For the people who take the call.`), gradient `01–05` numeral per row, tri-column card layout (identity | Pain+Win | In practice italic quote), radial signal-blue glow accent per row, motion fade-up staggers.
  - **Login enhanced**: `One door. / Email, then in.` headline with gradient tint on "Email, then in." (blue → sky). Custom display type sizing. Ghost-glass form card via updated `.card-linear`.
  - **Step OutputCards** get a **gradient signal-blue top highlight** (`::after` pseudo, 90deg linear gradient hairline from transparent → signal-blue → sky → transparent), reinforcing the cinematic language at the individual card level.
  - **⚠️ Redeploy needed** to push to `use-bracket.com`.



- 2026-07-14 — **Iteration 35 — Horizontal scroll math fix + ProjectFlow cinematic elevation**:
  - **Showcase blank-scroll — proper fix**: previous `vw` math (`-${(cards-1)*58}vw`) still overshot on desktop because the cards' `max-w-[620px]` cap makes each card only ~32vw at 1920px viewport (not 55vw). Replaced with **dynamic pixel-based measurement**: `ResizeObserver` on the strip → `scrollWidth - viewport + 40px buffer` → `useTransform` maps `scrollYProgress` to `[0, -travel]` in pixels. Container height also derived from measured travel (`travelVw * 0.85 + 100vh`). Last card ("Locked. Signed. Shipped.") now lands cleanly at the right edge across all viewport sizes (1280 / 1440 / 1920+). No more blank end.
  - **ProjectFlow cinematic elevation** (`ProjectFlow.jsx` + CSS):
    * New `.flow-ambient` fixed background: radial blue-signal wash top-left + secondary sky wash bottom-right + vertical black gradient. Matches Landing hero.
    * `.flow-grain` SVG-turbulence film-grain overlay (opacity 0.035, mix-blend overlay).
    * `.workbench-topbar` upgraded — larger padding (20/24px), rounded to 18px, backdrop-blur 14px + saturate 140%, stronger inset highlight + drop shadow. Radial gradient overlay (blue + sky).
    * `.workbench-num` gradient scaled up (32→44px, tri-stop blue/cyan/violet, text-shadow bloom).
    * `.workbench-celebration` chip: fatter padding, stronger border, blue box-shadow.
    * `StepShell` rewritten with **Framer Motion staggered entry** — top bar → previously → step body, `ease: [0.16, 1, 0.3, 1]`, 0.08s stagger. Respects `useReducedMotion`.
    * Step chapter title scaled up (`text-[24→32px]`), body kicker larger.
  - Both fixes verified with screenshots at 1920 / 1440 / 1280 viewports.

- 2026-07-14 — **Iteration 36 — Brand refresh · story section · CTA fix · AI rename**:
  - **New logo (`/logo-icon1.png` + `/logo-mark1.png`)**: replaced the black `{B}racket` wordmark with the user-attached gradient `{ }` bracket icon (blue→violet). Cropped from the raw PNG (688×179) to a tight 162×179 mark using PIL — near-white pixels made transparent so it sits cleanly on dark surfaces. `BracketMark` component rewritten: `label={false}` → icon only; `label={true}` → icon + Poppins-semibold "Bracket" wordmark rendered in JSX (color follows current surface).
  - **Hero image swap**: Landing hero backdrop switched from the moody circuit close-up (`photo-1518770660439-4636190af475`) to a painterly abstract wave (`photo-1618005182384-a83a8bd57fbe`). Reads as "creative chaos → structured form" — matches Bracket's core promise.
  - **"Start building." CTA truncation fix**: `WordReveal` used `pb-[0.05em]` which sliced italic descenders + "g" tail on giant sizes. Increased to `paddingTop: 0.15em` + `paddingBottom: 0.25em`. Italic + descenders now render cleanly at 128px.
  - **New Story section (above Pricing)**: 4-chapter grid (Origin / Mistakes / Now / Future) with color-coded accents (blue → red → green → violet), radial corner glow per card, `.liquid-glass` treatment, and Framer Motion staggered entry. Content: how Bracket started at 3am, what we did wrong (built a writing tool), where we are now (decision engine), what's next (client-side loop + memory layer).
  - **"Claude Sonnet 4.5" → "BRACKET AI"** replaced in all user-facing surfaces: `ProjectFlow.jsx` project header, `ProjectOverview.jsx` engine badge, `FAQ.jsx` training-policy answer. Backend keeps the actual model names — this is UI-only rebranding.


- 2026-07-14 — **Iteration 37 — Client sign-off flow polish + owner CTA + real-time**:
  - **RejectFlow scroll fix** (`ClientReview.jsx` + `index.css`): New `.review-reject-form` class adds `overflow-y: auto` + `overscroll-behavior: contain` so the concerns popup scrolls on short viewports.
  - **Owner-side CTA + modal** (`ClientReviewModal.jsx` new component): inline "concerns raised" panel replaced with a compact summary card + "View concerns & reply" CTA that opens a full-screen modal containing concerns, AI suggestions, reply thread, and composer. `AcceptedBadge`/`RejectedBadge` removed.
  - **Real-time polling**: `ProjectOverview.jsx` + `ProjectDocument.jsx` poll `/api/projects/{id}` every 6s while awaiting client action — owners see updates within ~7s without refreshing.

- 2026-07-14 — **Iteration 38 — Client email + PDF cleanup + marketing footer**:
  - **Mandatory client email** on accept + reject flows (`data-testid='review-signature-email'`). Backend `AcceptIn`/`RejectConfirmIn` now include `client_email: EmailStr`.
  - **Client receipt email** (`emailer.py` `send_client_receipt_email`): accept → mails signed PDF as base64 attachment; reject → mails concerns back as a paper trail.
  - **PDF `§` removed**: `H(s)` no longer prepends `\u00a7 ` to section headings.
  - **Marketing footer visibility**: Footer given `position: relative; z-index: 10` so `.marketing-ambient` (fixed z:0) no longer paints over it.

- 2026-07-14 — **Iteration 39 — File upload brief + persona-aware AI + cascading step edits**:
  - **File upload brief** (`POST /api/projects/upload-brief`, `Dashboard.jsx` "Attach file" button): PDF (`pypdf`), TXT (utf-8), PNG/JPEG (Gemini vision OCR). If sufficient (`extract_full_brief_from_paste` returns 6/9 fields), backend fire-and-forgets a chain of Steps 1→4 and lands the user on Step 5. Frontend polls `auto_advance_status` every 3s.
  - **Persona-aware master prompt** (`ai_engine.py` `SYSTEM_VOICE`): Bracket silently infers 1 of 5 personas (indie creatives / small agencies / in-house product / juniors / independent designers) and adapts voice + examples.
  - **Cascading step edits**: `POST /api/projects/{id}/reset-from-step/{step}` clears downstream outputs. `guardStepRework` helper in `ProjectFlow.jsx` shows a confirm dialog before proceeding.

- 2026-07-14 — **Iteration 40 — Smooth carousel drag + section blend + `{ }` → `< >`**:
  - **Smooth carousel inertia** (`Landing.jsx`): drag now tracks velocity and applies `raf` deceleration (friction 0.93) after release. Snap changed to `snap-proximity` so inertia doesn't fight snap points.
  - **Section edge-blend** (`index.css` `.section-blend`): Every landing `<section>` gets a matching `linear-gradient(var(--bg) → transparent)` fade at top + bottom (140px desktop / 96px mobile). No hard boundaries between sections.
  - **`{ }` → `< >`**: All decorative mono labels swapped across ClientReview, ClientReviewModal, ProjectDocument, ProjectOverview, ProjectFlow, ClaimProjects, AdminLogin, Footer, and the bracket loader `<...>`.

- 2026-07-14 — **Iteration 41 — Modal top-cut + dashboard dead-scroll (P0 regression fix)**:
  - **Modal top-cut** (`index.css` `.review-modal-overlay`): Root cause was `align-items: center` on the flex overlay clipping the panel's top when the modal was taller than the viewport (browsers won't let you scroll up to see the pushed-out portion). Fix: `align-items: safe center` + `margin: auto` on `.review-modal-panel`, and swapped `max-height: calc(100vh - 48px)` → `100dvh` for stable sizing on mobile browsers with collapsing address bars. Verified at 1440×900 and 1366×768.
  - **Modal truncation FINAL fix (2026-06)** (`ClientReviewModal.jsx`): The TRUE root cause — the modal was rendered inside `<main class="page-enter">`, whose `pageEnter` animation (`fill: both`) permanently retains `transform: translateY(0)` + `filter: blur(0)`, making `main` the containing block for the `position: fixed` overlay. The modal therefore centered against page content instead of the viewport. Fix: render the modal via `createPortal(..., document.body)` so it escapes all transformed ancestors. Verified at 1366×768 (panel y=24, fully in viewport) and 1024×560 (short viewport, no clipping, internal scroll works). NOTE for future modals: any `position: fixed` overlay rendered inside `.page-enter` MUST use a portal to document.body.
  - **Dashboard / Overview dead-scroll** (`index.css` `.dashboard-root`): `.hero-ambient::before` is a 1400px-tall absolute gradient inside `.hero-ambient` (`overflow: visible`) which extended past `.dashboard-root`, pushing `.app-shell-main`'s scroll height beyond the content. Swapped `overflow-x: clip` → `overflow: clip` on `.dashboard-root`. Both axes clipped, no scroll container created, internal scroll still works. `main_scrollHeight == main_clientHeight` after fix.



- 2026-06-15 — **Iteration 42 — Hero metrics: real data only, no placeholder flip-flop**:
  - **Bug**: First page load showed hardcoded placeholder numbers (128/47/92) before `/api/public/metrics` responded, so reloads flip-flopped between fake and real data depending on network timing.
  - **Fix (frontend, `Landing.jsx` `HeroMetrics`)**: Removed placeholder fallbacks entirely. Strip renders an empty spacer until real data arrives, then fades in and counts up to the real values only. Fetch sends `Cache-Control: no-cache`.
  - **Fix (backend, `server.py` `public_metrics`)**: Response now sets `Cache-Control: no-store, no-cache, must-revalidate` to prevent CDN/browser caching in production.
  - Verified via screenshot: hero shows exact live API values (26/34/90) on first load. NOTE: production needs a REDEPLOY to pick this up.

- 2026-06-15 — **Iteration 43 — Blocking "Applying changes" popup**:
  - **New** `ApplyingChangesOverlay.jsx`: non-dismissable full-screen popup (portal, no close button, no Escape, no backdrop-click) shown while `project.applying_changes` is true. Rotating stage messages every 9s, opaque panel (`rgba(10,11,13,0.97)`), `data-testid="applying-changes-overlay"`.
  - `ProjectDocument.jsx`: replaced the inline applying-changes banner with the overlay. `ProjectOverview.jsx`: added the overlay + `applying_changes` change-detection & completion toast in its 6s poll.
  - `ClientReviewModal.jsx` `applyChanges`: optimistically sets `applying_changes: true` so the popup appears instantly after clicking "Apply the changes"; removed the redundant toast.
  - Overlay auto-closes when the poll sees `applying_changes` flip false (success toast fires). Verified via screenshot: visible, survives Escape + backdrop click, 0 close buttons.

- 2026-06-15 — **Iteration 44 — Fix intermittent "AI engine error" on output generation**:
  - **Root cause**: every step-generation endpoint called the LLM exactly once via `ai_engine._run` — any transient provider error (429/5xx/overloaded), hung request, or malformed JSON surfaced a 502 to the user; reloading/resubmitting succeeded.
  - **Fix** (`ai_engine.py` `_run`): one automatic retry with a fresh chat session on ANY failure (timeout, provider error, JSON parse). Attempt budgets: 50s + 40s (+1.5s backoff) so the total stays under Cloudflare's ~100s proxy limit. `STEP_TIMEOUT_S` 70→50, new `STEP_RETRY_TIMEOUT_S=40`.
  - Verified: live framing call succeeds (14.5s); unit test proves recovery from a simulated first-attempt failure and clean raise after two failures.

- 2026-06-15 — **Iteration 45 — Mobile app experience (full treatment) + CTA truncation fix**:
  - **CTA fix** (`index.css` `.disc-btn`): `max-width:100%`, wraps + `margin-left:0` on ≤640px — "Show alternatives, trade-offs & risks" no longer truncated.
  - **PWA installable**: new `public/manifest.json` (standalone, start_url /app, 192/512 icons incl. maskable); `index.html` gains manifest link, `viewport-fit=cover, maximum-scale=1`, apple-mobile-web-app metas (black-translucent).
  - **Bottom tab bar** (`MobileTabBar.jsx`, rendered by `AppShell`): Projects / New (raised accent circle, focuses dashboard paste box) / Settings (+ Admin for admins). Shown ≤768px; sidebar fully hidden (`--sidebar-w:0`), main gets safe-area bottom padding.
  - **Bottom-sheet modals** (≤768px): `.review-modal-panel` + `.bracket-dialog` become full-width sheets anchored to bottom with `mobileSheetUp` animation + safe-area padding.
  - **Touch/no-web-artifacts**: tap-highlight removed, `touch-action:manipulation` on buttons/links, inputs ≥16px on mobile (no iOS zoom), `html,body{overflow-x:hidden}` on mobile (fix by testing agent — `.hero-ambient` 1100px glow caused real h-scroll on /login + marketing).
  - **Layout fixes**: grid blowout fixed via `grid-cols-1` base (`ProjectDocument.jsx` doc grid, `ProjectFlow.jsx` lg:grid-cols-3); `workbench-topbar` wraps on mobile (num 28px); dashboard paste-footer stacks with full-width CTAs; filter tabs horizontally swipeable.
  - **Tested**: iteration_34.json — 32/32 mobile checks pass at 390×844 (marketing, login, dashboard, overview, flow, document, public review, settings) + desktop regression at 1920×800 pass.

- 2026-06-15 — **Iteration 46 — Desktop CTA truncation (final)**: `.disc-btn` `margin-left:-12px` pushed the pill's left edge outside its `overflow:auto` parent (`.output-card--scrollable`), clipping the border + ↓ arrow on desktop. Removed the negative margin entirely (also fixes ↑ HIDE). Removed 2 stray `}` at end of index.css that broke compilation. Verified: btnLeft == parentLeft, no clipping at 1920px.

- 2026-06-15 — **Iteration 47 — Mobile logout + Install Bracket popup**:
  - **Dashboard mobile logout** (`Dashboard.jsx` header): round `LogOut` icon button, `md:hidden`, `data-testid="dashboard-mobile-logout"` — signs out and leaves the app (sidebar+logout hidden on phones made signout unreachable).
  - **InstallPrompt.jsx** (mounted globally in `App.js`): shows on EVERY page load on phones (≤768px, no dismissal persistence), skipped when already installed (standalone). Android/Chrome: captures `beforeinstallprompt`, "Install app" button calls native prompt → icon lands on home screen. iOS: Share → "Add to Home Screen" 2-step instructions (Apple forbids programmatic install). Card floats above the tab bar (`.install-prompt` CSS block).
  - Verified: logout works (→/login), Android path (synthetic BIP event) shows card + prompt + closes, iOS UA path shows steps, reappears after reload.

- 2026-06-15 — **Iteration 48 — Installed-app launch + all-device responsiveness**:
  - **Installed app start screen**: verified (no code change needed) — manifest `start_url:/app` + ProtectedRoute means the installed app opens on the login screen when logged out, dashboard when logged in; mobile web untouched.
  - **Device matrix audit** (320/360/390/430 phones · 768/820/834/1024 tablets): zero horizontal overflow on landing, dashboard, flow. Fixes: ① ≤374px — dashboard paste-footer CTAs stack full-width (were clipping at 320px); ② ≤1100px — `.step-pipeline` journey rail becomes horizontally swipeable instead of clipping the last milestones on iPads.

- 2026-06-15 — **Iteration 49 — Login scroll fix + Web Push notifications + standalone polish**:
  - **Login scroll**: `.hero-ambient` (bottom:-800px + 1400px ::before) extended body scroll by ~800px. Fix: `overflow-clip` on login root + tightened `py-8 md:py-10`. Desktop sh==ch (no scroll), mobile no scroll.
  - **Web Push (VAPID)**: new `backend/push_notify.py` (pywebpush, prunes dead subs on 404/410, runs in thread). VAPID keys in `backend/.env` (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_CLAIMS_SUB). Endpoints: GET `/api/push/vapid-public-key`, POST `/api/push/subscribe|unsubscribe` (auth, upsert by endpoint). Triggers: client accept, client reject, apply-changes finished, auto-build (upload-brief) finished — all push to project owner with deep-link URLs.
  - **Frontend**: `public/sw.js` (push + notificationclick handlers), `lib/push.js` `enablePushNotifications()` called from `AppShell` when user present (registers SW, requests permission, subscribes, POSTs subscription). iOS: works only for the installed PWA (16.4+); silent no-op otherwise.
  - **Standalone**: `.back-to-site` hidden via `@media (display-mode: standalone)` on login header.
  - Verified: subscribe endpoint stores sub, `send_push_to_user` pushes + prunes fake endpoint gracefully; real delivery needs a physical device (headless denies Notification permission). Fixed pre-existing `client.close()` duplicate-line IndentationError at server.py shutdown handler.

- 2026-06-15 — **Iteration 50 — iOS install CTA**: iOS install popup now shows the same "Install app" primary CTA as Android; tapping reveals a numbered 3-step visual guide (Share → Add to Home Screen → Add) with a note that Apple only permits installs via the Share menu. Verified via iPhone UA emulation: CTA visible, guide expands on tap.

- 2026-06-15 — **Iteration 51 — iPad logout alignment**: dashboard mobile logout wrapper now `flex w-full items-center justify-between` + button `self-center` — icon sticks to the right edge and is vertically centered with the greeting. Verified at 744px (iPad mini) and 390px: button centerY == greeting centerY, flush right.

- 2026-06-15 — **Iteration 52 — Suppress install popup when app installed**:
  - `InstallPrompt.jsx`: ① Chrome/Android — `navigator.getInstalledRelatedApps()` check (manifest gains `related_applications` webapp entry) + `beforeinstallprompt` inherently never fires when installed. ② iOS — no installed-state API exists in browsers, so once the user opens the install guide we set `localStorage bracket.ios.installed=1` and stop showing the popup thereafter. Standalone mode was already excluded.
  - Verified: iOS popup → guide → flag → reload = no popup; Android with installed related app + synthetic BIP = no popup.

- 2026-06-15 — **Iteration 53 — iOS status bar bleed fix**: `apple-mobile-web-app-status-bar-style` switched `black-translucent` → `black` (solid, app content starts below the clock/battery bar; matches #08090A). Plus `@media (display-mode: standalone)` safe-area-inset-top padding on `.app-sidebar`, `.app-shell-main`, `.marketing-header`, `.flow-header`, `.cinema-nav` for notched devices. NOTE: iOS bakes this meta at install time — users must remove + re-add the app to Home Screen after redeploy.

- 2026-06-15 — **Iteration 54 — Landscape tablet safe-area strengthening**: standalone CSS block extended with `safe-area-inset-left/right` padding on `.app-shell`, `.marketing-header`, `.cinema-nav` for landscape notch intrusions. (User's screenshots were from the pre-redeploy build — the iteration-53 top-inset fix + this one require REDEPLOY; the solid status-bar meta additionally requires remove/re-add of the Home Screen icon.)

- 2026-06-15 — **Iteration 55 — Nav bars never scroll**: `.cinema-nav` + `.marketing-header` switched sticky → `position: fixed` (compensating `pt-16` on MarketingLayout main, `pt-[92px]/[100px]` on Login main). `.app-sidebar` `overflow-y:auto` → `hidden` (no internal scroll). Global `html,body{overscroll-behavior-y:none}` kills rubber-band bounce that drags chrome on iOS/Android. Verified: landing nav y=0 before/after scroll, sidebar y=0 after main scroll, login fits viewport, dashboard layout intact.

- 2026-06-15 — **Iteration 56 — iOS splash screens**: generated 34 `apple-touch-startup-image` PNGs (17 devices × portrait+landscape: iPhone SE→16 Pro Max, iPad mini→12.9" Pro) — Bracket diamond centered on #08090A, in `/public/splash/` (~1.5MB total, PIL-generated). 34 device-matched `<link>` tags inserted in index.html after the apple-title meta. Verified: links served in HTML, splash PNG loads 200. NOTE: like the status-bar meta, iOS bakes splash at install time — remove/re-add Home Screen icon after redeploy.

- 2026-06-15 — **Iteration 57 — Sidebar scroll (landscape tablet) hard lock**: `.app-shell`/`.app-shell-main`/`.app-sidebar` heights 100vh → `100dvh` + `body:has(.app-shell){height:100dvh; overflow:hidden; overscroll-behavior:none}` — the page itself can never scroll on app routes (iOS landscape 100vh > visible height caused body scroll dragging the sidebar). Verified at 1180×820: body not scrollable, scrollY stays 0, sidebar sh==ch, wheel over sidebar doesn't move it.

- 2026-06-15 — **Iteration 58 — iOS splash removed** (user request): deleted all 34 `apple-touch-startup-image` links from index.html and the `/public/splash/` directory. Verified: 0 references served.

- 2026-07-20 — **Iteration 59 — AI step speedup (fixes production Cloudflare 524)**:
  - **Problem**: On live site, "Decide" (Step 3) could take 25–48s (Haiku extract 5–8s + Sonnet 4.5 step 20–40s + occasional retry) — Cloudflare 100s cutoff surfaced as "The origin web server did not respond" error.
  - **Fix 1 — Model swap**: `MODEL_MAP["claude"]` switched from Sonnet 4.5 → **Haiku 4.5** for step outputs (3–5× faster, comparable JSON quality on structured prompts). Sonnet still available via `engine="sonnet"`.
  - **Fix 2 — Extraction folded**: `run_situation_framing / run_context_compression / run_decision_engine` now accept optional `raw_paste` and extract+reason in a single call. Server step endpoints no longer make the separate `extract_*_from_paste` Haiku call. Saves one round-trip (~5–8s) per step.
  - **Fix 3 — Parallelism**: Step 1 now runs `run_situation_framing` and `generate_project_title` concurrently via `asyncio.gather` (was sequential). Saves ~3–5s when a project title is being generated.
  - **Fix 4 — Timeout tightening**: `STEP_TIMEOUT_S` 50→35s, `STEP_RETRY_TIMEOUT_S` 40→20s. Worst-case wall-clock ~56s (was ~92s) — comfortably under Cloudflare's 100s cutoff.
  - **Measured on preview** (support account, real paste): Step 1 **6.8s**, Step 2 **7.1s**, Step 3 **18.8s** — output quality intact ("Pass. Redesign the brief or walk." on the Goa wedding scenario).
  - Files: `backend/ai_engine.py`, `backend/server.py`. No frontend changes needed.

- 2026-07-20 — **Iteration 60 — Step 1 one-shot jump to Step 5 (rich brief detection)**:
  - **User ask**: "If the first chatbox already has all the info Bracket needs, take the user straight to Step 5. Otherwise continue with other steps."
  - **Backend** (`server.py::step_situation`): when raw_paste is present on the FIRST Step-1 submission (no existing framing), Bracket now runs `auto_build_from_brief` (two parallel Haiku calls, ~20–27s). If the paste is genuinely rich, the response comes back with **step=5, `auto_advance_status="advanced"`, and framing / context / decision / artifacts all populated**. If not, framing is reused from the auto-build result and the user continues to Step 2 normally.
  - **Sufficiency gate** (`ai_engine.py::auto_build_from_brief`) — stricter to prevent false positives on thin briefs: (1) all four output blocks present, (2) inputs are broad (situation + at least one of context/decision dimensions extracted from the paste — not confabulated), (3) model self-reported `clarity_score ≥ 60`. Applies to both step-1 one-shot AND the existing upload-brief flow.
  - **Frontend** (`ProjectFlow.jsx::Step1`): after the situation POST returns, if `data.step === 5` with artifacts + decision present, `onDone(5)` fires 700ms later — user's Step-1 "done" checkmark flashes then they land directly on the locked document. Otherwise flow behaves as before (jump to Step 2).
  - **Measured on preview**: thin brief ("redesign landing page") → clarity 15 → **step=2, 16s**. Rich brief (Goa wedding, all inputs) → clarity 72 → **step=5, 26.8s**.

- 2026-07-20 — **Iteration 61 — Targeted follow-up questions on Steps 2 and 3**:
  - **User ask**: "After 1st chat, ask questions in step 2 and 3 which are required."
  - **Backend** (`ai_engine.py::auto_build_from_brief`): prompt A extended to also produce `open_questions: {context, decision}` — 2–4 sharp, project-specific questions per step derived from the actual gaps in the paste (not generic templates). Sanitized (trim, ≤200 chars, force `?` suffix, cap 4).
  - **Persistence** (`server.py::step_situation`): when the one-shot falls through to Step 2 (not-sufficient), `open_questions` is saved on the project doc. Model (`models.py::ProjectOut`) exposes the field.
  - **Frontend** (`ProjectFlow.jsx`): new `OpenQuestions` component — subtle signal-tinted callout with numbered list. Renders above the paste input on Step 2 when `project.open_questions.context` is non-empty and Step 2 output doesn't yet exist; same for Step 3 with the `decision` list. Hides once the step generates its own output.
  - **Verified on preview**: paste "Client wants a landing page redesign. Bombay Sweet Shop reference. No deadline yet." → Step 2 questions include "What's the client's actual business…", "When do they need this—hard deadline or exploratory?", "Looking at Bombay Sweet Shop, what specifically are they drawn to—visual style, structure, interaction?"; Step 3 questions include budget/revisions, scratch-vs-existing, and stakeholder count. Both screenshotted and rendering correctly.

- 2026-07-20 — **Iteration 62 — Skip Step 1 UI + clickable follow-up questions**:
  - **User ask 1**: "User should not land directly on step 1, instead show a subtle popup showing loading and then if bracket have all the things, take user to step 5 else, continue with next steps."
  - **User ask 2**: "Wire the questions to be clickable — tapping a question could auto-insert it as a prompt line in the paste box so the user just types the answer under it."
  - **Loading overlay** — new `frontend/src/components/AutoBuildOverlay.jsx`: subtle portal-mounted modal (BRACKET IS THINKING · "Reading your brief…" · rotating stages every 6s) shown while the Step-1 auto-build pipeline runs. Non-blocking, no close button, dismisses when the pipeline completes.
  - **Auto-route** (`ProjectFlow.jsx::Step1::runInternal`) — new `opts.autoRoute` flag: when the paste came from the Dashboard hero (via sessionStorage) OR the URL sample param, the overlay shows and after completion the user is routed to Step 5 (rich brief) or Step 2 (thin brief) automatically — they never see the Step 1 workbench. Manual Step-1 form submits keep the previous behavior (stay on Step 1 to inspect framing).
  - **Clickable questions** (`OpenQuestions` component): each question is now a full-width button. Tapping calls `onPick(q)` which Step 2 / Step 3 wire to append `Q: <question>\nA: ` to their paste box, focus the textarea, drop the caret at end, and scroll to bottom. Multiple taps stack (double newline separator). Small helper text "Tap a question to answer it in your paste below." only visible when `onPick` is provided.
  - **Verified on preview**: fresh project with thin paste → overlay visible for ~15s → auto-routed to Step 2 (skipping Step 1 UI entirely) → clicking Q1 then Q2 stacked both prompts into the textarea correctly with focus/scroll on the bottom.

- 2026-07-20 — **Iteration 63 — Prominent pitch-metrics board in admin panel**:
  - **User ask**: "Add these data to admin panel [9 metrics list]. It should look prominent."
  - **Backend** (`server.py`): new `GET /api/admin/pitch-metrics` computes: registered_users (excludes guests), projects_created, documents_locked_shared, client_accept_rate, weekly_active_users (last-7d `last_seen_at`), retention_4w (28-day cohort × 28-day activity), organic_paid_split (from `sessions.utm_medium` and `source_bucket`). NPS + notable_users read from a single `admin_config` document (`_id: pitch_metrics`).
  - **Backend PUT** `/api/admin/pitch-metrics/config`: admins edit NPS (-100..100) and up to 12 notable users (name, role, optional logo_url). Validated + sanitized server-side.
  - **Frontend** (`AdminAnalytics.jsx`): new `PitchMetricsBoard` component mounted as the FIRST section of the admin analytics tab. Prominent styling — 6 large color-coded stat cards (Registered / Projects / Locked&Shared / Accept-rate / WAU / 4-week retention) followed by 3 secondary cards (NPS with tone-based color scale, Organic/Paid % bar with legend, Notable Users list with monogram avatars). Header "PITCH SNAPSHOT · The numbers investors care about." with Refresh button.
  - **Inline editor** — `PitchConfigModal`: click any Edit button (NPS or Notable Users) → full modal with numeric NPS field + repeatable rows (name / role / logo URL) with add/remove. Saves via PUT.
  - **Verified end-to-end**: logged in as admin, saw all 6 auto-metrics render (85 users, 120 projects, 25 shared, 80% accept, 10 WAU, 50% retention, 99.5%/0.5% organic-paid), opened editor, saved NPS=42 and 2 notable users (Rukmini Poddar, Yellow Slice Studio) — both surfaced correctly after save.

- 2026-07-20 — **Iteration 64 — NPS survey email campaign (Resend + interactive HTML + auto-compute)**:
  - **User ask**: "Send email to all the registered users with the survey for this NPS score, the message should be user-friendly, interactive, follow Bracket's design guidelines, and have Bracket's logo too."
  - **Email design** (`emailer.py::send_nps_survey_email`): Dark #08090A background, Bracket diamond logo (`/logo-diamond.png`) at top, mono `< BRACKET · ONE QUESTION >` chip in signal blue #5E6AD2, centered headline "How likely are you to recommend Bracket to a friend?" (blue accent on brand word), 11 tap-friendly rating buttons in a single row (colored red/orange/green for detractor/passive/promoter), NOT LIKELY / EXTREMELY LIKELY legend, "the next page has a text box" copy, mono footer. Poppins + JetBrains Mono. Fully on-brand.
  - **Backend campaign** — new `POST /api/admin/nps/send-campaign` (admin only): iterates registered users (excludes guests, excludes already-answered by default), fires emails via `resend` with 350 ms pacing between sends, logs the run to a `nps_campaigns` collection. `test_only` flag sends only to the admin. Returns targeted count immediately, delivery runs as `asyncio.create_task`.
  - **Public endpoints**:
    - `GET /api/nps/submit?u=<user_id>&s=<0-10>&t=<token>` — HMAC token check, upserts to `nps_responses` (score, bucket, timestamps), returns a dark-themed thank-you HTML page with the score badge, tone-appropriate copy (detractor "Something's off. Tell us the one thing that would fix it." / passive / promoter), and a comment textarea.
    - `POST /api/nps/comment` — accepts the native HTML form submit from the thank-you page and stores the free-text comment on the same response doc. Returns a "Got it — thank you" final state.
  - **Auto-computed NPS** — `admin_pitch_metrics` now derives NPS from `nps_responses` when at least one exists ((promoters − detractors)/total × 100). Falls back to the manual `admin_config` value. Response includes `nps_source: "responses" | "manual" | "none"` and `nps_responses_count` so the UI can label the number "From N responses".
  - **Frontend send button** — `NpsCard` gains a "Send NPS survey →" CTA that calls the campaign endpoint after a confirm() prompt. Refreshes the board 3s later so results start showing.
  - **HMAC signing** — `_nps_token(user_id)` = first 16 chars of HMAC-SHA256(JWT_SECRET, user_id). Prevents randoms from ballot-stuffing the score without needing per-invite storage.
  - **Verified end-to-end** on preview: sent test campaign (test_only=1) → 1 email queued; simulated 5 responses via signed URLs → NPS auto-updated to 80 ("From 5 responses · World-class."); thank-you page + email HTML both render on-brand with diamond logo, correct color-coded rating buttons, and promoter-specific follow-up copy.

- 2026-07-20 — **Iteration 65 — NPS deep view + 24h cool-down + live campaign progress** (later removed): See earlier session log; cool-down was rolled back in iteration 65b per user request. Delete-response endpoint added (iteration 65c).

- 2026-07-20 — **Iteration 68 — Publish Log + before/after comparison**:
  - **User ask**: Compare data from before and after a particular publish. Track visitor→signup, signup→first-project, first-project→locked-doc, avg time to first doc, avg steps completed. 14-day default window. Chart annotations.
  - **Backend**: new `POST/GET/DELETE /api/admin/publishes` for the release log, and `GET /api/admin/publishes/{id}/compare?window_days=N` for the comparison. Default window = **14 days** (matches investor-story recommendation).
  - **Funnel metrics in `_metrics_in_window`**: `visitor_to_signup_pct` (signups / sessions), `signup_to_first_project_pct` (of users signed up in window, how many have any project), `project_to_locked_pct` (of projects created in window, how many reached `share_status ≠ 'none'`), `avg_time_to_first_doc_min`, `avg_steps_completed`.
  - **Delta table** returns 12 metrics with `pct_change`. Each row is tagged `kind: "pct" | "num" | "lower_better"` so the frontend inverts the arrow color for time-to-first-doc (a decrease is good).
  - **Frontend** (`PublishLogPanel`): 2-column layout — releases list (add / select / delete, hover-to-remove) + comparison table with `DeltaValue` component (before → after + colored ↑/↓/→ arrow). Window dropdown (7/14/21/30/60 days). "Log publish" CTA opens an inline form (name / description / optional datetime).
  - **Verified on preview**: created "v0.9.4 · NPS launch" 5 days ago → comparison table populated correctly with 14-day windows on either side; delta arrows and % changes rendering right (Sessions 182→10 = −94.5% red, Avg steps completed 1.6→3.6 = +125% green, NPS responses 0→5 = +100% green). Screenshot captured.

- 2026-07-20 — **Iteration 67 — Product signals row (activation + engagement + retention)**:
  - **User ask**: Add average time signup→first document, % activated in 10 min, avg projects per active user, returning users (7d/30d), and avg session duration.
  - **Backend** (`_compute_product_signals` helper): iterates users, joins to earliest project per user_id for activation math; counts returning users (signup >Nd ago AND last_seen within past Nd); avg session duration = mean of (`last_seen_at − first_seen_at`) across all sessions.
  - **Response fields** added to `/admin/pitch-metrics.product_signals`: `avg_signup_to_first_doc_minutes`, `pct_activated_10min`, `avg_projects_per_active_user`, `returning_users_7d`, `returning_users_30d`, `avg_session_duration_seconds`, plus sample counts for context.
  - **Frontend**: new `ProductSignalsRow` component + `formatDuration()` helper render a 5-card row directly below the primary pitch KPIs. Cards use the existing `PitchStat` component for visual consistency (color-coded, large tabular-nums), values format nicely (`4h 35m`, `44.7%`, `12`, `4 / 1`, `37m 9s`).
  - **Verified**: All 5 metrics computed correctly on live preview data — 40 users with a first document, 38 activated within 10 min (44.7%), 12.0 avg projects per 7d-active user, 4 returning-7d / 1 returning-30d, avg session 37m 9s across 186 sessions. Screenshot captured.

- 2026-07-20 — **Iteration 66 — Website Analytics (traffic + geo + click heatmap) + retention fix**:

  - **User ask**: Lifetime website analytics on admin panel (total sessions, requests/page views, locations, how many visitors, from where), multiple time-range filters (Yesterday, Last 7 days, etc.), heatmaps, real-time updates, and corrected 4-week retention %.
  - **Session tracking upgraded** (`server.py::/public/track/session`): now captures visitor IP from `X-Forwarded-For`, `CF-Connecting-IP`, or `X-Real-IP`, increments `page_views` on every ping, and fires an async background `_ensure_geo_for_ip()` task that resolves the IP to country/city via free ip-api.com and caches the result in a new `geoip_cache` collection (indefinite cache — one lookup per unique IP).
  - **Click tracker** — new `POST /api/public/track/click` endpoint stores normalized (x_frac, y_frac) click positions to a new `click_events` collection with viewport size and target-element tag (e.g. `button[cta-primary]`).
  - **Frontend tracker** — new `frontend/src/lib/analyticsTracker.js` + `useAnalyticsTracker()` hook mounted globally in `App.js`. Fires a session ping on every route change AND records every user click (throttled to 200 ms). Replaces the stale, broken `/public/track` call that was previously in Landing.jsx.
  - **New admin endpoints**:
    - `GET /admin/website-analytics?range={yesterday|7d|30d|90d|lifetime}` — returns traffic KPIs (sessions/visitors/page views/logged-in visits), daily series, top pages, top sources, top countries (with lat/lon), and unresolved-IP count.
    - `GET /admin/heatmap/pages?range=…` — list of pages with click counts.
    - `GET /admin/heatmap?path=&range=…` — up to 5000 click events with normalized coords + tag for a given page.
  - **Frontend admin panel** — new `WebsiteAnalyticsPanel` (mounted below the NPS deep view). Sections: RangePicker (5 presets), 4 KPI cards, Top Countries with gradient bars, Top Pages table, Top Traffic Sources grid, and a **Click Heatmap** with a page-selector dropdown and a scaled canvas rendering red radial-glow dots at each click position. Refresh button + hourly auto-refresh timer.
  - **4-week retention fix** — was "% of 4-week-old users active in past 28 days" (nearly always high). Now "% of 4-week-old users active in past 7 days" — a real stickiness metric. Changed from 100% → 50% on the current dataset (accurate).
  - **Verified on preview**: session ping with `X-Forwarded-For: 8.8.8.8` → session stored with IP → background geo lookup resolved to `United States/Ashburn/39.03,-77.5` → country appeared on the admin panel. 3 test clicks rendered as red dots at correct positions on the heatmap canvas. Range filter tested: switching to "7d" instantly filtered Total Sessions 185 → 7. Screenshots captured.

  - **User ask**: "Should be able to see the email sending queue in Admin panel, and detailed NPS view (how many mail sent/failed/queued, how many responded, etc.) and the CTA should be disabled for 24 hours after sending the mail."
  - **24-hour cool-down** — `POST /admin/nps/send-campaign` now returns **HTTP 429** with a friendly "Next campaign available in Xh Ym" message when a full (non-test) campaign was fired < 24 h ago. `test_only=true` calls always bypass the cool-down for self-checks.
  - **Live campaign progress** — the send task now writes progress to the `nps_campaigns` doc every 5 emails (or on the last one), updating `sent`, `failed`, `queued`, `status ("running" → "completed")`, `updated_at`, `completed_at`. Campaign doc is upserted BEFORE the task starts so the UI can poll immediately.
  - **New detail endpoint** — `GET /admin/nps/detail` returns: `campaigns[]` (last 30 with live progress), `cooldown_remaining_seconds`, score `histogram[0-10]`, `totals { responses, promoters, passives, detractors, nps }`, `response_rate` (responses / total_sent), `total_sent`, `latest_responses[]` (last 20 with score + comment + first name, no email).
  - **Frontend** (`AdminAnalytics.jsx`) — new `NpsDetailPanel` mounted below the pitch board:
    - Header "NPS · deep view · Every score, every campaign, every comment." with response count, response rate, campaign count, and inline cool-down status
    - Blue-tinted **live-progress banner** with animated gradient bar (only when a campaign is running), auto-polls every 4 s
    - Two-column: **Score distribution histogram** (0-10 bars, promoter/passive/detractor legend, bars scaled to max) + **Latest responses list** (score badge + first name + comment/"No comment" italics)
    - **Campaign history table** — Started / Type (Test | Full) / Targeted / Sent (green) / Failed (red if > 0) / Queued (amber) / Status (with animated pulse for running rows)
    - Collapse / Refresh buttons; auto-poll only when a campaign is running; per-minute re-poll during cool-down so the countdown updates without user action
  - **CTA disabled state** — `NpsCard` reads `cooldownSeconds` from the detail endpoint and swaps the label to **"Next in Xh Ym"** with `disabled=true`, `cursor: not-allowed`, and 0.5 opacity when > 0.
  - **Verified end-to-end on preview**: full campaign fired → HTTP 200 (83 targeted) → immediate re-tap returned HTTP 429 "Next campaign available in 23h 59m" → `test_only=true` still bypassed the gate → detail endpoint showed `cooldown_remaining_seconds: 86397`, live histogram, running campaign with real-time `sent/failed/queued` counts, and CTA label flipped to "Next in 23h 58m" with `disabled=true`. Screenshots captured.



- 2026-07-20 — **Iteration 69 — Dashboard-owned structuring modal + Step-1 landing for thin briefs**:
  - **User ask**: "When a user types in the dashboard text box and hits the CTA, they should see a popup just like the delete popup — non-dismissable — showing loading. If Bracket determines the info is enough, land directly on Step 5. Else, land on Step 1 and continue from there. Bracket should determine what follow-up questions it needs based on the first input to build the document in Steps 2 and 3."
  - **New component** (`frontend/src/components/StructuringModal.jsx`): non-dismissable modal styled with the same `bracket-dialog-overlay` + `bracket-dialog` frame as the delete-confirm dialog. No close button, no cancel button, ESC is captured and swallowed. Shows the shared spinner + `BRACKET IS THINKING` kicker + rotating stage copy every 5.5s.
  - **Dashboard flow rewrite** (`Dashboard.jsx::structureBrief`): the AI structuring pass now runs from the Dashboard itself so the routing decision happens before navigation. Sequence: `POST /projects` → `POST /projects/{id}/situation` (120s timeout) → inspect response → navigate to `/project/{id}/flow?step=5` when the response has `step === 5 && artifacts && decision` (rich one-shot) or `?step=1` otherwise (thin — start from Step 1 so the user can inspect the framing before continuing). Modal stays open the entire time and is unmounted only when the Dashboard component unmounts on navigation. On failure, if the project was already created we still land the user on Step 1 so they can retry manually.
  - **Behaviour change**: thin briefs used to auto-advance the user to Step 2 immediately. They now land on Step 1 with the framing pre-computed (server-side already stores it). Steps 2 and 3 still surface the AI-generated `open_questions` via the existing `OpenQuestions` component — no backend change needed.
  - **Cleanup**: removed the `sessionStorage[bracket:pending-paste:{id}]` hand-off (Dashboard no longer defers the AI call to Step 1). The read in `ProjectFlow.jsx::Step1` is left intact as a harmless no-op fallback.
  - **Verified on preview**: (1) thin brief "Client wants a website for their coffee shop. Budget unclear. Timeline maybe 4 weeks." → modal appeared → survived a keyboard `Escape` press → landed at `?step=1` with project auto-titled "Coffee Shop Website" and framing already visible. (2) rich SaaS landing brief → modal appeared → landed at `?step=5` "Lock the call" with all four upstream steps checkmarked and the stance drafted. Screenshots captured for both flows.
  - **Iteration 69b — File-upload flow unified with paste flow**: user reported that uploading a document (via **Attach file**) still landed them on Step 1 with a "Bracket is building your project from the brief" banner instead of the new modal. Fixed by (a) making `handleFileUpload` flip `submitting` so the same `StructuringModal` mounts, then polling `GET /projects/{id}` every 2s (max 150s) until `auto_advance_status !== "pending"`, then routing to `?step=5` if `auto_advance_status === "advanced"` else `?step=1`. (b) Backend fix in `upload_brief::_auto_advance_task`: when the one-shot build returns `sufficient=false`, we now also persist `framing`, `open_questions`, and bump `step` to 2 (matching the paste flow's thin-brief behaviour) so the user lands on Step 1 with the reframe output ready instead of a "PENDING" placeholder. Verified on preview: rich `.txt` brief upload → modal → land at `?step=5` "Lock the call" with project auto-titled "Loop Coffee Brand Launch"; thin `.txt` brief upload → modal → land at `?step=1` with framing visible ("Rohit has a hard opening date but hasn't decided what the website needs to do…"), clarity/tensions pills populated, Continue CTA ready.

- 2026-07-20 — **Iteration 70 — Fix Cloudflare 524 under concurrent load (`SOMETHING BROKE` on Step 3)**:
  - **User report**: screenshot of Step 3 (Decide) showing "SOMETHING BROKE — The origin web server did not respond to Cloudflare within the allowed time. This typically means the origin is overloaded or a backend process is taking too long." User asked: fix it so it never comes back, even with 100s of users at once.
  - **Root cause**: every LLM call ran through `asyncio.to_thread(...)`, which uses Python's shared default `ThreadPoolExecutor` (only `min(32, cpu+4)` workers, and shared with PDF parsing, Motor, image OCR, etc.). Each LLM request blocks a worker thread for 10–60s waiting on Anthropic. Under concurrent load the pool saturated → new requests queued silently → because `asyncio.wait_for` cannot cancel a thread that hasn't been dispatched yet, queued requests waited > 100s → Cloudflare's origin-timeout wall fired, rendering the scary 524 page instead of our own error path.
  - **Backend fix** (`backend/ai_engine.py`): (a) new dedicated `ThreadPoolExecutor(max_workers=64, thread_name_prefix="bracket-ai")` — isolated from every other blocking IO in the app; (b) a lazily-initialised `asyncio.Semaphore(48)` that caps concurrent AI calls slightly below the pool size, guaranteeing headroom; (c) new `_dispatch_llm_call(chat, message, timeout=…)` choke-point routes every LLM invocation through both — `_run`, `_run_fast`, and `extract_text_from_image` now share it; (d) when the semaphore stays full for > 8s we raise `AIBackpressureError` → mapped by a new `@app.exception_handler` in `server.py` to HTTP 503 with `Retry-After: 5`. Six step-endpoints (`/situation` × 2, `/context`, `/decision`, `/artifacts`, `/share/{token}/reject/preview`) got an explicit `except AIBackpressureError: raise` line ahead of their generic `except Exception` so the app-level handler wins.
  - **Frontend fix** (`frontend/src/lib/api.js`): axios response interceptor now auto-retries HTTP 503 responses tagged `code: "ai_backpressure"` up to 2 times with an exponential backoff derived from the `Retry-After` header (+ 0-800ms jitter). Users never see the error at all — the request just takes ~3-5s longer.
  - **Verified under load** with `/tmp/load_test.py`: 100 concurrent `/decision` calls against the preview server → 48 × HTTP 200 (18-26s), 52 × HTTP 503 backpressure (all under 1s, all with `Retry-After`), **0 uncategorized errors, 0 Cloudflare 524s**, wall time 25.6s. Zero error-level log spam on backpressure. Regression happy-path (single request through /situation → /context → /decision) still returns 200 in 12.5s with a real recommendation.




- 2026-07-20 — **Iteration 71 — Fix "Step 2 comes out blank" + defensive 500 fallback for CF 520**:
  - **User report**: "clicking on continue in Step 1, Step 2 comes out blank" + separate 520 error on production.
  - **Root cause of blank Step 2**: the Step-1 Continue button used `onClick={onDone}` which forwards the React SyntheticEvent as the first argument to the parent handler. Parent was `onDone={(nextStep) => setCurrentStep(Math.max(2, nextStep || 2))}` — `SyntheticEvent || 2` evaluates to the truthy SyntheticEvent, then `Math.max(2, SyntheticEvent)` coerces to number → `NaN`. `setCurrentStep(NaN)` then made `{currentStep === 1}`, `{currentStep === 2}`, … all false, so no step body rendered at all — a completely blank main pane.
  - **Fix** (`frontend/src/pages/ProjectFlow.jsx`): (a) the button now explicitly calls `onDone()` (no args) with `type="button"`; (b) the parent handler ignores non-numeric args: `const target = typeof nextStep === "number" ? nextStep : 2; setCurrentStep(Math.max(2, target));`. Belt-and-suspenders — a future caller that passes an event again won't blow up either.
  - **Defensive safety net for CF 520** (`backend/server.py`): added an `@app.exception_handler(Exception)` catch-all that logs and returns a well-formed 500 JSON `{"detail":..., "code":"internal_error"}` for any unhandled exception. HTTPException and AIBackpressureError re-raise so their dedicated handlers still win. This guarantees Cloudflare always sees a clean, complete origin response — never a truncated/invalid one that would surface as a 520 page.
  - **Verified on preview**: clicking Continue on Step 1 → Step 2 renders cleanly with the "Simplify" chapter, "Previously" rail from Step 1, three AI-generated targeted open questions, paste box, and Back / Compress buttons. Backend restart clean, `/auth/login`, `/auth/me`, and unknown routes all respond with correct status codes.
  - **Note to redeploy**: the previous iteration-70 fix for CF 524 is only live on **preview**. The user's production 520 error is most likely the same 524 root cause manifesting as 520 in some CF paths (RST while the origin thread pool is starved) — they need to redeploy production to pick up the fix. This iteration also ships as part of that redeploy.

- 2026-07-20 — **Iteration 68 — Publish Log: per-day normalization**:
  - **User ask**: "I want this data to be per day, or per user — currently it's pointless to compare last 60 days vs just 4 days of deployment."
  - **Backend** (`server.py::admin_compare_publish`): compute fractional-day length of each window (`before_days`, `after_days`) from the ISO timestamps. New helper `_per_day(k, raw, days)` divides sum-based metrics (`sessions`, `page_views`, `new_signups`, `new_projects`, `docs_shared`, `nps_responses`) by their respective window's days. Rates (`*_pct`, `client_accept_rate`) and averages (`avg_time_to_first_doc_min`, `avg_steps_completed`) are already normalized and pass through untouched. Response now includes `before_window.days`, `after_window.days`, and per-delta `before_raw`/`after_raw` for transparency. Delta labels updated to "Sessions / day", "Page views / day", etc., and given new `kind: "per_day"`. `pct_change` is computed on the normalized values so the direction is mathematically honest.
  - **Frontend** (`AdminAnalytics.jsx::PublishLogPanel`): sub-header explains that sum metrics are shown per day so unequal windows compare fairly. Comparison card header now shows `(14d)` / `(5.02d)` next to each date range. `DeltaValue` fmt gives per-day values extra precision (2 decimals when < 10, 1 decimal 10–100, 0 above 100).
  - **Verified on preview**: 14-day window comparison for `v0.9.4 · NPS launch` now displays "Sessions / day 13 → 2.79 (-78.5%)" and "NPS responses / day 0 → 1 (+100.0%)" — apples-to-apples across a 14d "before" and a 5.02d "after" window. Screenshot captured.


- 2026-08-12 — **Iteration 74 — Figma OAuth granular scopes**:
  - Figma OAuth was failing with `Invalid scopes for app` (HTTP 400) because `connectors.py` still requested the deprecated `file_read` scope.
  - **Fix** (`backend/connectors.py::_auth_url`): replaced `scope=file_read` with the four granular scopes now required by Figma: `current_user:read,file_content:read,file_metadata:read,file_comments:read`. Verified — hitting the generated authorize URL now returns HTTP 200 (Figma login) instead of the previous 400. Redirect URI derivation via `x-forwarded-host` remains untouched so preview + production callbacks both continue to work.

- 2026-08-12 — **Iteration 75 — Connect Work "intelligence layer" — 4 dashboard features**:
  - **User ask**: Ship Change Digest, Scope Creep Alerts (in-app only), Cross-Source Ask (both `/api/ask/all` and per-project `/api/projects/all/ask` alias), Connection Health (tiered green > 7d / amber ≤ 7d / red expired).
  - **Backend** (`backend/connectors.py`):
    - `_connection_health(account)` — traffic-light computation on OAuth token expiry. Gmail refresh-token holders are reported green even when the access token is dead (auto-refresh path).
    - `GET /api/connect/digest?window=24h|7d` — aggregates `project_memory` across every owned project inside the window. Returns `{counts, total, items, projects_with_changes, scope_alerts, generated_at}`.
    - `GET /api/notifications` + `POST /api/notifications/read` — in-app bell backed by a `notifications` collection.
    - Scope-creep notifications are now auto-inserted inside `_sync_connection` whenever a new `project_memory` item has `category == "scope_change"` (up to 6 per sync).
    - `POST /api/ask/all` and `POST /api/projects/all/ask` (alias) — answers a single question stitched across every connected source in every owned project, with per-project labelled citations.
    - `GET /api/projects/{id}/connections` now attaches `health` on every connection.
  - **Frontend** (`frontend/src/`):
    - `components/NotificationBell.jsx` — bell in dashboard header, 45s poll (paused when tab hidden), unread badge, outside-click / Escape to close, mark-read on open.
    - `components/ChangeDigestPanel.jsx` — new panel on dashboard with 24h / 7d toggle, 6-category count strip, and up to 6 recent items. Panel hides itself entirely when there are no changes so first-time users don't see an empty card.
    - `components/GlobalAskModal.jsx` — "Ask Bracket" modal (opened from a new button in the composer footer). Suggestion chips submit inline. Renders answer + confidence + labelled sources.
    - `components/ConnectedWorkPanel.jsx` — `SourceRow` now shows an amber/red health badge next to the source name when the token needs attention.
    - `pages/Dashboard.jsx` — wired the bell, digest, and Ask Bracket button; kept the mobile logout in the same header cluster.
  - **Testing** (iteration_38.json): 10/10 backend pytest passing. Frontend: bell + digest + modal + suggestion-chip all verified end-to-end. Fixed one MEDIUM bug caught by the tester (stale closure on suggestion-chip submit) by passing the override string explicitly into `submit()`. Screenshot confirms modal now fires POST `/api/ask/all` on chip click and renders a grounded AI answer with Figma source citation for the seeded scope-change memory item.


- 2026-08-13 — **Iteration 76 — Client Operating System pivot (Project Memory)**:
  - **Positioning shift** — Bracket is now framed as an AI-native Client OS: "Your client talks. Bracket remembers." The 5-step decision flow at /project/:id is superseded by a new **Project Memory** page. Legacy flow moved to /project/:id/legacy so no data is lost.
  - **Theme flip** — every :root token in `frontend/src/index.css` rewritten for a white-paper + soft-lavender + navy-ink light theme (bg #FBFAFE, surface white, hairlines cool-grey, accent Bracket-blue #4F46E5). Scrollbar re-coloured. shadcn HSL vars updated. Every existing component that uses CSS variables adapts automatically.
  - **9 canonical memory categories** — Scope, Deliverables, Decisions, Requirements, Timeline, Risks, Assumptions, Commercials, Open Questions. Legacy AI-emitted categories (`deadline`, `scope_change`) are normalised into their canonical bucket at read time so existing memory rows keep flowing. Source of truth: `frontend/src/lib/memoryCategories.js`.
  - **Backend** (`connectors.py`):
    - `GET /api/projects/{id}/memory` — grouped by 9 canonical categories + counts + total. Every row is stamped `is_scope_change` so the UI can still flag scope-creep items even after they land in the Scope bucket.
    - `PATCH /api/connect/memory/{id}` — inline edit title / detail / category with a `history` diff.
    - `POST /api/projects/{id}/memory` — manual add for "the phone call the client didn't write down".
    - `DELETE /api/connect/memory/{id}` — soft delete (status → ignored, kept for audit).
    - `POST /api/connect/memory/{id}/action` — extended to accept `dismiss` / `not_a_change` / `review` alongside the existing `confirm` / `context` / `ignore`.
    - `POST /api/connect/memory/{id}/suggest-reply` — new signature interaction. Calls Haiku via `suggest_reply_for_change(project_name, client_name, change, related_memory)` and returns `{reply, impacts[], priority, memory_updates[], deep_links{mailto, gmail_web, slack_web}}`. Zero autonomous send — user is always in the loop.
    - `POST /api/demo/seed` (idempotent) + `DELETE /api/demo/reset` — seeds/removes the "Acme Dashboard Redesign" demo project with 13 memory items telling one coherent story (analytics moved P1→P2, mobile dashboard added, launch pushed to May 31), 3 demo `source_connections` (Gmail/Slack/Figma with `is_demo: true`), and one scope-creep notification. The dashboard calls `POST /api/demo/seed` on first mount so a brand-new user never lands on an empty product.
  - **`connect_ai.py`** — added `suggest_reply_for_change` (project-aware Haiku prompt returning strict JSON).
  - **`models.py`** — `ProjectOut` extended with `client_name`, `project_type`, `is_demo`, `demo_tag` so the new UI can render the DEMO tag and client subtitle. (Root-caused by testing agent — `ConfigDict(extra="ignore")` was silently dropping the new fields.)
  - **Frontend**:
    - `pages/ProjectMemory.jsx` (new) — split layout: 240px left rail w/ 9 categories + a compact "Connected sources" widget → main pane w/ status filter (All / New-detected / Confirmed) and memory rows.
    - `components/ChangeActionDrawer.jsx` (new) — right-side drawer opened on any detected memory row. Shows What Changed, Impact list (kind + quantified detail), AI-suggested Response with Copy / Send in Gmail / Open in default mail / Open Slack, Memory Updates preview (colour-coded add/update/remove per category), and a "Confirm & update memory" / "Not a change" / "Ignore" decision row. Never sends anything on the user's behalf.
    - `lib/memoryCategories.js` (new) — 9-category metadata + STATUS_META.
    - `App.js` — `/project/:id` → ProjectMemory, `/project/:id/legacy` → old ProjectOverview.
    - `pages/Dashboard.jsx` — idempotent demo-seed on first mount.
  - **Testing** (iteration_39.json): 12/12 backend pytest (`/app/backend/tests/test_iteration_39_project_memory.py`) + all frontend flow checkpoints. One MEDIUM bug caught (ProjectOut missing fields) — fixed before finish. Verified end-to-end: login → dashboard (light theme) → Acme project → 9 categories with correct counts → click detected scope-change row → drawer opens with AI reply (5 impacts, 5 memory updates, deep links) → Copy button doesn't crash → Confirm moves item from DETECTED→CONFIRMED.

- 2026-08-13 — **Iteration 77 — Visual polish + demo removal + intent-first composer**:
  - User feedback: visuals were still dark-theme-flavored (invisible pills, translucent whites on paper), demo project felt like clutter, and the paste textbox no longer fit the "your client talks, Bracket remembers" positioning.
  - **Removed the paste textbox** — Dashboard's composer is now the `NewProjectComposer` (`frontend/src/components/NewProjectComposer.jsx`) that asks "Where does your client talk?" and offers 5 tool chips (Gmail / Slack / Figma / GitHub / Notion) + a "Start a new project" CTA that deep-links into `/app/connect?tool={provider}`.
  - **`ConnectWork.jsx`** — new `useEffect` reads `?tool=` and auto-opens that provider's picker so a chip click on the dashboard drops straight into the source-selection flow.
  - **Killed the demo project** — Dashboard mount now calls `DELETE /api/demo/reset` instead of `POST /api/demo/seed`, so the Acme demo is deleted for anyone who was seeded during iter39. Endpoint is idempotent (deleted:true on first call, deleted:false afterwards).
  - **Removed the "quickstart tiles" empty state** — those chips populated the removed textbox, so they had no destination. First-time users now see the composer + the "what Bracket does" produces list only.
  - **CSS retrofit** for the light theme — surgically re-tokenised the CSS classes that still shipped dark-alpha whites: `.card-brut`, `.card-linear`, `.liquid-glass`, `.glass`, `.dashboard-paste-panel`, `.dashboard-tile`, `.dashboard-recent-card`, `.dashboard-stat-card`, `.dashboard-search-input`, `.dashboard-filter-tabs`, `.dashboard-project-card`, `.hero-ambient::after`, `.hero-ambient--dashboard::after`, `.blueprint-bg`. Added a proper `.clay-ghost` class definition (was referenced across the app but never defined — used by every "Connect work"/"Attach file" pill on the composer).
  - **Removed dead dark backdrop `<div>`** in `Dashboard.jsx` (was still applying `linear-gradient(#08090A → #050506)` under the page — the light theme was hiding it but the DOM still shipped it).
  - **Testing** (iteration_40.json): 8/8 backend pytest + 100% frontend checkpoints. No regressions on iter39 flows. Screenshot verified — dashboard, project memory page, and connected-sources widget all render cleanly on the paper theme with legible pill buttons, cool-grey rules, and proper shadow depth.

- 2026-08-23 — **Iteration 78 — Extend workflow (no rewrites)**:
  - **User ask**: evolve the existing Bracket product for the client-intelligence workflow — reuse OAuth / sync / memory / action drawer, only fill genuine gaps.
  - **Audit**: OAuth (Gmail/Slack/Figma/GitHub read-only) ✅ · preview + establish ✅ · AI extraction (requirements / decisions / deliverables / deadlines / questions) ✅ · continuous poller sync ✅ · change detection ✅ · scope-creep notifications ✅ · Copy + Gmail/Slack deep-links ✅ · multi-source per project ✅ · `project_memory.history` + `source_events` collections ✅. **Genuine gaps**: editable/regenerate reply, Deadlines folded into Timeline, decision-history view not rendered.
  - **Backend** (`connectors.py`):
    - Split Deadlines from Timeline — removed `deadline → timeline` from `_LEGACY_CAT_MAP`; added `deadline` to `MEMORY_CATEGORIES`. Existing rows with category="deadline" now appear in their own bucket automatically.
    - `GET /api/projects/{id}/history?limit=N` — fuses `source_events` + `project_memory.history` into one reverse-chronological stream. Each entry has `kind` (SOURCE_CONNECTED / STATUS_CHANGE / EDITED / CREATED / REMOVED), title, provider, source_label, memory_id (for click-through), category, detail, at.
  - **Frontend**:
    - `lib/memoryCategories.js` — added the `deadline` bucket (10th) with `CalendarClock` icon + `#EA580C` color.
    - `components/HistoryDrawer.jsx` **(new)** — right-side timeline drawer, colour-coded pills per kind, click any row to jump to the memory item (opens the ChangeActionDrawer).
    - `components/ChangeActionDrawer.jsx` — reply is now **editable** (`textarea` swapped in when the Edit button is clicked), **Regenerate** button re-runs the suggestion, **Reset** button restores the original AI draft. Copy / Gmail / Slack deep-links now serialise the LATEST draft, not the frozen initial AI reply.
    - `pages/ProjectMemory.jsx` — new **History** button in the project header opens the timeline drawer. `HistoryDrawer.onJumpToItem` re-uses the existing `ChangeActionDrawer` — zero new drawers.
  - **Verified**: `GET /api/projects/{id}/memory` now returns 10 canonical categories inc `deadline`; `GET /api/projects/{id}/history` returns fused events; confirming a detected item creates a `STATUS_CHANGE` entry surfaced in the drawer.
  - **Deferred (needs OAuth re-consent)**: send-through-source via `gmail.send` / Slack `chat:write` scopes — today the user still copies or opens a deep-link so send happens in their own tool. Trust rule preserved: Bracket never posts autonomously.
- 2026-08-23 — **Iteration 79 — Design System v1 + 10-second auto-refresh**:
  - **Design System v1** (`index.css :root`) — rebased every token to the spec supplied by the user:
    - Core: bg `#FFFFFF`, surface `#F8F8F7`, hairline `#E6E6E3`, text-primary `#151515`, secondary `#5F5F5B`, tertiary `#8A8A84`.
    - Brand: `#3157FF` primary, `#2449E8` hover, `#193BCC` active, `#EEF1FF` soft, `#C9D2FF` brand-border.
    - Semantic: success `#18864B`, warning `#A56200`, danger `#C62828`, info `#3157FF` (each with soft variant).
    - Radii: xs 4, sm 6, md 8, lg 12, xl 16, 2xl 20, full 999.
    - Elevation: 3-level ladder (0/1/2/3) with `--elev-*` tokens.
    - Motion: fast 120 / base 180 / medium 240 / slow 320 with `cubic-bezier(0.2, 0.8, 0.2, 1)` easing.
    - Sidebar: swapped the lavender gradient for the DS §10 spec — white surface, right hairline, 16px padding, no shadow.
    - shadcn HSL bridge re-derived from the new palette so every shadcn component adopts the new brand automatically.
  - **10-second auto-refresh** — perceived-live cadence without hammering provider APIs:
    - Backend `poller_loop` tightened from 300s → 60s per cycle, batch bumped from 4 → 8 stale connections. This keeps provider-side syncs frequent while staying inside typical rate limits.
    - Frontend `ProjectMemory.jsx` — silent 10s poll on `/projects/:id` + `/projects/:id/memory` (pauses when tab hidden, resumes on visibility change, no full-page spinner and no error toasts on transient failures).
    - `ConnectedSourcesCompact` widget re-polls `/projects/:id/connections` every 10s so "Last synced" and health dots move in near-real-time.
    - `NotificationBell` cadence dropped from 45s → 10s.
    - New **LIVE · SYNCS EVERY 10s** indicator (pulsing green dot) on the project subtitle.
  - **Verified**: 11-second Playwright window captured exactly 2 API calls (`/memory` + `/connections`) confirming 10-second polling is active; visual regression check on dashboard + project memory confirms every design-system token now surfaces (brand blue CTA, paper white sidebar, clean hairlines, 12px card radii).

- 2026-08-23 — **Iteration 80 — Dark Notion-minimal + Overview + one project-level reply**:
  - **Dark theme v2** (`index.css :root`): bg `#191919`, surface `#1E1E1E`, hairlines `rgba(255,255,255,0.07)`, text `#EDEDED`/`#B4B3B0`/`#7A7975`, brand `#3B82F6`. Every legacy component picks up the new palette from the tokens — no per-component rewrites. Sidebar re-tokenised to match (dark surface + subtle right hairline).
  - **6 canonical categories in UI** (`lib/memoryCategories.js`): Deliverables · Scope · Timeline · Requirements · Decisions · Deadlines. Risks / Assumptions / Commercials / Open Questions still live in the data model and backend extractor — just hidden from v1 UI (surface later if needed).
  - **Horizontal pill navigation** replaces the vertical rail. Overview tab is the default landing; the six category pills sit next to it under the header, with an animated `layoutId` underline for the active tab.
  - **New Overview view**:
    - **ONE project-level Suggested Response** panel — draws from the newest inbound client message across every connected source and the full project memory. Editable, Regenerate, Reset-to-AI, Copy reply, Send in Gmail, Open in default mail, Open Slack. Trust rule preserved — Bracket never sends, only drafts.
    - Category snapshot: 6 tiles with counts, click to jump into that category view.
    - Right rail: connected sources (compact).
  - **Backend** (`connectors.py` + `connect_ai.py`):
    - New `POST /api/projects/{id}/suggest-reply` — grounds a single project-level draft in the latest non-manual memory item (proxy for "latest client message") + the full memory context. Returns `{reply, confidence, grounded_in, based_on {…}, deep_links}`.
    - New `connect_ai.suggest_project_reply(project_name, client_name, latest_client_message, memory_items)` — strict-JSON Haiku prompt, 3-5 sentence output, first-person, no fabricated context.
  - **Verified**: dark palette across dashboard + project page; horizontal pills switch instantly (layout animation); overview surfaces a real reply grounded in the seeded scope-change item ("Great — thanks for the green light on v2..."); backend endpoint returns confidence:high with a `based_on` chip pointing at the correct source; 10-second live polling still active.


## 2026-06 — ParticleField halftone (Login / Plan visual)
- Rebuilt `ParticleField.jsx` from random drifting diamonds into a true halftone dot-matrix.
- Traces brightness of the reference image (`/frontend/public/halftone-source.png`, derived from `right-img.png`) onto a 7px grid; dot size ∝ luminance so the sculptural form emerges — dense/bright right, pure black left.
- Mixed glyphs (dot / diamond / occasional "x"), subtle global "breathing" + per-cell shimmer; respects prefers-reduced-motion.
- Fixed a "ResizeObserver loop" runtime overlay error by guarding the observer to rebuild only on real dimension changes (rAF-debounced).
- Verified via screenshot on /login.

## 2026-06 — Post-purchase "first project" landing (/welcome)
- New page `frontend/src/pages/FirstProject.jsx` at route `/welcome` (ProtectedRoute, standalone — no AppShell).
- Replicates the provided reference: Bracket logo, "Bring your first project into bracket" heading, mono subhead, and 4 full-width connect cards (Gmail / Slack / Figma / GitHub) with authentic multicolor brand SVGs + hover arrow, over the flow-field ParticleField (right panel).
- Cards reuse the real ConnectWork OAuth flow: click → popup + `GET /api/connect/{key}/auth-url`; on `bracket-oauth:{key}:ok` postMessage → navigate to `/app/connect?tool={key}` (ConnectWork opens the source picker). Already-connected providers jump straight there.
- `PaymentSuccess` now routes to `/welcome` (was `/app`) after a confirmed payment.
- Verified: page renders (logged-in demo), providers endpoint returns statuses, gmail auth-url returns a valid OAuth URL.

## 2026-06 — Fix: payment stuck on "Still processing"
- Root cause: app uses the Emergent SHARED Stripe sandbox (`sk_test_emergent`). On that shared sandbox the status read `stripe.checkout.Session.retrieve` returns "No such checkout.session" and the proxy does NOT deliver `checkout.session.completed` webhooks to the app (verified with a real completed test payment: tx stayed `pending`, 0 webhooks). Flow A claimable sandbox is unavailable here (Stripe rejects country "IN").
- Fix: new authenticated endpoint `POST /api/payments/confirm/{session_id}` — scoped to the session owner, best-effort Stripe verify, then idempotent `_mark_paid` (sets `plan`/`plan_since`). Stripe only redirects to success_url after a completed payment, so the authenticated buyer's return is the completion signal on this sandbox. Webhook handler kept as idempotent secondary path.
- `PaymentSuccess.jsx` now calls `/payments/confirm/{id}` (was polling `/payments/status` which can never resolve on the shared sandbox) → routes to `/welcome`.
- Verified E2E via Playwright: login → /plan → Stripe checkout (4242) → `/welcome`. Security: 401 unauth, 403 other-user session, 404 unknown, idempotent re-confirm.
- NOTE: on the shared sandbox this trusts the authenticated success redirect (test mode). If the app is later moved to a claimable sandbox / real Stripe account, real webhook + retrieve verification will apply automatically.

## 2026-06 — Subscriptions, Billing, transitions, /welcome heading
- **Real subscription**: `/api/payments/checkout` rewritten to raw Stripe SDK (proxy-aware). `monthly` → `mode=subscription` with a recurring monthly price; `project` → one-time `mode=payment`. Verified E2E: monthly creates a subscription (tx.kind=subscription), confirm sets plan, billing shows recurring + renews +30d.
- **Billing screen**: Settings → Billing card via new `GET /api/payments/billing` (plan, label, amount, started, renews_on = +30d monthly / +60d project, recurring). `POST /api/payments/cancel` clears the plan (local; shared sandbox can't hold a Stripe sub id). Change plan → /plan. Verified UI + cancel.
- **Smooth transitions**: added `page-enter` to Login/ChoosePlan/FirstProject/PaymentSuccess content, `fade-in` on particle panels, and a keyed `fade-in` between PaymentSuccess states.
- **/welcome heading**: widened left column (lg:54% / xl:52%, max-w 820) + `xl:whitespace-nowrap` → "Bring your first project into bracket" now one line at desktop, matching the reference.
- `_mark_paid` now stores `plan_kind` on the user. Demo account left with no plan (re-testable).

## 2026-06 — Multi-currency checkout (USD + INR) for UPI go-live
- User going LIVE with real money via Emergent's built-in Stripe (Indian Stripe account); wants UPI + cards. UPI on Stripe is India-only, INR-only; recurring UPI (AutoPay) capped at ₹15,000/mandate (₹2,499/mo fine).
- Backend `server.py`: `PLANS` now hold `amount` (USD) + `amount_inr`; new `_plan_amount(plan, currency)` + `SUPPORTED_CURRENCIES={usd,inr}`. `/api/payments/checkout` accepts optional `currency` (default usd, validated). `payment_method_types` intentionally omitted so Stripe Checkout auto-renders every method enabled in the connected account for the currency (UPI shows for INR on the live Indian account). Transaction + user `plan_currency` persisted; `/payments/billing` returns `currency` and correct amount.
- INR amounts: ₹749 single-project, ₹2,499 monthly (matches $9/$29 price points; adjustable in PLANS).
- Frontend: currency toggle ($ USD / ₹ INR) on `ChoosePlan.jsx` (`/plan`, drives checkout) and marketing `Pricing.jsx`; Settings billing renders ₹/$ per stored currency. Monochrome pill toggle.
- Verified: curl — USD & INR checkout both create valid Stripe sessions on the shared sandbox; `eur` rejected 400. Screenshot — /pricing toggle switches $29/$9 ↔ ₹2,499/₹749.
- GO-LIVE (still test mode / not deployed): deploy → claim own Indian Stripe account (STRIPE_API_KEY becomes sk_live_ automatically, code unchanged) → enable UPI in Stripe Dashboard (Settings→Payment methods). UPI only appears when currency=INR. Test card 4242 4242 4242 4242 (any future expiry/CVC).

## 2026-06 — Pre-launch hardening (dialog, sync, accuracy, responsiveness, reconnect)
Fixes from user's 5-item pre-payment list:
1. Add-source dialog glitch (#1): modal lived inside the sticky sidebar's stacking context, so the page title bled through its header. Fixed via React `createPortal(..., document.body)` in `AddSourceDialog.jsx` + `.bkt-modal-overlay` z-index 60→130. Verified (screenshot): clean opaque header.
5. Gmail shows "coming soon" after disconnect (#5): `AddSourceDialog` rendered ANY non-`available` status (incl. still-linked `connected`) as a disabled "Soon". Fixed badge/usable logic: `connected`→"Add" (usable), `available`→"Connect", `setup_required`→"Setup" (disabled), else "Soon". Verified (Notion now shows SETUP).
4. Desktop responsiveness at 1366×768 (#4): fixed 100dvh viewport was correct but chrome (44px padding, 40px header margin, 38px title, tall stat cards) clipped inner lists below the fold. Added `@media (min-width:1024px) and (max-height:860px)` in index.css compressing padding/margins/title/cards on laptop-height screens; ≥820px design untouched. Verified: Home shows all 5 recent rows, Conversations full stream + composer, Timeline scrolls internally.
2. Sync freshness + parsing accuracy (#2 — real data):
   - Accuracy: extraction paths `analyze_connected_source` + `detect_source_updates` (connect_ai.py) switched Haiku → **claude-sonnet-4-6** (ai_engine MODEL_MAP sonnet updated to claude-sonnet-4-6). Typing suggestions stay Haiku. Verified via /connect/preview: sharp, correctly classified extraction (~16s, within 35s budget).
   - Freshness (new client emails only appeared after reconnect): root cause = a Gmail connection = ONE thread (source_id=thread_id); poller only re-polled that thread, never new threads. Added `gmail_fetch_client_digest(account, thread_id, client_email)` — folds the connected thread + up to 3 recent threads from the same client (`from:{email} newer_than:21d`) into the digest so brand-new client emails are captured automatically. Wired into `_sync_connection` (gmail, non-demo; derives+persists client_email if missing). Poll interval 60s→30s, batch 8→12.
   - NOT e2e-tested against REAL Gmail (preview demo accounts have no OAuth token). Demo path regression-safe (guarded by source_id not starting "demo-"); verified demo sync_now returns cleanly.

## 2026-06 — Regression pass + Scope-Creep email alerts (Resend)
- Regression (testing_agent iteration_55.json): 100% frontend PASS across login, portaled Add-source dialog (no title bleed), provider badges (Connect/Setup/Soon), disconnect+re-add (gmail stays connectable), USD/INR toggles on /pricing + /plan, and 1366×768 (no page scroll, lists scroll internally). Hardening applied: `.bkt-modal-head` given its own solid `#0c0c0c` background. Re-seeded demo (seed_demo.py) since tester left pro's Gmail source disconnected.
- Scope-Creep Alerts: Resend integration (SDK already present; key updated in .env, sender support@use-bracket.com verified). New `send_scope_creep_alert()` in emailer.py (amber alert template + text). Wired into `_sync_connection`: when a sync detects `scope_change` memory items, one batched email fires (asyncio.create_task, fire-and-forget) to the project owner's email listing the requests, deep-linking `/project/{id}`. Verified: live send returns True via Resend; email preview renders on-brand.
- Recipient = project owner account email. Batched = one email per sync. Gated on RESEND_API_KEY (no-op if unset).

## 2026-06 — Payment receipt email (Resend) + deploy
- New `send_payment_receipt()` in emailer.py: branded dark receipt (green "payment confirmed" accent, itemized Plan/Billing/Date/Total, currency-aware ₹/$ via `_fmt_amount`, ref = last 16 of session_id, CTA to /app). Text alt included.
- Wired into `_mark_paid` (server.py): sends ONLY on the atomic transition to paid (`res.modified_count == 1`) so racing webhook + status-poll never duplicate. Fire-and-forget via asyncio.create_task; recipient = user email; recurring flag from plan kind. Gated on RESEND_API_KEY.
- Verified: send returns True for INR subscription + USD one-time; amounts format $29/₹2,499/$9/₹749; preview renders on-brand.
- Deploy: dispatched to deployer (go-live). UPI activates on the live Indian Stripe account once claimed + enabled in Stripe Dashboard (currency INR path already built).

## 2026-06 — Razorpay Standard Checkout (INR: UPI + cards + netbanking)
- Added alongside Stripe: INR path uses Razorpay, USD path stays Stripe (via ChoosePlan currency toggle).
- Backend (server.py): razorpay SDK 2.0.1. `POST /api/payments/razorpay/order` (auth; validates plan; amount=INR*100 paise, ≥100; creates Razorpay order; stores payment_transaction provider=razorpay; returns order_id/amount/currency/key_id/plan_label). `POST /api/payments/razorpay/verify` (auth; verifies signature via client.utility.verify_payment_signature; 400 on mismatch/missing — never marks paid; on success atomically marks txn paid, sets user plan + plan_currency=inr, sends receipt once via modified_count guard).
- Frontend (ChoosePlan.jsx): loads checkout.js; when currency=INR shows "Pay with UPI / Card" → creates order → opens Razorpay modal → verifies → redirects /app. Handles modal dismiss + payment.failed. key_id comes from server (KEY_SECRET never reaches frontend).
- Env: RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in backend/.env (gitignored). Test keys rzp_test_TWNQZd7YbuYZPy.
- Verified: real Razorpay test order created (₹749→74900, ₹2,499→249900 paise); bad/missing signature → 400; checkout modal opens with UPI/cards/netbanking.
- NOTE: monthly is a one-time ₹2,499 Standard-Checkout charge (grants monthly plan). True auto-recurring needs the Razorpay Subscriptions API (not in this scope).

## 2026-06 — UI elevate pass (additive CSS)
- Appended monochrome elevate layer to index.css: global soft-light grain (body::after, z100, ~2.5%), elevated modal depth (inner sheen + hairline ring + deep cast), hover lift on ov-card/stream-row2/tl-h-row, staggered entrance (bkt-rise) on stat strip + lists, Ask Bracket focus-within glow + backdrop blur, crisper suggestion chips, prefers-reduced-motion guard. Verified via screenshots (Home/Conversations/dialog); grain doesn't block clicks or haze modals.

## 2026-06 — Razorpay ONLY (Stripe removed from UX)
- User decision: keep Razorpay only. Removed currency toggle + USD/Stripe path from ChoosePlan.jsx and Pricing.jsx; both now INR-only (₹2,499 / ₹749), single "Pay with UPI / Card" (Razorpay). Terms.jsx prices updated to ₹. FAQ/SEO text updated.
- Backend Stripe endpoints (/payments/checkout, /payments/status, webhook) left in place but now UNREFERENCED (dead code); Razorpay order/verify are the only payment paths used. Can be removed on request.
- Verified via screenshots: /plan and /pricing show no toggle, INR only, Razorpay button.

## 2026-06 — Stripe removed + Razorpay webhook safety-net
- Stripe backend fully removed from server.py: deleted _init_stripe, CheckoutIn, /payments/checkout, _mark_paid, /payments/status, /payments/confirm, /webhook/stripe, emergentintegrations.stripe + `import stripe` imports, SUPPORTED_CURRENCIES. Kept PLANS + _plan_amount + _renewal_iso + /payments/billing + /payments/cancel. STRIPE_API_KEY removed from .env. (Razorpay is the only payment path.)
- Refactored Razorpay fulfillment into shared idempotent `_fulfill_razorpay(order_id, payment_id, expected_user_id=None)` (marks txn paid atomically, sets plan+plan_currency=inr, sends receipt once). Used by /payments/razorpay/verify (browser) AND new webhook.
- NEW `POST /api/webhook/razorpay`: verifies X-Razorpay-Signature via client.utility.verify_webhook_signature against RAZORPAY_WEBHOOK_SECRET; handles order.paid + payment.captured → _fulfill_razorpay. Safety net if browser closes before /verify. RAZORPAY_WEBHOOK_SECRET added to .env (whsec_bkt_...). 
- Frontend: PaymentSuccess.jsx simplified (removed the deleted /payments/confirm poll; now just refresh + redirect /app). ChoosePlan Razorpay handler redirects to /payment/success.
- Verified: Stripe /payments/checkout → 404; razorpay order OK (₹749→74900, ₹2,499→249900); verify bad-sig → 400; webhook bad-sig → 400, valid-sig → 200 and fulfills plan idempotently (fresh acct got plan via webhook, then reset). Frontend compiles.
- PROD TODO (user): redeploy to carry new .env; create Razorpay Dashboard webhook → https://use-bracket.com/api/webhook/razorpay, events order.paid + payment.captured, secret = RAZORPAY_WEBHOOK_SECRET value.

## 2026-06 — Razorpay switched to LIVE keys
- backend/.env RAZORPAY_KEY_ID/SECRET updated to live (rzp_live_TWNj3lffba3d0J). RAZORPAY_WEBHOOK_SECRET unchanged. Verified live order creation returns rzp_live key + order_id. Preview now transacts real money. Redeploy required to carry live keys to production; dashboard webhook must use the same RAZORPAY_WEBHOOK_SECRET.

## 2026-06 — Unified CTA shape (pill everywhere)
- .btn-ghost/.btn-secondary border-radius 6px → 9999px so secondary/Cancel buttons match the primary pill. Standardizes CTA shape across all modals/dialogs (admin delete/reset, disconnect confirm, useDialog). Verified via disconnect confirm dialog screenshot (Cancel + Disconnect both pills). Ships to prod on next redeploy.

## 2026-06 — Admin analytics reframed to connect-tools philosophy
- Backend /admin/pitch-metrics: added sources_connected, memory_items_extracted, projects_with_source, pct_projects_connected, avg_sources_per_project, avg_memory_per_project (counts all connections incl. demo for board consistency). _compute_product_signals: added pct_users_connected_source (activation), sources_connected, memory_items_extracted, avg_sources_per_project, avg_memory_per_project, pct_projects_connected.
- Frontend AdminAnalytics.jsx: headline "Locked & shared docs" → "Work tools connected"; new connect-tools row (Memory captured / Projects connected % / Sources per project / Memory per project / Projects with a source); activation row relabeled "Signup → 1st project" + "Connected a source %". Publish-log helper copy reframed to source-connect + memory-capture rates.
- Verified via /admin/pitch-metrics curl + admin board screenshot (all tiles render: 5 sources, 64 memory, 100% connected, 1.67 src/proj, 21.3 mem/proj, 40% connected-a-source). Preview only — ships on next redeploy.

## 2026-06 — Admin identity cleanup (support@ only; purge saksham)
- backend/.env: added PURGE_USER_EMAILS="saksham.shukla@use-bracket.com". ADMIN_EMAILS/BOOTSTRAP_ADMIN_EMAIL stay support@use-bracket.com (pw Bracket@123, unchanged).
- server.py startup: (1) env-driven idempotent purge of PURGE_USER_EMAILS users + cascade projects/sessions/otps, guarded to never delete current admins; (2) bootstrap admin seed name changed "Saksham Shukla"→"Bracket Admin" + normalization of existing legacy admin name on startup.
- Preview verified: seeded test saksham → purged on restart; support@ login works, is_admin=True, name now "Bracket Admin"; saksham absent from DB.
- IMPORTANT: prod takes effect only after REDEPLOY (removes saksham.shukla@use-bracket.com admin access + account, renames admin). saksham currently has admin in prod via older deployed env.

## 2026-06 — Admin fix v2 (frozen prod secret workaround)
- ROOT CAUSE (deployer RCA): prod ADMIN_EMAILS secret = saksham.shukla@use-bracket.com (NOT support). Redeploys never overwrite EXISTING prod secret values; only NEW keys propagate. So dev .env edits to ADMIN_EMAILS/BOOTSTRAP_ADMIN_EMAIL never reached prod → saksham stayed admin (+ purge-protected), support@ not admin, support@ password also stale.
- FIX (code + new env key, no manual secret editing):
  - auth.py admin_emails(): prefer NEW key ADMIN_EMAILS_OVERRIDE over ADMIN_EMAILS; always subtract PURGE_USER_EMAILS (decommissioned = never admin).
  - server.py startup purge guard now uses effective admin_emails() → saksham no longer protected → purged (+cascade projects/sessions/otps).
  - server.py bootstrap seed keys off ADMIN_EMAILS_OVERRIDE first; (re)sets bootstrap admin password when it doesn't verify BOOTSTRAP_ADMIN_PASSWORD, so support@ can always log in with Bracket@123.
  - .env: added ADMIN_EMAILS_OVERRIDE="support@use-bracket.com".
- Preview verified: simulated prod (seeded saksham+project, broke support@ pw) → after restart: saksham purged + projects gone, support@ login Bracket@123 works (is_admin, name "Bracket Admin"), admin/users 200.
- Admin login = support@use-bracket.com / Bracket@123.

## 2026-06 — CRITICAL: paywall bypass on returning sessions (fixed)
- BUG: after login, closing + reopening prod site and navigating to /app or /project/:id let a no-plan user reach the workspace, bypassing payment. ProtectedRoute only checked auth, not plan; plan-gating existed ONLY at login-time redirects (Login.jsx, AuthCallback.jsx).
- FIX: new components/RequirePlan.jsx — redirects logged-in users with no `user.plan` (and not is_admin) to /plan. App.js: added <Tool> wrapper (ProtectedRoute + RequirePlan) applied to all tool routes: /app, /app/new, /app/connect, /app/activity, /welcome*, /claim, /project/:id (+legacy/flow/document). /plan, /payment/*, /onboarding, /settings remain auth-only (no plan required) so users can pay / manage account.
- Verified in preview: fresh@ (no plan) → /app redirects to /plan; pro@ (plan) → reaches /project/:id workspace. Admins exempt.

## 2026-06 — In-app Plan modal (no more kick-out to /pricing) + USD via Razorpay
- FEATURE: single-project (₹749) user at limit clicking "New project" (project switcher) now opens an in-app PlanModal instead of navigate("/pricing"). Modal shows BOTH plans (Monthly ₹2,499/$29, Single ₹749/$9) with an INR/USD currency toggle; pays via Razorpay; on success → /welcome (new-project connect flow). Same modal wired to the expired-plan "Renew or upgrade" banner in ProjectMemory.
- FILES: new components/PlanModal.jsx; ProjectSidebar.jsx (state + at-limit button opens modal, removed /pricing redirect + unused Sparkles import); ProjectMemory.jsx (expired banner opens modal).
- BACKEND: /payments/razorpay/order now accepts `currency` ("inr"|"usd"), uses PLANS amount_inr/amount, Razorpay order currency INR/USD; friendly error if USD not enabled. Verified: INR order (249900 INR) + USD order (900 USD) both created on live account; modal renders with both plans + working currency toggle (preview screenshot).
- NOTE: did NOT complete a live payment (LIVE Razorpay keys).

## 2026-06 — Integrations "dummy projects" (diagnosis)
- NOT a regression: git log confirms Figma/Slack/GitHub OAuth code unchanged across recent commits. connectors.list_sources() returns _demo_sources(provider) with demo:true whenever no integration_account exists → real account sees sample/"dummy" sources because OAuth didn't complete.
- Redirect URI derived per-host: https://use-bracket.com/api/connect/{provider}/callback (prod) — must be registered in each provider's OAuth app. Likely cause: prod missing FIGMA/SLACK/GITHUB client secrets (frozen prod secrets, like admin) and/or unregistered prod callback URLs. Dispatched deployer debug to confirm prod secret existence + OAuth callback errors.

## 2026-06 — ROOT CAUSE of "dummy integrations": identity fragmentation (fixed via self-heal)
- Deployer prod RCA: NOT a secret/callback problem (all 6 OAuth secrets present, client IDs match, other users have real figma/slack/github connections). Real cause: past DB resets wiped `users` but left `integration_accounts`+`user_sessions`; each post-reset login mints a new user_id, stranding old connections/projects. Same Google email = 5 user_ids; current session had gmail only → list_sources() returned demo:true samples for figma/slack/github. RCA doc: /app/deployer-agent-docs/RCA_a06cad61-...MD
- FIX (server.py): `_heal_orphaned_identity(canonical_user_id, email)` runs on every Google + OTP login. Discovers orphan user_ids via strong email signals (gmail integration_account label==email, or project creator_email==email) and re-points their integration_accounts (dedupe per provider, keep newest) + projects.owner_user_id onto the canonical user_id. Idempotent, email-scoped. Consulted integration_expert (Emergent Google Auth) first per protocol; email resolution + existing unique users.email index already prevent forward duplicates.
- Verified in preview: seeded orphan identity (gmail+slack+project, no users row) → OTP login → all 3 healed onto canonical, 0 rows left orphaned. Admin/password login unaffected.
- PROD: takes effect after deploy + the user's NEXT Google login (heal runs then; consolidates all 5 fragmented identities). Interim, reconnecting in current session also works.

## 2026-06 — Test plan + connector hardening + account-switch modal
1) TEMP ₹0/$0 TEST PLAN: PLANS["test"] (behaves like monthly, 10 projects). Gated to admins + TEST_PLAN_EMAILS allowlist (.env: support@, yashwork1303@gmail.com, shuklasaksham01@gmail.com). New endpoint POST /payments/test-activate (403 if not allowlisted). razorpay/order rejects plan_id=test. public_user exposes can_test_plan. Frontend: PlanModal shows "Test · free" option; ChoosePlan shows "Activate free test plan (₹0)" (calls refresh() then /welcome to avoid paywall loop). Verified: allowlisted activates→/welcome; non-allowlisted 403.
2) CONNECTOR HARDENING (Gmail/GitHub/Slack/Figma "dummy/expired"): deployer RCA showed app returns 5xx that Cloudflare masks with its origin-error page (hiding our real message). Added connectors._upstream_fail() → logs upstream status+body and raises 4xx (401 reconnect / 429 rate-limit / 424 generic) so users see actionable messages. Applied to github/slack/notion/gmail/figma source fetchers. Added logging on Google + Figma token refresh failures. NOTE: definitive Gmail cause (likely Google OAuth consent screen in "Testing" → 7-day refresh token expiry, USER-owned Google Cloud Console fix) + exact GitHub non-200 still to be confirmed from prod logs after this deploy.
3) PENCIL = ACCOUNT CHANGE: SelectSource pencil now opens an in-page "Switch account" modal (reconnect same provider via OAuth popup, upserts integration_account) instead of navigating to the tool list. Verified via screenshot.

## 2026-06 — Native Google login (replaces Emergent consent screen)
- WHY: Emergent-managed Google Auth consent page (auth.emergentagent.com) can't be white-labeled (support confirmed). User chose native Google OAuth with own credentials for main app login.
- BACKEND (server.py): new GET /api/auth/google/native/start (302 → accounts.google.com, scope openid email profile, own GOOGLE_OAUTH_CLIENT_ID, state in oauth_states, host-aware redirect_uri via _request_base_url) + GET /api/auth/google/native/callback (code→token→userinfo→get_or_create_user_by_email + _heal_orphaned_identity → session cookie → 302 to /app or /plan). Reuses existing Google client (also used by Gmail connector). Emergent exchange (/auth/google/exchange) left in place but frontend no longer uses it.
- FRONTEND (Login.jsx): googleSignIn now → ${REACT_APP_BACKEND_URL}/api/auth/google/native/start (was auth.emergentagent.com).
- redirect_uri is host-aware: preview → https://design-decided.preview.emergentagent.com/api/auth/google/native/callback ; prod → https://use-bracket.com/api/auth/google/native/callback. BOTH must be added to the Google client's Authorized redirect URIs.
- Verified in preview: button now goes to Google's own screen (no Emergent). redirect_uri_mismatch until URIs registered (expected). NOT yet deployed to prod (waiting on URI registration to avoid broken prod Google button; email OTP + password still work).

## 2026-06 — ₹0 test plan: admin ON/OFF toggle (replaces email allowlist as primary control)
- auth.py: TEST_PLAN_STATE={"enabled":False} module global; can_use_test_plan(user)=is_admin OR TEST_PLAN_STATE.enabled OR email in TEST_PLAN_EMAILS. Admins can always test.
- server.py: GET/POST /api/admin/test-plan (admin-guarded via auth_current_admin) persists to app_settings{key:"test_plan",enabled} + updates in-memory state; startup loads it into TEST_PLAN_STATE.
- Frontend AdminDashboard.jsx: pill toggle in header (data-testid admin-test-plan-toggle) with ON/OFF switch + toast. When ON, PlanModal + ChoosePlan show the free option for ALL signed-in users; when OFF, only admins.
- Verified in preview: admin toggle ON→ non-admin fresh@ can_test_plan true + activate 200; OFF→ false + 403; non-admin cannot hit /admin/test-plan (404). Persisted + reloads on restart. Default OFF.
