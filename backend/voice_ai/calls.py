"""AI client calls: planning, a time-based call simulator, and post-call output.

Real telephony is not wired in yet. A call's state is derived from the time
since the user confirmed it (dialing → ringing → connected → ended), so the
UI can poll `GET /api/voice/calls/{id}` and see a live call without any
background workers. Swapping in a real provider means replacing
`materialize()` with provider webhooks that write the same fields.
"""
from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Optional

DIAL_S = 2.5          # dialing → ringing
CONNECT_S = 5.0       # ringing → connected
NO_ANSWER_S = 15.0    # ringing gives up
SUMMARY_DELAY_S = 4.0  # call ended → summary ready

TERMINAL = {"completed", "no_answer", "busy", "failed", "canceled"}
OUTCOMES = {"completed", "no_answer", "busy", "failed"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _parse(ts: Optional[str]) -> Optional[datetime]:
    return datetime.fromisoformat(ts) if ts else None


def mmss(seconds: float) -> str:
    s = max(0, int(seconds))
    return f"{s // 60:02d}:{s % 60:02d}"


# ---------------------------------------------------------------------------
# Scenarios. Each is the script and the intelligence a real call would yield.
# `line` on summary items and memory updates points at the transcript line
# that supports it — only lines actually spoken make it into the output.
# ---------------------------------------------------------------------------
SCENARIOS = {
    "approval": {
        "title": "Call Sarah Chen about the tablet approval",
        "objective": (
            "Get Sarah’s decision on adding tablet layouts. If she approves, agree a new launch date "
            "and confirm when Acme will send the brand assets."
        ),
        "talking_points": [
            "Thank her for the tablet request; confirm it adds ~1 week of design work.",
            "Ask whether she approves adding tablet layouts to scope.",
            "If yes — propose Fri Oct 24 for launch instead of Oct 17.",
            "Ask when Acme can send logos and fonts (promised Sep 29).",
        ],
        "questions": [
            ("“Are you happy to add tablet layouts to the current scope?”", True),
            ("“Would Friday October 24th work as the new launch date?”", True),
            ("“Who else at Acme needs to sign off on the change?”", False),
        ],
        "why": (
            "Sarah requested tablet layouts on Oct 7 but hasn’t approved the scope or a new date. "
            "Two emails and one Slack nudge have gone unanswered for 8 days."
        ),
        "script": [
            {"at": 1, "speaker": "bracket", "text": "Hi Sarah, this is Bracket, Maya Rao’s assistant at Studio North. This call is recorded. Is now a good time for two minutes on the landing page?"},
            {"at": 5, "speaker": "client", "text": "Sure, go ahead."},
            {"at": 8, "speaker": "bracket", "text": "Thanks for the tablet request. Adding tablet layouts is about one extra week of design. Are you happy to add it to the scope?", "covers": 0},
            {"at": 13, "speaker": "client", "text": "Yes — let’s include tablet. Our users are heavy on iPad.", "tags": ["Decision"], "covers": 1},
            {"at": 16, "speaker": "bracket", "text": "Great. Would Friday October 24th work as the new launch date?"},
            {"at": 20, "speaker": "client", "text": "The 24th works, as long as tablet is covered from 768 to 1024.", "tags": ["Deadline", "Requirement"], "covers": 2},
            {"at": 23, "speaker": "bracket", "text": "Noted. Maya will confirm by email today. One last thing — when can we expect the logos and fonts?"},
            {"at": 27, "speaker": "client", "text": "I’ll get them over by Friday. And honestly the editorial direction is landing really well internally.", "tags": ["Action", "Feedback"], "covers": 3},
            {"at": 30, "speaker": "bracket", "text": "Perfect, thank you Sarah. Maya will follow up shortly. Bye for now."},
        ],
        "end_at": 33,
        "headline": "Sarah approved tablet scope — launch moves to Fri Oct 24",
        "summary": (
            "Sarah approved adding tablet layouts to the scope and agreed to move launch to Fri Oct 24, on the "
            "condition that tablet covers 768–1024px. She’ll send brand assets by Fri Oct 10 and said the "
            "editorial direction is landing well. Maya should confirm both changes by email today."
        ),
        "items": [
            {"kind": "decision", "line": 3, "text": "Tablet layouts are in scope."},
            {"kind": "decision", "line": 5, "text": "Launch moves to Fri Oct 24."},
            {"kind": "scope_change", "line": 3, "before": "Desktop and mobile layouts.", "after": "Desktop, tablet and mobile layouts."},
            {"kind": "deadline", "line": 5, "before": "Launch · Fri Oct 17", "after": "Launch · Fri Oct 24"},
            {"kind": "deadline", "line": 7, "before": "Brand assets · “early next week”", "after": "Brand assets · Fri Oct 10"},
            {"kind": "requirement", "line": 5, "text": "Homepage must be responsive at tablet widths (768–1024px)."},
            {"kind": "action_item", "line": 5, "text": "Email Sarah to confirm scope + Oct 24", "owner": "Maya · today"},
            {"kind": "action_item", "line": 5, "text": "Design tablet breakpoints", "owner": "Maya · Wed Oct 15"},
            {"kind": "action_item", "line": 7, "text": "Send logos and fonts", "owner": "Sarah (Acme) · Fri Oct 10"},
            {"kind": "feedback", "line": 7, "text": "“Honestly the editorial direction is landing really well internally.”", "sentiment": "Positive"},
            {"kind": "followup", "line": 5, "text": "Confirm scope + new date by email today", "action": "draft_email"},
            {"kind": "followup", "line": 5, "text": "Tell James Park the launch moved — he said Oct 17 was firm (Slack, Oct 8)", "action": "draft_slack"},
        ],
        "memory_updates": [
            {"id": "u-scope", "category": "Scope", "type": "Modify", "tone": "warning", "line": 3,
             "before": "Desktop and mobile layouts are included.",
             "after": "Desktop, tablet and mobile layouts are included.",
             "reason": "Sarah: “Yes — let’s include tablet.”", "confidence": "High",
             "effects": [{"op": "memory_set", "id": "scope", "statement": "Desktop, tablet and mobile layouts are included."},
                         {"op": "blocker_resolve", "id": "tablet-approval"},
                         {"op": "approval_done", "id": "approve-tablet"}]},
            {"id": "u-deliverable", "category": "Deliverables", "type": "Add", "tone": "info", "line": 5,
             "before": None, "after": "Tablet layouts for the homepage — revised screens by Wed Oct 15.",
             "reason": "Follows from the approved scope and new date.", "confidence": "High",
             "effects": [{"op": "deliverable_add", "item": {"id": "tablet-screens", "title": "Tablet + mobile screens to Sarah", "meta": "From you · due Wed Oct 15", "badge": "New", "tone": "info"}},
                         {"op": "memory_add", "item": {"id": "tablet-deliverable", "category": "Deliverables", "statement": "Tablet layouts for the homepage — revised screens by Wed Oct 15."}}]},
            {"id": "u-requirement", "category": "Requirements", "type": "Add", "tone": "info", "line": 5,
             "before": None, "after": "Homepage must be responsive at tablet widths (768–1024px).",
             "reason": "Sarah: “as long as tablet is covered from 768 to 1024.”", "confidence": "High",
             "effects": [{"op": "memory_add", "item": {"id": "tablet-req", "category": "Requirements", "statement": "Homepage must be responsive at tablet widths (768–1024px)."}}]},
            {"id": "u-launch", "category": "Commitments", "type": "Conflict", "tone": "danger", "line": 5,
             "before": "Launch two weeks after kickoff — Oct 17.",
             "after": "Launch Fri Oct 24 — agreed with Sarah Chen on the call.",
             "reason": "Conflicts with James Park in #acme-redesign (Oct 8): “Oct 17 is firm on our side.” Accepting marks it superseded.",
             "confidence": "Medium",
             "conflict": {"source": "Slack · #acme-redesign · Oct 8", "quote": "Oct 17 is firm on our side.", "by": "James Park"},
             "effects": [{"op": "memory_set", "id": "launch", "statement": "Launch Fri Oct 24 — agreed with Sarah Chen on a call."},
                         {"op": "commitment", "id": "launch", "fields": {"date": "Fri Oct 24", "note": "Agreed with Sarah on a call · today", "badge": "Updated", "tone": "success"}},
                         {"op": "project", "fields": {"launch_date": "Fri Oct 24", "launch_status": "on_track"}},
                         {"op": "blocker_meta", "id": "brand-assets", "meta": "Sarah Chen · promised Fri Oct 10 on today’s call"}]},
            {"id": "u-people", "category": "People", "type": "Modify", "tone": "warning", "line": 5,
             "before": "Sarah Chen — client lead.", "after": "Sarah Chen — client lead; approves scope and launch dates.",
             "reason": "She approved scope and a date on the call without deferring to anyone.", "confidence": "Medium",
             "effects": [{"op": "memory_set", "id": "people-sarah", "statement": "Sarah Chen — client lead; approves scope and launch dates."}]},
        ],
        "project_after": {
            "summary": ("Acme Finance is redesigning its website to improve trust and conversions. Desktop, tablet "
                        "and mobile are agreed. Launch moved to Fri Oct 24 on today’s call with Sarah."),
            "updated_from_call": True,
        },
    },
    "hosting": {
        "title": "Call James Park about DNS access",
        "objective": "Get DNS access for launch day and confirm who flips the domain at Acme.",
        "talking_points": [
            "Remind James launch is approaching and hosting moves after launch.",
            "Ask for DNS access (or a contact who can update records on launch day).",
            "Confirm the domain stays with Acme.",
        ],
        "questions": [("“Who at Acme can update DNS records on launch day?”", True),
                      ("“Can you share registrar access before Oct 20?”", True)],
        "why": "Hosting handover was agreed on Oct 6, but nobody owns the DNS change for launch day.",
        "script": [
            {"at": 1, "speaker": "bracket", "text": "Hi James, this is Bracket, Maya Rao’s assistant at Studio North. This call is recorded. Do you have a minute about DNS for launch?"},
            {"at": 5, "speaker": "client", "text": "Yep, go for it.", "covers": 0},
            {"at": 8, "speaker": "bracket", "text": "We’ll need someone to update DNS records on launch day. Who should we work with?"},
            {"at": 12, "speaker": "client", "text": "That’s me. I’ll add Maya to the registrar by Monday.", "tags": ["Decision", "Action"], "covers": 1},
            {"at": 16, "speaker": "bracket", "text": "Thanks. And the domain stays with Acme after the handover?"},
            {"at": 19, "speaker": "client", "text": "Correct, we keep the domain.", "covers": 2},
        ],
        "end_at": 22,
        "headline": "James will add Maya to the registrar by Monday",
        "summary": "James owns DNS changes for launch and will add Maya to the registrar by Monday. Acme keeps the domain.",
        "items": [
            {"kind": "decision", "line": 3, "text": "James owns the DNS change on launch day."},
            {"kind": "action_item", "line": 3, "text": "Add Maya to the registrar", "owner": "James (Acme) · Monday"},
        ],
        "memory_updates": [
            {"id": "u-dns", "category": "People", "type": "Add", "tone": "info", "line": 3, "before": None,
             "after": "James Park owns DNS changes for launch.", "reason": "James: “That’s me.”", "confidence": "High",
             "effects": [{"op": "memory_add", "item": {"id": "dns-owner", "category": "People", "statement": "James Park owns DNS changes for launch."}}]},
        ],
        "project_after": {},
    },
    "general": {
        "title": "Check in with {name}",
        "objective": "Give {first} a quick project update and ask if anything is blocking them.",
        "talking_points": ["Share where the redesign stands.", "Ask if anything is blocking them."],
        "questions": [("“Is anything blocking you right now?”", True)],
        "why": "No open requests with {first} — this is a general check-in.",
        "script": [
            {"at": 1, "speaker": "bracket", "text": "Hi {first}, this is Bracket, Maya Rao’s assistant at Studio North. This call is recorded. Quick project update?"},
            {"at": 5, "speaker": "client", "text": "Sure.", "covers": 0},
            {"at": 8, "speaker": "bracket", "text": "The redesign is on track. Is anything blocking you on your side?"},
            {"at": 12, "speaker": "client", "text": "Nothing right now, thanks for checking in.", "covers": 1},
        ],
        "end_at": 15,
        "headline": "Check-in with {name} — nothing blocking",
        "summary": "{first} isn’t blocked. No changes to the project.",
        "items": [],
        "memory_updates": [],
        "project_after": {},
    },
}

DEFAULT_OUTCOME = {"sarah-chen": "completed", "james-park": "completed", "priya-nair": "busy"}


def pick_scenario(contact: dict, request_text: str = "") -> str:
    text = (request_text or "").lower()
    if contact["id"] == "james-park" or any(k in text for k in ("dns", "hosting", "registrar")):
        return "hosting"
    if contact["id"] == "sarah-chen":
        return "approval"
    return "general"


def _fmt(value, contact):
    if isinstance(value, str):
        return value.format(name=contact["name"], first=contact["first_name"])
    return value


def build_call(user_id: str, contact: dict, project: dict, settings: dict,
               request_text: str = "", source: str = "voice") -> dict:
    key = pick_scenario(contact, request_text)
    sc = SCENARIOS[key]
    return {
        "id": f"call_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "scenario": key,
        "direction": "outgoing",
        "source": source,
        "request_text": request_text,
        "contact": deepcopy(contact),
        "project": {"id": project["id"], "name": project["name"]},
        "plan": {
            "title": _fmt(sc["title"], contact),
            "objective": _fmt(sc["objective"], contact),
            "why": _fmt(sc["why"], contact),
            "talking_points": [{"id": f"tp{i}", "text": _fmt(t, contact)} for i, t in enumerate(sc["talking_points"])],
            "questions": [{"id": f"q{i}", "text": q, "selected": sel} for i, (q, sel) in enumerate(sc["questions"])],
            "instructions": ("Be brief and friendly. Don’t agree to pricing or new dates on Maya’s behalf — say Maya "
                             "will confirm by email today. If they ask for Maya, offer a callback after 2pm."),
            "max_minutes": settings.get("max_minutes", 10),
            "recording": settings.get("record_calls", True),
            "introduces_as": "Maya’s assistant at Studio North",
            "caller_id": settings.get("caller_id"),
        },
        "status": "prepared",
        "outcome": DEFAULT_OUTCOME.get(contact["id"], "completed"),
        "created_at": _iso(_now()),
        "confirmed_at": None,
        "connected_at": None,
        "ended_at": None,
        "ended_by": None,
        "notify_on_end": True,
        "transcript": [],
        "summary": None,
        "memory_updates": [],
        "review_status": "none",
        "accepted_update_ids": [],
    }


def _script(call: dict) -> list:
    sc = SCENARIOS[call["scenario"]]
    lines = []
    for i, ln in enumerate(sc["script"]):
        who = "Bracket" if ln["speaker"] == "bracket" else call["contact"]["name"]
        lines.append({
            "i": i, "at": ln["at"], "t": mmss(ln["at"]), "speaker": ln["speaker"], "who": who,
            "text": _fmt(ln["text"], call["contact"]), "tags": ln.get("tags", []), "covers": ln.get("covers"),
        })
    return lines


def _finish(call: dict, status: str, ended: datetime) -> None:
    call["status"] = status
    call["ended_at"] = _iso(ended)
    if status == "completed" and len(call["transcript"]) >= 2:
        call["summary_ready_at"] = _iso(ended + timedelta(seconds=SUMMARY_DELAY_S))


def _attach_summary(call: dict) -> None:
    sc = SCENARIOS[call["scenario"]]
    spoken = {ln["i"] for ln in call["transcript"]}
    by_line = {ln["i"]: ln["t"] for ln in call["transcript"]}
    items = [dict(it, t=by_line[it["line"]]) for it in sc["items"] if it["line"] in spoken]
    updates = [dict({k: v for k, v in u.items() if k != "effects"}, t=by_line[u["line"]])
               for u in sc["memory_updates"] if u["line"] in spoken]
    call["summary"] = {
        "headline": _fmt(sc["headline"], call["contact"]),
        "text": _fmt(sc["summary"], call["contact"]),
        "items": items,
    }
    call["memory_updates"] = updates
    call["review_status"] = "pending" if updates else "none"


def materialize(call: dict, now: Optional[datetime] = None) -> bool:
    """Advance a call to its current state. Returns True if anything changed."""
    now = now or _now()
    before = (call["status"], len(call["transcript"]), call.get("summary") is not None)

    if call["status"] not in ("prepared",) and call["status"] not in TERMINAL:
        start = _parse(call["confirmed_at"])
        t = (now - start).total_seconds()
        outcome = call["outcome"]
        user_end = _parse(call.get("ended_at")) if call.get("ended_by") == "user" else None
        if user_end is not None:
            t = min(t, (user_end - start).total_seconds())

        at = lambda s: start + timedelta(seconds=s)  # noqa: E731
        if outcome == "failed" and t >= 2.0:
            _finish(call, "failed", at(2.0))
        elif outcome == "busy" and t >= DIAL_S:
            _finish(call, "busy", at(DIAL_S))
        elif outcome == "no_answer" and t >= NO_ANSWER_S:
            _finish(call, "no_answer", at(NO_ANSWER_S))
        elif outcome == "completed" and t >= CONNECT_S:
            connected = at(CONNECT_S)
            call["connected_at"] = _iso(connected)
            talk = t - CONNECT_S
            script = _script(call)
            call["transcript"] = [ln for ln in script if ln["at"] <= talk]
            end_at = SCENARIOS[call["scenario"]]["end_at"]
            if user_end is not None or talk >= end_at:
                ended = user_end or connected + timedelta(seconds=end_at)
                _finish(call, "completed", ended)
            else:
                call["status"] = "connected"
        elif user_end is not None:
            _finish(call, "canceled", user_end)
        else:
            call["status"] = "dialing" if t < DIAL_S else "ringing"

    if (call["status"] == "completed" and call.get("summary") is None and call.get("summary_ready_at")
            and now >= _parse(call["summary_ready_at"])):
        _attach_summary(call)

    return before != (call["status"], len(call["transcript"]), call.get("summary") is not None)


def view(call: dict, now: Optional[datetime] = None) -> dict:
    """Public shape for the UI — adds derived timing and progress fields."""
    now = now or _now()
    out = {k: v for k, v in call.items() if k not in ("_id", "user_id")}
    connected = _parse(call.get("connected_at"))
    ended = _parse(call.get("ended_at"))
    confirmed = _parse(call.get("confirmed_at"))
    if connected:
        out["duration_s"] = int(((ended or now) - connected).total_seconds())
    else:
        out["duration_s"] = 0
    out["duration"] = mmss(out["duration_s"])
    out["elapsed_s"] = int(((ended or now) - confirmed).total_seconds()) if confirmed else 0
    covered = {ln["covers"] for ln in call["transcript"] if ln.get("covers") is not None}
    points = call["plan"]["talking_points"]
    nxt = next((i for i in range(len(points)) if i not in covered), None)
    out["progress"] = [
        {"text": p["text"], "state": "done" if i in covered else ("now" if i == nxt and call["status"] == "connected" else "todo")}
        for i, p in enumerate(points)
    ]
    out["detected"] = [{"tag": tag, "text": ln["text"], "t": ln["t"]} for ln in call["transcript"] for tag in ln["tags"]]
    out["summarizing"] = call["status"] == "completed" and call.get("summary") is None and bool(call.get("summary_ready_at"))
    return out


def apply_updates(workspace: dict, call: dict, accepted_ids: list) -> list:
    """Apply accepted memory updates from a call to the workspace. Returns applied ids."""
    sc = SCENARIOS[call["scenario"]]
    offered = {u["id"] for u in call.get("memory_updates", [])}
    applied = []
    for upd in sc["memory_updates"]:
        if upd["id"] not in accepted_ids or upd["id"] not in offered:
            continue
        for eff in upd["effects"]:
            _apply_effect(workspace, eff)
        applied.append(upd["id"])
    if applied and sc.get("project_after"):
        workspace["project"].update(sc["project_after"])
    return applied


def _apply_effect(ws: dict, eff: dict) -> None:
    op = eff["op"]
    if op == "memory_set":
        for m in ws["memory"]:
            if m["id"] == eff["id"]:
                m["statement"] = eff["statement"]
                m["source"] = "Call with Sarah Chen · today"
    elif op == "memory_add":
        if not any(m["id"] == eff["item"]["id"] for m in ws["memory"]):
            ws["memory"].append(dict(eff["item"], source="Call · today"))
            ws["project"]["memory_count"] = ws["project"].get("memory_count", 0) + 1
    elif op == "blocker_resolve":
        for b in ws["blockers"]:
            if b["id"] == eff["id"]:
                b["resolved"] = True
    elif op == "blocker_meta":
        for b in ws["blockers"]:
            if b["id"] == eff["id"]:
                b["meta"] = eff["meta"]
    elif op == "approval_done":
        for a in ws["approvals"]:
            if a["id"] == eff["id"]:
                a["status"] = "done"
    elif op == "deliverable_add":
        if not any(d["id"] == eff["item"]["id"] for d in ws["deliverables"]):
            ws["deliverables"].append(eff["item"])
    elif op == "commitment":
        for c in ws["commitments"]:
            if c["id"] == eff["id"]:
                c.update(eff["fields"])
    elif op == "project":
        ws["project"].update(eff["fields"])
