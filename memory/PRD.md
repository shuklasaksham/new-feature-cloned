# Bracket — PRD

## Original problem statement
Build "Bracket" — a decision operating system for designers. Not another tool. A senior-designer brain between input and output. Positioned against Notion / Figma plugins / AI writing tools.

Brand promise: "Designers don't need more tools. They need better decisions."

## Current mode (Feb 2026 onward)
**Anonymous, free during early access.** No accounts, no waitlist, no payment. Anyone can use the full 5-step flow with just a name + email + project name. Projects are ephemeral — there is no dashboard, no "my projects" listing. Users export the result as markdown before closing the tab.

## Users / personas
1. **Freelancers** — clarity + confidence; scope creep, pricing anxiety.
2. **Agencies** — consistency across designers; juniors defer calls to founders.
3. **Product designers** — structured thinking that survives stakeholders.
4. **Junior designers** — a senior brain sitting next to them.

## Architecture (current)
- **Backend** — FastAPI + MongoDB (Motor). Files: `server.py`, `ai_engine.py`, `models.py`, `emailer.py`.
- **No auth.** Project ids are random UUIDs; possessing the id is the only handle on the project.
- **AI engine** — `emergentintegrations.llm.chat.LlmChat` wrapping Claude Sonnet 4.5 (default) and GPT-5.2 (alternate). Strict JSON-output prompts per step.
- **Email** — Resend, fire-and-forget "thanks for trying" on project creation.
- **Frontend** — React 19 + React Router 7 + Tailwind + custom Swiss/brutalist design system. Cabinet Grotesk + Manrope + JetBrains Mono.
- **Design aesthetic** — #F4F4F0 paper, pure black ink, electric blue #0033FF signal, sharp corners, brutalist shadow.

## API surface (current)
- `POST /api/projects` — body `{name, email, project_name, engine?}` → ephemeral project doc with id; triggers thanks email.
- `GET /api/projects/{id}` — fetch project (anyone with the id).
- `POST /api/projects/{id}/situation` → framing
- `POST /api/projects/{id}/context` → compressed context
- `POST /api/projects/{id}/decision` → recommendation + alternatives + risks
- `POST /api/projects/{id}/artifacts` → scope doc + client message + assumptions + risk flags
- `POST /api/projects/{id}/lock` → locked decision
- `GET /api/projects/{id}/export.md` → plain-text markdown export

## Routes (current)
Marketing: `/` `/how-it-works` `/use-cases` `/pricing` (INR/USD toggle, framed as "Free for now") `/case-studies`.
Tool: `/start` (name+email+project_name, returning-user resume via `/api/projects/by-email`) → `/project/:id` (5-step flow) → `/project/:id/document` (polished in-app sign-off document).
Public client review: `/r/:token` (no nav header, public read of artifacts + accept-with-checkboxes-and-signature OR reject-with-AI-suggestions paths).
Catch-all `*` redirects to `/`.

## API surface (current)
- `POST /api/projects` — body `{name, email, project_name, engine?}` → ephemeral or resumed project doc with id; triggers thanks email on first create; same (email, project_name) returns existing.
- `GET /api/projects/by-email?email=...` — list a user's projects, most recent first.
- `GET /api/projects/{id}` — fetch project (anyone with the id).
- `POST /api/projects/{id}/situation` → framing
- `POST /api/projects/{id}/context` → compressed context
- `POST /api/projects/{id}/decision` → recommendation + alternatives + risks
- `POST /api/projects/{id}/artifacts` → scope doc + client message + assumptions + risk flags
- `POST /api/projects/{id}/lock` → locked decision
- `GET /api/projects/{id}/export.md` → plain-text markdown
- `GET /api/projects/{id}/export.pdf` → fpdf2-generated PDF (Bracket-branded)
- `POST /api/projects/{id}/feedback` — thumbs + optional text (after lock-in only)
- `POST /api/projects/{id}/share` → mint or reuse a public review token; sets `share_status=sent`
- `GET /api/share/{token}` → public read-only project view (no email leaked)
- `POST /api/share/{token}/accept` → body `{acceptances, signature_name, role}` → status=accepted
- `POST /api/share/{token}/reject/preview` → body `{concerns}` → calls Claude for 3 suggestions + watch-for (no state mutation)
- `POST /api/share/{token}/reject/confirm` → finalize with concerns + AI suggestions + signature → status=rejected

