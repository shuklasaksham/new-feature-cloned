# Bracket — Business & Product Strategy (Plain-English Version)

**Date:** June 2026

**Two simple markers used in this doc:**
- ✅ **Real today** — this actually exists in the product right now (I checked the code).
- 🔵 **Not proven / planned** — this is a guess, a plan, or a hope. Not a fact yet.

**One honesty note before you read:** the traction numbers in **§9 are now REAL production data** from use-bracket.com (measured **2026-08-28**, guests excluded). The market-size and industry figures in §5/§6/§8 are **external research** (sources listed at the end). Everything else is either code-verified (✅) or a clearly-marked guess (🔵). Nothing was invented.

---

## In one line
**Bracket connects to the tools where client work happens (email, Slack, Figma, GitHub), reads the mess, and keeps one clean, always-updated record of your project — then tells you the one thing you need to deal with.** ✅ Real today

---

## ✅ 2 inconsistencies — now FIXED (June 2026)
These were flagged in an earlier draft and have since been corrected in the product:

1. **Website vs. app story — FIXED.** ✅
   The marketing site now leads with the real product. The Landing page was already "The Project Memory OS for client work"; **How it Works** now opens with "Connect once. Bracket keeps up." and a 4-step everyday loop (connect → Bracket reads → 5-second briefing → approve & reply), with the old 5-step flow clearly relabelled as the *optional* decision & sign-off flow. **FAQ** and **Terms** updated to match.

2. **"Bracket never sends messages for you" — FIXED.** ✅
   Copy now tells the truth: Bracket **can** draft and send client replies through Gmail and Slack, but **only when you explicitly approve** — never on its own, and it never edits or deletes. Updated in the FAQ, Terms, Privacy policy (incl. the Google Limited-Use section), the in-app change drawer, and the onboarding welcome. Figma/GitHub/Notion remain read-only.

### Still worth watching
- **Illustrative testimonials.** The landing/case-study stories (e.g. the "₹1 lakh order") read as examples, not documented customers. Don't cite them as traction until you have named, permissioned cases.

---

## 1. What is Bracket?

**The problem.** ✅ (problem is real; how *painful* it is = 🔵)
When you run client projects, the truth is scattered — some in email, some in Slack, some in Figma comments, some just in your head. Nobody keeps a clean record of what was agreed, what changed, and what's now at risk. Result: scope creep, missed deadlines, and "but you said…" arguments.

**What Bracket does about it.** ✅ Real today
You connect your tools. Bracket reads them automatically and builds a live record organized into six simple buckets: **Deliverables, Scope, Timeline, Requirements, Decisions, Deadlines.** When something changes, it tells you.

**Why it's different.** (✅ where noted)
- It **reads** your tools instead of asking you to type everything in. ✅
- It gives you **one summary and one approval** for all changes at once, instead of nagging you approval-by-approval. ✅
- The home screen is a **5-second briefing**, not a busy dashboard. ✅
- It can **reply to clients for you** (with your OK) through Gmail/Slack. ✅
- 🔵 The bet: "a record that updates itself + a clear summary" is something people will keep using. Not proven yet.

---

## 2. Who is it for?

The product's tone and built-in AI clearly aim at **independent creatives and small client-service teams.** ✅ (the AI is literally tuned for these people)

The four likely customer types (which one is *best* is 🔵 not proven):
- **Small design agencies** — juggle many clients; scope creep eats their profit.
- **Freelancers** — live in email/WhatsApp/Slack; no formal process; disputes cost them money.
- **Consultants** — decisions change verbally; they need a clear record.
- **Small teams** — want shared project truth without a heavy PM tool.

**Why Bracket fits them:** it removes the "keep everything organized" chore and gives them a defensible record — without forcing a new process on them. 🔵 (fit is logical, not yet validated with paying users)

---

## 3. What can a user actually do today? ✅ Real today

