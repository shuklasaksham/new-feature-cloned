"""Turns a spoken (or typed) request into a Bracket reply.

Deterministic intent routing over the user's Voice AI workspace. Read-only
requests (status, lookups, summaries) answer instantly. Anything that sends,
calls or changes memory returns a pending *action* that only runs after an
explicit confirmation — a click, or a clear "yes" on the next turn.

A future LLM provider can replace `respond()` as long as it returns the same
reply shape; the confirmation contract stays in the router.
"""
from __future__ import annotations

import re
import uuid
from typing import Optional

YES = re.compile(r"^\s*(yes|yep|yeah|sure|ok(ay)?|confirm|do it|go ahead|send it|call (her|him|them)|"
                 r"sounds good|please do|accept( it| them| all)?)\b", re.I)
NO = re.compile(r"^\s*(no|nope|cancel|stop|never ?mind|don'?t)\b", re.I)


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _has(text: str, *words: str) -> bool:
    return any(w in text for w in words)


def find_contact(text: str, ws: dict) -> Optional[dict]:
    t = text.lower()
    for c in ws["contacts"]:
        if c["first_name"].lower() in t or c["name"].lower() in t:
            return c
    return None


def latest_call(calls: list, *, scenario: Optional[str] = None, status: Optional[str] = None) -> Optional[dict]:
    for c in calls:  # calls arrive newest first
        if scenario and c.get("scenario") != scenario:
            continue
        if status and c.get("status") != status:
            continue
        return c
    return None


def _sources(ws):
    return [
        {"n": 1, "provider": "gmail", "title": "Re: Homepage direction + next steps", "date": "Oct 7"},
        {"n": 2, "provider": "slack", "title": "#acme-redesign", "date": "Oct 8"},
        {"n": 3, "provider": "notes", "title": "Kickoff call notes", "date": "Oct 3"},
    ]


def _status_reply(ws: dict) -> dict:
    open_blockers = [b for b in ws["blockers"] if not b.get("resolved")]
    launch = ws["project"]["launch_date"]
    approval_open = any(b["id"] == "tablet-approval" for b in open_blockers)
    if approval_open:
        text = (f"The launch is waiting on one approval. Sarah asked to add tablet layouts on Oct 7 and hasn’t "
                f"approved the new scope yet — so the {launch.replace('Fri ', '')} date isn’t confirmed. "
                "Everything else is on track.")
        suggestions = [
            {"label": "Call Sarah and ask for an update", "utterance": "Call Sarah and ask for an update", "icon": "phone", "primary": True},
            {"label": "Draft a follow-up email", "utterance": "Draft a follow-up email to Sarah", "icon": "mail"},
            {"label": "Show the scope change", "utterance": "What changed in scope?", "icon": "eye"},
        ]
    else:
        text = (f"Nothing is blocking the launch now — it’s set for {launch}. "
                + (f"Still waiting on: {open_blockers[0]['title'].lower()}." if open_blockers else "No open blockers."))
        suggestions = [
            {"label": "Write this week’s project update", "utterance": "Write this week’s project update", "icon": "sparkles"},
            {"label": "What needs my approval?", "utterance": "What needs my approval?", "icon": "check-circle"},
        ]
    return {
        "intent": "status",
        "text": text,
        "cards": [{"type": "blockers", "title": f"Blocking the {launch} launch", "items": open_blockers}] if open_blockers else
                 [{"type": "status", "rows": [["Status", "On track", "success"], ["Launch", launch, None],
                                              ["Next due", "Tablet screens · Oct 15", None]]}],
        "suggestions": suggestions,
        "sources": _sources(ws),
        "memory_from": [
            {"category": "Approvals", "statement": "Tablet scope — awaiting Sarah Chen since Oct 7." if approval_open else "Tablet scope — approved by Sarah on a call."},
            {"category": "Commitments", "statement": f"Launch {launch} — {'at risk' if approval_open else 'on track'}."},
        ],
    }


def _call_reply(text: str, ws: dict) -> dict:
    contact = find_contact(text, ws)
    settings = ws["settings"]
    if not settings.get("calling_enabled", True):
        return {"intent": "call", "text": "AI calling is turned off for this workspace. You can turn it on in Settings → Voice & calling.",
                "cards": [], "suggestions": []}
    if not contact:
        names = ", ".join(c["first_name"] for c in ws["contacts"] if c.get("authorized"))
        return {"intent": "call", "text": f"Who should I call? I can call {names}.", "cards": [], "suggestions": [
            {"label": f"Call {c['first_name']}", "utterance": f"Call {c['first_name']}", "icon": "phone"}
            for c in ws["contacts"] if c.get("authorized")]}
    if settings.get("only_authorized", True) and not contact.get("authorized"):
        return {"intent": "call", "text": f"{contact['name']} isn’t an authorized contact, so I can’t call them. "
                                          "Add them in Settings → Voice & calling.", "cards": [], "suggestions": []}
    return {
        "intent": "call",
        "text": f"On it. I’ll call {contact['name']} at {contact['company']}. I’m preparing a call plan — you’ll review it before I dial.",
        "cards": [],
        "suggestions": [],
        "prepare_call": {"contact_id": contact["id"], "request_text": text},
    }


