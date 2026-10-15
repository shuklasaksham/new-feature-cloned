"""In-process tests for the Voice AI router (/api/voice/*).

Runs against a real Mongo when MONGO_URL is set, otherwise an in-memory
mongomock-motor database. Auth is overridden with a fixed user. Call time is
fast-forwarded by moving `confirmed_at` into the past.
"""
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

httpx = pytest.importorskip("httpx")
from fastapi import FastAPI  # noqa: E402

from voice_ai import router  # noqa: E402
from voice_ai.deps import get_db, get_user  # noqa: E402


def _make_db():
    if os.environ.get("MONGO_URL"):
        from motor.motor_asyncio import AsyncIOMotorClient
        return AsyncIOMotorClient(os.environ["MONGO_URL"])[f"voice_ai_test_{uuid.uuid4().hex[:8]}"]
    mm = pytest.importorskip("mongomock_motor")
    return mm.AsyncMongoMockClient()["voice_ai_test"]


@pytest.fixture
async def ctx():
    db = _make_db()
    user = {"user_id": f"user_{uuid.uuid4().hex[:6]}", "email": "maya@studio.co"}
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_user] = lambda: user
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client, db, user


async def _rewind(db, cid, seconds):
    past = (datetime.now(timezone.utc) - timedelta(seconds=seconds)).isoformat()
    await db.voice_calls.update_one({"id": cid}, {"$set": {"confirmed_at": past}})


async def _say(client, sid, text):
    r = await client.post(f"/api/voice/sessions/{sid}/turns", json={"text": text})
    assert r.status_code == 200, r.text
    return r.json()["reply"]


async def test_primary_journey_voice_to_memory(ctx):
    client, db, _ = ctx
    ws = (await client.get("/api/voice/workspace")).json()
    assert ws["project"]["launch_date"] == "Fri Oct 17"
    sid = (await client.post("/api/voice/sessions")).json()["id"]

    reply = await _say(client, sid, "What's blocking the Acme launch?")
    assert reply["intent"] == "status"
    assert "waiting on one approval" in reply["text"]
    assert reply["cards"][0]["type"] == "blockers"
    assert reply["suggestions"][0]["utterance"].startswith("Call Sarah")

    reply = await _say(client, sid, "Call Sarah and ask for an update.")
    assert reply["navigate"]["step"] == "prepare"
    cid = reply["navigate"]["call_id"]
    call = (await client.get(f"/api/voice/calls/{cid}")).json()
    assert call["status"] == "prepared" and call["contact"]["name"] == "Sarah Chen"
    assert len(call["plan"]["talking_points"]) == 4

    reply = await _say(client, sid, "Yes, call her")
    assert reply["navigate"] == {"call_id": cid, "step": "confirm"}

    r = await client.patch(f"/api/voice/calls/{cid}/plan", json={"objective": "Get the tablet decision."})
    assert r.json()["plan"]["objective"] == "Get the tablet decision."

    call = (await client.post(f"/api/voice/calls/{cid}/confirm", json={})).json()
    assert call["status"] == "dialing"
    assert (await client.patch(f"/api/voice/calls/{cid}/plan", json={"objective": "x"})).status_code == 409

    await _rewind(db, cid, 3.5)
    assert (await client.get(f"/api/voice/calls/{cid}")).json()["status"] == "ringing"

    await _rewind(db, cid, 5 + 21)
    live = (await client.get(f"/api/voice/calls/{cid}")).json()
    assert live["status"] == "connected"
    assert [ln["i"] for ln in live["transcript"]] == [0, 1, 2, 3, 4, 5]
    assert [p["state"] for p in live["progress"]] == ["done", "done", "done", "now"]
    assert {d["tag"] for d in live["detected"]} >= {"Decision", "Deadline", "Requirement"}
    ws = (await client.get("/api/voice/workspace")).json()
    assert ws["active_call"]["id"] == cid

    await _rewind(db, cid, 5 + 33 + 1)
    done = (await client.get(f"/api/voice/calls/{cid}")).json()
    assert done["status"] == "completed" and done["summarizing"] and done["summary"] is None

    await db.voice_calls.update_one({"id": cid}, {"$set": {"summary_ready_at": datetime.now(timezone.utc).isoformat()}})
    done = (await client.get(f"/api/voice/calls/{cid}")).json()
    assert done["summary"]["headline"].startswith("Sarah approved tablet scope")
    kinds = {i["kind"] for i in done["summary"]["items"]}
    assert kinds >= {"decision", "scope_change", "deadline", "requirement", "action_item", "feedback", "followup"}
    assert [u["id"] for u in done["memory_updates"]] == ["u-scope", "u-deliverable", "u-requirement", "u-launch", "u-people"]
    assert done["memory_updates"][3]["conflict"]["by"] == "James Park"
    assert done["review_status"] == "pending"

    ws = (await client.get("/api/voice/workspace")).json()
    titles = [n["title"] for n in ws["notifications"]]
    assert any(t.startswith("Memory review required — 5 updates") for t in titles)
    assert any(t.startswith("Deadline change detected") for t in titles)
    assert ws["unread"] > 0
    await client.post("/api/voice/notifications/read")
    assert (await client.get("/api/voice/workspace")).json()["unread"] == 0

    r = await client.post(f"/api/voice/calls/{cid}/review", json={"accepted_ids": [u["id"] for u in done["memory_updates"]]})
    assert r.status_code == 200, r.text
    ws = r.json()["workspace"]
    assert ws["project"]["launch_date"] == "Fri Oct 24" and ws["project"]["updated_from_call"] is True
    assert next(m for m in ws["memory"] if m["id"] == "scope")["statement"].startswith("Desktop, tablet and mobile")
    assert next(b for b in ws["blockers"] if b["id"] == "tablet-approval")["resolved"] is True
    assert next(c for c in ws["commitments"] if c["id"] == "launch")["badge"] == "Updated"
    assert (await client.post(f"/api/voice/calls/{cid}/review", json={"accepted_ids": ["u-scope"]})).status_code == 409

    reply = await _say(client, sid, "What's blocking the Acme launch?")
    assert reply["text"].startswith("Nothing is blocking the launch now")

    calls = (await client.get("/api/voice/calls", params={"q": "tablet"})).json()
    assert [c["id"] for c in calls] == [cid]
    assert (await client.get("/api/voice/calls", params={"status": "busy"})).json() == []