1. **Sign in** with an email code, Google, or a password (guest mode too). A demo project is pre-loaded so the app is never empty.
2. **Connect a tool** — a specific Gmail thread, a Slack channel, a Figma file, or a GitHub repo. (Notion works too when set up.)
3. Bracket **reads it automatically** (re-checks every ~10 seconds) and fills the six buckets.
4. Open a project and read the **"Today's Focus"** screen: *What needs you*, *What changed since last time*, *What's coming in 7 days*. If nothing needs you, it says **"You're all caught up."**
5. Click **"Review project update"** — see everything that changed in one place and **approve or reject it all at once.**
6. Ask **"Ask Bracket"** to draft a client reply, tweak it, and **send it** straight into the email thread or Slack channel.
7. (Older feature) Run a **5-step flow** to produce a locked document and send clients a **sign-off page** where they accept or reject.

**What it remembers per project:** every deliverable, scope item, timeline event, requirement, decision, and deadline — with where it came from (which tool), when, and a history of changes. ✅

---

## 4. What Bracket believes 🔵 (this is the philosophy/bet)
- Keeping a project's record should be **automatic**, a side effect of the work — not a second job.
- People should spend their time **deciding**, not updating trackers.
- Show someone the **one thing that matters**, not a wall of information.
- Approve changes **once**, not fifty times.

This is deliberately the opposite of traditional project tools, which make *you* enter and maintain everything.

---

## 5. Who else is out there?

| Type of tool | Examples | How Bracket relates |
|---|---|---|
| Project management | Asana, Trello, Jira, ClickUp | They need constant manual updating. Bracket updates itself and talks to clients. |
| Communication | Gmail, Slack, WhatsApp | Bracket sits *on top* of these and plugs into them — partner, not rival. |
| Docs/knowledge | Notion, Confluence, Google Docs | Those are written by hand and go stale. Bracket's record is generated and stays current. |
| New AI "work assistants" | AI note-takers, project copilots | Closest competitors. Bracket's angle: structured project buckets + one-click approval + actually replying to clients. |

**Honest take:** no single one of Bracket's features is impossible to copy. The edge is the *combination* — and that edge is 🔵 not yet proven to be defensible.

**Who's actually out there (real players & prices, 2026):**
- **Freelancer/agency client-management incumbents:** **HoneyBook** (client-experience/proposals-to-payment; US/Canada only; ~$29–$49/mo after an ~89% price rise in early 2025), **Bonsai** (ledger-first, per-user; acquired by Zoom Dec 2025), **Dubsado** (deep automation, steep 2–3 week setup). Cheaper alternatives: **Moxie** (~$10/mo), **Plutio** (workspace pricing), **Agiled**, **Bloom**. _(The Stack Architects; FirmTools; Agiled)_
- **Execution/PM & docs:** ClickUp, Asana, Jira, monday, ONES; Notion, Confluence, Google Docs.
- **The gap none of them close [KEY]:** all of the above are **manual-entry** — you feed them. **None reads your Gmail/Slack/Figma/GitHub and maintains the project record for you.** That is exactly where Bracket sits. Bracket is closer to a "**layer on top of the tools you already use**" than a replacement CRM or task board — which is both its differentiation and its dependency risk (§11).

---

## 6. Market & opportunity

> These are **external, sourced market facts (2025–2026)** — real data about the *market*, not about Bracket's own traction. They validate that the problem is large and unsolved; they do **not** prove Bracket has won any of it.

