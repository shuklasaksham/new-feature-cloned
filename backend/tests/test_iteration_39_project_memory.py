"""Iteration 39 — Project Memory pivot backend tests.

Covers:
- POST /api/demo/seed  (idempotent)
- GET  /api/projects/{id}/memory  (9 categories, ~13 items)
- POST /api/connect/memory/{id}/suggest-reply
- PATCH /api/connect/memory/{id}
- POST /api/projects/{id}/memory
- POST /api/connect/memory/{id}/action (all 5 actions)
- GET  /api/projects/{id}/connections  (3 demo sources, green health)
- DELETE /api/demo/reset  (idempotent)
"""
import os
import pytest
import requests
from pathlib import Path


def _load_env():
    env_file = Path("/app/frontend/.env")
    for line in env_file.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_env()).rstrip("/")
EMAIL = "demo@use-bracket.com"
PASSWORD = "BracketDemo@2026"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def demo_project_id(session):
    # Ensure the demo project exists for this run
    r = session.post(f"{BASE_URL}/api/demo/seed", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    pid = data.get("project_id")
    assert pid, f"No project_id in seed response: {data}"
    return pid


# ------------------------------ demo seed --------------------------------
class TestDemoSeed:
    def test_seed_is_idempotent(self, session):
        r1 = session.post(f"{BASE_URL}/api/demo/seed", timeout=20)
        assert r1.status_code == 200
        d1 = r1.json()
        assert "project_id" in d1
        # second call must return seeded:false
        r2 = session.post(f"{BASE_URL}/api/demo/seed", timeout=20)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["seeded"] is False, f"expected seeded:false on second call, got {d2}"
        assert d2["project_id"] == d1["project_id"]


# ------------------------------ memory grouping --------------------------
class TestProjectMemory:
    def test_memory_grouped_9_categories(self, session, demo_project_id):
        r = session.get(f"{BASE_URL}/api/projects/{demo_project_id}/memory", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert set(data["categories"]) == {
            "scope", "deliverable", "decision", "requirement",
            "timeline", "risk", "assumption", "commercial", "question",
        }
        counts = data["counts"]
        # Expected counts from seed:
        expected = {"scope": 2, "deliverable": 2, "decision": 2, "requirement": 1,
                    "timeline": 2, "risk": 1, "assumption": 1, "commercial": 1, "question": 1}
        for k, v in expected.items():
            assert counts.get(k, 0) >= v, f"{k}: expected>={v}, got {counts.get(k)}"
        total = data["total"]
        assert total >= 13, f"expected total>=13, got {total}"


# ------------------------------ suggest-reply ----------------------------
class TestSuggestReply:
    def test_scope_change_suggest_reply(self, session, demo_project_id):
        r = session.get(f"{BASE_URL}/api/projects/{demo_project_id}/memory", timeout=20)
        grouped = r.json()["grouped"]
        scope_change = next(
            (m for m in grouped.get("scope", []) if m.get("is_scope_change") and m.get("status") == "detected"),
            None,
        )
        assert scope_change, "No detected scope_change item in demo seed"
        mem_id = scope_change["id"]

        rr = session.post(f"{BASE_URL}/api/connect/memory/{mem_id}/suggest-reply", timeout=45)
        assert rr.status_code == 200, rr.text
        data = rr.json()
        assert isinstance(data.get("reply"), str) and len(data["reply"]) > 20, "reply must be non-empty string"
        assert len(data.get("impacts") or []) >= 3, f"impacts must be >=3, got {data.get('impacts')}"
        assert data.get("priority") in ("low", "medium", "high"), f"bad priority {data.get('priority')}"
        assert len(data.get("memory_updates") or []) >= 1
        dl = data.get("deep_links") or {}
        assert dl.get("mailto", "").startswith("mailto:")
        assert dl.get("gmail_web", "").startswith("https://mail.google.com/")
        assert "slack" in (dl.get("slack_web") or "")


# ------------------------------ patch memory -----------------------------
class TestMemoryEdit:
    def test_patch_title_records_diff(self, session, demo_project_id):
        r = session.get(f"{BASE_URL}/api/projects/{demo_project_id}/memory", timeout=20)
        # pick a confirmed item so we don't perturb the detected flow
        confirmed = None
        for cat in r.json()["grouped"].values():
            for m in cat:
                if m.get("status") == "confirmed":
                    confirmed = m
                    break
            if confirmed:
                break
        assert confirmed, "No confirmed memory item found"
        mem_id = confirmed["id"]
        old_title = confirmed["title"]

        pr = session.patch(f"{BASE_URL}/api/connect/memory/{mem_id}", json={"title": "edited"}, timeout=20)
        assert pr.status_code == 200, pr.text
        data = pr.json()
        assert data["updated"] is True
        assert data["diff"]["title"] == [old_title, "edited"]

        # revert
        session.patch(f"{BASE_URL}/api/connect/memory/{mem_id}", json={"title": old_title}, timeout=20)


# ------------------------------ create memory ----------------------------
class TestMemoryCreate:
    def test_create_manual_memory(self, session, demo_project_id):
        payload = {"category": "assumption", "title": "TEST_Manual note", "detail": "created by pytest"}
        r = session.post(f"{BASE_URL}/api/projects/{demo_project_id}/memory", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        item = r.json()["item"]
        assert item["category"] == "assumption"
        assert item["title"] == "TEST_Manual note"
        assert item["provider"] == "manual"
        # cleanup — soft-delete
        session.delete(f"{BASE_URL}/api/connect/memory/{item['id']}", timeout=10)


# ------------------------------ memory actions ---------------------------
class TestMemoryActions:
    @pytest.mark.parametrize("action,expected_status", [
        ("confirm", "confirmed"),
        ("dismiss", "ignored"),
        ("not_a_change", "not_a_change"),
        ("review", "review"),
        ("ignore", "ignored"),
    ])
    def test_action(self, session, demo_project_id, action, expected_status):
        # Create a throwaway item so we don't destabilise the demo
        payload = {"category": "requirement", "title": f"TEST_{action}", "detail": "throwaway"}
        cr = session.post(f"{BASE_URL}/api/projects/{demo_project_id}/memory", json=payload, timeout=15)
        mid = cr.json()["item"]["id"]
        try:
            r = session.post(f"{BASE_URL}/api/connect/memory/{mid}/action", json={"action": action}, timeout=15)
            assert r.status_code == 200, r.text
            assert r.json()["status"] == expected_status
        finally:
            session.delete(f"{BASE_URL}/api/connect/memory/{mid}", timeout=10)


# ------------------------------ connections ------------------------------
class TestConnections:
    def test_three_demo_connections_green(self, session, demo_project_id):
        r = session.get(f"{BASE_URL}/api/projects/{demo_project_id}/connections", timeout=20)
        assert r.status_code == 200, r.text
        conns = r.json()["connections"]
        assert len(conns) >= 3, f"expected >=3 demo connections, got {len(conns)}"
        demo_conns = [c for c in conns if c.get("is_demo")]
        assert len(demo_conns) == 3
        for c in demo_conns:
            h = c.get("health") or {}
            assert h.get("level") == "green"
            assert h.get("message") == "Demo source"


# ------------------------------ demo reset -------------------------------
class TestDemoReset:
    def test_reset_is_idempotent(self, session):
        # 1st call — deletes
        r1 = session.delete(f"{BASE_URL}/api/demo/reset", timeout=20)
        assert r1.status_code == 200, r1.text
        # 2nd call — nothing to delete but still ok
        r2 = session.delete(f"{BASE_URL}/api/demo/reset", timeout=20)
        assert r2.status_code == 200
        assert r2.json().get("ok") is True
        # Re-seed for downstream/UI tests
        session.post(f"{BASE_URL}/api/demo/seed", timeout=20)
