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
from typing import Optional
from fastapi import APIRouter, Request
from pydantic import BaseModel

import asyncio
import logging
import os
import uuid
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from auth import current_user_optional, current_user
from connectors import (db, _get_account, gmail_list_sources, slack_list_sources,
                        figma_list_sources, github_list_sources, gmail_threads_meta,
                        oauth_auth_url, extract_sources_into_project, _plan_limit,
                        _active_project_count, PROVIDERS, send_gmail_reply, send_slack_message)
import v2_real
import v2_categories

logger = logging.getLogger("bracket.v2")
router = APIRouter(prefix="/api/v2")

SEED_IDS = {"p1", "p2"}


async def _resolve(wid):
    """Return (mode, project). 'real' for a stored non-seed project, else 'seed'."""
    if wid in SEED_IDS:
        return "seed", None
    proj = await db.projects.find_one({"id": wid}, {"_id": 0})
    if proj and not proj.get("is_sandbox_showcase"):
        return "real", proj
    return "seed", None

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

# Only these demo/showcase accounts see the two sample workspaces (p1/p2) so the
# full UI can be demoed. Real signed-up users get a clean account with only the
# workspaces they create. Overridable via env (comma-separated emails).
SEED_VIEWER_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("SEED_VIEWER_EMAILS", "fresh@use-bracket.com,solo@use-bracket.com,pro@use-bracket.com").split(",")
    if e.strip()
}


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/workspaces")
async def workspaces(request: Request):
    user = await current_user_optional(request, db)
    show_seed = bool(user) and (user.get("email") or "").lower() in SEED_VIEWER_EMAILS
    items = [dict(w) for w in SEED_WORKSPACES] if show_seed else []
    if user:
        async for p in db.projects.find({"owner_user_id": user["user_id"], "archived": {"$ne": True}}, {"_id": 0}).sort("updated_at", -1).limit(30):
            nm = p.get("name") or "Untitled"
            items.append({"id": p["id"], "name": nm, "client_name": p.get("client_name", ""), "business": p.get("client_name", "") or "Personal",
                          "initials": "".join([w[0] for w in nm.split()[:2]]).upper() or "B", "role": "owner",
                          "status": "active", "summary": p.get("description", ""), "created_at": p.get("created_at"),
                          "memory_updated_at": p.get("updated_at"), "last_seen_prev": p.get("updated_at"), "is_demo": p.get("is_demo", False)})
    return {"workspaces": items}


@router.get("/onboarding/draft")
async def onboarding_draft(request: Request):
    """The user's most recent unfinished onboarding workspace, so 'Save & exit'
    can resume exactly where they left off."""
    user = await current_user(request, db)
    p = await db.projects.find_one(
        {"owner_user_id": user["user_id"], "status": "in_progress", "archived": {"$ne": True}},
        {"_id": 0, "id": 1, "name": 1, "onboarding": 1}, sort=[("updated_at", -1)])
    if not p:
        return {"draft": None}
    step = ((p.get("onboarding") or {}).get("step")) or 1
    return {"draft": {"id": p["id"], "name": p.get("name", ""), "step": step}}


class OnbStepIn(BaseModel):
    step: int = 1


@router.post("/w/{wid}/onboarding/step")
async def onboarding_set_step(wid: str, request: Request, payload: OnbStepIn):
    await _onboarding_project(wid, request)
    await db.projects.update_one({"id": wid}, {"$set": {"onboarding.step": payload.step, "updated_at": iso(_now())}})
    return {"ok": True}


# ── Onboarding wizard (real: create project + connect sources + extract) ─────
class CreateWorkspaceIn(BaseModel):
    client_name: str = ""
    name: str = ""
    kind: str = ""


@router.post("/workspaces")
async def create_workspace(request: Request, payload: CreateWorkspaceIn):
    user = await current_user(request, db)
    udoc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "plan": 1}) or {}
    limit = _plan_limit(udoc.get("plan"))
    if limit is not None:
        used = await _active_project_count(user["user_id"])
        if used >= limit:
            return JSONResponse(status_code=402, content={"code": "plan_limit", "detail": "You've reached your plan's active-project limit."})
    now = iso(_now())
    name = (payload.name or payload.client_name or "Untitled workspace").strip()[:120]
    pid = uuid.uuid4().hex
    await db.projects.insert_one({
        "id": pid, "name": name, "name_source": "user",
        "client_name": (payload.client_name or "").strip(), "kind": (payload.kind or "").strip(),
        "creator_name": user.get("name", ""), "creator_email": user.get("email", ""),
        "owner_user_id": user["user_id"], "engine": "claude", "status": "in_progress", "step": 1,
        "onboarding": {"connected": {}}, "created_at": now, "updated_at": now,
    })
    return {"id": pid, "name": name, "client_name": payload.client_name, "kind": payload.kind}


