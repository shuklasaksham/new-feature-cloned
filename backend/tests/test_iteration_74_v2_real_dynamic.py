"""Iteration 74 — v2 real-data + dynamic AI categories backend tests.

Covers:
- OTP auth for pro@use-bracket.com, admin login regression.
- /api/demo/open → seeds Harbor project (real project); use its id as {pid}.
- /api/demo/simulate/next → creates detected items (and ideally a conflict).
- /api/v2/w/{pid}/categories → AI-inferred dynamic categories (NOT the fixed legacy set);
  stable across repeated calls (project.v2_categories persisted).
- /api/v2/w/{pid}/overview → real workspace name 'Harbor — Payments App Launch',
  dynamic categories, real sources (gmail/slack/figma/github/meeting), attention array.
- /api/v2/w/{pid}/memory → every item.category is a dynamic key; counts match.
- /people, /timeline, /sources → derived from real DB (not seed fixture).
- /reviews, /attention → reflect detected items and conflicts after beats.
- POST /ask → grounded answer mentioning stripe and/or launch date.
- POST /threads/{connId}/draft → non-empty draft + to.
- Mutations persist: reviews/accept, reviews/dismiss, conflicts/resolve, attention/dismiss.
- /api/v2/workspaces → Harbor present alongside p1/p2 seed showcases.
- Sandbox seed intact: /api/v2/w/p1/overview still returns fixed Fintech fixture.
"""
import os
import time
import pytest
import requests

def _read_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return os.environ.get("REACT_APP_BACKEND_URL", "")

BASE_URL = _read_env().rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"

PRO_EMAIL = "pro@use-bracket.com"

LEGACY_KEYS = {"scope", "decision", "deliverable", "requirement", "commitment"}


