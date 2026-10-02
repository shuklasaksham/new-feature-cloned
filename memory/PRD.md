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
