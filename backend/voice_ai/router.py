"""HTTP API for Bracket Voice AI (/api/voice/*).

Collections (all scoped by user_id):
  voice_workspaces — the user's Voice AI workspace: project context, contacts, settings
  voice_sessions   — voice conversations with Ask Bracket, incl. pending actions
  voice_calls      — AI client calls: plan, live state, transcript, summary, memory updates
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from . import brain
from . import calls as callsim
from .deps import get_db, get_user
from .seed import VOICES, initial_workspace

router = APIRouter(prefix="/api/voice", tags=["voice-ai"])

SETTINGS_FIELDS = {
    "voice_enabled": bool, "calling_enabled": bool, "captions": bool, "voice": str, "language": str,
    "also_understands": str, "opening_line": str, "on_behalf_of": str, "caller_id": str,
    "only_authorized": bool, "voicemail": bool, "agree_dates_pricing": bool, "calling_hours": str,
    "record_calls": bool, "retention_days": int, "max_minutes": int,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------
async def _workspace(db, uid: str) -> dict:
    ws = await db.voice_workspaces.find_one({"user_id": uid}, {"_id": 0})
    if not ws:
        ws = initial_workspace(uid)
        await db.voice_workspaces.insert_one(dict(ws))
    return ws


async def _save_workspace(db, ws: dict) -> None:
    await db.voice_workspaces.replace_one({"user_id": ws["user_id"]}, ws, upsert=True)


async def _calls(db, uid: str, limit: int = 100) -> list:
    cur = db.voice_calls.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(limit)
    out = []
    async for c in cur:
        if callsim.materialize(c):
            await db.voice_calls.replace_one({"id": c["id"]}, c)
        out.append(c)
    return out


async def _call(db, uid: str, cid: str) -> dict:
    c = await db.voice_calls.find_one({"id": cid, "user_id": uid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Call not found.")
    if callsim.materialize(c):
        await db.voice_calls.replace_one({"id": c["id"]}, c)
    return c


async def _session(db, uid: str, sid: str) -> dict:
    s = await db.voice_sessions.find_one({"id": sid, "user_id": uid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Voice session not found.")
    return s


def _notifications(ws: dict, calls: list) -> list:
    out = []
    for c in calls:
        name = c["contact"]["name"]
        ended = c.get("ended_at") or c["created_at"]
        if c.get("review_status") == "pending":
            out.append({"id": f"{c['id']}-review", "group": "attention", "icon": "git-branch", "tone": "warning",
                        "title": f"Memory review required — {len(c['memory_updates'])} updates from your call with {c['contact']['first_name']}",
                        "meta": c["project"]["name"], "at": ended, "href": f"/voice/calls/{c['id']}/review"})
        if c["status"] in ("busy", "no_answer", "failed"):
            label = {"busy": "line busy", "no_answer": "no answer", "failed": "couldn’t connect"}[c["status"]]
            out.append({"id": f"{c['id']}-failed", "group": "attention", "icon": "phone-missed", "tone": "danger",
                        "title": f"Call failed — {name}, {label}", "meta": c["project"]["name"], "at": ended,
                        "href": f"/voice/calls/{c['id']}/live"})
        if c["status"] == "completed" and c.get("summary"):
            out.append({"id": f"{c['id']}-done", "group": "calls", "icon": "check-circle", "tone": "success",
                        "title": f"Call completed — {name} · {callsim.view(c)['duration']}", "meta": "Summary ready",
                        "at": ended, "href": f"/voice/calls/{c['id']}"})
            for it in c["summary"]["items"]:
                if it["kind"] == "decision":
                    out.append({"id": f"{c['id']}-dec-{it['line']}-{it['text'][:8]}", "group": "calls", "icon": "sparkles",
                                "title": f"New decision detected — {it['text'].rstrip('.')}", "meta": f"Call with {name} · {it['t']}",
                                "at": ended, "href": f"/voice/calls/{c['id']}"})
                elif it["kind"] == "deadline":
                    out.append({"id": f"{c['id']}-dl-{it['line']}-{it['after'][:8]}", "group": "attention", "icon": "calendar", "tone": "warning",
                                "title": f"Deadline change detected — {it['before']} → {it['after'].split('· ')[-1]}",
                                "meta": f"Call with {name} · {it['t']}", "at": ended, "href": f"/voice/calls/{c['id']}"})
                elif it["kind"] == "feedback":
                    out.append({"id": f"{c['id']}-fb", "group": "calls", "icon": "messages",
                                "title": f"Client feedback received — {it['text']}", "meta": f"Call with {name} · {it['t']}",
                                "at": ended, "href": f"/voice/calls/{c['id']}"})
                elif it["kind"] == "followup" and it.get("action") == "draft_email":
                    out.append({"id": f"{c['id']}-fu", "group": "calls", "icon": "mail",
                                "title": f"Follow-up recommended — {it['text'][:1].lower() + it['text'][1:]}",
                                "meta": "Draft ready", "at": ended, "href": f"/voice/calls/{c['id']}"})
    seen = ws.get("notifications_seen_at")
    for n in out:
        n["unread"] = not seen or n["at"] > seen
    return out


def _ws_view(ws: dict, calls: list) -> dict:
    notes = _notifications(ws, calls)
    out = {k: v for k, v in ws.items() if k not in ("_id", "user_id")}
    out["voices"] = VOICES
    out["notifications"] = notes
    out["unread"] = sum(1 for n in notes if n["unread"])
    out["active_call"] = next((callsim.view(c) for c in calls if c["status"] in ("dialing", "ringing", "connected")), None)
    return out


# ---------------------------------------------------------------------------
# Workspace + settings
# ---------------------------------------------------------------------------
@router.get("/workspace")
async def get_workspace(user=Depends(get_user), db=Depends(get_db)):
    ws = await _workspace(db, user["user_id"])
    return _ws_view(ws, await _calls(db, user["user_id"]))


@router.post("/reset")
async def reset_workspace(user=Depends(get_user), db=Depends(get_db)):
    uid = user["user_id"]
    await db.voice_workspaces.delete_many({"user_id": uid})
    await db.voice_calls.delete_many({"user_id": uid})
    await db.voice_sessions.delete_many({"user_id": uid})
    ws = await _workspace(db, uid)
    return _ws_view(ws, [])


class SettingsIn(BaseModel):
    model_config = {"extra": "allow"}


@router.put("/settings")
async def update_settings(payload: SettingsIn, user=Depends(get_user), db=Depends(get_db)):
    ws = await _workspace(db, user["user_id"])
    data = payload.model_dump()
    for key, value in data.items():
        typ = SETTINGS_FIELDS.get(key)
        if typ is None:
            continue  # confirm_before_call and unknown keys are not settable
        if not isinstance(value, typ) or (typ is int and isinstance(value, bool)):
            raise HTTPException(422, f"Invalid value for {key}.")
        ws["settings"][key] = value
    await _save_workspace(db, ws)
    return ws["settings"]


class ContactAuthIn(BaseModel):
    authorized: bool


@router.put("/contacts/{contact_id}")
async def set_contact_authorized(contact_id: str, payload: ContactAuthIn, user=Depends(get_user), db=Depends(get_db)):
    ws = await _workspace(db, user["user_id"])
    contact = next((c for c in ws["contacts"] if c["id"] == contact_id), None)
    if not contact:
        raise HTTPException(404, "Contact not found.")
    contact["authorized"] = payload.authorized
    await _save_workspace(db, ws)
    return contact


@router.post("/notifications/read")
async def mark_notifications_read(user=Depends(get_user), db=Depends(get_db)):
    ws = await _workspace(db, user["user_id"])
    ws["notifications_seen_at"] = _iso(_now())
    await _save_workspace(db, ws)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Voice sessions (Ask Bracket voice mode)
# ---------------------------------------------------------------------------
@router.post("/sessions")
async def create_session(user=Depends(get_user), db=Depends(get_db)):
    ws = await _workspace(db, user["user_id"])
    if not ws["settings"].get("voice_enabled", True):
        raise HTTPException(403, "Voice is turned off for this workspace.")
    s = {"id": f"vs_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"], "title": "New voice session",
         "created_at": _iso(_now()), "turns": [], "actions": [], "pending_action_id": None, "pending_call_id": None}
    await db.voice_sessions.insert_one(dict(s))
    s.pop("user_id")
    return s


@router.get("/sessions")
async def list_sessions(user=Depends(get_user), db=Depends(get_db)):
    cur = db.voice_sessions.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0, "actions": 0}).sort("created_at", -1).limit(20)
    return [s async for s in cur if s.get("turns")]


@router.get("/sessions/{sid}")
async def get_session(sid: str, user=Depends(get_user), db=Depends(get_db)):
    s = await _session(db, user["user_id"], sid)
    s.pop("user_id", None)
    return s


class TurnIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    mode: str = "voice"


def _find_action(session: dict, aid: str) -> Optional[dict]:
    return next((a for a in session["actions"] if a["id"] == aid), None)


async def _execute(db, uid: str, ws: dict, action: dict) -> str:
    kind = action["kind"]
    now = _iso(_now())
    if kind in ("draft_email", "project_update"):
        ws["activity"].append({"kind": kind, "title": action["title"], "to": action.get("to"), "at": now})
        result = f"Sent to {action.get('to', 'Acme Finance')}."
    elif kind == "action_item":
        ws["action_items"].append({"id": action["id"], "title": action["title"], "due": action["due"],
                                   "owner": action["owner"], "done": False, "created_at": now})
        result = f"Added “{action['title']}”, due {action['due']}."
    elif kind == "accept_updates":
        call = await _call(db, uid, action["call_id"])
        ids = [u["id"] for u in call["memory_updates"]]
        applied = callsim.apply_updates(ws, call, ids)
        call["review_status"] = "accepted"
        call["accepted_update_ids"] = applied
        await db.voice_calls.replace_one({"id": call["id"]}, call)
        result = f"Accepted — {len(applied)} memories updated."
    else:
        raise HTTPException(400, "Unknown action.")
    action["status"] = "done"
    action["done_at"] = now
    action["result"] = result
    await _save_workspace(db, ws)
    return result


@router.post("/sessions/{sid}/turns")
async def add_turn(sid: str, payload: TurnIn, user=Depends(get_user), db=Depends(get_db)):
    uid = user["user_id"]
    s = await _session(db, uid, sid)
    ws = await _workspace(db, uid)
    text = payload.text.strip()
    now = _iso(_now())
    s["turns"].append({"role": "you", "text": text, "at": now, "mode": payload.mode})
    if s["title"] == "New voice session":
        s["title"] = text[:80]

    pending = _find_action(s, s.get("pending_action_id")) if s.get("pending_action_id") else None
    if pending and pending["status"] == "pending" and (brain.is_yes(text) or brain.is_no(text)):
        if brain.is_yes(text):
            result = await _execute(db, uid, ws, pending)
            reply = {"intent": "confirm", "text": result, "cards": [{"type": "action", "action": pending}], "suggestions": []}
        else:
            pending["status"] = "canceled"
            reply = {"intent": "cancel", "text": "Canceled — nothing was sent.", "cards": [{"type": "action", "action": pending}], "suggestions": []}
        s["pending_action_id"] = None
    elif s.get("pending_call_id") and brain.is_yes(text):
        reply = {"intent": "call", "text": "Okay — check the details and I’ll dial.", "cards": [], "suggestions": [],
                 "navigate": {"call_id": s["pending_call_id"], "step": "confirm"}}
        s["pending_call_id"] = None
    else:
        reply = brain.respond(text, ws, await _calls(db, uid))
        prep = reply.pop("prepare_call", None)
        if prep:
            contact = next(c for c in ws["contacts"] if c["id"] == prep["contact_id"])
            call = callsim.build_call(uid, contact, ws["project"], ws["settings"], prep["request_text"], "voice")
            await db.voice_calls.insert_one(dict(call))
            reply["cards"] = [{"type": "call_prepared", "call": callsim.view(call)}]
            reply["navigate"] = {"call_id": call["id"], "step": "prepare"}
            s["pending_call_id"] = call["id"]
        if reply.get("action"):
            s["actions"].append(reply["action"])
            s["pending_action_id"] = reply["action"]["id"]
            reply.pop("action")

    s["turns"].append({"role": "bracket", "text": reply["text"], "at": _iso(_now()), "reply": reply})
    await db.voice_sessions.replace_one({"id": sid}, s)
    s.pop("user_id", None)
    return {"session": s, "reply": reply}


@router.post("/sessions/{sid}/actions/{aid}/{decision}")
async def decide_action(sid: str, aid: str, decision: str, user=Depends(get_user), db=Depends(get_db)):
    if decision not in ("confirm", "cancel"):
        raise HTTPException(404, "Unknown decision.")
    uid = user["user_id"]
    s = await _session(db, uid, sid)
    action = _find_action(s, aid)
    if not action:
        raise HTTPException(404, "Action not found.")
    if action["status"] != "pending":
        raise HTTPException(409, f"This action is already {action['status']}.")
    ws = await _workspace(db, uid)
    if decision == "confirm":
        result = await _execute(db, uid, ws, action)
    else:
        action["status"] = "canceled"
        result = "Canceled — nothing was sent."
    if s.get("pending_action_id") == aid:
        s["pending_action_id"] = None
    s["turns"].append({"role": "bracket", "text": result, "at": _iso(_now()),
                       "reply": {"intent": decision, "text": result, "cards": [], "suggestions": []}})
    await db.voice_sessions.replace_one({"id": sid}, s)
    return {"action": action, "result": result, "workspace": _ws_view(ws, await _calls(db, uid))}


# ---------------------------------------------------------------------------
# AI client calls
# ---------------------------------------------------------------------------
class CallIn(BaseModel):
    contact_id: str
    request_text: str = ""
    source: str = "workspace"


@router.post("/calls")
async def prepare_call(payload: CallIn, user=Depends(get_user), db=Depends(get_db)):
    uid = user["user_id"]
    ws = await _workspace(db, uid)
    contact = next((c for c in ws["contacts"] if c["id"] == payload.contact_id), None)
    if not contact:
        raise HTTPException(404, "Contact not found.")
    call = callsim.build_call(uid, contact, ws["project"], ws["settings"], payload.request_text, payload.source)
    await db.voice_calls.insert_one(dict(call))
    return callsim.view(call)


@router.get("/calls")
async def list_calls(q: str = "", status: str = "", direction: str = "", user=Depends(get_user), db=Depends(get_db)):
    out = []
    for c in await _calls(db, user["user_id"]):
        if c["status"] == "prepared":
            continue
        if status and c["status"] != status:
            continue
        if direction and c["direction"] != direction:
            continue
        hay = " ".join([c["contact"]["name"], c["plan"]["title"], (c.get("summary") or {}).get("headline", ""),
                        " ".join(ln["text"] for ln in c["transcript"])]).lower()
        if q and q.lower() not in hay:
            continue
        out.append(callsim.view(c))
    return out


@router.get("/calls/{cid}")
async def get_call(cid: str, user=Depends(get_user), db=Depends(get_db)):
    return callsim.view(await _call(db, user["user_id"], cid))


class PointIn(BaseModel):
    id: Optional[str] = None
    text: str


class QuestionIn(BaseModel):
    id: Optional[str] = None
    text: str
    selected: bool = True


class PlanIn(BaseModel):
    contact_id: Optional[str] = None
    objective: Optional[str] = None
    instructions: Optional[str] = None
    talking_points: Optional[List[PointIn]] = None
    questions: Optional[List[QuestionIn]] = None


@router.patch("/calls/{cid}/plan")
async def edit_plan(cid: str, payload: PlanIn, user=Depends(get_user), db=Depends(get_db)):
    uid = user["user_id"]
    call = await _call(db, uid, cid)
    if call["status"] != "prepared":
        raise HTTPException(409, "The plan can only be edited before the call starts.")
    if payload.contact_id and payload.contact_id != call["contact"]["id"]:
        ws = await _workspace(db, uid)
        contact = next((c for c in ws["contacts"] if c["id"] == payload.contact_id), None)
        if not contact:
            raise HTTPException(404, "Contact not found.")
        fresh = callsim.build_call(uid, contact, ws["project"], ws["settings"], call["request_text"], call["source"])
        fresh["id"] = call["id"]
        fresh["created_at"] = call["created_at"]
        call = fresh
    plan = call["plan"]
    if payload.objective is not None:
        plan["objective"] = payload.objective.strip()
    if payload.instructions is not None:
        plan["instructions"] = payload.instructions.strip()
    if payload.talking_points is not None:
        plan["talking_points"] = [{"id": p.id or f"tp{i}", "text": p.text.strip()}
                                  for i, p in enumerate(payload.talking_points) if p.text.strip()]
    if payload.questions is not None:
        plan["questions"] = [{"id": q.id or f"q{i}", "text": q.text.strip(), "selected": q.selected}
                             for i, q in enumerate(payload.questions) if q.text.strip()]
    await db.voice_calls.replace_one({"id": cid}, call)
    return callsim.view(call)


class ConfirmIn(BaseModel):
    notify: bool = True
    simulate: Optional[str] = None  # completed | no_answer | busy | failed — demo/testing only


@router.post("/calls/{cid}/confirm")
async def confirm_call(cid: str, payload: ConfirmIn, user=Depends(get_user), db=Depends(get_db)):
    uid = user["user_id"]
    call = await _call(db, uid, cid)
    if call["status"] != "prepared":
        raise HTTPException(409, "This call has already started.")
    ws = await _workspace(db, uid)
    settings = ws["settings"]
    if not settings.get("calling_enabled", True):
        raise HTTPException(403, "AI calling is turned off for this workspace.")
    contact = next((c for c in ws["contacts"] if c["id"] == call["contact"]["id"]), None)
    if settings.get("only_authorized", True) and not (contact and contact.get("authorized")):
        raise HTTPException(403, f"{call['contact']['name']} isn’t an authorized contact.")
    if payload.simulate:
        if payload.simulate not in callsim.OUTCOMES:
            raise HTTPException(422, "Unknown outcome.")
        call["outcome"] = payload.simulate
    call["status"] = "dialing"
    call["confirmed_at"] = _iso(_now())
    call["notify_on_end"] = payload.notify
    await db.voice_calls.replace_one({"id": cid}, call)
    return callsim.view(call)


@router.post("/calls/{cid}/end")
async def end_call(cid: str, user=Depends(get_user), db=Depends(get_db)):
    call = await _call(db, user["user_id"], cid)
    if call["status"] not in ("dialing", "ringing", "connected"):
        raise HTTPException(409, "This call isn’t in progress.")
    call["ended_by"] = "user"
    call["ended_at"] = _iso(_now())
    callsim.materialize(call)
    await db.voice_calls.replace_one({"id": cid}, call)
    return callsim.view(call)


@router.post("/calls/{cid}/cancel")
async def cancel_call(cid: str, user=Depends(get_user), db=Depends(get_db)):
    call = await _call(db, user["user_id"], cid)
    if call["status"] != "prepared":
        raise HTTPException(409, "Only a call that hasn’t started can be canceled.")
    call["status"] = "canceled"
    call["ended_at"] = _iso(_now())
    await db.voice_calls.replace_one({"id": cid}, call)
    return callsim.view(call)


@router.post("/calls/{cid}/retry")
async def retry_call(cid: str, user=Depends(get_user), db=Depends(get_db)):
    uid = user["user_id"]
    old = await _call(db, uid, cid)
    ws = await _workspace(db, uid)
    contact = next((c for c in ws["contacts"] if c["id"] == old["contact"]["id"]), old["contact"])
    call = callsim.build_call(uid, contact, ws["project"], ws["settings"], old["request_text"], old["source"])
    call["plan"] = old["plan"]
    call["outcome"] = "completed"
    await db.voice_calls.insert_one(dict(call))
    return callsim.view(call)


class ReviewIn(BaseModel):
    accepted_ids: List[str]


@router.post("/calls/{cid}/review")
async def review_updates(cid: str, payload: ReviewIn, user=Depends(get_user), db=Depends(get_db)):
    uid = user["user_id"]
    call = await _call(db, uid, cid)
    if call.get("review_status") != "pending":
        raise HTTPException(409, "There are no updates waiting for review on this call.")
    if not payload.accepted_ids:
        raise HTTPException(422, "Select at least one update to accept.")
    ws = await _workspace(db, uid)
    applied = callsim.apply_updates(ws, call, payload.accepted_ids)
    call["review_status"] = "accepted"
    call["accepted_update_ids"] = applied
    await db.voice_calls.replace_one({"id": cid}, call)
    await _save_workspace(db, ws)
    return {"applied": applied, "call": callsim.view(call), "workspace": _ws_view(ws, await _calls(db, uid))}


@router.post("/calls/{cid}/review/dismiss")
async def dismiss_updates(cid: str, user=Depends(get_user), db=Depends(get_db)):
    call = await _call(db, user["user_id"], cid)
    if call.get("review_status") != "pending":
        raise HTTPException(409, "There are no updates waiting for review on this call.")
    call["review_status"] = "dismissed"
    await db.voice_calls.replace_one({"id": cid}, call)
    return callsim.view(call)
