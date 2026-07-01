# Bracket — PRD

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
- Split `server.py` (~1120 lines) into `routes_projects.py`, `routes_share.py`, `routes_export.py`.
- Public case study CMS.
- Email-the-PDF on lock-in.
- Dashboard loading skeleton (prevent empty-state flash on first load).

## Next tasks
1. Add Playwright coverage for ProjectDocument owner-reply UI and Claim page (orphan-project setup).
2. Enforce OTP cooldown server-side.
3. Consider breaking `ProjectFlow.jsx` (>1600 lines) into per-step child components.