def _msg_count(meta):
    extra = (meta or {}).get("extra") or ""
    digits = "".join(ch for ch in extra if ch.isdigit())
    return int(digits) if digits else 0


async def _onboarding_project(wid, request):
    user = await current_user(request, db)
    proj = await db.projects.find_one({"id": wid, "owner_user_id": user["user_id"]}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Workspace not found.")
    return user, proj


@router.get("/w/{wid}/onboarding")
async def onboarding_state(wid: str, request: Request, q: str = "", status: int = 0):
    user, proj = await _onboarding_project(wid, request)
    connected = dict((proj.get("onboarding") or {}).get("connected") or {})
    client = proj.get("client_name") or ""
    tok = (client.split() or [""])[0].lower()
    threads, channels = [], []
    # Reflect real OAuth links. `status=1` returns ONLY the connect state (fast —
    # step 2 doesn't need a live mailbox fetch, which was making it slow/flicker).
    linked = {}
    for prov in ("gmail", "slack", "figma", "github", "notion"):
        try:
            linked[prov] = await _get_account(user["user_id"], prov)
        except Exception:
            linked[prov] = None
        if linked[prov] and connected.get(prov) != "cancelled":
            connected[prov] = "connected"
    if status:
        return {"workspace": {"client_name": client, "name": proj.get("name", "")}, "connected": connected, "threads": [], "channels": []}
    # `q` performs a real server-side search (whole mailbox / workspace).
    for prov in ("gmail", "slack"):
        account = linked.get(prov)
        if not account:
            continue
        try:
            if prov == "gmail":
                srcs = await gmail_list_sources(account, q)
                for i, s in enumerate(srcs):
                    meta = s.get("meta") or {}
                    frm = meta.get("detail") or ""
                    threads.append({"id": s["id"], "name": s.get("name") or "(no subject)", "from": frm,
                                    "messages": _msg_count(meta) or 1, "at": meta.get("updated") or "",
                                    "mentions": bool(tok and (tok in (s.get("name", "").lower()) or tok in frm.lower())),
                                    "selected": False})
            else:
                srcs = await slack_list_sources(account, q)
                for s in srcs:
                    meta = s.get("meta") or {}
                    channels.append({"id": s["id"], "name": s.get("name") or "channel", "messages": _msg_count(meta) or 0})
        except Exception as e:
            logger.warning("[onboarding] list %s failed: %s", prov, e)
    return {"workspace": {"client_name": client, "name": proj.get("name", "")},
            "connected": connected, "threads": threads, "channels": channels}


class UpdatesReadIn(BaseModel):
    ids: list = []


@router.get("/updates")
async def updates(request: Request):
    user = await current_user_optional(request, db)
    if not user:
        return {"items": [], "unread": 0}
    pids = [p["id"] async for p in db.projects.find({"owner_user_id": user["user_id"], "archived": {"$ne": True}}, {"_id": 0, "id": 1})]
    items, unread = [], 0
    async for n in db.notifications.find({"project_id": {"$in": pids}}, {"_id": 0}).sort("created_at", -1).limit(30):
        read = bool(n.get("read"))
        if not read:
            unread += 1
        is_conflict = n.get("kind") == "conflict" or n.get("type") == "conflict"
        items.append({
            "id": n.get("id"), "read": read, "group": "attention",
            "icon": "conflict" if is_conflict else "changed",
            "title": n.get("title") or n.get("summary") or "Update",
            "body": n.get("body") or n.get("detail") or "",
            "at": n.get("created_at"),
            "link": {"kind": "review", "workspace": n.get("project_id"), "id": n.get("memory_id") or n.get("id")},
        })
    return {"items": items, "unread": unread}


@router.post("/updates/read")
async def updates_read(request: Request, payload: UpdatesReadIn):
    user = await current_user_optional(request, db)
    if not user:
        return {"ok": True}
    pids = [p["id"] async for p in db.projects.find({"owner_user_id": user["user_id"]}, {"_id": 0, "id": 1})]
    query = {"project_id": {"$in": pids}}
    if payload.ids:
        query["id"] = {"$in": payload.ids}
    await db.notifications.update_many(query, {"$set": {"read": True}})
    return {"ok": True}


class ConnectUrlIn(BaseModel):
    provider: str = ""


@router.post("/w/{wid}/sources/connect")
async def onboarding_connect_url(wid: str, request: Request, payload: ConnectUrlIn):
    await _onboarding_project(wid, request)
    return await oauth_auth_url(payload.provider, request)


class OnbConnectIn(BaseModel):
    provider: str = ""
    cancelled: bool = False


@router.post("/w/{wid}/onboarding/connect")
async def onboarding_connect(wid: str, request: Request, payload: OnbConnectIn):
    user, proj = await _onboarding_project(wid, request)
    status = "cancelled" if payload.cancelled else ("Added" if payload.provider in ("notes", "files") else "connected")
    await db.projects.update_one({"id": wid}, {"$set": {f"onboarding.connected.{payload.provider}": status, "updated_at": iso(_now())}})
    return {"ok": True}


class OnbStartIn(BaseModel):
    thread_ids: list = []
    channel_ids: list = []


async def _list_provider_sources(account, prov):
    if prov == "gmail":
        return await gmail_list_sources(account, "")
    if prov == "slack":
        return await slack_list_sources(account, "")
    if prov == "figma":
        return await figma_list_sources(account, "", "")
    if prov == "github":
        return await github_list_sources(account, "")
    return []


async def _run_onboarding(user, wid, gmail_ids, slack_ids):
    uid = user["user_id"]
    # gmail/slack use the user's explicit picks (fetched directly by id — we must
    # NOT re-list + intersect, because that drops threads found via search that
    # aren't in the default inbox listing). figma/github auto-include the most
    # recent sources of any connected account (no per-file picker in the wizard).
    plan = [("gmail", list(gmail_ids)), ("slack", list(slack_ids))]
    for prov in ("figma", "github"):
        try:
            if await _get_account(uid, prov):
                plan.append((prov, None))
        except Exception:
            pass
    run = {"status": "running", "providers": {}, "found": [], "found_count": 0, "done": False}
    unit = {"gmail": "threads", "slack": "channels", "figma": "files", "github": "repos"}
    try:
        for prov, ids in plan:
            if ids is not None and not ids:
                continue
            try:
                account = await _get_account(uid, prov)
            except Exception:
                account = None
            if not account:
                continue
            if ids is None:
                # figma/github: auto-include the most recent sources.
                try:
                    listed = await _list_provider_sources(account, prov)
                except Exception:
                    listed = []
                picked = [{"id": s["id"], "name": s.get("name", ""), "url": s.get("url", "")} for s in listed[:3]]
            elif prov == "gmail":
                # Pick exactly the chosen thread ids; label them from metadata.
                try:
                    meta = await gmail_threads_meta(account, ids)
                except Exception:
                    meta = {}
                picked = [{"id": tid, "name": (meta.get(tid) or {}).get("name", ""), "url": (meta.get(tid) or {}).get("url", "")} for tid in ids[:20]]
            else:
                # slack: label chosen channels from the full channel listing.
                try:
                    listed = await _list_provider_sources(account, prov)
                except Exception:
                    listed = []
                by_id = {s["id"]: s for s in listed}
                picked = [{"id": cid, "name": (by_id.get(cid) or {}).get("name", ""), "url": (by_id.get(cid) or {}).get("url", "")} for cid in ids[:20]]
            if not picked:
                continue
            run["providers"][prov] = {"label": f"Reading {len(picked)} {unit[prov]}", "done": False, "pct": 0.1, "eta": "about a minute"}
            await db.projects.update_one({"id": wid}, {"$set": {"onboarding.run": run}})
            res = await extract_sources_into_project(user, wid, prov, picked)
            run["found"] = (res.get("found") or []) + run["found"]
            run["found_count"] += res.get("memory_count", 0)
            run["providers"][prov] = {"label": f"{len(picked)} {unit[prov]} read", "done": True, "pct": 1, "eta": ""}
            await db.projects.update_one({"id": wid}, {"$set": {"onboarding.run": run}})
    except Exception as e:
        logger.exception("[onboarding] run failed: %s", e)
    run["status"] = "done"
    run["done"] = True
    await db.projects.update_one({"id": wid}, {"$set": {"onboarding.run": run, "updated_at": iso(_now())}})


@router.post("/w/{wid}/onboarding/start")
async def onboarding_start(wid: str, request: Request, payload: OnbStartIn):
    user, proj = await _onboarding_project(wid, request)
    full = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0}) or user
    asyncio.create_task(_run_onboarding(full, wid, list(payload.thread_ids or []), list(payload.channel_ids or [])))
    return {"ok": True}


