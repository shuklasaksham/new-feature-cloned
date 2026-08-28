# Bracket — Business & Product Strategy

_A grounded strategy document built from the actual Bracket codebase and running application (preview/dev environment). Written for founders, customer conversations, YC/investor discussions, product strategy, and onboarding future team members._

**Document date:** June 2026
**Author of record:** Generated from source-of-truth inspection of `/app` (frontend routes, backend endpoints, AI layer, data model) — not from marketing copy.

### How to read the labels
Every material claim is tagged:
- **[VERIFIED]** — exists in the current code/product and was inspected directly.
- **[OBSERVED]** — measurable from the app's own instrumentation. ⚠️ All numbers below come from the **preview/dev database**, which contains development, QA, and automated-test accounts. They are **not verified production traction.** Production (`use-bracket.com`) is a separate environment not accessible from here.
- **[HYPOTHESIS]** — a founder belief not yet proven.
- **[FUTURE]** — a planned or possible opportunity, not built.

> ⚠️ **Top-level honesty note:** Real market data, revenue, and production user traction were **not** available to this document. Nothing here should be read as validated customer or market evidence unless explicitly tagged **[OBSERVED]** with its caveat. No customers, revenue, TAM figures, or PMF signals have been invented.

---

## ⚑ Discrepancies flagged up front (product vs. narrative)
These are real gaps between what the app *does* and what surrounding copy/assumptions *say*. Resolving them is a strategy task, not just a cleanup task.

