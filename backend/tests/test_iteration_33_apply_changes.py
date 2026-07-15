"""
Iteration 33 backend tests — REVISED client-review owner-response actions.

Replaces iteration 32's per-suggestion apply endpoint (which was DELETED).

Covers:
- POST /api/projects/{id}/review/apply-changes (no body):
  * With share_status='rejected' + ai_suggestions → 200 { step, items:[{step,instruction,title}...] }
    items sorted by step, step = earliest, sets status='in_progress',
    step=earliest, revising=true, revision_context={step, items, created_at}.
  * Requires owner session (401/403 without cookie).
  * Returns 400 when share_status not in rejected/awaiting_reply OR no suggestions.
- Unfreeze on concerns: with share_status='rejected' (revising=false), /unlock
  now returns 200 (was 409), and /reset-from-step/{n} works. With 'sent' or
  'accepted' both still return 409.
- POST /projects/{id}/lock on rejected/awaiting_reply (or revising=true)
  flips share_status='sent', revising=false, revision_context=null,
  status='locked'.
- POST /projects/{id}/reply still works (appends owner_replies,
  share_status→'awaiting_reply').
- Old endpoint /review/apply-suggestion was REMOVED — verify 404/405.
"""
import os
import copy
import uuid
import requests
import pytest
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "bracket_db")

DEMO_EMAIL = "demo@use-bracket.com"
DEMO_PASSWORD = "BracketDemo@2026"
DEMO_PROJECT_ID = "0b9effac-2b12-4beb-9f9a-40ab7213d23f"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def demo_session():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"demo login failed: {r.status_code} {r.text}"
    yield s
    s.close()


def _seed_project(mongo, share_status="rejected", suggestions=None, revising=False):
    base = mongo.projects.find_one({"id": DEMO_PROJECT_ID}, {"_id": 0})
    assert base, "Ceramic Vase seed project missing"
    p = copy.deepcopy(base)
    new_id = f"TESTREV-{uuid.uuid4().hex[:12]}"
    p["id"] = new_id
    p["name"] = f"TEST_apply_changes_{new_id[-6:]}"
    p["share_token"] = f"tok_{uuid.uuid4().hex[:12]}"
    p["share_status"] = share_status
    p["status"] = "locked"
    p["revising"] = revising
    p["revision_context"] = None
    p["owner_replies"] = []
    if suggestions is None:
        suggestions = [
            {
                "title": "Extend delivery window by 2 weeks",
                "what_to_change": "Adjust scope timeline note to reflect an extra 2 weeks of production.",
                "what_to_say": "We can add two weeks to production, no scope change.",
                "why_it_helps": "Reduces the client's timeline anxiety while keeping scope intact.",
                "affects_step": 4,
            },
            {
                "title": "Reduce deliverables count",
                "what_to_change": "Drop the third 'showcase piece' from deliverables and keep two.",
                "what_to_say": "Happy to trim deliverables to align with your budget.",
                "why_it_helps": "Aligns with client's cost sensitivity.",
                "affects_step": 4,
            },
        ]
    p["share_review"] = {
        "type": "reject",
        "submitted_at": "2026-01-01T00:00:00+00:00",
        "signature_name": "Test Client",
        "role": "Buyer",
        "client_email": "client@example.com",
        "concerns": "Timeline is too tight, please rework scope.",
        "ai_suggestions": {
            "summary": "Client wants scope + timeline revised.",
            "suggestions": suggestions,
        },
    }
    mongo.projects.insert_one(p)
    return new_id


@pytest.fixture()
def seeded_rejected_project(mongo):
    pid = _seed_project(mongo, share_status="rejected")
    yield pid
    mongo.projects.delete_one({"id": pid})


@pytest.fixture()
def seeded_awaiting_project(mongo):
    pid = _seed_project(mongo, share_status="awaiting_reply")
    yield pid
    mongo.projects.delete_one({"id": pid})


@pytest.fixture()
def seeded_sent_project(mongo):
    pid = _seed_project(mongo, share_status="sent", suggestions=[])
    yield pid
    mongo.projects.delete_one({"id": pid})


# ---------- 1. apply-changes happy path ----------
class TestApplyChanges:
    def test_apply_changes_returns_all_items_and_unfreezes(self, demo_session, seeded_rejected_project, mongo):
        pid = seeded_rejected_project
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{pid}/review/apply-changes",
            timeout=45,
        )
        assert r.status_code == 200, f"apply-changes failed: {r.status_code} {r.text}"
        data = r.json()
        # shape
        assert "step" in data and isinstance(data["step"], int)
        assert 1 <= data["step"] <= 5
        assert "items" in data and isinstance(data["items"], list)
        assert len(data["items"]) == 2, f"Expected 2 items, got {len(data['items'])}"
        # items sorted by step ascending
        steps = [it["step"] for it in data["items"]]
        assert steps == sorted(steps), f"items not sorted by step: {steps}"
        # step in response equals earliest item step
        assert data["step"] == steps[0]
        # each item has step, instruction, title
        for it in data["items"]:
            assert "step" in it and isinstance(it["step"], int)
            assert "instruction" in it and isinstance(it["instruction"], str) and len(it["instruction"]) > 0
            assert "title" in it
        # DB persistence
        p = mongo.projects.find_one({"id": pid}, {"_id": 0})
        assert p["status"] == "in_progress"
        assert p["step"] == data["step"]
        assert p.get("revising") is True
        rc = p.get("revision_context") or {}
        assert rc.get("step") == data["step"]
        assert isinstance(rc.get("items"), list) and len(rc["items"]) == 2
        assert rc.get("created_at")

    def test_apply_changes_works_on_awaiting_reply(self, demo_session, seeded_awaiting_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_awaiting_project}/review/apply-changes",
            timeout=45,
        )
        assert r.status_code == 200, f"apply-changes on awaiting_reply failed: {r.status_code} {r.text}"

    def test_apply_changes_400_on_non_rejected(self, demo_session, seeded_sent_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_sent_project}/review/apply-changes",
            timeout=15,
        )
        assert r.status_code == 400

    def test_apply_changes_400_when_no_suggestions(self, demo_session, mongo):
        pid = _seed_project(mongo, share_status="rejected", suggestions=[])
        try:
            r = demo_session.post(
                f"{BASE_URL}/api/projects/{pid}/review/apply-changes",
                timeout=15,
            )
            assert r.status_code == 400
        finally:
            mongo.projects.delete_one({"id": pid})

    def test_apply_changes_requires_owner_session(self, seeded_rejected_project):
        r = requests.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/review/apply-changes",
            timeout=15,
        )
        assert r.status_code in (401, 403, 404)