@router.get("/w/{wid}/onboarding/progress")
async def onboarding_progress(wid: str, request: Request):
    _, proj = await _onboarding_project(wid, request)
    run = (proj.get("onboarding") or {}).get("run") or {}
    providers = run.get("providers") or {}
    out = {"found_count": run.get("found_count", 0), "found": (run.get("found") or [])[:12], "done": run.get("done", False),
           "providers": [{"provider": k, "label": v.get("label", ""), "pct": v.get("pct", 0), "done": v.get("done", False), "eta": v.get("eta", "")} for k, v in providers.items()]}
    if "gmail" in providers:
        out["gmail"] = {"label": providers["gmail"]["label"]}
    if "slack" in providers:
        s = providers["slack"]
        out["slack"] = {"label": s["label"], "pct": s.get("pct", 0), "done": s.get("done", False), "eta": s.get("eta", "")}
    return out


@router.post("/w/{wid}/onboarding/finish")
async def onboarding_finish(wid: str, request: Request):
    user, proj = await _onboarding_project(wid, request)
    counts = {}
    async for row in db.project_memory.aggregate([
        {"$match": {"project_id": wid, "status": {"$ne": "ignored"}}},
        {"$group": {"_id": "$category", "n": {"$sum": 1}}}]):
        counts[row["_id"]] = row["n"]
    view_counts = {k: counts.get(k, 0) for k in ("scope", "decision", "deliverable", "requirement", "commitment", "person")}
    parts = []
    by_prov = {}
    async for c in db.source_connections.find({"project_id": wid, "status": {"$ne": "disconnected"}}, {"_id": 0, "provider": 1}):
        by_prov[c["provider"]] = by_prov.get(c["provider"], 0) + 1
    for prov, n in by_prov.items():
        unit = {"gmail": "Gmail thread", "slack": "Slack channel", "meeting": "note", "file": "file"}.get(prov, prov)
        parts.append(f"{n} {unit}{'s' if n != 1 else ''}")
    read = " and ".join(parts) if parts else "your sources"
    first = await db.project_memory.find_one({"project_id": wid, "status": "detected"}, {"_id": 0, "id": 1, "title": 1})
    attention = {"title": first["title"], "review_id": first["id"]} if first else None
    # Onboarding complete → no longer a resumable draft.
    await db.projects.update_one({"id": wid}, {"$set": {"status": "active", "onboarding.step": 5, "updated_at": iso(_now())}})
    return {"workspace": {"name": proj.get("name", "")}, "read": read, "counts": view_counts, "attention": attention}


