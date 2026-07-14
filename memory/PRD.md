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