**How big is the space Bracket touches?**
- **Project management software:** ~**$9.1B in 2025 → ~$16.9B by 2030** (~12.6% CAGR). The project-portfolio segment is growing even faster (~14% CAGR). _(The Business Research Company; Grand View Research)_
- **Freelance economy (Bracket's core users):** ~**1.57B freelancers globally** (~47% of the workforce, broad definition); **76.4M in the US** (~38% of the US workforce). Total freelance earnings estimated **$1.3–1.5 trillion/yr**. _(Upwork; multiple 2025–26 trackers)_
- **Creative work is the biggest freelance slice:** design/creative is ~**32.5% of demand** on major freelance platforms; the global freelance **creative-services market was ~$248B (2023)**. _(ENTEEF; Gitnux)_
- **India (Bracket's likely first market, given the ₹ framing):** ~**12M gig/platform workers** (Economic Survey 2025-26) and ~**15M professional freelancers** (industry). India's freelance-platform market: **$265M (2025) → ~$1.5B by 2033 (~25% CAGR)**; project-based hiring **up 38% in FY25**; India is the **2nd-largest talent supplier on Upwork**. _(Economic Survey; Flexable; xFlow)_

**Is the problem real? The data says clearly yes:**
- **Scope creep hits ~52% of projects.** Of those, **85% finish over budget**, with an **average 27% overrun** — and this has barely improved in a decade. _(PMI-aligned research; PM Study Circle)_
- **Communication is the #1 delay driver for agencies: 32%** of agencies name client communication as the top cause of project delays; **46%** struggle with scoping; **79%** over-service clients. _(WifiTalents; setup.us; FunctionFox 2025)_
- **The record is a mess by default: 44% of agencies still manage briefs over email, and 16% communicate them verbally with no formal record.** _(Decision Marketing)_ — this is almost a direct description of the gap Bracket fills.
- **Tool sprawl is the norm:** the average marketing team runs **14 disconnected tools**; knowledge workers lose **~12 hours/week** to context-switching and hunting for info, toggling apps **~1,200×/day**. _(Switch to Landing 2026; AgencyPro)_
- **AI is already in the workflow: 60% of freelancers use AI** (saving ~12 hrs/week) and **34% of agencies** have adopted it business-wide. The 2026 differentiator is shifting to **AI-native tools with a single data layer** that remove manual handoffs. _(Karbon; HyperscaleAI)_

**Where this leaves Bracket [HYPOTHESIS, but well-supported]**
- **Beachhead:** small design/creative studios and freelancers who feel scope-creep and "lost the thread" pain, already live in Gmail/Slack/Figma, and are open to AI — an **India-first** wedge is plausible and cheaper to reach.
- **The whitespace:** every incumbent (see §5) is **manual-entry** — CRMs, proposals, invoices, or task boards you must maintain. **None auto-builds a project record by reading the client's actual communication.** That specific gap is what the "44% email / 16% verbal / no formal record" stat exposes.
- **Grow into:** marketing agencies, dev shops, consultancies, then small teams; more integrations widen the funnel.
- **Still to validate:** switch-pain vs. inertia, trust to connect a real inbox, AI accuracy, and willingness to pay.

---

## 7. How to get the first customers 🔵 (recommended plan, not done yet)
Today the app is **free** and already tracks where signups come from. ✅

Suggested first moves:
- **Talk to 20–40 freelancers/agencies.** Watch one real project's mess and confirm the pain before selling.
- **Go where they hang out:** design/freelance communities, Twitter/X, LinkedIn.
- **Run 5–10 hands-on pilots.** Help them connect their tools, then see if they come back next week.
- **Lean on the client sign-off page** — clients see Bracket, which could bring in new users.

**Test first:** which group connects a real tool and returns a week later. That's the only signal that matters early.

---

## 8. How Bracket could make money 🔵 (nothing is charged today)
There is **no paid plan or billing in the product right now.** It's free during early access. ✅

Possible later:
- A **monthly plan per person** (freelancers/consultants).
- A **team/agency plan** with shared projects and multiple members.
- Note: the AI costs real money per project, so any price has to cover that.

**Price anchors from the market (2026):** comparable freelancer tools sit at roughly **$10–$49/month** — Moxie ~$10, HoneyBook ~$29–49, Bonsai per-user. That's the realistic band for an individual Bracket plan; team/agency plans typically price higher per workspace. **In India, willingness-to-pay is lower** and adoption skews to tools that help with client acquisition, payments, and automation — so India-first pricing likely needs to be well below the US band. _(The Stack Architects; Karbon)_

**Charge for things like:** active projects, connected tools, team members, or AI actions (drafting/sending replies).

**Must find out:** the right price, and whether individuals or agencies pay more reliably.

---

## 9. Do we have traction? Be honest: not proven.
- ✅ The whole journey **works end-to-end** (sign in → connect → read → review → reply → sign-off).
- 🔵 There is **no confirmed paying customer, no revenue, and no proof people love it** in the data I can see.
- **Good sign:** the app already measures the right things — weekly active users, 4-week retention, client accept rate, NPS, and where traffic comes from. ✅ (Most early startups don't bother; Bracket does.)

**Live production numbers — use-bracket.com (measured 2026-08-28, read-only from the production database).** Guest/anonymous accounts are excluded so these are *real* people.

| Metric | Real figure | What it means |
|---|---|---|
| Registered users | **63** (73 incl. 10 guests) | Very early. |
| New signups, last 30 days | **5** real (10 of 15 recent were guests) | Growth is slow right now. |
| Users who connected ≥1 tool | **7** | ⚠️ The big one — only ~11% of signups ever connected a tool. |
| — by provider | Gmail 7, Slack 1, GitHub 1, Figma 0, Notion 0 | Gmail is the only real entry point so far. |
| Projects created | **62** | People make projects… |
| Projects with a tool connected | **7** | …but few connect anything to them. |
| Projects with memory extracted | **4** | Only 4 projects ever became "live memory." |
| Weekly active users | **5** | |
| Monthly active users | **8** | |
| Retention (loose proxy) | **~2–5%** of the 4-week-old cohort still active | Low; not a real cohort-retention calc (see note). |
| Client sign-off | 5 shared, **2 accepted** (~40%) | Sample too small to read into. |
| NPS | n=**2** (avg 9.0) | Not meaningful at n=2. |
| Website traffic | ~2,893 sessions, **94% direct**, ~4% Google | Mostly anonymous/crawler; not signups. |

**The honest read of this data:**
- **Bracket is at the very beginning** — ~63 real users, ~5 weekly actives. No traction claim is justified yet.
- **The #1 problem is crystal clear: activation.** 63 people signed up, but only **7 connected a tool** and only **4 projects ever got a live memory.** The value only exists after you connect something — and almost nobody does. **Fixing "connect your first tool" is priority number one.**
- **Retention is low** (single-digit actives) and **there is no paying customer, no revenue, and no proof of product-market fit.**
- **Gmail is effectively the only working front door** (7 of 7 connectors). Slack/GitHub barely used; Figma/Notion unused in production.
- **Positive:** the plumbing works in production (projects → connected sources → 52 auto-extracted memory items), and the app genuinely measures the right things (WAU, retention, accept rate, NPS, sources).

_Notes: figures are a point-in-time read on 2026-08-28. "Retention" is a rough lower-bound (current activity of users who joined ≥4 weeks ago), not a true per-user week-4 calculation — the production data store couldn't compute the exact window. Acquisition is by referrer, not paid/organic tags, so paid spend can't be isolated. There is no message-send log, so reply-send volume isn't reported._

---

## 10. Roadmap

**Already built ✅**
- Sign-in (email code / Google / password), onboarding, demo project.
- Connect Gmail, Slack, Figma, GitHub (Notion when set up), auto-refresh every ~10s.
- The six-bucket Project Memory with sources + history.
- Ask Bracket (answers + drafts replies), and **sending** replies via Gmail/Slack.
- **One-click "Project Update"** (approve/reject all changes together).
- **"Today's Focus"** home screen.
- The older 5-step flow + client sign-off page.
- Notifications, admin dashboard with analytics.

**Just shipped ✅**
- Simpler Project Update screen (one-line summary, details hidden until you want them).
- Shorter, more human client replies; fixed a garbled-email bug.

**Next 🔵**
- Add WhatsApp, Microsoft Teams, Google Drive; finish Notion.
- "Undo" after approving; a cleaner history log.
- Real due dates so "Coming Up" is exact.
- Search across everything.

**Later 🔵**
- Shareable client summary/report, team workspaces, automations, deeper analytics.

---

## 11. Biggest risks / open questions 🔵
1. **Activation is the #1 proven problem.** Real production data (2026-08-28): 63 users, but only **7 connected a tool** and **4 projects got a memory**. Until "connect your first tool" is fixed, nothing else matters.
2. **Which customer type is really the best fit?** Not known.
3. **Do people come back weekly?** Now measured and **low** — ~5 weekly actives, single-digit retention on the live site. No PMF yet.
4. **Will anyone pay, and how much?** Not tested (market anchor: ~$10–49/mo, lower in India).
5. **How do we reliably find customers?** No proven channel.
6. **Is the AI accurate enough to trust** on scope and decisions? Must be measured.
7. **We depend on Gmail/Slack/Figma/GitHub approvals.** (Figma's app review already caused a live outage.) This is a real, ongoing dependency. ✅ risk
8. **Will people connect their real inbox** to a young tool? Big trust hurdle.
9. **Website vs. app story — now fixed (June 2026).** The marketing site (How it Works / FAQ / Terms) and the "never sends" claim have been corrected to match the current product. ✅ Keep the whole site aligned as the product evolves.

---

## 12. Who does what (founders) ✅
- **Saksham** — Product, Design, Technology, and overall product direction. (What Bracket is and how it works.)
- **Tanay** — Go-to-market, customer development, market research, and getting customers. (Who it's for and how it reaches them.)

---

## 13. The questions to answer in the next 6–12 months
1. Which **one** customer type should we build and sell for?
2. What action predicts that a user will stick (probably "connected a tool and came back")? What's the real rate on the live site?
3. Will people **trust us with their inbox/Slack**? What makes that easier?
4. Is the **AI accurate enough** — and how do we prove it?
5. Do people **return weekly** without being nudged?
6. **What will they pay**, and for what?
7. Do the **AI costs** leave room for a fair price?
8. Which **one marketing channel** actually works?
9. Do we **fix the two-story problem** (website vs. app)?
10. Does the **client sign-off page bring in new users**?
11. Which **next integration** (WhatsApp/Teams/Drive) helps most?
12. Where's the money — **individuals or teams**?
13. How do we **reduce dependence** on the big platforms' approvals?
14. What's the **"wow" moment** in the first 60 seconds — and are we delivering it?
15. What makes Bracket **hard to copy** in 18 months?

---

*Everything marked ✅ was checked directly in the app's code. Everything marked 🔵 is a plan or a guess and still needs proof. No customers, revenue, or market sizes were made up.*

---

### Market-research sources (external, 2025–2026)
Figures in §5, §6 and §8 are drawn from public research and are about the **market**, not Bracket:
- **PM software market size:** The Business Research Company; Grand View Research; IDC; Mordor Intelligence.
- **Scope creep / project failure:** PMI *Pulse of the Profession 2025*; PM Study Circle; PM World Library (2026 IT failure-rate update).
- **Freelance economy:** Upwork resources; whatsthebigdata; trybiut; invopilot; ENTEEF Global Freelancer Market Report; Gitnux.
- **Agency tool sprawl & communication pain:** Switch to Landing "Tool Sprawl Report 2026"; AgencyPro; HyperscaleAI; WifiTalents; setup.us "2025 Marketing Relationship Survey"; FunctionFox "2025 Creative Agency Industry Report"; Decision Marketing.
- **Competitors & pricing:** The Stack Architects (Bonsai vs HoneyBook / alternatives); FirmTools; Agiled; ratethetool; ONES.com AI-PM tools guide.
- **India market & willingness to pay:** India Economic Survey 2025-26; Flexable; xFlow; Karbon; Outsized "Talent on Demand 2025"; ISB "India's Creator Economy."

_Note: research estimates vary by methodology and definition; treat single figures as directional, not precise._
