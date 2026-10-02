# Bracket Demo Workspace (Sandbox)

A pre-populated, fully interactive demo project that lets a brand-new user experience Bracket's complete value — ingestion, project memory, change detection, conflict handling, Ask Bracket, reply drafting and a simulated email loop — using realistic fictional data, before connecting any real account.
It reuses the existing Bracket workspace, components and AI pipeline; it is not a tour, a separate site, or a redesign.

## Who it's for
- New users who land in Bracket but haven't yet connected Gmail/Slack/Figma/GitHub or uploaded notes, and want to see what Bracket does before trusting it with real data.
- Existing users who want to re-experience or show the core loop on demand without touching their real projects.

## Core features and experience

**1. Entry points**
- During first-run onboarding, before any integration step, two clear choices are presented:
  - "Try a demo workspace" — marked *Recommended*, sub-text "Experience Bracket with a fictional project. No integrations required."
  - "Connect my business" — the existing connect/onboarding path, unchanged.
- Choosing the demo immediately opens a ready, pre-populated demo project — no OAuth, no integration setup, no questionnaire.
- For existing users, a persistent "Demo Workspace" entry appears in the sidebar/project switcher only, visually separated from real projects and clearly labelled as Demo. It is not added to the account or settings menus. Once opened it behaves like a Bracket project but can never be mistaken for a real one.

