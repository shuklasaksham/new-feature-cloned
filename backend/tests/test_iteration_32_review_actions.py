"""
Iteration 32 backend tests — client-review owner-response actions.

Covers:
- POST /api/projects/{id}/review/apply-suggestion
- POST /api/projects/{id}/reply
- After apply-suggestion (revising=true) → step edits are NOT frozen; /lock resets flags.
- Regression: /unlock still 409 on plain shared project (revising=false).
- Dashboard drag&drop file upload — POST /api/projects/upload-brief returns 200.
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


@pytest.fixture()
def seeded_rejected_project(mongo, demo_session):
    """Deep-copy the Ceramic Vase project into a new id with share_status='rejected'
    and a canned ai_suggestions payload — no LLM calls needed."""
    base = mongo.projects.find_one({"id": DEMO_PROJECT_ID}, {"_id": 0})
    assert base, "Ceramic Vase seed project missing"
    p = copy.deepcopy(base)
    new_id = f"TESTREV-{uuid.uuid4().hex[:12]}"
    p["id"] = new_id
    p["name"] = f"TEST_review_actions_{new_id[-6:]}"
    p["share_token"] = f"tok_{uuid.uuid4().hex[:12]}"
    p["share_status"] = "rejected"
    p["status"] = "locked"
    p["revising"] = False
    p["revision_context"] = None
    p["owner_replies"] = []
    p["share_review"] = {
        "type": "reject",
        "submitted_at": "2026-01-01T00:00:00+00:00",
        "signature_name": "Test Client",
        "role": "Buyer",
        "client_email": "client@example.com",
        "concerns": "Timeline is too tight, please rework scope.",
        "ai_suggestions": {
            "summary": "Client wants scope + timeline revised.",
            "suggestions": [
                {
                    "title": "Extend delivery window by 2 weeks",
                    "what_to_change": "Adjust scope timeline note to reflect an extra 2 weeks of production.",
                    "why_it_helps": "Reduces the client's timeline anxiety while keeping scope intact.",
                    "affects_step": 4,
                },
                {
                    "title": "Reduce deliverables count",
                    "what_to_change": "Drop the third 'showcase piece' from deliverables and keep two.",
                    "why_it_helps": "Aligns with client's cost sensitivity.",
                    "affects_step": 4,
                },
            ],
        },
    }
    mongo.projects.insert_one(p)
    yield new_id
    # teardown
    mongo.projects.delete_one({"id": new_id})


# ---------- 1. apply-suggestion happy path ----------
class TestApplySuggestion:
    def test_apply_suggestion_index_0_unfreezes_and_returns_mapping(self, demo_session, seeded_rejected_project, mongo):
        pid = seeded_rejected_project
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{pid}/review/apply-suggestion",
            json={"index": 0},
            timeout=45,
        )
        assert r.status_code == 200, f"apply-suggestion failed: {r.status_code} {r.text}"
        data = r.json()
        # shape
        assert "step" in data and isinstance(data["step"], int)
        assert 1 <= data["step"] <= 5
        assert "instruction" in data and isinstance(data["instruction"], str)
        assert len(data["instruction"]) > 0
        # DB assertions
        p = mongo.projects.find_one({"id": pid}, {"_id": 0})
        assert p["status"] == "in_progress"
        assert p["step"] == data["step"]
        assert p.get("revising") is True
        rc = p.get("revision_context") or {}
        assert rc.get("step") == data["step"]
        assert rc.get("instruction") == data["instruction"]
        assert rc.get("suggestion_title") == "Extend delivery window by 2 weeks"

    def test_apply_suggestion_index_out_of_range_returns_404(self, demo_session, seeded_rejected_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/review/apply-suggestion",
            json={"index": 9},
            timeout=15,
        )
        assert r.status_code == 404

    def test_apply_suggestion_requires_owner_session(self, seeded_rejected_project):
        # No cookie → 401/403
        r = requests.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/review/apply-suggestion",
            json={"index": 0},
            timeout=15,
        )
        assert r.status_code in (401, 403, 404)


# ---------- 2. reply endpoint ----------
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
        assert last.get("from_name")
        assert last.get("sent_at")
        # DB persistence
        p = mongo.projects.find_one({"id": pid}, {"_id": 0})
        assert p["share_status"] == "awaiting_reply"
        assert len(p["owner_replies"]) == 1

    def test_reply_rejected_on_non_rejected_project(self, demo_session, mongo):
        # Ceramic Vase is share_status=sent → cannot reply
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{DEMO_PROJECT_ID}/reply",
            json={"text": "should be blocked"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_reply_text_too_short(self, demo_session, seeded_rejected_project):
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/reply",
            json={"text": "hi"},
            timeout=15,
        )
        assert r.status_code == 422


# ---------- 3. revising bypasses freeze; lock resets it ----------
class TestRevisingFreezeBypass:
    def test_unlock_blocked_when_shared_and_not_revising(self, demo_session, seeded_rejected_project):
        # freshly seeded rejected → revising=false → freeze applies
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{seeded_rejected_project}/unlock",
            timeout=15,
        )
        assert r.status_code == 409

    def test_after_apply_unlock_is_allowed(self, demo_session, seeded_rejected_project, mongo):
        pid = seeded_rejected_project
        # apply first
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{pid}/review/apply-suggestion",
            json={"index": 0},
            timeout=45,
        )
        assert r.status_code == 200
        # Now unlock should be allowed (revising bypass)
        r = demo_session.post(f"{BASE_URL}/api/projects/{pid}/unlock", timeout=15)
        assert r.status_code == 200, f"unlock during revising must succeed: {r.status_code} {r.text}"

    def test_lock_after_revising_resets_flags_and_share_status(self, demo_session, seeded_rejected_project, mongo):
        pid = seeded_rejected_project
        r = demo_session.post(
            f"{BASE_URL}/api/projects/{pid}/review/apply-suggestion",
            json={"index": 0},
            timeout=45,
        )
        assert r.status_code == 200
        # Artifacts already exist on seed → lock should succeed
        r = demo_session.post(f"{BASE_URL}/api/projects/{pid}/lock", timeout=15)
        assert r.status_code == 200, f"lock failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["status"] == "locked"
        assert data["share_status"] == "sent"
        # revising cleared
        p = mongo.projects.find_one({"id": pid}, {"_id": 0})
        assert p.get("revising") in (False, None)
        assert p.get("revision_context") in (None, {}, {"step": None})


# ---------- 4. Dashboard upload-brief regression ----------
class TestUploadBrief:
    def test_upload_brief_txt_returns_200(self, demo_session):
        content = b"Client brief: refresh the checkout page. Priority: mobile."
        files = {"file": ("brief.txt", content, "text/plain")}
        r = demo_session.post(
            f"{BASE_URL}/api/projects/upload-brief",
            files=files,
            timeout=60,
        )
        assert r.status_code == 200, f"upload-brief failed: {r.status_code} {r.text}"
        data = r.json()
        # The endpoint should return either a project id or a job id — accept either shape.
        assert isinstance(data, dict)
        assert any(k in data for k in ("id", "project_id", "job_id"))


# ---------- 5. Landing / regression ----------
class TestLandingRegression:
    def test_landing_page_loads(self):
        r = requests.get(f"{BASE_URL}/", timeout=15)
        assert r.status_code == 200
        # Loose content check — no assertion on exact copy since SPA serves index.html
        assert "<html" in r.text.lower() or "bracket" in r.text.lower()

    def test_public_share_endpoint(self, mongo):
        # Any project with share_status != none
        p = mongo.projects.find_one({"share_status": {"$ne": None}, "share_token": {"$exists": True}}, {"_id": 0})
        assert p, "no shared project to check"
        r = requests.get(f"{BASE_URL}/api/share/{p['share_token']}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "name" in data
        assert "share_status" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