# ---------- 2. Old endpoint should be REMOVED ----------
class TestOldEndpointRemoved:
    def test_apply_suggestion_endpoint_removed(self, demo_session, seeded_rejected_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/review/apply-suggestion",
            json={"index": 0},
            timeout=15,
        )
        # 404 (route removed) or 405 (method not allowed) both acceptable
        assert r.status_code in (404, 405), f"Old endpoint still responds with {r.status_code}"


# ---------- 3. Unfreeze on concerns ----------
class TestUnfreezeOnConcerns:
    def test_unlock_allowed_when_rejected_even_without_revising(self, demo_session, seeded_rejected_project):
        # NEW behaviour: rejected/awaiting_reply no longer freezes
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/unlock",
            timeout=15,
        )
        assert r.status_code == 200, f"unlock on rejected must succeed: {r.status_code} {r.text}"

    def test_unlock_allowed_when_awaiting_reply(self, demo_session, seeded_awaiting_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_awaiting_project}/unlock",
            timeout=15,
        )
        assert r.status_code == 200

    def test_unlock_blocked_when_sent(self, demo_session, seeded_sent_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_sent_project}/unlock",
            timeout=15,
        )
        assert r.status_code == 409
        # detail should mention "with your client"
        detail = (r.json() or {}).get("detail", "")
        assert "client" in detail.lower()

    def test_reset_from_step_works_on_rejected(self, demo_session, seeded_rejected_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/reset-from-step/3",
            timeout=15,
        )
        assert r.status_code == 200

    def test_reset_from_step_blocked_on_sent(self, demo_session, seeded_sent_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_sent_project}/reset-from-step/3",
            timeout=15,
        )
        assert r.status_code == 409


# ---------- 4. Lock after concern-era edits ----------
class TestLockAfterConcerns:
    def test_lock_on_rejected_flips_share_status_to_sent(self, demo_session, seeded_rejected_project, mongo):
        pid = seeded_rejected_project
        # Artifacts already exist on seed → lock should succeed
        r = demo_session.post(f"{BASE_URL}/api/projects/{pid}/lock", timeout=15)
        assert r.status_code == 200, f"lock failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["status"] == "locked"
        assert data["share_status"] == "sent"
        p = mongo.projects.find_one({"id": pid}, {"_id": 0})
        assert p.get("revising") in (False, None)
        assert p.get("revision_context") in (None, {}, {"step": None})

    def test_lock_after_apply_changes_resets_all_flags(self, demo_session, seeded_rejected_project, mongo):
        pid = seeded_rejected_project
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{pid}/review/apply-changes",
            timeout=45,
        )
        assert r.status_code == 200
        r = demo_session.post(f"{BASE_URL}/api/projects/{pid}/lock", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "locked"
        assert data["share_status"] == "sent"
        p = mongo.projects.find_one({"id": pid}, {"_id": 0})
        assert p.get("revising") in (False, None)
        assert p.get("revision_context") in (None, {}, {"step": None})


# ---------- 5. Reply endpoint ----------
class TestOwnerReply:
    def test_reply_on_rejected_project_appends_and_flips_status(self, demo_session, seeded_rejected_project, mongo):
        pid = seeded_rejected_project
        payload = {"text": "Thanks for the concerns — here's my proposed adjustment."}
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{pid}/reply",
            json=payload,
            timeout=45,
        )
        assert r.status_code == 200, f"reply failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("share_status") == "awaiting_reply"
        assert isinstance(data.get("owner_replies"), list) and len(data["owner_replies"]) >= 1
        last = data["owner_replies"][-1]
        assert last["text"] == payload["text"]
        p = mongo.projects.find_one({"id": pid}, {"_id": 0})
        assert p["share_status"] == "awaiting_reply"

    def test_reply_text_too_short(self, demo_session, seeded_rejected_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/reply",
            json={"text": "hi"},
            timeout=15,
        )
        assert r.status_code == 422


# ---------- 6. Regression: public share endpoint still works ----------
class TestPublicShareRegression:
    def test_public_share_returns_project(self, mongo):
        p = mongo.projects.find_one(
            {"share_status": {"$ne": None}, "share_token": {"$exists": True}}, {"_id": 0}
        )
        assert p, "no shared project to check"
        r = requests.get(f"{BASE_URL}/api/share/{p['share_token']}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "name" in data
        assert "share_status" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