def _draft_email(text: str, ws: dict, calls: list) -> dict:
    contact = find_contact(text, ws) or next(c for c in ws["contacts"] if c["id"] == "sarah-chen")
    done = latest_call(calls, scenario="approval", status="completed")
    if done and done.get("summary") and contact["id"] != done["contact"]["id"]:
        title = f"Let {contact['name']} know the launch moved"
        body = (f"Hi {contact['first_name']} — heads up: Sarah approved tablet layouts on today’s call and launch moves to "
                "Fri Oct 24. I know Oct 17 looked firm on your side — happy to talk through the hosting timeline.")
        drafted_from = [{"provider": "call", "title": f"Call with {done['contact']['name']}", "date": "Today"},
                        {"provider": "slack", "title": "#acme-redesign", "date": "Oct 8"}]
        lead = f"Here’s a heads-up for {contact['first_name']}. Want me to send it?"
    elif done and done.get("summary"):
        title = f"Follow-up to {contact['name']} — tablet scope & new launch date"
        body = (f"Hi {contact['first_name']} — thanks for the time today. Confirming what we agreed: tablet layouts are in "
                "scope, and launch moves to Fri Oct 24. I’ll send revised mobile + tablet screens by Wed Oct 15.")
        drafted_from = [{"provider": "call", "title": f"Call with {done['contact']['name']}", "date": "Today"}]
        lead = "Here’s a draft based on today’s call. Want me to send it from your Gmail?"
    else:
        title = f"Nudge {contact['name']} on the tablet approval"
        body = (f"Hi {contact['first_name']} — quick nudge on adding tablet layouts. It’s about a week of design work; "
                "could you confirm whether you’d like it in scope so we can lock the launch date?")
        drafted_from = [{"provider": "gmail", "title": "Re: Homepage direction + next steps", "date": "Oct 7"}]
        lead = "Here’s a short nudge. Want me to send it from your Gmail?"
    action = {"id": _id("act"), "kind": "draft_email", "status": "pending", "eyebrow": "DRAFT EMAIL",
              "title": title, "to": contact["email"], "body": body, "drafted_from": drafted_from,
              "confirm_label": "Approve & send"}
    return {"intent": "draft_email", "text": lead, "cards": [{"type": "action", "action": action}],
            "suggestions": [], "action": action}


def _action_item(text: str) -> dict:
    m = re.search(r"remind me to (.+?)(?: on| by| this)? ?(monday|tuesday|wednesday|thursday|friday|tomorrow)?\.?$", text, re.I)
    what = (m.group(1) if m else text).strip().rstrip(".")
    when = (m.group(2) if m and m.group(2) else "Wed").capitalize()
    due = {"Wednesday": "Wed Oct 15", "Wed": "Wed Oct 15", "Monday": "Mon Oct 13", "Tuesday": "Tue Oct 14",
           "Thursday": "Thu Oct 16", "Friday": "Fri Oct 17", "Tomorrow": "Wed Oct 8"}.get(when, "Wed Oct 15")
    title = what[:1].upper() + what[1:]
    action = {"id": _id("act"), "kind": "action_item", "status": "pending", "eyebrow": "ACTION ITEM",
              "title": title, "owner": "You → Acme Finance", "due": due, "confirm_label": "Add"}
    return {"intent": "action_item", "text": f"Added as a commitment for you, due {due}. Keep it?",
            "cards": [{"type": "action", "action": action}], "suggestions": [], "action": action}


def _summary(ws: dict, calls: list) -> dict:
    done = latest_call(calls, scenario="approval", status="completed")
    bullets = ["Editorial homepage approved (email, Mon)", "Assets still outstanding (Slack)"]
    if done:
        bullets = ["Tablet layouts approved (call, today)", "Launch → Fri Oct 24 (call, today)"] + bullets
    else:
        bullets = ["Sarah asked to add tablet layouts (email, Tue)", "James: Oct 17 is firm (Slack, Wed)"] + bullets
    text = ("This week: " + "; ".join(b.split(" (")[0].lower() for b in bullets) + ".")
    return {"intent": "summarize", "text": text[:1].upper() + text[1:],
            "cards": [{"type": "list", "title": f"This week with Acme · {len(bullets)} items", "items": bullets}],
            "suggestions": [{"label": "Write this week’s project update", "utterance": "Write this week’s project update", "icon": "sparkles"}]}