## Changelog
- 2025-12 — Initial MVP: marketing site + JWT auth + onboarding + dashboard + 5-step decision flow + artifacts + lock-in.
- 2026-01 — Currency toggle INR↔USD; Pricing page; Stripe hosted checkout; Workspace + Templates + Revisions + Pushback simulator + share links + markdown export.
- 2026-02 — **Waitlist pivot**: hid the full app behind a "Coming Soon" waitlist; custom domain `use-bracket.com`.
- 2026-02 — **Network-error fix**: same-origin API + tightened CORS for credentialed wildcard.
- 2026-02 — **Logo + favicon swap** to the `{B}` rounded-square lockup.
- 2026-02 — **Waitlist duplicate handling**: 409 with friendly copy.
- 2026-02 — **Full responsiveness pass** across all 6 public routes + Navbar/Footer.
- 2026-02 — **Anonymous pivot**: removed waitlist + auth + dashboard + billing + share/templates/workspaces/revisions/simulate. New `/start` + 5-step flow. Thanks-email via Resend. Pricing reframed as "Free for now".
- 2026-02 — **Step 5 polish + persistence**: returning-user resume by email; PDF export (fpdf2); post-lock feedback prompt; dark-card bg-ink visibility fix.
- 2026-02 — **In-app document viewer + client review flow** (this iteration):
  - `/project/:id/document` — polished sign-off document inside Bracket. Download PDF (fetch-as-blob, fixes the "Site wasn't available" download failure), Share-with-client button, back-to-flow.
  - `/r/:token` — public client review. Accept path: per-section checkboxes (one each for: client message, every in-scope item, every deliverable, every assumption) + typed signature + role. Reject path: textarea → Claude generates 3 calm specific suggestions + "watch for" → client confirms with signature → owner sees concerns + AI suggestions back inside the document viewer.
  - Feedback prompt moved out of Step 5: now appears as a one-shot modal *after* the owner clicks "Send via email" / copies the review link.
  - Backend: new `share_token`, `share_status`, `share_review` fields on project; `run_client_pushback_suggestions` AI function. Verified end-to-end via curl (8 backend checks + Playwright smoke).

## Backlog (P1)
- Email notification to the project owner when client accepts or rejects (currently only visible if they open `/project/:id/document`).
- "Email me my artifacts" — send the PDF to the project's email on lock-in.

## Backlog (P2)
- Public case study CMS
- Reintroduce paid tiers when graduating from early access
- Embedded Stripe Elements

## Changelog
- 2025-12 — Initial MVP: marketing site + JWT auth + onboarding + dashboard + 5-step decision flow + artifacts + lock-in.
- 2026-01 — Currency toggle INR↔USD; Pricing page; Stripe hosted checkout; Workspace + Templates + Revisions + Pushback simulator + share links + markdown export.
- 2026-02 — **Waitlist pivot**: hid the full app behind a "Coming Soon" waitlist with terminal-style demo player, countdown, Resend welcome emails, custom domain `use-bracket.com`.
- 2026-02 — **Network-error fix**: same-origin API + tightened CORS for credentialed wildcard.
- 2026-02 — **Logo + favicon swap** to the `{B}` rounded-square lockup.
- 2026-02 — **Waitlist duplicate handling**: 409 with friendly copy.
- 2026-02 — **Full responsiveness pass** across all 6 public routes + Navbar/Footer. Verified across 42 viewport/route combinations.
- 2026-02 — **Anonymous pivot**: removed waitlist + auth + dashboard + billing + share/templates/workspaces/revisions/simulate. New `/start` page (name+email+project_name) → `/project/:id` 5-step flow. Send "thanks for trying" email via Resend. Pricing page reframed as "Free for now". Verified by testing agent: 19/19 backend tests pass + all frontend flows green (dead routes 404, marketing CTAs all point to `/start`, no waitlist references remain, refresh on `/project/:id` restores state, export.md works).

## Backlog (P1)
- "Email me my artifacts" — at lock-in, optionally send the markdown to the project's email.
- A short feedback prompt after lock-in (1-tap thumbs up/down + free text).
- Replace ephemeral state with a 24-hour resume token if user opts in (no full account).

## Backlog (P2)
- Public case study CMS
- Reintroduce paid tiers when the product graduates from early access (the Pricing page already telegraphs this)
- Embedded Stripe Elements (was P2 before; will be P1 when paid tiers ship)

## Next tasks
1. Retention/lead nurture: email-the-artifacts at lock-in (P1 above).
2. Virality: shareable read-only artifact link (would require persistence — defer).
3. Quality: short post-lock feedback prompt.
