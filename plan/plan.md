# Bracket marketing page — clearer positioning and story

A rebuild of the public homepage so a first-time visitor understands, within seconds, what Bracket is and why it matters. Bracket is positioned as **the memory layer for your business**: it connects the tools where work already happens, notices when something important changes, and lets you ask it anything about your projects.

## Who it's for
Teams and operators who run work across scattered tools — email, chat, design, code, docs — and keep losing track of what was decided, what changed, and where things stand. The copy speaks to any team (not only freelancers/agencies), while client/project work remains a natural example.

## What the page must communicate (the core message)
Three pillars, repeated consistently across the page:
1. **Connect your tools** — Gmail, Slack, Figma, GitHub, Notion and more feed into one memory.
2. **Change detection** — when scope, requirements, decisions or deadlines shift, Bracket surfaces exactly what changed and what it affects.
3. **Ask Bracket** — ask questions in plain language and get answers grounded in everything that's been said and done.

The current page gestures at this with a single abstract line ("Your client changed something. Bracket already knows.") and never plainly states what the product does, what it connects, or what you get. The rebuild fixes that.

## Page sections (top to bottom)
1. **Launch ribbon + Product Hunt** — keep the existing launch ribbon and the "free for 14 days, no card" offer; keep the Product Hunt badge in the hero (dark theme, as it is now).
2. **Hero** — a plain-language headline naming the product and promise ("The memory layer for your business"), a one-sentence explanation, primary **Get started** and **See pricing** buttons, and the Product Hunt badge beneath them.
3. **Integrations strip** — a row of recognizable logos (Gmail, Slack, Figma, GitHub, Notion, and others) with a short line so visitors instantly see what connects.
4. **Problem** — a short, honest section naming the pain: work and decisions live scattered across tools, changes slip by unnoticed, and reconstructing context wastes time.
5. **How it works** — the three pillars above, each with a title, one-line explanation, and a supporting visual or icon. Connect → Detect changes → Ask.
6. **What you get / benefits** — a handful of concrete outcomes (e.g. nothing important slips, one place for project truth, answers without digging). Benefit-led copy only, no invented statistics.
7. **Product visual** — keep the existing live app-preview mockup, placed to reinforce the pillars.
8. **FAQ** — a short set of plain-answer questions (what Bracket is, what it connects, how change detection works, what "Ask Bracket" does, data/privacy at a high level, pricing/trial).
9. **Final CTA** — restated promise, **Get started** button, and the 14-day free offer.

## User flow
A visitor lands → reads the hero and immediately knows what Bracket is → sees the tools it connects → recognizes their own problem → understands the three pillars → sees the benefits and a real product shot → has remaining doubts answered in the FAQ → clicks **Get started** (or **See pricing**). Every CTA routes to the existing sign-up/login, and the 14-day free offer is visible at entry and exit.

## UI/UX feel
Keep the current Linear-grade flat dark aesthetic (#111111, Geist, pill CTAs, subtle entrance motion). This is a content and structure rework, not a visual restyle — new sections adopt the existing design language so the page stays cohesive. Desktop-only; no separate mobile treatment.

## Implementation phases

**Phase 1 (built now — MVP):** Full rewrite of the homepage with all sections above — new hero/positioning copy, integrations strip, problem, three-pillar how-it-works, benefits, FAQ, and final CTA — reusing the existing product visual, launch ribbon, 14-day offer, and Product Hunt badge.

**Phase 2 (later):** Social proof — testimonials/quotes and customer logos once real ones exist; optional short product demo clip in the hero or how-it-works.

**Phase 3 (later):** Deeper content — a dedicated per-integration explainer, a security/privacy page, and any real usage numbers once available.

## Assumptions
- Lead positioning is "The memory layer for your business" (broad, any team), with client/project work as a recurring example rather than the sole framing.
- The three pillars (connect tools, change detection, Ask Bracket) are the backbone of the page; "Ask Bracket" refers to the existing in-app ask feature.
- The integrations strip lists currently supported sources (Gmail, Slack, Figma, GitHub, Notion); providers still mocked/unreleased are not implied as live.
- No testimonials, customer logos, or numeric stats are shown in Phase 1 (none are real yet); copy stays benefit-led.
- The existing launch ribbon, 14-day free trial offer, and Product Hunt badge are retained as-is.
- This is a copy/structure rework within the existing dark design system — no new brand colors, fonts, or visual restyle.
- All CTAs continue to point to the existing sign-up/login and pricing routes; no backend, pricing, or auth changes.