**2. The demo project (initial state)**
- One fictional project: **Harbor — Payments App Launch**. A product studio is designing and building a new payments app for a fintech client, Harbor. This modern software-build scenario makes all five sources coexist naturally: Gmail (client/stakeholder emails with Harbor), Slack (the studio's internal team channel), Figma (product/UI design files and comments), GitHub (the engineering repo — PRs, issues, commits), and recurring project meetings.
- People: Sarah (Harbor's product lead — the client), Alex (designer at the studio), Mike (engineer at the studio), and the user (the studio's project owner/account lead).
- The workspace opens already **established and lived-in**, not empty. It is seeded with a substantial baseline of historical project memory so Ask Bracket is genuinely useful from the first second — before the simulation is ever started. Baseline includes: confirmed scope (marketing website, customer dashboard, authentication, payments), a confirmed decision (Stripe for payments), the current launch date (October 20), named deliverables, requirements, open questions, and a back-history of Gmail threads, Slack discussion, Figma comments, GitHub activity and meeting notes that produced that memory.
- The point of the simulation (below) is to show how this *already-established* project memory **evolves** as fresh activity arrives — not to build the project from scratch.
- The workspace is clearly and persistently marked as a **Demo Workspace** with fictional data throughout.

**3. Live project simulation ("Simulate incoming activity")**
- A subtle control inside the demo releases ~5–7 predetermined events one at a time (not all at once), pacing the full run at roughly 30–45 seconds, and the user can always advance immediately to the next event rather than wait for the timer.
- Each event flows through Bracket's real ingestion → extraction → memory → change-detection pipeline (same logic used for real sources), with a curated expected-outcome safety net so the staged beats always land even if the model phrases things differently. The planned beats:
  - **Gmail — Sarah** asks to move the launch from Oct 20 → Oct 27 for stakeholder review → deadline change detected (source: Gmail).
  - **Slack — team** decides to include analytics in V1 → potential scope change detected (source: Slack).
  - **Figma — comment** still references "ready for the October 20 launch" → Bracket surfaces a **conflict** (Gmail Oct 27 vs Figma Oct 20), preserving both values and their sources rather than assuming the newest wins, with a "Review conflict" action.
  - **Meeting notes** discussing the analytics requirement and launch delay → extracted as requirement/decision/deadline/scope using the same notes logic.
  - **GitHub** activity related to analytics → reinforces the scope change (not random noise).
- New activity, detected changes and the conflict appear in the existing workspace surfaces (attention/change cards, memory counts, conversations, timeline).

**4. Ask Bracket (live)**
- Ask Bracket works inside the demo against the demo project's actual accumulated memory/context — real answers, not canned text.
- Because the project opens with a seeded baseline of memory, Ask Bracket is useful **immediately on open**, before any simulation: a new user can ask about current scope, the launch date, the Stripe decision or open questions and get grounded, sourced answers right away.
- After simulation events occur, the suggested questions adapt to the new activity, e.g. "Why was the launch date changed?", "What changed in scope this week?", "What did the client say about analytics?", "Are there conflicting requirements?", "What decisions are still unresolved?".
- Answers cite the relevant sources using Bracket's normal source-reference pattern (e.g. explaining the Oct 20 → Oct 27 move and noting the lingering Figma Oct 20 conflict).

**5. Suggested reply + demo email**
- When the launch-date conflict is detected, a "Draft clarification email" action generates a reply (live) asking Sarah to confirm Oct 27 vs the Oct 20 design handoff.
- The user edits it in the existing reply/email composer.
- In demo mode the send button becomes "Send demo email": clicking it shows success feedback, adds the outgoing message to the demo conversation history, and clearly states no real email was sent. No real email is ever sent in demo mode.

**6. Simulated client response**
- A short delay after the demo email, a reply from Sarah arrives ("Yes, October 27 is confirmed. Please disregard the old October 20 date.") through the same demo ingestion path.
- Bracket processes it: the conflict resolves, the confirmed launch date becomes October 27 (source: Sarah via Gmail), and memory/UI update accordingly — completing the full feedback loop.

**7. Conversion to real workspace**
- A subtle, non-intrusive persistent marker in the demo: "Using demo data — Connect your business →".
- After the main loop completes, a closing prompt: "That's Bracket with demo data. Now let Bracket keep up with your business." Primary CTA "Connect my tools" (routes into the existing real integration/onboarding flow — no new flow), secondary "Continue exploring demo".

**8. Reset**
- A "Reset demo" control restores the fictional project to its original seeded state so the simulation can be replayed. Reset never affects the user's real projects.

**9. Analytics**
- Funnel events are recorded: demo_workspace_opened, demo_simulation_started, demo_change_detected_viewed, demo_conflict_viewed, demo_ask_bracket_used, demo_reply_generated, demo_email_sent, demo_conflict_resolved, demo_completed, demo_connect_tools_clicked — so the path from demo → change detection → Ask Bracket → demo reply → completion → real connection can be measured.

## User flow
Enter demo → see a realistic, already-established Harbor Payments App Launch project with usable memory (Ask Bracket works right away) → start simulation → Gmail deadline change appears → Slack scope change appears → Figma creates a conflict Bracket surfaces (both dates preserved) → ask Bracket why the launch changed and get a sourced answer → draft the clarification email → edit it → "Send demo email" → simulated Sarah reply arrives → Bracket resolves the conflict and updates memory (Oct 27 confirmed) → closing prompt to "Connect my tools" (real flow) or keep exploring. Reset at any time replays from the seeded state.

## UI/UX feel
- Identical to the existing Bracket product: same dark Linear-grade aesthetic, same workspace pages, sidebar, memory system, conversations, timeline, change/attention cards, Ask Bracket and reply composer. The only demo-specific chrome is clear "Demo Workspace / fictional data" labelling, the "Simulate incoming activity" and "Reset demo" controls, the demo-mode "Send demo email" relabelling, and the conversion prompt.
- No slideshow tour, no fake dashboard, no fake screenshots, no tutorial popup spam, no separate frontend.

## Implementation phases

**Phase 1 — MVP (built now):** Everything above — demo entry points (onboarding + sidebar switcher), the seeded Harbor Payments App Launch demo project (opening with a usable baseline of memory) isolated per user, the demo connector feeding the real pipeline with safety-net fallbacks, the ~30–45s 5–7 event simulation including the conflict, live Ask Bracket (useful immediately on open) with suggested questions, live reply drafting, "Send demo email" with the simulated client response and conflict resolution, the conversion prompt into the real connect flow, reset, and the analytics funnel events.

**Phase 2 (later):** Additional demo scenarios/personas beyond Harbor; richer pacing controls; optional guided highlights pointing at where changes surfaced (still inside the real UI, no slideshow).

**Phase 3 (later):** Localisation of demo content; A/B variants of the demo script measured against the funnel; shareable read-only demo link for prospects.

## Assumptions
- Demo pipeline uses the hybrid approach: authored event content runs through the real extraction/change-detection and live Ask Bracket/reply drafting, with a curated expected-outcome fallback per event so staged beats are guaranteed. This means each demo run does consume a small amount of LLM credit for the live steps.
- There is exactly one demo project per user ("Harbor — Payments App Launch"), it is free, never counts against plan limits or the 14-day trial, and is fully isolated from real/production data.
- Bracket has no native "conflict between two sources" primitive today; the conflict beat is surfaced by preserving both sourced values and presenting them through the existing attention/change-card pattern plus a "Review conflict" action — not by assuming the newest source wins.
- The demo reuses the existing real connect/onboarding flow for conversion; no parallel integration flow is created.
- The demo is available to signed-in users (so it can be isolated per user and reset safely); it is surfaced at first-run onboarding and in the sidebar switcher, not in account/settings menus.
- Real projects and the existing real-user workflow are unchanged; demo behaviour is gated behind a demo mode flag on the project/workspace.
- Demo content (people, messages, dates) is fictional and fixed for Phase 1; the only variable outputs are the live LLM answers/reply text.
