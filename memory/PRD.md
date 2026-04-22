# Bracket — PRD

## Original problem statement
Build "Bracket" — a decision operating system for designers. Not another tool. A senior-designer brain between input and output. Positioned against Notion / Figma plugins / AI writing tools.

Brand promise: "Designers don't need more tools. They need better decisions."

Sells emotionally: confidence without arrogance · structure without rigidity · authority without ego · professionalism without pretending.

## Users / personas
1. **Freelancers** — clarity + confidence; scope creep, pricing anxiety.
2. **Agencies** — consistency across designers; juniors defer calls to founders.
3. **Product designers** — structured thinking that survives stakeholders.
4. **Junior designers** — a senior brain sitting next to them.

## Architecture
- **Backend** — FastAPI + MongoDB (Motor). Files: `server.py`, `auth.py`, `ai_engine.py`, `models.py`.
- **Auth** — JWT email+password (bcrypt). httpOnly cookie + Bearer-header fallback (Bearer preferred).
- **AI engine** — `emergentintegrations.llm.chat.LlmChat` wrapping Claude Sonnet 4.5 (default) and GPT-5.2 (alternate). Strict JSON-output prompts per step.
- **Frontend** — React 19 + React Router 7 + Tailwind + custom Swiss/brutalist design system. Cabinet Grotesk + Manrope + JetBrains Mono.
- **Design aesthetic** — #F4F4F0 paper, pure black ink, electric blue #0033FF signal, sharp corners, brutalist shadow `4px 4px 0 #0A0A0A`, oversized `{ }` motif.

## API surface
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/onboarding`
- `GET/POST /api/projects`, `GET/DELETE /api/projects/{id}`
- `POST /api/projects/{id}/situation` → framing
- `POST /api/projects/{id}/context` → compressed context
- `POST /api/projects/{id}/decision` → recommendation + alternatives + risks
- `POST /api/projects/{id}/artifacts` → scope doc + client message + assumptions + risk flags
- `POST /api/projects/{id}/lock` → locked decision

## Pages
Marketing: `/` `/how-it-works` `/use-cases` `/pricing` (INR/USD toggle) `/case-studies`.
Auth: `/signup` `/login` `/onboarding` (2-step intent capture).
App: `/app` (dashboard — drafts / in-progress / locked), `/app/new`, `/app/projects/:id` (5-step flow).

## What's implemented (2025-12)
- ✅ Full marketing site (9-section landing + 4 supporting pages)
- ✅ JWT auth (register / login / me / logout) with Bearer-first precedence
- ✅ Onboarding (work type + struggle)
- ✅ Dashboard with project grouping by status
- ✅ 5-step AI decision flow end-to-end (Claude Sonnet 4.5 + GPT-5.2)
- ✅ Artifact generation (scope doc, client message, assumptions, risk flags) with copy-to-clipboard
- ✅ Confidence Lock-in with status + locked_at timestamp
- ✅ Currency toggle INR ↔ USD
- ✅ Proper meta tags + branded document title

## Backlog (P1)
- Revision tracking (diff locked decisions against new versions)
- Moment Advisor: paste a client message → get a response strategy
- Scenario / Pushback Simulator (feature 05 from the board)
- Templates library (saveable decision patterns)
- Team workspaces + client-facing outputs (Studio tier)
- Export artifacts as PDF / Markdown / shareable link
- Stripe billing for Pro/Studio tiers

## Backlog (P2)
- Onboarding email sequence
- Public case study CMS
- SSO / Google login
- Password reset flow

## Next tasks
1. Revenue: wire Stripe (subscription / lifetime) on Pricing page.
2. Retention: Moment Advisor as a quick-action from dashboard.
3. Virality: shareable public artifact link (read-only).

## Changelog
- 2026-02 — **Waitlist "Network Error" on custom domain fixed.** Frontend `api.js` + `Share.jsx` now use `window.location.origin` in the browser, so API calls go same-origin (`use-bracket.com/api/...`) and bypass the cross-origin → preview-domain CORS mismatch. Backend CORS hardened: `allow_origins=["*"]` replaced with `allow_origin_regex=".*"` when `CORS_ORIGINS=*`, which is the only credentialed-CORS-safe wildcard. Verified: preview submit works end-to-end; `use-bracket.com/api/waitlist` returns 200 with correct position. **User must redeploy (Deploy button) to push this fix to `use-bracket.com`.**
- 2026-02 — **Logo + favicon swap.** Replaced the text-based `BracketMark` wordmark with the single-image lockup (`/bracket-logo.png` — `{B}` rounded-square mark + "Bracket" wordmark). Generated `favicon.ico` (multi-size), `favicon-32.png`, `logo192.png`, `apple-touch-icon.png` from the cropped square. `index.html` updated with proper `<link rel="icon">` / `apple-touch-icon` entries. Component keeps `variant="chalk"` (CSS invert) for dark backgrounds and `label={false}` for mark-only usage.
- 2026-02 — **Waitlist duplicate handling.** `POST /api/waitlist` now returns HTTP 409 with `"You're already on the waitlist. We'll be in touch soon."` when an email is already registered. Frontend `Waitlist.jsx` surfaces the 409 message as-is in the existing error panel instead of the generic "invalid email" copy.
- 2026-02 — **Waitlist counter reset to 0.** All rows in the `waitlist` collection deleted; `/api/waitlist/count` confirms `{"count": 0}`.
- 2026-02 — **Full responsiveness pass (mobile / tablet / desktop).** Overhauled all 6 public routes for responsive layout: Landing, Waitlist, HowItWorks, UseCases, Pricing, CaseStudies, plus Navbar + Footer. Key changes:
  - Global: `html, body { max-width: 100vw; overflow-x: clip }`, `.font-display { overflow-wrap: anywhere }`, buttons get `white-space: nowrap` + slightly reduced padding.
  - Hero headings scaled down on mobile (landing 44/72/104/148, others 5xl/6xl/8xl).
  - Waitlist countdown is now 2×2 on mobile, 1×4 from `sm` up.
  - `border-r` on CaseStudies / Landing BEFORE cards now `md:border-r` + `border-b md:border-b-0` so stacked mobile cards get a bottom rule instead of a dangling right rule.
  - Navbar adds a compact "Join →" CTA on tablet; logo is `shrink-0`.
  - Oversized decorative `{ }` replaced hard-coded `fontSize:560` with Tailwind `text-[260px] sm:text-[380px] lg:text-[560px]` and use the global overflow clip to ensure no horizontal scroll.
  - Section vertical paddings reduced on mobile (`py-12 md:py-20` etc.).
  Verified by the testing agent across 42 combos (6 routes × 7 widths: 375, 390, 430, 768, 820, 1280, 1440) — zero horizontal overflow, nav/forms/grids reflow correctly.