async def test_partial_review_applies_only_accepted(ctx):
    client, db, _ = ctx
    cid = (await client.post("/api/voice/calls", json={"contact_id": "sarah-chen"})).json()["id"]
    await client.post(f"/api/voice/calls/{cid}/confirm", json={})
    await _rewind(db, cid, 60)
    await client.get(f"/api/voice/calls/{cid}")
    assert (await client.post(f"/api/voice/calls/{cid}/review", json={"accepted_ids": []})).status_code == 422
    ws = (await client.post(f"/api/voice/calls/{cid}/review", json={"accepted_ids": ["u-requirement"]})).json()["workspace"]
    assert ws["project"]["launch_date"] == "Fri Oct 17"
    assert any(m["id"] == "tablet-req" for m in ws["memory"])


@pytest.mark.parametrize("contact,simulate,at,expected", [
    ("priya-nair", None, 3, "busy"),
    ("sarah-chen", "no_answer", 16, "no_answer"),
    ("sarah-chen", "failed", 3, "failed"),
])
async def test_call_end_states(ctx, contact, simulate, at, expected):
    client, db, _ = ctx
    cid = (await client.post("/api/voice/calls", json={"contact_id": contact})).json()["id"]
    await client.post(f"/api/voice/calls/{cid}/confirm", json={"simulate": simulate} if simulate else {})
    await _rewind(db, cid, at)
    call = (await client.get(f"/api/voice/calls/{cid}")).json()
    assert call["status"] == expected and call["summary"] is None and call["review_status"] == "none"
    ws = (await client.get("/api/voice/workspace")).json()
    assert any(n["title"].startswith("Call failed") for n in ws["notifications"])
    retry = (await client.post(f"/api/voice/calls/{cid}/retry")).json()
    assert retry["status"] == "prepared" and retry["id"] != cid