1. **Two products live under one brand. [VERIFIED]**
   - (A) **Legacy "5-step decision flow"**: a guided flow that produces a locked "decision document" and a public client sign-off page (accept-with-signature / reject-with-concerns). Routes: `/project/:id/flow`, `/project/:id/document`, `/project/:id/legacy`, public `/r/:token`.
   - (B) **Current primary surface — "Project Memory from connected work"**: `/project/:id` now renders the Project Memory experience (Today's Focus, category tabs, Ask Bracket, consolidated Project Update).
   - **The marketing site (`/how-it-works`) still describes the "five steps"** (surface A) as the core, while the app defaults to surface B. **Positioning has not caught up to the product's center of gravity.** This is the single biggest narrative risk.

2. **"Bracket never sends on your behalf" is now partially false. [VERIFIED]**
   - Older in-app copy (change drawer) says Bracket is read-only and never sends. But the product now has `POST /send-email` (threaded Gmail replies) and `POST /send-slack`, and Gmail OAuth requests `gmail.send` scope. **Bracket can now send messages directly** from Ask Bracket. Copy and privacy posture must be reconciled.

3. **Notion is wired in code, not merely "coming soon." [VERIFIED]** `notion` has a full OAuth path; it becomes available only when `NOTION_CLIENT_ID/SECRET` are configured. Earlier internal notes treated it as pending.

4. **Landing testimonials/case studies are illustrative. [VERIFIED / UNVERIFIED as evidence]** e.g. the "₹1 lakh clothing order" line reads as narrative, not a documented customer. Do not cite as traction.

5. **Currency is INR (₹) throughout the AI layer. [VERIFIED]** The product is implicitly **India-first** in tone and money framing, even though nothing else restricts geography.

---

## 1. Company / Product Overview

**What Bracket is [VERIFIED]**
Bracket is an authenticated web app (React + FastAPI + MongoDB) that turns scattered client-project communication into a single, structured, always-current **Project Memory**. It connects to the tools where client work actually happens (email, chat, design, code), uses an LLM layer to extract what matters, and surfaces it as six canonical categories: **Deliverables, Scope, Timeline, Requirements, Decisions, Deadlines.**

**The problem it solves [VERIFIED product intent + HYPOTHESIS on severity]**
For people running client projects, the "truth" of a project is smeared across Gmail threads, Slack channels, Figma comments, and GitHub — plus memory. Nobody maintains a clean record of what was agreed, what changed, and what's now at risk. Scope creep, missed deadlines, and "but you said…" disputes follow. **[HYPOTHESIS]** that this fragmentation is painful enough that professionals will adopt a dedicated layer to fix it.

**Why this problem exists [HYPOTHESIS]**
Communication tools optimize for messaging, not memory. Project-management tools optimize for tasks the user must manually enter and maintain — so they rot. No tool sits *between* the raw communication and the structured project truth and keeps them in sync automatically.

**Core value proposition [VERIFIED capability]**
"Connect your tools; Bracket reads the mess and keeps a live, trustworthy record of your project — and tells you the one thing that needs your attention." Concretely delivered today via: auto-sync from connected sources, six-category memory, a "Today's Focus" briefing, and a **single consolidated approval** for all changes at once.

**What makes Bracket different [VERIFIED where noted, else HYPOTHESIS]**
- **Ingests, doesn't ask you to enter.** Memory is built from real communication, not manual data entry. **[VERIFIED]**
- **One review, one approval.** Instead of approving each detected change separately, Bracket bundles everything (plus AI-computed downstream impacts) into one snapshot you approve or reject once. **[VERIFIED]**
- **A 5-second briefing, not a dashboard.** Default view is three sections capped at a handful of items, with an "all caught up" state. **[VERIFIED]**
- **Can act, not just observe.** Drafts and sends threaded client replies via Gmail/Slack. **[VERIFIED]**
- **[HYPOTHESIS]** that "auto-maintained memory + decisive summarization" is a durable wedge vs. tools that only store or only message.

---

## 2. Target Customers

**Primary ICP framing [HYPOTHESIS — ICP not yet proven]**
The product tone, personas baked into the AI system prompt, and marketing all point at **independent creatives and small client-service teams**. The AI explicitly adapts to five personas **[VERIFIED in code]**:
1. Indie creatives (writers, photographers, editors, illustrators, indie devs)
2. Small agencies (2–10 people)
3. In-house product designers
4. Juniors leveling up
5. Independent/freelance designers

**Segments and why Bracket is relevant**
- **Design agencies (small) [HYPOTHESIS].** Juggle multiple clients; scope creep and unclear sign-off directly cost margin. Bracket's scope-creep flagging + consolidated approval + client sign-off map cleanly to their pain.
- **Freelancers [HYPOTHESIS].** Live in email/WhatsApp/Slack with clients; no PM discipline; "what did we agree?" disputes hurt cashflow. Bracket gives a defensible record without process overhead.
- **Consultants [HYPOTHESIS].** Decisions and requirements evolve verbally; Bracket's Decisions/Requirements capture + history is a natural fit.
- **Small teams [HYPOTHESIS].** Need shared project truth without adopting heavyweight PM tooling.

**Workflows/pain points the product already targets [VERIFIED]:** email/Slack/Figma/GitHub as the real workspace; scope-creep detection; deadline surfacing; client reply drafting; a sign-off/accept-reject loop.

> ⚠️ Which of these is the *strongest* ICP is **unproven**. The instrumentation exists to find out (see §9), but the answer has not been established.

---

## 3. Product — what Bracket actually does today

**Authentication & onboarding [VERIFIED]**
Email OTP (primary), Emergent-managed Google OAuth, optional email/password, and a guest mode. Onboarding captures name, designation, avatar. One demo project is seeded per user so the app is never empty.

**Core capabilities [VERIFIED]**
- **Connect Work (multi-source OAuth).** Live: **Gmail, Slack, Figma, GitHub** (and **Notion** where configured). Users attach *specific* sources (a thread, a channel, a file, a repo) rather than granting blanket access.
- **Auto-sync.** A background poller (~10s cadence in-app) re-reads connected sources and detects meaningful changes.
- **Project Memory in six categories:** Deliverables, Scope, Timeline, Requirements, Decisions, Deadlines. (The data model also stores risk/assumption/commercial/question, not surfaced in the six tabs.)
- **AI extraction layer** (Claude/Gemini via the Emergent LLM key; Haiku-class model for extraction/replies): `analyze_connected_source`, `detect_source_updates`, `answer_project_question` (Ask Bracket), `suggest_project_reply`, `build_project_update`.
- **Ask Bracket.** On-demand assistant that drafts short, grounded client replies and can **send them** as threaded Gmail replies or Slack messages.
- **Consolidated Project Update.** All pending changes + AI-computed downstream impacts → one snapshot → approve/reject once.
- **Today's Focus dashboard.** Three sections — *Needs Your Action*, *What Changed Since Last Visit* (per-account, syncs across devices), *Coming Up (next 7 days)* — with an "all caught up" empty state.
- **Legacy decision flow.** 5-step flow → locked decision document → public client review page (accept-with-signature / reject-with-concerns) → owner reply loop.
- **Supporting:** notifications + Web Push (VAPID), activity/history views, an admin console with analytics.

**Key user journeys [VERIFIED]**
1. Sign in → onboarding → land on dashboard with a live demo project.
2. Connect a Gmail thread / Slack channel / Figma file → Bracket extracts memory → Today's Focus shows what changed.
3. Open a project → read the 5-second briefing → click "Review project update" → approve/reject all changes at once.
4. Ask Bracket to draft a client reply → edit → send threaded reply via Gmail/Slack.
5. (Legacy) Run the 5-step flow → lock a decision doc → share a review link → client accepts/rejects.

**What information Bracket captures & maintains [VERIFIED]**
Per project: deliverables, scope (incl. scope-creep flags), timeline events, requirements, decisions, deadlines — each with status (detected/confirmed/ignored), source provenance (which tool/thread), timestamps, and an edit/approval history.

**How it turns fragmented comms into context [VERIFIED]**
Raw source content → AI extraction into typed items → change detection against existing memory → consolidated review → confirmed memory + history trail. The provenance and history are what make the record trustworthy.

---

## 4. Product Philosophy

**The core idea [VERIFIED as design stance]**
Project truth should be a **byproduct of the work already happening**, not a second job. The system should read the communication and maintain the record; the human should only make decisions.

**What Bracket believes should change [HYPOTHESIS]**
- Stop asking people to *maintain* project state by hand — infer it.
- Replace endless small approvals with **one decisive review**.
- Replace dashboards-that-overwhelm with a **briefing you read in seconds**.
- Treat scope, decisions, and deadlines as first-class, provenance-backed facts — not buried chat.

**What it deliberately does differently from traditional PM tools [VERIFIED in product behavior]**
- No manual task entry as the primary input.
- No sprawling default view; aggressive summarization and an "all caught up" state.
- Changes are consolidated, not atomized into a chain of approvals.
- Opinionated, plain-language output (the AI takes a stance) rather than neutral data display.

---

## 5. Competitive Landscape

**Categories & overlap [VERIFIED overlaps, HYPOTHESIS on differentiation strength]**
- **Traditional PM (Asana, Trello, ClickUp, Jira, Monday).** Overlap: tasks/deadlines/status. Difference: they depend on manual upkeep; Bracket auto-maintains from communication and is client-facing (sign-off, replies).
- **Communication tools (Gmail, Slack, WhatsApp, Teams).** Overlap: they *are* where the work happens. Bracket sits on top and connects into them (read + send) rather than competing. Dependency, not just competition.
- **Knowledge/docs (Notion, Confluence, Google Docs).** Overlap: a "source of truth" store. Difference: those are manually authored and go stale; Bracket's memory is generated and kept current with provenance.
- **AI PM / context tools (emerging: AI notetakers, "project brain" copilots, meeting-summary tools).** Overlap: LLM summarization of work. Difference **[HYPOTHESIS]**: Bracket is structured around six durable project categories, a consolidated approval model, and client-facing action (reply/sign-off), not just notes.

**Where Bracket is differentiated [HYPOTHESIS]:** the combination of (auto-ingested structured memory) + (decisive one-shot approval) + (client-facing send/sign-off). Each piece exists elsewhere; the bundle is the bet.

**Honest risk:** none of the differentiators are individually a moat. Defensibility must come from workflow lock-in and accuracy over time — **unproven.**

---

## 6. Market & Opportunity

> ⚠️ No TAM/SAM/SOM figures are asserted — none were available or measured. The following are **categories and [HYPOTHESIS]**, not sized markets.

- **Relevant categories:** freelancer/agency ops tooling; client-services collaboration; AI work-context/copilots; proposal/scope/sign-off tools.
- **Beachhead [HYPOTHESIS]:** small design/creative studios and freelancers who feel scope-creep and sign-off pain acutely and live in Gmail/Slack/Figma — the exact integrations already built. India-first tone (₹) suggests an initial Indian creative-freelancer wedge, though nothing technical restricts geography.
- **Expansion [FUTURE]:** adjacent client-service verticals (marketing agencies, dev shops, consultancies), then small teams generally; deeper integrations (WhatsApp, Teams, Drive, Linear) to widen the funnel.
- **Assumptions needing validation [HYPOTHESIS]:** (a) the pain is top-3 for the ICP, (b) they'll connect their real inbox/Slack to a young tool (trust hurdle), (c) auto-extraction is accurate enough to be trusted, (d) willingness to pay exists.

---

## 7. Go-To-Market

> Current state: **[VERIFIED]** the product is free ("free during early access"), instruments acquisition (UTM/source tracking, sessions) and engagement (WAU, retention, NPS scaffolding). No paid acquisition is evidenced in code beyond the ability to *measure* organic vs. paid split.

**How to acquire first customers [HYPOTHESIS / recommended tests]**
- **Founder-led discovery** with 20–40 freelancers/agencies: watch a real project's comms and quantify the pain before pitching.
- **Design/freelance communities** (Slack/Discord groups, Twitter/X, LinkedIn, local creative networks) — organic, founder-voiced.
- **Pilots:** 5–10 hands-on pilots where the founder helps connect sources and observes whether the memory is trusted and used weekly.
- **Onboarding:** the demo-project seed + specific-source connect flow is already built to make first-run non-empty and low-risk. **[VERIFIED]**
- **Distribution channels to test [FUTURE]:** integration marketplaces (Slack, Figma, Google Workspace), agency communities, referral loops via the client-facing sign-off page (clients see Bracket → potential top-of-funnel).

**What to test first [HYPOTHESIS]:** which segment connects their tools and comes back in week 2. Activation = "connected ≥1 real source and returned." Retention over polish.

---

## 8. Business Model

> **[VERIFIED]** No billing, Stripe, subscriptions, or paid tiers exist today. Pricing is "free during early access." Everything below is **[HYPOTHESIS]**.

**Possible pricing models [HYPOTHESIS]**
- **Per-seat subscription** for individuals (freelancers/consultants) — simplest.
- **Per-workspace/agency** tier with multiple members and shared project memory.
- **Usage-adjacent** consideration: AI extraction has real per-project LLM cost (Emergent LLM key), so pricing must cover inference; heavy-usage tiers or fair-use caps are plausible.

**What could be charged for [HYPOTHESIS]:** number of active projects, connected sources, team members, AI actions (reply drafting/sends), history retention, client-facing sign-off volume.

**Individual vs team [HYPOTHESIS]:** land with a low-friction individual plan; expand to agency/team pricing where shared memory and multiple clients create the most value.

**Expansion/upsell [FUTURE]:** more integrations, client-facing exports/snapshots, advanced analytics, automation ("auto-send on approve"), white-label client review.

**Assumptions to validate [HYPOTHESIS]:** price point, whether individuals or agencies convert better, and whether AI cost per active project stays below a sustainable price.

---

## 9. Current Traction & Validation

> ⚠️ **Critical caveat:** The only numbers accessible to this document come from the **preview/dev database**, which includes developer, QA, and automated-testing accounts. **These are not production metrics** and must **not** be presented as traction to investors. Production (`use-bracket.com`) data is not accessible here.

**Instrumentation that already exists [VERIFIED] — this is itself a positive signal of measurement discipline:**
The admin "pitch metrics" endpoint computes: registered users, projects created, documents shared, **client accept rate**, **WAU**, **4-week retention** (cohort-based), **NPS** (from `nps_responses`), and **organic vs. paid split** (from UTM-tagged sessions). The landing page shows a live "professionals on Bracket" counter from a public metrics endpoint.

**Preview/dev snapshot [OBSERVED — dev data, June 2026, NOT production]:**
- Users: ~133 · Projects: ~108 · Memory items: ~715
- Users who connected ≥1 real integration: **16** (Gmail 16, Slack 3, Figma 3)
- Projects with a source connected: ~20
- Client review outcomes recorded: 7 accepted / 2 rejected (tiny sample)
- 7-day active users: ~25
- **Interpretation:** these confirm the *flows work end-to-end and are exercised*, and that **integration connection is the key activation drop-off to watch**. They say **nothing reliable** about market demand.

**Verified vs. assumed:**
- **[VERIFIED]** The end-to-end journeys function (auth, connect, extract, review, send, sign-off).
- **[OBSERVED, dev-only]** People *can* and *do* connect Gmail most often; other sources lag.
- **[HYPOTHESIS]** Any claim of product-market fit. **No validated PMF signal exists.**
- **No** documented paying customers, no revenue, no confirmed external pilots in the data available here.

---

## 10. Product Roadmap

**Already built [VERIFIED]**
- Email OTP + Google + password auth, guest mode, onboarding, demo seed.
- Multi-source OAuth: Gmail, Slack, Figma, GitHub (+ Notion where configured), with specific-source selection and ~10s auto-sync.
- Six-category Project Memory with provenance, status, and history.
- AI extraction, change detection, Ask Bracket (grounded Q&A + reply drafting).
- **Direct threaded sending** to Gmail & Slack.
- **Consolidated Project Update** (one review, one approval, AI downstream impacts).
- **Today's Focus** dashboard; per-account "last visit" tracking.
- Legacy 5-step decision flow + public client sign-off (accept/reject) loop.
- Notifications + Web Push; admin console + analytics/pitch metrics; SEO/marketing site.

**Currently being developed / recently shipped [VERIFIED — this session]**
- Simpler, one-sentence Project Update summary with details behind a toggle.
- Concise extraction + shorter, human client replies; email header encoding fix.

**Next priorities [HYPOTHESIS — from internal backlog]**
- Wire remaining "coming soon" integrations: **WhatsApp, Microsoft Teams, Google Drive** (and finalize Notion enablement).
- **Undo window** after approving an update; log each approved update as one History entry.
- **Sent confirmation** markers under Ask Bracket replies.
- **Structured deadlines** (real due dates) so "Coming Up" is exact.
- **Global search** across all memory.

**Longer-term opportunities [FUTURE]**
- Client-facing project snapshot/share link; automation on approve; team/agency workspaces; deeper analytics; white-label review; broader vertical templates.

---

## 11. Key Business Risks & Unknowns

1. **Who is the strongest ICP?** Five personas are served; none is proven as the wedge. **[HYPOTHESIS]**
2. **Willingness to pay & price point.** No billing exists; conversion is entirely unproven. **[HYPOTHESIS]**
3. **Retention / habit.** Does anyone connect a real source and return weekly? Dev data hints connection is the drop-off. **[OBSERVED-dev / HYPOTHESIS]**
4. **Distribution.** No proven acquisition channel. **[HYPOTHESIS]**
5. **AI accuracy & trust.** The entire value depends on extraction being trustworthy; errors on scope/decisions are high-stakes. Not independently validated. **[HYPOTHESIS]**
6. **Integration dependency & platform risk.** Bracket relies on Gmail/Slack/Figma/GitHub OAuth apps, review processes, and scope approvals (Figma app review already caused production friction). Platform policy changes are an existential dependency. **[VERIFIED risk]**
7. **Trust to connect a real inbox/Slack.** Asking a young tool for `gmail.send` and channel history is a high consent bar. **[HYPOTHESIS]**
8. **Competitive differentiation durability.** The bundle is the edge; no single moat. **[HYPOTHESIS]**
9. **Narrative/product mismatch.** Marketing sells the 5-step flow; product centers on Project Memory. Confuses positioning and measurement. **[VERIFIED]**
10. **Unit economics of AI.** Per-project inference cost vs. an unproven price. **[HYPOTHESIS]**

---

## 12. Founder Responsibilities [VERIFIED — per founders]

- **Saksham — Product, Design, Technology & overall product direction.** Owns what Bracket is and how it works: product decisions, UX/design, engineering, AI/integration architecture, and the roadmap.
- **Tanay — GTM, Customer Development, Market Research & customer acquisition.** Owns who Bracket is for and how it reaches them: discovery interviews, market/competitor research, pilots, outreach, and early-customer acquisition.

Interfaces to watch: ICP definition (shared), pricing (shared: cost is Product-owned, willingness-to-pay is GTM-owned), and closing the product↔narrative gap (both).

---

## 13. The 10–15 Strategic Questions for the Next 6–12 Months

1. **Which single ICP** (agency vs. freelancer vs. consultant) activates and retains best — and should we build/message for just one?
2. **What is the activation metric** that predicts retention (likely "connected a real source + returned in week 2"), and what's the current rate on *production*?
3. **Will users connect their real Gmail/Slack** to a young tool, and what removes the trust barrier (security posture, permissions clarity, read-only option)?
4. **Is the AI extraction accurate enough to be trusted** on scope/decisions/deadlines — and how do we measure and prove accuracy?
5. **Do people return weekly** without prompting, and what is real production 4-week retention?
6. **What will people pay, and per what** (seat, workspace, active project, AI actions)? Does the first pricing test convert?
7. **Do AI unit costs leave room** for a viable price at expected usage?
8. **Which single distribution channel** produces repeatable, cheap activation — and should we go all-in on it?
9. **Should we resolve the two-product split**: double down on Project Memory and re-message the site, keep the sign-off flow as a feature, or split them?
10. **How much does the client-facing sign-off/reply loop drive top-of-funnel** (clients discovering Bracket)?
11. **Which next integration** (WhatsApp / Teams / Drive) unlocks the most activation for the chosen ICP?
12. **What is the retention/expansion story for teams** vs. individuals — where is the money?
13. **How do we de-risk platform dependency** (OAuth review, scope changes) across providers?
14. **What is the one "magic moment"** in onboarding that makes the value undeniable in <60 seconds, and are we delivering it?
15. **What would make this defensible in 18 months** beyond being an early mover?

---

### Appendix — Source-of-truth basis for this document
- Frontend routes: `frontend/src/App.js` (marketing site, `/app`, `/app/connect`, `/project/:id` → Project Memory, legacy flow/document/review routes, `/admin`).
- Backend: `connectors.py` (OAuth + memory CRUD + Project Update + send endpoints), `connect_ai.py` + `ai_engine.py` (LLM layer, INR framing, five-persona system voice), `auth.py` (OTP/Google/password), `server.py` (`/public/metrics`, `/admin/pitch-metrics`, Web Push).
- Integration status from `PROVIDERS`/`OAUTH_CONF`: live = Gmail, Slack, Figma, GitHub, Notion(configurable); coming-soon = WhatsApp, Teams, Adobe, Google Drive, Dropbox, Linear.
- Metrics quoted are **preview/dev** counts (June 2026), explicitly **not** production traction.