def _approvals(ws: dict, calls: list) -> dict:
    items = []
    for c in calls:
        if c.get("review_status") == "pending":
            items.append({"title": f"{len(c['memory_updates'])} updates from call with {c['contact']['first_name']}",
                          "badge": "Pending", "tone": "warning", "call_id": c["id"]})
    for a in ws["approvals"]:
        if a["status"] == "pending":
            items.append({"title": a["title"], "badge": "Waiting on client", "tone": "warning"})
    if not items:
        return {"intent": "approvals", "text": "Nothing needs your approval right now.", "cards": [], "suggestions": []}
    reply = {"intent": "approvals", "text": f"{len(items)} item{'s' if len(items) > 1 else ''} need{'' if len(items) > 1 else 's'} you.",
             "cards": [{"type": "list", "title": "Needs your approval", "items": [i["title"] for i in items]}],
             "suggestions": []}
    review = next((i for i in items if i.get("call_id")), None)
    if review:
        action = {"id": _id("act"), "kind": "accept_updates", "status": "pending", "eyebrow": "MEMORY REVIEW",
                  "title": f"Accept {review['title']}", "call_id": review["call_id"], "confirm_label": "Yes, accept all",
                  "body": "Updates scope, adds a deliverable and a requirement, and moves the launch commitment."}
        reply["text"] += f" Want me to accept the {review['title']}?"
        reply["cards"].append({"type": "action", "action": action})
        reply["action"] = action
    return reply


def _project_update(ws: dict) -> dict:
    p = ws["project"]
    body = (f"This week: {'tablet scope approved, ' if p.get('updated_from_call') else 'tablet scope pending Sarah’s approval, '}"
            f"launch {p['launch_date']}, editorial homepage signed off. Next: tablet screens Oct 15, assets from Acme Oct 10.")
    action = {"id": _id("act"), "kind": "project_update", "status": "pending", "eyebrow": "PROJECT UPDATE",
              "title": "Weekly update for Acme Finance", "to": "Sarah Chen, James Park", "body": body,
              "confirm_label": "Send to Acme"}
    return {"intent": "project_update", "text": "Draft ready for Sarah and James. Want me to send it?",
            "cards": [{"type": "action", "action": action}], "suggestions": [], "action": action}


def _lookup(text: str, ws: dict) -> dict:
    words = {w for w in re.findall(r"[a-z]{4,}", text.lower())} - {"what", "when", "where", "which", "about", "with", "agree", "agreed", "did", "have", "does", "there"}
    best, score = None, 0
    for m in ws["memory"]:
        s = sum(1 for w in words if w in m["statement"].lower() or w in m["category"].lower())
        if s > score:
            best, score = m, s
    if not best:
        return {"intent": "lookup", "text": "I couldn’t find that in this workspace’s memory. Try asking about scope, the launch, hosting or people.",
                "cards": [], "suggestions": [{"label": "What’s blocking the Acme launch?", "utterance": "What’s blocking the Acme launch?", "icon": "ask"}]}
    return {"intent": "lookup", "text": best["statement"],
            "cards": [{"type": "answer", "category": best["category"], "statement": best["statement"], "source": best.get("source")}],
            "suggestions": [], "memory_from": [{"category": best["category"], "statement": best["statement"]}]}


def respond(text: str, ws: dict, calls: list) -> dict:
    t = text.lower()
    if _has(t, "call ", "phone ", "ring ") and not _has(t, "summar", "what did"):
        return _call_reply(text, ws)
    if _has(t, "remind me", "action item", "to-do", "todo", "add a task", "create a task"):
        return _action_item(text)
    if _has(t, "project update", "weekly update", "status update", "update for acme", "write this week"):
        return _project_update(ws)
    if _has(t, "draft", "email", "follow-up", "follow up", "write to"):
        return _draft_email(text, ws, calls)
    if _has(t, "summar", "recap", "this week"):
        return _summary(ws, calls)
    if _has(t, "approv", "needs my", "need my", "pending"):
        return _approvals(ws, calls)
    if _has(t, "block", "status", "how's", "how is", "going", "on track", "launch", "risk"):
        return _status_reply(ws)
    return _lookup(text, ws)


def is_yes(text: str) -> bool:
    return bool(YES.search(text or ""))


def is_no(text: str) -> bool:
    return bool(NO.search(text or ""))