async def test_end_call_early(ctx):
    client, db, _ = ctx
    cid = (await client.post("/api/voice/calls", json={"contact_id": "sarah-chen"})).json()["id"]
    await client.post(f"/api/voice/calls/{cid}/confirm", json={})
    assert (await client.post(f"/api/voice/calls/{cid}/end")).json()["status"] == "canceled"

    cid = (await client.post("/api/voice/calls", json={"contact_id": "sarah-chen"})).json()["id"]
    await client.post(f"/api/voice/calls/{cid}/confirm", json={})
    await _rewind(db, cid, 5 + 14)  # Sarah has approved tablet, nothing about dates yet
    ended = (await client.post(f"/api/voice/calls/{cid}/end")).json()
    assert ended["status"] == "completed" and len(ended["transcript"]) == 4
    await db.voice_calls.update_one({"id": cid}, {"$set": {"summary_ready_at": datetime.now(timezone.utc).isoformat()}})
    call = (await client.get(f"/api/voice/calls/{cid}")).json()
    assert [u["id"] for u in call["memory_updates"]] == ["u-scope"]
    assert (await client.post(f"/api/voice/calls/{cid}/end")).status_code == 409


async def test_calling_guardrails(ctx):
    client, _, _ = ctx
    await client.put("/api/voice/contacts/priya-nair", json={"authorized": False})
    cid = (await client.post("/api/voice/calls", json={"contact_id": "priya-nair"})).json()["id"]
    r = await client.post(f"/api/voice/calls/{cid}/confirm", json={})
    assert r.status_code == 403 and "authorized" in r.json()["detail"]
    sid = (await client.post("/api/voice/sessions")).json()["id"]
    assert "isn’t an authorized contact" in (await _say(client, sid, "Call Priya"))["text"]

    await client.put("/api/voice/settings", json={"calling_enabled": False})
    cid = (await client.post("/api/voice/calls", json={"contact_id": "sarah-chen"})).json()["id"]
    assert (await client.post(f"/api/voice/calls/{cid}/confirm", json={})).status_code == 403
    assert (await client.post(f"/api/voice/calls/{cid}/confirm", json={"simulate": "nope"})).status_code == 403

    await client.put("/api/voice/settings", json={"voice_enabled": False})
    assert (await client.post("/api/voice/sessions")).status_code == 403


async def test_settings_validation(ctx):
    client, _, _ = ctx
    s = (await client.put("/api/voice/settings", json={"confirm_before_call": False, "voice": "kai", "max_minutes": 5})).json()
    assert s["confirm_before_call"] is True and s["voice"] == "kai" and s["max_minutes"] == 5
    assert (await client.put("/api/voice/settings", json={"max_minutes": "ten"})).status_code == 422
    assert (await client.put("/api/voice/settings", json={"record_calls": 1})).status_code == 422


async def test_actions_need_confirmation(ctx):
    client, _, _ = ctx
    sid = (await client.post("/api/voice/sessions")).json()["id"]
    reply = await _say(client, sid, "Draft a follow-up email to Sarah")
    action = reply["cards"][0]["action"]
    assert action["kind"] == "draft_email" and action["status"] == "pending"
    ws = (await client.get("/api/voice/workspace")).json()
    assert ws["activity"] == []

    reply = await _say(client, sid, "Send it")
    assert reply["intent"] == "confirm" and reply["text"].startswith("Sent to sarah.chen@")
    ws = (await client.get("/api/voice/workspace")).json()
    assert ws["activity"][0]["kind"] == "draft_email"

    reply = await _say(client, sid, "Remind me to send tablet screens Wednesday")
    aid = reply["cards"][0]["action"]["id"]
    assert reply["cards"][0]["action"]["due"] == "Wed Oct 15"
    r = await client.post(f"/api/voice/sessions/{sid}/actions/{aid}/cancel")
    assert r.json()["action"]["status"] == "canceled"
    assert (await client.post(f"/api/voice/sessions/{sid}/actions/{aid}/confirm")).status_code == 409
    assert r.json()["workspace"]["action_items"] == []

    reply = await _say(client, sid, "Write this week's project update")
    assert reply["intent"] == "project_update"
    reply = await _say(client, sid, "no")
    assert reply["intent"] == "cancel"

    assert (await _say(client, sid, "What did we agree about hosting?"))["text"].startswith("Studio North hands over")
    assert (await _say(client, sid, "Summarize this week"))["intent"] == "summarize"
    sessions = (await client.get("/api/voice/sessions")).json()
    assert sessions[0]["title"] == "Draft a follow-up email to Sarah"