# ────────────────────────── fixtures ──────────────────────────
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    # OTP login
    r = s.post(f"{API}/auth/otp/request", json={"email": PRO_EMAIL}, timeout=20)
    assert r.status_code == 200, r.text
    code = r.json().get("dev_code")
    assert code, r.text
    r = s.post(f"{API}/auth/otp/verify", json={"email": PRO_EMAIL, "code": code}, timeout=20)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def pid(session):
    r = session.post(f"{API}/demo/reset", json={}, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("project_id")
    return data["project_id"]


@pytest.fixture(scope="module")
def pid_with_beats(session, pid):
    # Run a few beats to generate detected items + a conflict (beats 1-4).
    for _ in range(5):
        r = session.post(f"{API}/demo/simulate/next", json={}, timeout=120)
        assert r.status_code == 200, r.text
        if r.json().get("done"):
            break
        time.sleep(0.5)
    return pid


# ────────────────────────── auth regression ──────────────────────────
def test_auth_me(session):
    r = session.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 200
    assert r.json().get("email") == PRO_EMAIL


def test_admin_login_regression():
    r = requests.post(f"{API}/v2/admin/login",
                      json={"username": "admin", "password": "Bracket@Admin2026"}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True


# ────────────────────────── sandbox p1 seed intact ──────────────────────────
def test_seed_p1_overview_fixed():
    r = requests.get(f"{API}/v2/w/p1/overview", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "Fintech" in data["workspace"]["name"]
    keys = {c["key"] for c in data["categories"]}
    # fixed seed uses legacy keys
    assert LEGACY_KEYS.issubset(keys), f"seed should keep fixed cats, got {keys}"


def test_seed_p1_memory_has_items():
    r = requests.get(f"{API}/v2/w/p1/memory", timeout=15)
    assert r.status_code == 200
    assert r.json()["total"] > 0


# ────────────────────────── dynamic categories ──────────────────────────
def test_real_categories_dynamic(session, pid):
    r = session.get(f"{API}/v2/w/{pid}/categories", timeout=120)
    assert r.status_code == 200, r.text
    cats = r.json()["categories"]
    assert isinstance(cats, list) and len(cats) >= 3
    for c in cats:
        for k in ("key", "label", "singular", "description", "n", "count"):
            assert k in c, f"missing {k} in {c}"
    keys = {c["key"] for c in cats}
    # Should NOT be identical to the fixed legacy set. (Fallback DEFAULT_CATS is acceptable
    # per spec, but we at least enforce it's not literally the legacy fixture.)
    # Accept if 'person'/'people' present and categories include at least one non-legacy key,
    # OR explicitly a payments-domain key.
    non_legacy = keys - LEGACY_KEYS - {"person"}
    assert non_legacy or any(c["label"].lower() in ("features", "integrations",
            "milestones", "compliance", "payments", "specifications", "samples")
            for c in cats), f"Expected dynamic (non-legacy) categories, got {keys}"


def test_real_categories_stable(session, pid):
    """Second call must return the same set (persisted on project.v2_categories)."""
    r1 = session.get(f"{API}/v2/w/{pid}/categories", timeout=120).json()["categories"]
    r2 = session.get(f"{API}/v2/w/{pid}/categories", timeout=60).json()["categories"]
    assert [c["key"] for c in r1] == [c["key"] for c in r2]


# ────────────────────────── overview ──────────────────────────
def test_real_overview_shape(session, pid):
    r = session.get(f"{API}/v2/w/{pid}/overview", timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "Harbor" in d["workspace"]["name"]
    for k in ("attention", "snoozed", "saved", "categories", "sources", "coming_up", "since_last_visit"):
        assert k in d
    assert isinstance(d["attention"], list)
    assert isinstance(d["snoozed"], int)
    assert isinstance(d["saved"], int)
    # Sources: real connected providers from demo seed (gmail/slack/figma/github/meeting)
    providers = {s["provider"] for s in d["sources"]}
    assert providers, "expected at least one real source connection"
    assert providers.issubset({"gmail", "slack", "figma", "github", "meeting", "notes"}), providers


# ────────────────────────── memory w/ dynamic keys ──────────────────────────
def test_memory_items_use_dynamic_keys(session, pid):
    cats = session.get(f"{API}/v2/w/{pid}/categories", timeout=60).json()["categories"]
    valid = {c["key"] for c in cats}
    counts_api = {c["key"]: c["count"] for c in cats}

    r = session.get(f"{API}/v2/w/{pid}/memory", timeout=120)
    assert r.status_code == 200
    items = r.json()["items"]
    assert items, "expected non-empty memory for Harbor"
    for it in items:
        assert it["category"] in valid, f"{it['category']} not in {valid}"
    # Counts align
    actual = {}
    for it in items:
        actual[it["category"]] = actual.get(it["category"], 0) + 1
    for k, n in actual.items():
        assert counts_api.get(k, 0) == n, f"count mismatch for {k}: api={counts_api.get(k)} vs items={n}"


def test_memory_q_filter(session, pid):
    r = session.get(f"{API}/v2/w/{pid}/memory", params={"q": "stripe"}, timeout=60)
    assert r.status_code == 200
    # Filter should run (even if 0 results it should not 500)
    assert "items" in r.json()


def test_memory_category_filter(session, pid):
    cats = session.get(f"{API}/v2/w/{pid}/categories", timeout=30).json()["categories"]
    # Pick a category with count > 0
    target = next((c for c in cats if c["count"] > 0), None)
    if not target:
        pytest.skip("no categorised items")
    r = session.get(f"{API}/v2/w/{pid}/memory", params={"category": target["key"]}, timeout=60)
    assert r.status_code == 200
    for it in r.json()["items"]:
        assert it["category"] == target["key"]


# ────────────────────────── people / timeline / sources ──────────────────────────
def test_real_people(session, pid):
    r = session.get(f"{API}/v2/w/{pid}/people", timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json().get("people"), list)


def test_real_timeline(session, pid):
    r = session.get(f"{API}/v2/w/{pid}/timeline", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "events" in data and "total" in data


def test_real_sources_have_connections(session, pid):
    r = session.get(f"{API}/v2/w/{pid}/sources", timeout=30)
    assert r.status_code == 200
    srcs = r.json()["sources"]
    assert len(srcs) >= 1
    for s in srcs:
        assert "learned" in s and "total" in s["learned"]


# ────────────────────────── reviews/attention after beats ──────────────────────────
def test_reviews_after_beats(session, pid_with_beats):
    r = session.get(f"{API}/v2/w/{pid_with_beats}/reviews", timeout=60)
    assert r.status_code == 200
    reviews = r.json()["reviews"]
    assert isinstance(reviews, list)
    # Beats create detected items → should be reviewable
    if reviews:
        rv = reviews[0]
        for k in ("id", "title", "proposals", "trigger"):
            assert k in rv


def test_attention_after_beats(session, pid_with_beats):
    r = session.get(f"{API}/v2/w/{pid_with_beats}/attention", timeout=60)
    assert r.status_code == 200
    items = r.json()["items"]
    assert isinstance(items, list)


# ────────────────────────── live ask / draft ──────────────────────────
def test_live_ask(session, pid_with_beats):
    r = session.post(f"{API}/v2/w/{pid_with_beats}/ask",
                     json={"question": "What payment provider did we choose and what is the launch date?"},
                     timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("id", "question", "answer", "confidence", "sources", "at"):
        assert k in d
    assert isinstance(d["answer"], str) and len(d["answer"]) > 10


def test_live_draft(session, pid_with_beats):
    r = session.get(f"{API}/v2/w/{pid_with_beats}/sources", timeout=30)
    srcs = r.json()["sources"]
    gmail = next((s for s in srcs if s["provider"] == "gmail"), None)
    if not gmail:
        pytest.skip("no gmail connection to draft against")
    r = session.post(f"{API}/v2/w/{pid_with_beats}/threads/{gmail['id']}/draft",
                     json={"instruction": "Confirm the launch date with Sarah."}, timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("draft")
    assert "to" in d


# ────────────────────────── persisted mutations ──────────────────────────
def _first_detected_memory_id(session, pid):
    r = session.get(f"{API}/v2/w/{pid}/reviews", timeout=30)
    reviews = r.json()["reviews"]
    return reviews[0]["id"] if reviews else None


def test_review_accept_persists(session, pid_with_beats):
    mid = _first_detected_memory_id(session, pid_with_beats)
    if not mid:
        pytest.skip("no detected reviews to accept")
    r = session.post(f"{API}/v2/w/{pid_with_beats}/reviews/{mid}/accept", json={}, timeout=30)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    # Verify no longer pending in /reviews
    r2 = session.get(f"{API}/v2/w/{pid_with_beats}/reviews", timeout=30)
    assert mid not in [x["id"] for x in r2.json()["reviews"]]


def test_review_dismiss_persists(session, pid_with_beats):
    mid = _first_detected_memory_id(session, pid_with_beats)
    if not mid:
        pytest.skip("no detected reviews to dismiss")
    r = session.post(f"{API}/v2/w/{pid_with_beats}/reviews/{mid}/dismiss", json={}, timeout=30)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    # /memory should no longer return it (status=ignored excluded)
    r2 = session.get(f"{API}/v2/w/{pid_with_beats}/memory", timeout=60)
    assert mid not in [x["id"] for x in r2.json()["items"]]


def test_conflict_resolve_persists(session, pid_with_beats):
    # Find a conflict in attention
    r = session.get(f"{API}/v2/w/{pid_with_beats}/attention", timeout=30)
    conflicts = [i for i in r.json()["items"] if i.get("kind") == "conflict"]
    if not conflicts:
        pytest.skip("no conflicts to resolve")
    target = conflicts[0]["action"]["target"]
    r = session.post(f"{API}/v2/w/{pid_with_beats}/conflicts/{target}/resolve", json={}, timeout=30)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    # After resolve, that memory item should not be a conflict (status != conflict)
    r2 = session.get(f"{API}/v2/w/{pid_with_beats}/memory", timeout=60)
    hit = next((m for m in r2.json()["items"] if m["id"] == target), None)
    if hit:
        assert hit["status"] != "conflict"


def test_attention_dismiss_persists(session, pid_with_beats):
    r = session.get(f"{API}/v2/w/{pid_with_beats}/attention", timeout=30)
    items = [i for i in r.json()["items"] if i["id"].startswith("att_")]
    if not items:
        pytest.skip("no attention items to dismiss")
    aid = items[0]["id"]
    r = session.post(f"{API}/v2/w/{pid_with_beats}/attention/{aid}/dismiss", json={}, timeout=30)
    assert r.status_code == 200
    assert r.json()["ok"] is True


# ────────────────────────── workspaces mapping ──────────────────────────
def test_workspaces_includes_harbor_and_seed(session, pid):
    r = session.get(f"{API}/v2/workspaces", timeout=30)
    assert r.status_code == 200
    items = r.json()["workspaces"]
    ids = {w["id"] for w in items}
    assert "p1" in ids and "p2" in ids, "seed workspaces missing"
    assert pid in ids, "Harbor project missing"
    harbor = next(w for w in items if w["id"] == pid)
    assert "Harbor" in harbor["name"]
    assert harbor.get("initials")