@router.get("/w/{wid}")
async def workspace(wid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return v2_real._workspace(proj)
    s = _seed()
    w = dict(s["workspace"]); w["id"] = wid
    return w


@router.get("/w/{wid}/overview")
async def overview(wid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return await v2_real.build_overview(proj)
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
    mode, proj = await _resolve(wid)
    if mode == "real":
        active, snoozed, saved = await v2_real.partition_attention(proj)
        if view == "later":
            return {"snoozed": snoozed, "saved": saved}
        return {"items": active}
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
    mode, proj = await _resolve(wid)
    if mode == "real":
        cats, *_ = await v2_real.build_categories(proj)
        return {"categories": cats}
    return {"categories": _seed()["categories"]}


class CategoryRenameIn(BaseModel):
    label: str = ""
    hidden: Optional[bool] = None
    pinned: Optional[bool] = None


class CategorySuggestIn(BaseModel):
    name: str = ""
    description: str = ""


class CategoryMergeIn(BaseModel):
    into: str = ""


@router.patch("/w/{wid}/categories/{key}")
async def category_rename(wid: str, key: str, payload: CategoryRenameIn):
    mode, proj = await _resolve(wid)
    if mode == "real":
        cats = await v2_categories.rename_category(proj, key, payload.label, payload.hidden, payload.pinned)
        return {"categories": cats}
    return {"categories": _seed()["categories"]}


@router.post("/w/{wid}/categories/{key}/delete")
async def category_delete(wid: str, key: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        cats = await v2_categories.delete_category(proj, key)
        return {"categories": cats, "ok": True}
    return {"ok": True, "categories": _seed()["categories"]}


@router.post("/w/{wid}/categories/suggest")
async def category_suggest(wid: str, payload: CategorySuggestIn):
    mode, proj = await _resolve(wid)
    if mode == "real":
        cats = await v2_categories.add_category(proj, payload.name, payload.description)
        return {"categories": cats, "ok": True}
    return {"ok": True, "categories": _seed()["categories"]}


@router.post("/w/{wid}/categories/{key}/merge")
async def category_merge(wid: str, key: str, payload: CategoryMergeIn):
    mode, proj = await _resolve(wid)
    if mode == "real":
        cats = await v2_categories.merge_category(proj, key, payload.into)
        return {"categories": cats, "ok": True}
    return {"ok": True, "categories": _seed()["categories"]}


@router.get("/w/{wid}/memory")
async def memory(wid: str, category: str = "", status: str = "", q: str = ""):
    mode, proj = await _resolve(wid)
    if mode == "real":
        items = await v2_real.build_memory(proj, category, q)
        return {"items": items, "total": len(items)}
    items = _seed()["memory"]
    if category:
        items = [m for m in items if m["category"] == category]
    if q:
        ql = q.lower()
        items = [m for m in items if ql in m["title"].lower() or ql in (m.get("detail") or "").lower()]
    return {"items": items, "total": len(items)}


@router.get("/w/{wid}/memory/{mid}")
async def memory_item(wid: str, mid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        items = await v2_real.build_memory(proj)
        return next((m for m in items if m["id"] == mid), None) or {}
    return next((m for m in _seed()["memory"] if m["id"] == mid), None) or {}


@router.get("/w/{wid}/people")
async def people(wid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return {"people": await v2_real.build_people(proj)}
    return {"people": _seed()["people"]}


@router.get("/w/{wid}/people/{pid}")
async def person(wid: str, pid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return next((p for p in await v2_real.build_people(proj) if p["id"] == pid), None) or {}
    return next((p for p in _seed()["people"] if p["id"] == pid), None) or {}


@router.get("/w/{wid}/timeline")
async def timeline(wid: str, filter: str = ""):
    mode, proj = await _resolve(wid)
    if mode == "real":
        evs = await v2_real.build_timeline(proj)
        return {"events": evs, "total": len(evs)}
    return {"events": _seed()["events"], "total": len(_seed()["events"])}


@router.get("/w/{wid}/timeline/{eid}")
async def event(wid: str, eid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return next((e for e in await v2_real.build_timeline(proj) if e["id"] == eid), None) or {}
    return next((e for e in _seed()["events"] if e["id"] == eid), None) or {}


@router.get("/w/{wid}/sources")
async def sources(wid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return {"sources": await v2_real.build_sources(proj)}
    return {"sources": _seed()["sources"]}


@router.get("/w/{wid}/sources/{sid}")
async def source(wid: str, sid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return next((x for x in await v2_real.build_sources(proj) if x["id"] == sid), None) or {}
    return next((x for x in _seed()["sources"] if x["id"] == sid), None) or {}


@router.get("/w/{wid}/reviews")
async def reviews(wid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return {"reviews": await v2_real.build_reviews(proj)}
    return {"reviews": _seed()["reviews"]}


@router.get("/w/{wid}/reviews/{rid}")
async def review(wid: str, rid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return next((r for r in await v2_real.build_reviews(proj) if r["id"] == rid), None) or {}
    return next((r for r in _seed()["reviews"] if r["id"] == rid), None) or {}


@router.get("/w/{wid}/threads")
async def threads(wid: str, filter: str = ""):
    mode, proj = await _resolve(wid)
    if mode == "real":
        th = await v2_real.build_threads(proj)
        return {"threads": th, "total": len(th)}
    return {"threads": _seed()["threads"], "total": len(_seed()["threads"])}


@router.get("/w/{wid}/threads/{tid}")
async def thread(wid: str, tid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return next((t for t in await v2_real.build_threads(proj) if t["id"] == tid), None) or {}
    return next((t for t in _seed()["threads"] if t["id"] == tid), None) or {}


@router.get("/w/{wid}/ask/history")
async def ask_history(wid: str):
    return {"items": _seed()["ask_history"]}


class AskIn(BaseModel):
    question: str = ""
    scope: str = ""


@router.post("/w/{wid}/ask")
async def ask(wid: str, payload: AskIn):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return await v2_real.ask(proj, (payload.question or "").strip())
    q = (payload.question or "").strip()
    return {
        "id": "q_" + str(int(_now().timestamp())),
        "question": q,
        "lead": "Based on the project memory: desktop and mobile layouts are in scope and the launch is targeted for Oct 17. Tablet layouts were requested by Sarah Chen but haven't been agreed yet — that change is waiting in your review queue, and it puts the two-week timeline at risk.",
        "answer": "Based on the project memory: desktop and mobile layouts are in scope and the launch is targeted for Oct 17. Tablet layouts were requested by Sarah Chen but haven't been agreed yet — that change is waiting in your review queue, and it puts the two-week timeline at risk.",
        "paragraphs": [],
        "confidence": "high",
        "basis": {"memories": 5, "sources": 2},
        "sources": [{"n": 1, "provider": "gmail", "label": "Sarah Chen · Re: Homepage direction", "meta": "", "memory_id": "sc1"}, {"n": 2, "provider": "notes", "label": "Kickoff call notes", "meta": "", "memory_id": "co3"}],
        "next": [],
        "at": mins(0),
    }


class DraftIn(BaseModel):
    instruction: str = ""


@router.post("/w/{wid}/threads/{tid}/draft")
async def draft(wid: str, tid: str, payload: DraftIn):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return await v2_real.draft(proj, tid, payload.instruction or "")
    return {"body": "Hi Sarah — thanks for the note. Before we lock this in: adding tablet layouts expands the scope beyond the desktop + mobile we agreed, so the Oct 17 launch would be at risk unless we move the date or ship tablet in a second phase. Which would you prefer? Happy to send an updated timeline either way.", "to": "sarah.chen@acmefinance.com", "via": "gmail", "based_on": [], "note": ""}


class SendIn(BaseModel):
    body: str = ""
    to: object = ""


class AcceptIn(BaseModel):
    selected: list = []
    edits: dict = {}


class DismissIn(BaseModel):
    reason: str = ""
    note: str = ""


@router.post("/w/{wid}/threads/{tid}/send")
async def send(wid: str, tid: str, request: Request, payload: SendIn):
    mode, proj = await _resolve(wid)
    if mode != "real":
        return {"ok": True, "sent_at": mins(0)}
    user = await current_user(request, db)
    conn = await db.source_connections.find_one({"id": tid, "project_id": wid}, {"_id": 0})
    if not conn:
        raise HTTPException(404, "Conversation not found.")
    text = (payload.body or "").strip()
    if not text:
        raise HTTPException(400, "Nothing to send — the reply is empty.")
    provider = conn.get("provider")
    account = await _get_account(user["user_id"], provider)
    if not account:
        raise HTTPException(400, f"{PROVIDERS.get(provider, {}).get('label', provider)} isn't connected.")
    if provider == "gmail":
        to = (str(payload.to) if payload.to else "") or conn.get("client_email") or ""
        if "@" not in to:
            raise HTTPException(400, "No recipient email for this thread.")
        await send_gmail_reply(account, to, conn.get("source_id", ""), text)
    elif provider == "slack":
        await send_slack_message(account, conn.get("source_id", ""), text)
    else:
        raise HTTPException(400, "This source can't send messages.")
    return {"ok": True, "sent_at": iso(_now())}


class NewMessageIn(BaseModel):
    to: object = ""
    subject: str = ""
    body: str = ""
    via: str = "gmail"


@router.get("/w/{wid}/message-templates")
async def message_templates(wid: str):
    mode, proj = await _resolve(wid)
    client = (proj or {}).get("client_name", "") if mode == "real" else "the client"
    return {"templates": [
        {"id": "intro", "label": "Intro / kickoff", "to": "", "subject": "Great to be working together",
         "body": f"Hi{(' ' + client) if client else ''},\n\nLooking forward to getting started. I'll keep everything we agree on in one place and share updates as we go.\n\nBest,", "remember": []},
        {"id": "status", "label": "Status update", "to": "", "subject": "Quick update",
         "body": "Hi,\n\nA quick update on where things stand:\n\n• \n• \n\nLet me know if you have any questions.\n\nBest,", "remember": []},
        {"id": "followup", "label": "Follow-up", "to": "", "subject": "Following up",
         "body": "Hi,\n\nJust following up on this — happy to jump on a quick call if that's easier.\n\nBest,", "remember": []},
    ]}


@router.post("/w/{wid}/messages")
async def new_message(wid: str, request: Request, payload: NewMessageIn):
    mode, proj = await _resolve(wid)
    if mode != "real":
        return {"id": "t_new"}
    user = await current_user(request, db)
    to = (str(payload.to) if payload.to else "").strip()
    text = (payload.body or "").strip()
    subject = (payload.subject or "").strip()
    via = payload.via if payload.via in ("gmail", "slack") else "gmail"
    if not to:
        raise HTTPException(400, "Add a recipient first.")
    if not text:
        raise HTTPException(400, "Write a message before sending.")
    account = await _get_account(user["user_id"], via)
    if not account:
        raise HTTPException(400, f"{PROVIDERS.get(via, {}).get('label', via)} isn't connected to this workspace.")
    now = iso(_now())
    conn_id = str(uuid.uuid4())
    if via == "gmail":
        if "@" not in to:
            raise HTTPException(400, "Enter a valid email address.")
        thread_id = await send_gmail_reply(account, to, "", text, subject_override=(subject or "(no subject)"))
        cache = f"GMAIL CONVERSATION (1 messages):\n--- From: {user.get('email','you')} | Date: {_now().strftime('%a, %d %b %Y %H:%M:%S %z')} | Subject: {subject or '(no subject)'}\n{text}"
        await db.source_connections.insert_one({
            "id": conn_id, "project_id": wid, "user_id": user["user_id"], "provider": "gmail",
            "source_type": "gmail", "source_id": str(thread_id) if thread_id else "", "source_name": subject or f"Message to {to}",
            "source_url": "", "client_email": to, "status": "connected", "content_cache": cache,
            "last_synced_at": now, "last_activity_at": now, "created_at": now, "updated_at": now,
        })
    else:
        await send_slack_message(account, to, text)
        cache = f"SLACK CONVERSATION (most recent first):\n- {user.get('email','you')} ({_now().strftime('%Y-%m-%d %H:%M')}): {text}"
        await db.source_connections.insert_one({
            "id": conn_id, "project_id": wid, "user_id": user["user_id"], "provider": "slack",
            "source_type": "slack", "source_id": to, "source_name": f"#{to}", "source_url": "",
            "status": "connected", "content_cache": cache,
            "last_synced_at": now, "last_activity_at": now, "created_at": now, "updated_at": now,
        })
    await db.source_events.insert_one({
        "id": str(uuid.uuid4()), "project_id": wid, "connection_id": conn_id, "provider": via,
        "source_label": subject or to, "event_type": "sent", "occurred_at": now,
        "summary": f"You sent a message via {PROVIDERS.get(via, {}).get('label', via)} — {subject or to}.",
    })
    return {"id": conn_id, "ok": True}


class SnoozeIn(BaseModel):
    until: str = ""


@router.post("/w/{wid}/attention/{aid}/snooze")
async def att_snooze(wid: str, aid: str, payload: SnoozeIn = SnoozeIn()):
    mode, _ = await _resolve(wid)
    if mode == "real":
        await v2_real.set_attention_state(wid, aid, "snoozed", payload.until or None)
    return {"ok": True}


@router.post("/w/{wid}/attention/{aid}/save")
async def att_save(wid: str, aid: str):
    mode, _ = await _resolve(wid)
    if mode == "real":
        await v2_real.set_attention_state(wid, aid, "saved")
    return {"ok": True}


@router.post("/w/{wid}/attention/{aid}/restore")
async def att_restore(wid: str, aid: str):
    mode, _ = await _resolve(wid)
    if mode == "real":
        await v2_real.clear_attention_state(wid, aid)
    return {"ok": True}


@router.post("/w/{wid}/attention/{aid}/dismiss")
async def att_dismiss(wid: str, aid: str):
    rid = aid[4:] if aid.startswith("att_") else aid
    await db.notifications.update_one({"id": rid, "project_id": wid}, {"$set": {"read": True}})
    await db.project_memory.update_one({"id": rid, "project_id": wid}, {"$set": {"status": "ignored", "updated_at": iso(_now())}})
    mode, _ = await _resolve(wid)
    if mode == "real":
        await v2_real.clear_attention_state(wid, aid)
    return {"ok": True}


@router.post("/w/{wid}/reviews/{rid}/accept")
async def review_accept(wid: str, rid: str, payload: AcceptIn):
    mode, proj = await _resolve(wid)
    if mode == "real":
        res = await v2_real.accept_review(proj, rid, payload.selected, payload.edits)
        if not res.get("applied"):
            # stale review — the memory no longer exists or nothing matched
            from fastapi import HTTPException
            raise HTTPException(status_code=409, detail="This review is already up to date.")
        return res
    n = len(payload.selected) if payload.selected else 1
    return {"accepted": n, "impact": f"memories updated +{n}", "applied": True}


@router.post("/w/{wid}/reviews/{rid}/undo")
async def review_undo(wid: str, rid: str):
    mode, proj = await _resolve(wid)
    if mode == "real":
        return await v2_real.undo_review(proj, rid)
    return {"ok": True}


@router.post("/w/{wid}/reviews/{rid}/save")
async def review_save(wid: str, rid: str):
    await db.project_memory.update_one({"id": rid, "project_id": wid}, {"$set": {"review_saved": True, "updated_at": iso(_now())}})
    return {"ok": True}


@router.post("/w/{wid}/reviews/{rid}/dismiss")
async def review_dismiss(wid: str, rid: str, payload: DismissIn = DismissIn()):
    await db.project_memory.update_one({"id": rid, "project_id": wid}, {"$set": {"status": "ignored", "dismiss_reason": payload.reason, "updated_at": iso(_now())}})
    return {"ok": True}


@router.post("/w/{wid}/conflicts/{cid}/resolve")
async def conflict_resolve(wid: str, cid: str):
    await db.project_memory.update_one({"id": cid, "project_id": wid},
        {"$set": {"is_conflict": False, "status": "confirmed", "updated_at": iso(_now())},
         "$unset": {"conflict_values": ""}})
    return {"ok": True}


@router.post("/w/{wid}/sources/{sid}/sync")
async def source_sync(wid: str, sid: str):
    conn = await db.source_connections.find_one({"id": sid, "project_id": wid}, {"_id": 0})
    if conn and not conn.get("is_demo"):
        try:
            import connectors
            await connectors._sync_connection(conn)
        except Exception:
            pass
    return {"ok": True, "status": "synced"}



# ── Billing (bridges the v2 account UI to the real plan + Razorpay data) ─────
BILLING_PRICES = {"monthly": {"inr": 999, "usd": 12}, "project": {"inr": 199, "usd": 2}}
BILLING_LIMITS = {"monthly": 10, "project": 1, "test": 10, "ph_launch": 1}
PAID_PLANS = {"monthly", "project", "test", "ph_launch"}
TRIAL_DAYS = 14


def _parse_dt(s):
    try:
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _renews_on(plan, plan_since):
    dt = _parse_dt(plan_since or "")
    if not dt:
        return None
    days = 30 if plan in ("monthly", "test", "ph_launch") else 60 if plan == "project" else None
    return iso(dt + timedelta(days=days)) if days else None


async def _billing_view(u):
    plan = u.get("plan")
    currency = (u.get("plan_currency") or "inr").lower()
    used = await db.projects.count_documents({"owner_user_id": u["user_id"], "archived": {"$ne": True}, "is_demo": {"$ne": True}})
    interval = "project" if plan == "project" else "month"
    label = {"monthly": "Monthly", "project": "Per project", "test": "Monthly", "ph_launch": "Launch offer"}.get(plan, "Trial")
    renews_on = _renews_on(plan, u.get("plan_since"))
    invoices = []
    async for t in db.payment_transactions.find({"user_id": u["user_id"], "payment_status": "paid"}, {"_id": 0}).sort("created_at", -1).limit(12):
        invoices.append({"id": t.get("razorpay_payment_id") or t.get("session_id"), "at": t.get("created_at"),
                         "label": (PLANS_LABEL.get(t.get("plan_id")) or "Bracket"), "amount": t.get("amount") or 0,
                         "currency": (t.get("currency") or currency)})
    out = {
        "plan": plan, "label": label, "interval": interval, "currency": currency,
        "prices": BILLING_PRICES, "workspaces": {"used": used, "limit": BILLING_LIMITS.get(plan, 10)},
        "renews_on": renews_on, "invoices": invoices, "card": None,
    }
    if plan in PAID_PLANS:
        if u.get("billing_canceled_at") and plan == "monthly":
            out["status"] = "canceled"
            out["ends_on"] = renews_on
        else:
            out["status"] = "active"
            if u.get("billing_pending_plan") and u["billing_pending_plan"] != plan:
                out["pending_change"] = {"plan": u["billing_pending_plan"], "on": renews_on}
    else:
        created = _parse_dt(u.get("created_at") or "")
        ends = iso(created + timedelta(days=TRIAL_DAYS)) if created else None
        out["trial_ends_at"] = ends
        out["status"] = "trialing" if (created and datetime.now(timezone.utc) < created + timedelta(days=TRIAL_DAYS)) else "expired"
    return out


PLANS_LABEL = {"monthly": "Bracket Monthly", "project": "Bracket Single Project", "test": "Bracket", "ph_launch": "Launch offer"}


async def _user_doc(request: Request):
    user = await current_user(request, db)
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}


@router.get("/billing")
async def billing_get(request: Request):
    return await _billing_view(await _user_doc(request))


class BillingPatchIn(BaseModel):
    currency: str = ""


@router.patch("/billing")
async def billing_patch(request: Request, payload: BillingPatchIn):
    u = await _user_doc(request)
    cur = (payload.currency or "").lower()
    if cur in ("inr", "usd"):
        await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"plan_currency": cur, "updated_at": iso(_now())}})
        u["plan_currency"] = cur
    return await _billing_view(u)


class BillingChangeIn(BaseModel):
    plan: str = ""


@router.post("/billing/change")
async def billing_change(request: Request, payload: BillingChangeIn):
    u = await _user_doc(request)
    set_fields = {"updated_at": iso(_now())}
    unset_fields = {}
    if payload.plan and payload.plan != u.get("plan"):
        set_fields["billing_pending_plan"] = payload.plan
    else:
        unset_fields["billing_pending_plan"] = ""
    op = {"$set": set_fields}
    if unset_fields:
        op["$unset"] = unset_fields
    await db.users.update_one({"user_id": u["user_id"]}, op)
    u.update(set_fields)
    if unset_fields:
        u.pop("billing_pending_plan", None)
    return {"billing": await _billing_view(u)}


class BillingCancelIn(BaseModel):
    reason: str = ""
    note: str = ""


@router.post("/billing/cancel")
async def billing_cancel(request: Request, payload: BillingCancelIn):
    u = await _user_doc(request)
    await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"billing_canceled_at": iso(_now()), "billing_cancel_reason": payload.reason, "updated_at": iso(_now())}})
    u["billing_canceled_at"] = iso(_now())
    return {"billing": await _billing_view(u)}


@router.post("/billing/resume")
async def billing_resume(request: Request):
    u = await _user_doc(request)
    await db.users.update_one({"user_id": u["user_id"]}, {"$unset": {"billing_canceled_at": "", "billing_cancel_reason": ""}, "$set": {"updated_at": iso(_now())}})
    u.pop("billing_canceled_at", None)
    return {"billing": await _billing_view(u)}


@router.post("/billing/retry")
async def billing_retry(request: Request):
    return {"billing": await _billing_view(await _user_doc(request))}