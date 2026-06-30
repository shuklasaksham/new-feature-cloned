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

## Verified status (post iteration_10)
- ✅ 17/17 backend pytest pass — auth, projects CRUD with owner isolation, AI flow steps 1-2 with real LLM, share+reject+owner-reply loop, claim flow, logout.
- ✅ Frontend Playwright pass — /login → OTP → onboarding → /app dashboard → project create → /project/{id} → inline rename (save + cancel) → logout → redirect.
- ✅ `/auth/me` `has_password` flag fixed and curl-verified.

## Backlog (P1)
- Optionally enforce `OTP_RESEND_COOLDOWN_SECONDS` server-side (currently a constant but not enforced).
- ProjectDocument owner-reply UI surface — backend verified, frontend UI exists but not E2E-covered yet.
- ProtectedRoute `?next=` preservation — verify in a future pass.
- Reintroduce paid tiers (Stripe) once early access ends.

## Backlog (P2)
- Split `server.py` (~1120 lines) into `routes_projects.py`, `routes_share.py`, `routes_export.py`.
- Public case study CMS.
- Email-the-PDF on lock-in.

## Next tasks
1. Verify the `/auth/me` has_password fix end-to-end with the testing agent (retest_needed=true from iteration_4).
2. Add Playwright coverage for ProjectDocument owner-reply UI and Claim page (orphan-project setup).
3. Enforce OTP cooldown server-side.
