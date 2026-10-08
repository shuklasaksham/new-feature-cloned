"""Tests for /api/v2 workspace read endpoints + /api/v2/workspaces + auth regression."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

W = f"{BASE_URL}/api/v2/w/p1"


# ---------- Overview ----------
def test_overview_shape():
    r = requests.get(f"{W}/overview")
    assert r.status_code == 200
    d = r.json()
    for k in ["workspace", "attention", "snoozed", "saved", "categories", "sources", "coming_up", "since_last_visit"]:
        assert k in d, f"missing {k}"
    assert isinstance(d["workspace"], dict) and "name" in d["workspace"]
    assert isinstance(d["attention"], list)
    assert isinstance(d["snoozed"], int)
    assert isinstance(d["saved"], int)
    assert isinstance(d["categories"], list) and len(d["categories"]) > 0
    for c in d["categories"]:
        for k in ("key", "label", "n", "count"):
            assert k in c, f"category missing {k}"
    assert isinstance(d["sources"], list)
    assert isinstance(d["coming_up"], list)
    assert isinstance(d["since_last_visit"], list)


# ---------- Memory ----------
def test_memory_list():
    r = requests.get(f"{W}/memory")
    assert r.status_code == 200
    d = r.json()
    assert "items" in d and isinstance(d["items"], list)
    assert d.get("total") == 28


def test_memory_category_filter():
    r = requests.get(f"{W}/memory", params={"category": "scope"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    for it in items:
        assert it.get("category") == "scope"


def test_memory_query_filter():
    r = requests.get(f"{W}/memory", params={"q": "tablet"})
    assert r.status_code == 200
    items = r.json()["items"]
    # Should narrow results
    assert isinstance(items, list)
    for it in items:
        blob = (it.get("title", "") + " " + str(it.get("text", "")) + " " + str(it.get("summary", ""))).lower()
        assert "tablet" in blob or "tablet" in str(it).lower()


def test_memory_detail():
    r = requests.get(f"{W}/memory/sc1")
    assert r.status_code == 200
    d = r.json()
    assert d.get("id") == "sc1"
    assert "evidence" in d
    assert "history" in d


# ---------- Attention ----------
def test_attention_default():
    r = requests.get(f"{W}/attention")
    assert r.status_code == 200
    assert isinstance(r.json().get("items"), list)


def test_attention_later():
    r = requests.get(f"{W}/attention", params={"view": "later"})
    assert r.status_code == 200
    d = r.json()
    assert "snoozed" in d and "saved" in d
    assert isinstance(d["snoozed"], list) and isinstance(d["saved"], list)


# ---------- Categories ----------
def test_categories():
    r = requests.get(f"{W}/categories")
    assert r.status_code == 200
    cats = r.json()["categories"]
    assert len(cats) == 6
    for c in cats:
        assert "n" in c and "count" in c


# ---------- People ----------
def test_people_list():
    r = requests.get(f"{W}/people")
    assert r.status_code == 200
    assert len(r.json()["people"]) == 5


def test_people_detail():
    r = requests.get(f"{W}/people/pe1")
    assert r.status_code == 200
    d = r.json()
    assert d.get("id") == "pe1"


# ---------- Timeline ----------
def test_timeline_list():
    r = requests.get(f"{W}/timeline")
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d["events"], list)
    assert "total" in d


def test_timeline_detail():
    r = requests.get(f"{W}/timeline/ev4")
    assert r.status_code == 200
    d = r.json()
    assert "detail" in d and isinstance(d["detail"], dict)


# ---------- Sources ----------
def test_sources_list():
    r = requests.get(f"{W}/sources")
    assert r.status_code == 200
    srcs = r.json()["sources"]
    assert len(srcs) == 3
    ids = {s.get("id") for s in srcs}
    assert {"s_gmail", "s_slack", "s_notes"}.issubset(ids)


def test_sources_detail():
    r = requests.get(f"{W}/sources/s_gmail")
    assert r.status_code == 200
    d = r.json()
    for k in ("threads", "candidates", "learned"):
        assert k in d, f"missing {k}"


# ---------- Reviews ----------
def test_reviews_list():
    r = requests.get(f"{W}/reviews")
    assert r.status_code == 200
    assert len(r.json()["reviews"]) == 2


def test_reviews_detail():
    r = requests.get(f"{W}/reviews/r1")
    assert r.status_code == 200
    d = r.json()
    for k in ("proposals", "trigger", "compared"):
        assert k in d, f"missing {k}"


# ---------- Threads ----------
def test_threads_list():
    r = requests.get(f"{W}/threads")
    assert r.status_code == 200
    d = r.json()
    assert len(d["threads"]) == 4
    assert "total" in d


def test_threads_detail():
    r = requests.get(f"{W}/threads/t1")
    assert r.status_code == 200
    d = r.json()
    assert "messages" in d and isinstance(d["messages"], list)


# ---------- Ask ----------
def test_ask_post():
    r = requests.post(f"{W}/ask", json={"question": "what is in scope?"})
    assert r.status_code == 200
    d = r.json()
    for k in ("id", "question", "answer", "confidence", "sources", "at"):
        assert k in d, f"missing {k}"
    assert isinstance(d["sources"], list)


def test_ask_history():
    r = requests.get(f"{W}/ask/history")
    assert r.status_code == 200
    assert isinstance(r.json()["items"], list)


# ---------- Draft / Send ----------
def test_thread_draft():
    r = requests.post(f"{W}/threads/t1/draft", json={"instruction": "polite follow-up"})
    assert r.status_code == 200
    d = r.json()
    assert "draft" in d and "to" in d


def test_thread_send():
    r = requests.post(f"{W}/threads/t1/send", json={"body": "hi", "to": "a@b.com"})
    assert r.status_code == 200
    d = r.json()
    assert d.get("ok") is True
    assert "sent_at" in d


# ---------- Action stubs ----------
@pytest.mark.parametrize("path", [
    "/seen",
    "/attention/a1/snooze",
    "/attention/a1/dismiss",
    "/reviews/r1/accept",
    "/conflicts/cf1/resolve",
    "/sources/s_gmail/sync",
])
def test_action_stubs(path):
    r = requests.post(f"{W}{path}", json={})
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
    assert r.json().get("ok") is True


# ---------- Auth regression + /workspaces ----------
@pytest.fixture(scope="module")
def pro_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/otp/request", json={"email": "pro@use-bracket.com"})
    assert r.status_code == 200, r.text
    code = r.json().get("dev_code")
    assert code, f"no dev_code: {r.json()}"
    r = s.post(f"{BASE_URL}/api/auth/otp/verify", json={"email": "pro@use-bracket.com", "code": code})
    assert r.status_code == 200, r.text
    return s


def test_auth_me(pro_session):
    r = pro_session.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("email") == "pro@use-bracket.com"


def test_v2_workspaces(pro_session):
    r = pro_session.get(f"{BASE_URL}/api/v2/workspaces")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "workspaces" in d
    ids = {w.get("id") for w in d["workspaces"]}
    assert "p1" in ids and "p2" in ids, f"seed ids missing: {ids}"
    for w in d["workspaces"]:
        assert "id" in w and "name" in w and "initials" in w


def test_logout(pro_session):
    r = pro_session.post(f"{BASE_URL}/api/auth/logout")
    assert r.status_code in (200, 204), r.text
