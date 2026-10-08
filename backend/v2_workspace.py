"""Bracket v2 workspace API.

Serves the rich seeded project ("Fintech Landing Page Redesign") that the
bracket-v2 frontend was designed against, so the new workspace UI
(Overview / Memory / Attention / Timeline / Sources / Reviews / Threads / Ask)
is fully populated and interactive. Mounted at /api/v2.

The per-workspace read endpoints return this fixture for ANY workspace id (so
the sandbox workspace id, the demo project, and real project ids all render).
`/workspaces` additionally lists the signed-in user's real projects so their
own data is visible in the switcher.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request
from pydantic import BaseModel

from auth import current_user_optional
from connectors import db

router = APIRouter(prefix="/api/v2")

MIN = 60
HOUR = 3600
DAY = 86400


def _now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat()


def mins(m):
    return iso(_now() - timedelta(minutes=m))


def dago(days, hhmm="09:00"):
    h, m = map(int, hhmm.split(":"))
    x = _now() + timedelta(days=days)
    x = x.replace(hour=h, minute=m, second=0, microsecond=0)
    return iso(x)


def ev(provider, author, where, at, quote, source_id="", ref_id=""):
    return {"provider": provider, "author": author, "where": where, "at": at,
            "quote": quote, "source_id": source_id, "ref_id": ref_id}


def _seed():
    people = [
        {"id": "pe1", "name": "Sarah Chen", "role": "Client lead", "org": "Acme Finance", "email": "sarah.chen@acmefinance.com", "messages": 12, "summary": "12 messages · 3 commitments", "role_in_work": "Day-to-day decision maker for the website", "approves": "Design direction (confirmed) · scope changes (unconfirmed)", "approves_confidence": "low", "prefers": "Email for decisions, Slack for quick questions"},
        {"id": "pe2", "name": "James Park", "role": "Head of Marketing", "org": "Acme Finance", "email": "james.park@acmefinance.com", "messages": 6, "summary": "6 messages · approved proposal", "role_in_work": "Budget owner; approved the proposal", "approves": "Budget and contract", "approves_confidence": "high", "prefers": "Email"},
        {"id": "pe3", "name": "Maya Rao", "role": "Design lead", "org": "Northlight (you)", "email": "maya@northlight.studio", "messages": 14, "summary": "14 messages · 2 commitments", "you": True, "role_in_work": "Leads design and owns client communication", "approves": "Design deliverables", "approves_confidence": "high", "prefers": "Slack"},
        {"id": "pe4", "name": "Dev Patel", "role": "Webflow developer", "org": "Northlight", "email": "dev@northlight.studio", "messages": 9, "summary": "Slack · 9 messages", "role_in_work": "Builds the site in Webflow", "approves": "—", "approves_confidence": "medium", "prefers": "Slack"},
        {"id": "pe5", "name": "Lena Torres", "role": "Copywriter", "org": "Northlight", "email": "lena@northlight.studio", "messages": 3, "summary": "Slack · 3 messages", "role_in_work": "Writes homepage copy and testimonials", "approves": "—", "approves_confidence": "medium", "prefers": "Slack"},
    ]

    def m(mid, category, title, detail="", status="current", confidence="high", **extra):
        base = {"id": mid, "category": category, "title": title, "detail": detail,
                "status": status, "confidence": confidence,
                "created_at": dago(-4), "changed_at": dago(-4),
                "history": [], "related": [], "evidence": []}
        base.update(extra)
        return base

    memory = [
        m("sc1", "scope", "Desktop and mobile layouts are included", "Agreed at kickoff; covers the marketing homepage and four inner pages.",
          evidence=[ev("notes", "Maya Rao", "Kickoff call notes", dago(-4, "18:00"), "Platforms: desktop + mobile", "s_notes", "n1"), ev("gmail", "Sarah Chen", "Re: Kickoff recap", dago(-4, "18:02"), "Desktop and mobile it is.", "s_gmail", "t2")],
          history=[{"at": dago(-4, "18:00"), "text": "Discovered at kickoff"}], related=["co1", "dl1"], pending_change={"review_id": "r1", "text": "Tablet layouts requested — would add a breakpoint"}),
        m("sc2", "scope", "Marketing homepage plus four inner pages", "About, Pricing, Security, Contact.", evidence=[ev("gmail", "James Park", "Proposal — Acme Finance website", dago(-12, "10:00"), "Homepage + 4 inner pages as outlined.", "s_gmail", "t3")]),
        m("sc3", "scope", "Copywriting included for the homepage", evidence=[ev("slack", "Lena Torres", "#acme-redesign", dago(-3, "10:20"), "Copy will be ready Wednesday — testimonials included.", "s_slack")]),
        m("sc4", "scope", "Build in Webflow, including CMS setup", evidence=[ev("notes", "Maya Rao", "Kickoff call notes", dago(-4, "18:00"), "Build in Webflow; perf + SEO are priorities", "s_notes", "n1")]),
        m("sc5", "scope", "Blog redesign is out of scope", confidence="medium", evidence=[ev("gmail", "James Park", "Proposal — Acme Finance website", dago(-12, "10:00"), "We'll leave the blog as-is for now.", "s_gmail", "t3")]),
        m("sc6", "scope", "Two rounds of revisions per page", evidence=[ev("gmail", "James Park", "Proposal — Acme Finance website", dago(-12, "10:00"), "Two rounds of revisions per page.", "s_gmail", "t3")]),
        m("de1", "decision", "Homepage direction is editorial", "Story-led layout replaces the classic, image-led hero.", changed_at=dago(-1, "17:40"),
          versions=[{"at": dago(-6, "12:00"), "title": "Homepage uses a classic, image-led hero", "superseded_at": dago(-1, "17:40")}],
          evidence=[ev("gmail", "Sarah Chen", "Re: Homepage direction + next steps", dago(-1, "10:12"), "Let's go with the editorial direction — it feels much more like us.", "s_gmail", "t1")],
          history=[{"at": dago(-1, "17:40"), "text": "Changed from classic to editorial — accepted by Maya"}, {"at": dago(-6, "12:00"), "text": "Discovered: classic hero (moodboard review)"}]),
        m("de2", "decision", "Primary CTA is \u201cOpen an account\u201d", evidence=[ev("slack", "Sarah Chen", "#acme-redesign", dago(-3, "14:00"), "Primary CTA: Open an account.", "s_slack")]),
        m("de3", "decision", "Use Urbanist for headings", evidence=[ev("slack", "Maya Rao", "#acme-redesign", dago(-3, "14:10"), "Going with Urbanist for headings.", "s_slack")]),
        m("de4", "decision", "Testimonials managed in Webflow CMS", changed_at=dago(-3, "15:20"), evidence=[ev("notes", "Maya Rao", "Performance & SEO review", dago(-3, "15:20"), "Webflow CMS for testimonials.", "s_notes", "n2")]),
        m("de6", "decision", "Sarah approves design direction", evidence=[ev("gmail", "James Park", "Re: Kickoff recap", dago(-4, "18:30"), "Sarah has final say on design.", "s_gmail", "t2")]),
        m("de8", "decision", "Dark mode is not required", confidence="medium", evidence=[ev("slack", "Sarah Chen", "#acme-redesign", dago(-2, "11:00"), "No need for dark mode for launch.", "s_slack")]),
        m("dl1", "deliverable", "Mobile screens for the homepage", "Due to Sarah on Fri Oct 10.", related=["co1", "sc1"], evidence=[ev("gmail", "Sarah Chen", "Proposal — Acme Finance website", dago(-12, "10:00"), "Mobile screens for review before build.", "s_gmail", "t3")], pending_change={"review_id": "r1", "text": "Tablet layouts would add a deliverable"}),
        m("dl2", "deliverable", "Desktop homepage design", evidence=[ev("notes", "Maya Rao", "Kickoff call notes", dago(-4, "18:00"), "Desktop homepage first.", "s_notes", "n1")]),
        m("dl3", "deliverable", "Webflow build with CMS", evidence=[ev("slack", "Dev Patel", "#acme-redesign", dago(-1, "10:12"), "Webflow build for the homepage starts Monday.", "s_slack")]),
        m("rq1", "requirement", "Testimonials on the homepage", changed_at=dago(-1, "11:03"), created_at=dago(-1, "11:03"), evidence=[ev("slack", "Sarah Chen", "#acme-redesign", dago(-1, "11:03"), "Can we add testimonials to the homepage?", "s_slack")], history=[{"at": dago(-1, "11:03"), "text": "Added to Requirements automatically · high confidence"}]),
        m("rq2", "requirement", "Lighthouse 90+ on mobile", evidence=[ev("notes", "Maya Rao", "Performance & SEO review", dago(-3, "15:20"), "Lighthouse 90+ on mobile", "s_notes", "n2")]),
        m("rq4", "requirement", "WCAG 2.2 AA contrast on all text", evidence=[ev("gmail", "James Park", "Proposal — Acme Finance website", dago(-12, "10:00"), "Accessibility to WCAG AA.", "s_gmail", "t3")]),
        m("rq6", "requirement", "Pricing page shows INR and USD", confidence="medium", evidence=[ev("slack", "Sarah Chen", "#acme-redesign", dago(-2, "16:00"), "Pricing should show both INR and USD.", "s_slack")]),
        m("co1", "commitment", "Maya will deliver mobile screens to Acme Finance by Friday, Oct 10.", short="Mobile screens to Sarah", owner="Maya Rao", owed_to="Sarah Chen", direction="You → Acme Finance", due=dago(3), state="open", changed_at=dago(-4, "18:02"),
          evidence=[ev("slack", "Maya Rao", "#acme-redesign", dago(-4, "16:20"), "We'll have the mobile screens over to you by Friday.", "s_slack")], related=["dl1", "sc1"], pending_change={"review_id": "r1", "text": "Tablet layouts requested — may affect this date"}),
        m("co2", "commitment", "Acme Finance will provide brand assets (logos and fonts).", short="Brand assets from Acme", owner="Sarah Chen", owed_to="Maya Rao", direction="Acme Finance → You", state="open", waiting_days=8, evidence=[ev("gmail", "Sarah Chen", "Brand assets", dago(-8, "15:10"), "I'll send logos and fonts early next week.", "s_gmail", "t4")]),
        m("co3", "commitment", "Launch two weeks after kickoff — Oct 17.", short="Launch", owner="Maya Rao", owed_to="Acme Finance", direction="Agreed at kickoff", due=dago(10), state="open", at_risk=True, evidence=[ev("notes", "Maya Rao", "Kickoff call notes", dago(-4, "18:00"), "Timeline: 2 weeks from today → launch Fri Oct 17", "s_notes", "n1")], pending_change={"review_id": "r1", "text": "Two-week timeline may not fit the expanded scope"}),
        m("co5", "commitment", "Share the editorial homepage direction with Acme Finance.", owner="Maya Rao", owed_to="Sarah Chen", state="completed", completed_at=dago(-1, "17:12"), evidence=[ev("gmail", "Maya Rao", "Re: Homepage direction + next steps", dago(-1, "17:12"), "Sharing the editorial homepage direction we discussed.", "s_gmail", "t1")]),
    ]
    for p in people:
        memory.append(m("pm_" + p["id"], "person", f"{p['name']} — {p['role'].lower()}", person_id=p["id"], evidence=[ev("gmail", p["name"], "Re: Kickoff recap", dago(-4, "18:02"), f"{p['name']}, {p['role']}", "s_gmail", "t2")]))

    categories = [
        {"key": "scope", "label": "Scope", "singular": "Scope", "description": "What is and isn't part of this work."},
        {"key": "decision", "label": "Decisions", "singular": "Decision", "description": "Choices that were agreed, and who agreed them."},
        {"key": "deliverable", "label": "Deliverables", "singular": "Deliverable", "description": "What you'll hand over."},
        {"key": "requirement", "label": "Requirements", "singular": "Requirement", "description": "Conditions the work has to meet."},
        {"key": "commitment", "label": "Commitments", "singular": "Commitment", "description": "Promises made by you or the client."},
        {"key": "person", "label": "People", "singular": "Person", "description": "Everyone involved in this work."},
    ]
    for c in categories:
        c["n"] = sum(1 for it in memory if it["category"] == c["key"])
        c["count"] = c["n"]

    attention = [
        {"id": "a1", "kind": "scope_change", "tone": "warning", "eyebrow": "Potential scope change · affects 5 memories", "title": "Sarah asked to add tablet layouts while keeping the two-week timeline", "detail": "Tablet isn't in the current agreement. It touches scope, deliverables and the launch date.", "chip": {"provider": "gmail", "label": "Sarah Chen", "at": mins(18)}, "action": {"label": "Review 5 changes", "kind": "review", "target": "r1", "primary": True}},
        {"id": "a2", "kind": "conflict", "tone": "danger", "eyebrow": "Conflicting information", "title": "The two-week timeline may not fit the expanded scope", "detail": "Kickoff agreed two weeks for desktop and mobile. No new date has been agreed since tablet was requested.", "chip": {"provider": "slack", "label": "#acme-redesign", "at": dago(-4, "16:20")}, "action": {"label": "Resolve", "kind": "resolve", "target": "cf1"}},
        {"id": "a3", "kind": "waiting", "tone": "neutral", "eyebrow": "Waiting on Acme Finance · 8 days", "title": "Brand assets haven't been received", "detail": "Sarah said she'd send logos and fonts \u201cearly next week\u201d on Sep 29.", "chip": {"provider": "gmail", "label": "Sarah Chen", "at": dago(-8, "15:10")}, "action": {"label": "Draft follow-up", "kind": "follow_up", "target": "t4"}},
        {"id": "a4", "kind": "waiting", "tone": "neutral", "eyebrow": "Waiting on Dev Patel · 2 days", "title": "Staging link for the homepage build", "detail": "Dev said he'd share a staging link once the CMS is wired.", "chip": {"provider": "slack", "label": "#acme-redesign", "at": dago(-2, "17:30")}, "action": {"label": "Draft follow-up", "kind": "follow_up", "target": "C1"}, "snoozed_until": dago(2)},
        {"id": "a5", "kind": "reply", "tone": "neutral", "eyebrow": "Needs a reply", "title": "Invoice #0042 question from Acme AP", "detail": "AP asked for a PO number before paying.", "chip": {"provider": "gmail", "label": "Acme Finance AP", "at": dago(-3, "12:00")}, "action": {"label": "Draft reply", "kind": "reply", "target": "t5"}, "saved": True},
    ]

    conflicts = [{"id": "cf1", "title": "The two-week timeline may not fit the expanded scope",
        "sides": [{"provider": "notes", "label": "Kickoff call notes", "quote": "\u201cTimeline: 2 weeks → launch Fri Oct 17\u201d — scope was desktop + mobile.", "meta": "Oct 3 · agreed by Sarah Chen and Maya Rao"}, {"provider": "gmail", "label": "Sarah Chen", "quote": "\u201cCan we include tablet layouts as well? Ideally keep the two-week timeline.\u201d", "meta": "Today · not yet answered"}],
        "note": "Bracket can't decide which is true — this needs a decision from you or Sarah.",
        "options": [{"id": "split", "title": "Split the launch", "detail": "Keep Oct 17 for desktop and mobile; tablet ships later.", "date_label": "Tablet delivery date", "date": dago(17), "effect": "Updates Commitments and Deliverables.", "cta": "Update memory & draft reply"}, {"id": "move", "title": "Move the whole launch", "detail": "All three breakpoints ship on a new date.", "date_label": "New launch date", "date": dago(15), "effect": "Updates Commitments (Launch).", "cta": "Update memory & draft reply"}, {"id": "drop", "title": "Keep two weeks, drop tablet", "detail": "Scope stays desktop + mobile.", "effect": "Dismisses the tablet proposal.", "cta": "Update memory & draft reply"}, {"id": "ask", "title": "Not decided yet — ask Sarah", "detail": "Bracket drafts a reply; the conflict stays open.", "effect": "Nothing in memory changes.", "cta": "Draft reply"}]}]

    reviews = [
        {"id": "r1", "kind": "scope_change", "status": "pending", "label": "Potential scope change", "title": "Sarah asked to add tablet layouts while keeping the two-week timeline", "detected": {"count": 1, "unit": "email", "at": mins(18)}, "interpretation": "Sarah is asking to expand scope to tablet without moving the deadline. That adds a deliverable and a requirement, and puts the Oct 17 launch at risk. Nothing changes until you accept.",
         "trigger": {"provider": "gmail", "source_id": "s_gmail", "thread_id": "t1", "from": "Sarah Chen", "to": "Maya Rao", "at": mins(18), "subject": "Re: Homepage direction + next steps", "body": [{"text": "Hi Maya, thanks for the editorial direction — the team loves it."}, {"text": "Can we include tablet layouts as well?", "tags": ["Scope", "Deliverables", "Requirements"]}, {"text": "Ideally we'd still like to keep the two-week timeline.", "tags": ["Commitments"]}, {"text": "I'll send the brand assets over shortly.\n\nBest,\nSarah"}]},
         "compared": [{"memory_id": "sc1", "text": "Desktop and mobile layouts are included.", "chip": {"provider": "gmail", "label": "Agreed Sep 12"}}, {"memory_id": "co3", "text": "Launch two weeks after kickoff — Oct 17.", "chip": {"provider": "notes", "label": "Kickoff call · Oct 3"}}, {"memory_id": "dl1", "text": "Mobile screens for the homepage.", "chip": {"provider": "gmail", "label": "Proposal · Sep 12"}}],
         "proposals": [{"id": "p1", "category": "scope", "op": "modify", "target": "sc1", "before": "Desktop and mobile layouts are included.", "after": "Desktop, tablet and mobile layouts are included.", "confidence": "high", "rationale": "Sarah explicitly asks to \u201cinclude tablet layouts as well.\u201d"}, {"id": "p2", "category": "deliverable", "op": "add", "after": "Tablet layouts for the homepage.", "confidence": "high", "rationale": "New layout set implied by the scope request."}, {"id": "p3", "category": "requirement", "op": "add", "after": "Homepage must be responsive at tablet widths (768–1024px).", "confidence": "medium", "rationale": "Inferred from the tablet request."}, {"id": "p4", "category": "commitment", "op": "conflict", "target": "co3", "before": "Launch two weeks after kickoff — Oct 17.", "after": "Oct 17 launch is at risk.", "confidence": "medium", "rationale": "Sarah wants to keep the timeline; original estimate covered desktop and mobile only."}],
         "reply_to": "Sarah"},
        {"id": "r2", "kind": "decision", "status": "pending", "saved": True, "label": "New requirement", "title": "Lena wants testimonials managed by Acme in the CMS", "detected": {"count": 1, "unit": "Slack message", "at": mins(180)}, "interpretation": "Lena suggests Acme edit testimonials themselves in Webflow. That adds a CMS requirement and a training deliverable.",
         "trigger": {"provider": "slack", "source_id": "s_slack", "thread_id": "C1", "from": "Lena Torres", "to": "#acme-redesign", "at": mins(180), "subject": "#acme-redesign", "body": [{"text": "Quick one —"}, {"text": "Acme should be able to edit testimonials themselves in Webflow.", "tags": ["Requirements"]}, {"text": "Maybe a 30-min handover session?", "tags": ["Deliverables"]}]},
         "compared": [{"memory_id": "de4", "text": "Testimonials managed in Webflow CMS", "chip": {"provider": "notes", "label": "Perf & SEO review"}}],
         "proposals": [{"id": "p1", "category": "requirement", "op": "add", "after": "Acme can edit testimonials in the Webflow CMS.", "confidence": "high", "rationale": "Stated directly by Lena."}, {"id": "p2", "category": "deliverable", "op": "add", "after": "30-minute CMS handover session.", "confidence": "medium", "rationale": "Suggested, not yet agreed."}],
         "reply_to": "Lena"},
    ]

    threads = [
        {"id": "t1", "provider": "gmail", "kind": "email", "title": "Re: Homepage direction + next steps", "who": "Sarah Chen", "participants": "Sarah Chen, Maya Rao", "to_email": "sarah.chen@acmefinance.com", "count": 4, "started_at": dago(-1, "17:12"), "at": mins(18), "preview": "Can we include tablet layouts as well? Ideally we'd still like to keep...", "badge": {"tone": "warning", "label": "5 changes to review"}, "needs_reply": True, "earlier": {"count": 2, "at": dago(-1)},
         "messages": [{"id": "mm1", "author": "Maya Rao", "at": dago(-1, "17:12"), "body": [{"text": "Hi Sarah — sharing the editorial homepage direction we discussed."}]}, {"id": "mm2", "author": "Sarah Chen", "at": mins(18), "body": [{"text": "Hi Maya, thanks — the team loves it."}, {"text": "Can we include tablet layouts as well?", "tag": "Scope change", "tone": "warning"}, {"text": "Ideally we'd still like to keep the two-week timeline.", "tag": "Commitment", "tone": "warning"}]}],
         "would_change": [{"category": "Scope", "text": "Desktop, tablet and mobile"}, {"category": "Commitments", "text": "Oct 17 launch at risk"}], "created": [{"category": "Decisions", "text": "Homepage direction is editorial", "id": "de1"}], "referenced": [{"category": "Scope", "text": "Desktop and mobile are included", "id": "sc1"}], "review_id": "r1", "can_send": True},
        {"id": "C1", "provider": "slack", "kind": "slack", "title": "Dev handoff — Webflow CMS structure", "who": "#acme-redesign", "channel": "#acme-redesign", "members": 6, "participants": "Dev Patel, Sarah Chen, Maya Rao", "count": 6, "started_at": dago(-1, "14:02"), "at": dago(-1, "14:31"), "preview": "Dev: confirmed we're building in Webflow, CMS for testimonials...", "badge": {"tone": "info", "label": "1 decision found"}, "needs_reply": False,
         "messages": [{"id": "sm1", "author": "Dev Patel", "at": dago(-1, "14:02"), "body": [{"text": "One collection for testimonials, one for case studies."}, {"text": "We're building in Webflow, not Framer — confirmed with James.", "tag": "Decision", "tone": "info"}]}, {"id": "sm3", "author": "Maya Rao", "at": dago(-1, "14:31"), "body": [{"text": "Yes — adding a logo field."}]}],
         "would_change": [], "created": [{"category": "Decisions", "text": "Build in Webflow (not Framer)", "id": "de4"}], "referenced": [], "can_send": True},
        {"id": "t4", "provider": "gmail", "kind": "email", "title": "Brand assets", "who": "Sarah Chen", "participants": "Sarah Chen, Maya Rao", "to_email": "sarah.chen@acmefinance.com", "count": 3, "started_at": dago(-12, "11:00"), "at": dago(-8, "16:40"), "preview": "I'll pull the logo files and fonts together early next week.", "badge": {"tone": "neutral", "label": "Awaiting assets"}, "needs_reply": True,
         "alert": {"tone": "warning", "title": "Brand assets are 8 days late", "body": "Acme Finance said \u201cearly next week\u201d. The Oct 17 launch depends on them.", "draft": "follow-up"},
         "messages": [{"id": "bm2", "author": "Sarah Chen", "at": dago(-8, "16:40"), "body": [{"text": "I'll pull the logo files and fonts together and send them early next week."}]}], "would_change": [], "created": [{"category": "Commitments", "text": "Acme Finance will send brand assets", "id": "co2"}], "referenced": [], "can_send": True},
        {"id": "t5", "provider": "gmail", "kind": "email", "title": "Invoice #0042", "who": "Acme Finance AP", "participants": "Acme Finance AP, Maya Rao", "to_email": "ap@acmefinance.com", "count": 1, "started_at": dago(-3, "12:00"), "at": dago(-3, "12:00"), "preview": "Could you add our PO number before we process payment?", "needs_reply": True, "nothing_detected": True,
         "messages": [{"id": "im1", "author": "Acme Finance AP", "at": dago(-3, "12:00"), "body": [{"text": "Hi — could you add our PO number (PO-7781) to the invoice before we process payment? Thanks."}]}], "would_change": [], "created": [], "referenced": [], "can_send": True},
    ]

    events = [
        {"id": "ev1", "at": mins(17), "kind": "change_detected", "title": "Change detected — tablet layouts requested", "actor": {"provider": "gmail", "label": "Sarah Chen"}, "meta": "5 proposed updates · waiting for your review", "dot": "warning", "review_id": "r1"},
        {"id": "ev2", "short": "Sarah Chen emailed about tablet layouts", "icon": "mail", "at": mins(18), "kind": "email_received", "title": "Email received — Re: Homepage direction + next steps", "actor": {"provider": "gmail", "label": "Sarah Chen"}, "meta": "Read by Bracket · 2 requests found", "source": "gmail", "thread_id": "t1"},
        {"id": "ev3", "at": mins(104), "kind": "sync", "title": "Slack synced", "actor": {"provider": "slack", "label": "#acme-redesign"}, "meta": "38 messages read · 1 decision found", "source": "slack", "system": True},
        {"id": "ev4", "short": "Homepage direction changed to editorial", "icon": "changed", "at": dago(-1, "17:40"), "kind": "decision_changed", "title": "Decision changed — homepage direction is now editorial", "actor": {"provider": "gmail", "label": "Sarah Chen"}, "meta": "Accepted by Maya Rao · 2 memories updated", "dot": "success", "memory": True,
         "detail": {"heading": "Homepage direction is now editorial", "eyebrow": "Decision changed", "when": dago(-1, "17:40"), "accepted_by": "Maya Rao", "triggered_by": "Email from Sarah Chen, 10:12", "changes": [{"category": "Decisions", "before": "Homepage uses a classic, image-led hero.", "after": "Homepage uses an editorial, story-led direction."}], "source": {"provider": "gmail", "label": "Sarah Chen", "quote": "Let's go with the editorial direction."}, "restorable": True}},
        {"id": "ev6", "short": "New requirement: testimonials on homepage", "icon": "added", "at": dago(-1, "11:03"), "kind": "requirement_discovered", "title": "Requirement discovered — add testimonials to the homepage", "actor": {"provider": "slack", "label": "Sarah Chen"}, "meta": "Added to Requirements automatically", "memory": True, "memory_id": "rq1"},
        {"id": "ev8", "at": dago(-4, "18:02"), "kind": "commitment_confirmed", "title": "Commitment confirmed — mobile screens by Friday", "actor": {"provider": "gmail", "label": "Sarah Chen"}, "meta": "Due date set to Oct 10", "memory": True, "memory_id": "co1"},
        {"id": "ev11", "at": dago(-5, "11:02"), "kind": "source_connected", "title": "Gmail connected — 3 threads", "actor": {"provider": "gmail", "label": "Maya Rao"}, "meta": "First sync read 23 messages", "system": True, "source": "gmail"},
    ]

    sources = [
        {"id": "s_gmail", "provider": "gmail", "label": "Gmail", "account": "maya@northlight.studio", "connected_at": dago(-5, "11:02"), "connected_by": "Maya Rao", "status": "synced", "last_sync_at": mins(2), "messages": 214, "health": "ok", "reads_summary": "3 selected threads · Sarah Chen, James Park",
         "threads": [{"id": "t1", "subject": "Re: Homepage direction + next steps", "from": "Sarah Chen", "messages": 14, "memories": 9}, {"id": "t2", "subject": "Kickoff recap — Acme Finance", "from": "Sarah Chen", "messages": 6, "memories": 8}, {"id": "t3", "subject": "Proposal — Acme Finance website", "from": "James Park", "messages": 9, "memories": 6}],
         "auto_include": {"enabled": True, "label": "Automatically include new threads with @acmefinance.com", "help": "New threads from this domain are read without asking."}, "permissions": {"read": True, "send": True}, "learned": {"total": 23, "by": {"scope": 4, "decision": 5, "commitment": 3, "requirement": 4, "person": 7}, "corroborated": 9},
         "activity": [{"at": mins(18), "text": "Read 1 new email from Sarah Chen → 5 proposed updates"}, {"at": dago(-5, "11:02"), "text": "Connected · first sync read 23 messages"}],
         "candidates": [{"id": "t4", "subject": "Brand assets", "from": "Sarah Chen", "messages": 3, "at": dago(-8, "15:10"), "suggested": True}, {"id": "t5", "subject": "Invoice #2041", "from": "Accounts", "messages": 2, "at": dago(-7, "12:00")}]},
        {"id": "s_slack", "provider": "slack", "label": "Slack", "account": "Northlight Studio", "connected_at": dago(-5, "11:10"), "connected_by": "Maya Rao", "status": "syncing", "progress": {"done": 1204, "total": 3880}, "last_sync_at": mins(4), "messages": 1204, "health": "ok", "reads_summary": "#acme-redesign",
         "channels": [{"id": "C1", "name": "#acme-redesign", "messages": 1204, "memories": 11, "members": 6, "meta": "6 members · last 90 days"}],
         "candidates": [{"id": "C2", "name": "#acme-dev", "messages": 382, "members": 3, "meta": "3 members", "mentions": True}, {"id": "C3", "name": "#general", "messages": 9100, "members": 42, "meta": "42 members"}],
         "auto_include": {"enabled": True, "label": "Automatically include new channels named #acme-*", "help": "Direct messages are never read."}, "permissions": {"read": True, "send": True}, "learned": {"total": 11, "by": {"scope": 1, "decision": 3, "commitment": 2, "requirement": 3, "person": 3}, "corroborated": 4}, "activity": [{"at": mins(4), "text": "Syncing history · 1,204 of 3,880 messages"}]},
        {"id": "s_notes", "provider": "notes", "label": "Notes", "account": "Added in Bracket", "connected_at": dago(-4, "18:00"), "connected_by": "Maya Rao", "status": "synced", "last_sync_at": mins(60), "messages": 2, "health": "ok", "reads_summary": "Kickoff call, Performance & SEO review",
         "notes": [{"id": "n1", "title": "Kickoff call notes", "at": dago(-4, "18:00"), "by": "Maya Rao", "memories": 6, "attendees": "Maya Rao, Sarah Chen, James Park", "body": "· Goal: improve trust + conversions\n· Platforms: desktop + mobile\n· Timeline: 2 weeks → launch Fri Oct 17\n· Build in Webflow"}],
         "auto_include": {"enabled": True, "label": "Import meeting transcripts automatically", "help": "Coming soon."}, "permissions": {"read": True, "send": False}, "learned": {"total": 9, "by": {"scope": 1, "decision": 2, "commitment": 2, "requirement": 3, "person": 1}, "corroborated": 3}, "activity": [{"at": dago(-4, "18:00"), "text": "Kickoff call notes added → 6 memories"}]},
    ]

    ask_history = [
        {"id": "q1", "question": "Did we ever agree to a two-week deadline?", "at": mins(30)},
        {"id": "q2", "question": "What is currently included in scope?", "at": dago(-1, "15:00")},
        {"id": "q3", "question": "Why did we change the homepage direction?", "at": dago(-1, "18:00")},
    ]

    workspace = {"id": "p1", "name": "Fintech Landing Page Redesign", "client_name": "Acme Finance", "business": "Acme Finance", "initials": "AF", "role": "owner", "status": "active",
                 "summary": "Acme Finance is redesigning its website to improve trust and conversions. Desktop and mobile are agreed; tablet scope and the launch date are still open.", "created_at": dago(-6), "memory_updated_at": mins(2), "last_seen_prev": mins(1200)}

    return dict(people=people, memory=memory, categories=categories, attention=attention,
                conflicts=conflicts, reviews=reviews, threads=threads, events=events,
                sources=sources, ask_history=ask_history, workspace=workspace)


SEED_WORKSPACES = [
    {"id": "p1", "name": "Fintech Landing Page Redesign", "client_name": "Acme Finance", "business": "Acme Finance", "initials": "AF", "role": "owner", "status": "active", "summary": "Acme Finance is redesigning its website to improve trust and conversions.", "created_at": dago(-6), "memory_updated_at": mins(2), "last_seen_prev": mins(1200)},
    {"id": "p2", "name": "Spring '26 polo order", "client_name": "Ravi Textiles", "business": "Ravi Textiles", "initials": "RT", "attention": 2, "role": "owner", "status": "active", "summary": "Bulk polo order for Ravi Textiles' spring line.", "created_at": dago(-30), "memory_updated_at": mins(1560), "last_seen_prev": dago(-2)},
]


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/workspaces")
async def workspaces(request: Request):
    user = await current_user_optional(request, db)
    items = [dict(w) for w in SEED_WORKSPACES]
    if user:
        async for p in db.projects.find({"owner_user_id": user["user_id"], "archived": {"$ne": True}}, {"_id": 0}).sort("updated_at", -1).limit(30):
            nm = p.get("name") or "Untitled"
            items.append({"id": p["id"], "name": nm, "client_name": p.get("client_name", ""), "business": p.get("client_name", "") or "Personal",
                          "initials": "".join([w[0] for w in nm.split()[:2]]).upper() or "B", "role": "owner",
                          "status": "active", "summary": p.get("description", ""), "created_at": p.get("created_at"),
                          "memory_updated_at": p.get("updated_at"), "last_seen_prev": p.get("updated_at"), "is_demo": p.get("is_demo", False)})
    return {"workspaces": items}


@router.get("/w/{wid}")
async def workspace(wid: str):
    s = _seed()
    w = dict(s["workspace"]); w["id"] = wid
    return w


@router.get("/w/{wid}/overview")
async def overview(wid: str):
    s = _seed()
    w = dict(s["workspace"]); w["id"] = wid
    att = s["attention"]
    return {
        "workspace": w,
        "attention": [a for a in att if not a.get("snoozed_until") and not a.get("saved")],
        "snoozed": len([a for a in att if a.get("snoozed_until")]),
        "saved": len([a for a in att if a.get("saved")]),
        "categories": s["categories"],
        "sources": [{"id": x["id"], "provider": x["provider"], "label": x["label"], "status": x["status"], "last_sync_at": x.get("last_sync_at")} for x in s["sources"]],
        "coming_up": [{"id": it["id"], "title": it.get("short") or it["title"], "at": it.get("due"), "owner": it.get("owner"), "state": it.get("state")} for it in s["memory"] if it["category"] == "commitment" and it.get("due") and it.get("state") == "open"],
        "since_last_visit": [{"id": "ev1", "at": mins(17), "text": "Change detected — tablet layouts requested"}, {"id": "ev6", "at": dago(-1, "11:03"), "text": "New requirement: testimonials on homepage"}, {"id": "ev4", "at": dago(-1, "17:40"), "text": "Homepage direction changed to editorial"}],
    }


@router.get("/w/{wid}/attention")
async def attention(wid: str, view: str = ""):
    s = _seed()
    att = s["attention"]
    if view == "later":
        return {"snoozed": [a for a in att if a.get("snoozed_until")], "saved": [a for a in att if a.get("saved")]}
    return {"items": [a for a in att if not a.get("snoozed_until") and not a.get("saved")]}


@router.get("/w/{wid}/conflicts/{cid}")
async def conflict(wid: str, cid: str):
    s = _seed()
    return next((c for c in s["conflicts"] if c["id"] == cid), s["conflicts"][0])


@router.get("/w/{wid}/categories")
async def categories(wid: str):
    return {"categories": _seed()["categories"]}


@router.get("/w/{wid}/memory")
async def memory(wid: str, category: str = "", status: str = "", q: str = ""):
    items = _seed()["memory"]
    if category:
        items = [m for m in items if m["category"] == category]
    if q:
        ql = q.lower()
        items = [m for m in items if ql in m["title"].lower() or ql in (m.get("detail") or "").lower()]
    return {"items": items, "total": len(items)}


@router.get("/w/{wid}/memory/{mid}")
async def memory_item(wid: str, mid: str):
    return next((m for m in _seed()["memory"] if m["id"] == mid), None) or {}


@router.get("/w/{wid}/people")
async def people(wid: str):
    return {"people": _seed()["people"]}


@router.get("/w/{wid}/people/{pid}")
async def person(wid: str, pid: str):
    return next((p for p in _seed()["people"] if p["id"] == pid), None) or {}


@router.get("/w/{wid}/timeline")
async def timeline(wid: str, filter: str = ""):
    return {"events": _seed()["events"], "total": len(_seed()["events"])}


@router.get("/w/{wid}/timeline/{eid}")
async def event(wid: str, eid: str):
    return next((e for e in _seed()["events"] if e["id"] == eid), None) or {}


@router.get("/w/{wid}/sources")
async def sources(wid: str):
    return {"sources": _seed()["sources"]}


@router.get("/w/{wid}/sources/{sid}")
async def source(wid: str, sid: str):
    return next((x for x in _seed()["sources"] if x["id"] == sid), None) or {}


@router.get("/w/{wid}/reviews")
async def reviews(wid: str):
    return {"reviews": _seed()["reviews"]}


@router.get("/w/{wid}/reviews/{rid}")
async def review(wid: str, rid: str):
    return next((r for r in _seed()["reviews"] if r["id"] == rid), None) or {}


@router.get("/w/{wid}/threads")
async def threads(wid: str, filter: str = ""):
    return {"threads": _seed()["threads"], "total": len(_seed()["threads"])}


@router.get("/w/{wid}/threads/{tid}")
async def thread(wid: str, tid: str):
    return next((t for t in _seed()["threads"] if t["id"] == tid), None) or {}


@router.get("/w/{wid}/ask/history")
async def ask_history(wid: str):
    return {"items": _seed()["ask_history"]}


class AskIn(BaseModel):
    question: str = ""
    scope: str = ""


@router.post("/w/{wid}/ask")
async def ask(wid: str, payload: AskIn):
    q = (payload.question or "").strip()
    return {
        "id": "q_" + str(int(_now().timestamp())),
        "question": q,
        "answer": "Based on the project memory: desktop and mobile layouts are in scope and the launch is targeted for Oct 17. Tablet layouts were requested by Sarah Chen but haven't been agreed yet — that change is waiting in your review queue, and it puts the two-week timeline at risk.",
        "confidence": "high",
        "sources": [{"provider": "gmail", "label": "Sarah Chen · Re: Homepage direction", "memory_id": "sc1"}, {"provider": "notes", "label": "Kickoff call notes", "memory_id": "co3"}],
        "at": mins(0),
    }


class DraftIn(BaseModel):
    instruction: str = ""


@router.post("/w/{wid}/threads/{tid}/draft")
async def draft(wid: str, tid: str, payload: DraftIn):
    return {"draft": "Hi Sarah — thanks for the note. Before we lock this in: adding tablet layouts expands the scope beyond the desktop + mobile we agreed, so the Oct 17 launch would be at risk unless we move the date or ship tablet in a second phase. Which would you prefer? Happy to send an updated timeline either way.", "to": "sarah.chen@acmefinance.com"}


class SendIn(BaseModel):
    body: str = ""
    to: object = ""


@router.post("/w/{wid}/threads/{tid}/send")
async def send(wid: str, tid: str, payload: SendIn):
    return {"ok": True, "sent_at": mins(0)}


# Lightweight action stubs so the UI's buttons resolve cleanly.
@router.post("/w/{wid}/seen")
async def seen(wid: str):
    return {"ok": True}


@router.post("/w/{wid}/attention/{aid}/snooze")
async def att_snooze(wid: str, aid: str):
    return {"ok": True}


@router.post("/w/{wid}/attention/{aid}/dismiss")
async def att_dismiss(wid: str, aid: str):
    return {"ok": True}


@router.post("/w/{wid}/attention/{aid}/save")
async def att_save(wid: str, aid: str):
    return {"ok": True}


@router.post("/w/{wid}/reviews/{rid}/accept")
async def review_accept(wid: str, rid: str):
    return {"ok": True, "applied": True}


@router.post("/w/{wid}/reviews/{rid}/dismiss")
async def review_dismiss(wid: str, rid: str):
    return {"ok": True}


@router.post("/w/{wid}/conflicts/{cid}/resolve")
async def conflict_resolve(wid: str, cid: str):
    return {"ok": True}


@router.post("/w/{wid}/sources/{sid}/sync")
async def source_sync(wid: str, sid: str):
    return {"ok": True, "status": "synced"}
