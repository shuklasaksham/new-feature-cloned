"""Iteration 75 — Billing / Categories / Review-apply / Connect wiring regression.

Covers the four features requested in the review:
  (1) Billing bridge (GET/PATCH/change/cancel/resume)
  (2) Categories (list / rename / merge / suggest) for a real project
  (3) Live review apply (accept with edited text + undo + stale 409)
  (4) Connect providers directory + Gmail auth-url issuance

Credentials: support@use-bracket.com / Bracket@123
Real project: 58b8dba2-f25c-462b-b911-8dccd977697d (Flowdesk Website Redesign)
"""
import os
import time
import pytest
import requests

def _load_base():
    b = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if b:
        return b.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL unset")


BASE = _load_base()
API = f"{BASE}/api"
EMAIL = "support@use-bracket.com"
PW = "Bracket@123"
PID = "58b8dba2-f25c-462b-b911-8dccd977697d"

LLM_TIMEOUT = 60


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PW}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("session_token")
    assert tok
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# ---------------------------------------------------------------- Billing ---
class TestBilling:
    def test_get_billing_shape(self, client):
        r = client.get(f"{API}/v2/billing", timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        for k in ("status", "plan", "currency", "prices", "workspaces", "invoices"):
            assert k in b, f"missing {k} in billing: {b}"
        # prices nested
        pr = b["prices"]
        assert "monthly" in pr and "project" in pr
        for tier in ("monthly", "project"):
            assert "inr" in pr[tier] and "usd" in pr[tier]
        ws = b["workspaces"]
        assert "used" in ws and "limit" in ws
        assert isinstance(b["invoices"], list)
        # renews_on may be None for trial users — just key must exist
        assert "renews_on" in b

    def test_patch_billing_currency_toggle(self, client):
        r = client.patch(f"{API}/v2/billing", json={"currency": "usd"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("currency") == "usd"
        # confirm GET also reflects
        r2 = client.get(f"{API}/v2/billing", timeout=15)
        assert r2.json().get("currency") == "usd"
        # switch back
        r3 = client.patch(f"{API}/v2/billing", json={"currency": "inr"}, timeout=15)
        assert r3.status_code == 200
        assert r3.json().get("currency") == "inr"

    def test_billing_change_cancel_resume(self, client):
        # change plan to project — may set pending_change (if different from current)
        r = client.post(f"{API}/v2/billing/change", json={"plan": "project"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "billing" in body
        # cancel
        rc = client.post(f"{API}/v2/billing/cancel", json={"reason": "testing"}, timeout=15)
        assert rc.status_code == 200
        assert "billing" in rc.json()
        # resume
        rr = client.post(f"{API}/v2/billing/resume", json={}, timeout=15)
        assert rr.status_code == 200
        assert "billing" in rr.json()
        # Clear pending_change back to whatever current plan is so we don't drift
        cur = rr.json()["billing"].get("plan") or "monthly"
        client.post(f"{API}/v2/billing/change", json={"plan": cur}, timeout=15)


# ------------------------------------------------------------- Categories ---
class TestCategories:
    def test_list_categories(self, client):
        r = client.get(f"{API}/v2/w/{PID}/categories", timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        cats = r.json().get("categories") or r.json()
        if isinstance(cats, dict):
            cats = cats.get("categories", [])
        assert isinstance(cats, list) and 3 <= len(cats) <= 12, f"got {len(cats)} cats"
        for c in cats:
            for k in ("key", "label"):
                assert k in c, f"missing {k} in {c}"
            # n or count presence
            assert ("n" in c) or ("count" in c)

    def test_rename_category(self, client):
        r = client.get(f"{API}/v2/w/{PID}/categories", timeout=LLM_TIMEOUT)
        cats = r.json().get("categories") or []
        assert cats
        target = cats[0]
        key = target["key"]
        orig_label = target["label"]
        new_label = f"TEST Renamed {int(time.time())}"
        rp = client.patch(f"{API}/v2/w/{PID}/categories/{key}", json={"label": new_label}, timeout=LLM_TIMEOUT)
        assert rp.status_code == 200, rp.text
        new_cats = rp.json().get("categories") or []
        found = next((c for c in new_cats if c["key"] == key), None)
        assert found is not None, f"key {key} vanished after rename"
        assert found["label"] == new_label, f"label not updated: {found}"
        # revert
        client.patch(f"{API}/v2/w/{PID}/categories/{key}", json={"label": orig_label}, timeout=LLM_TIMEOUT)

    def test_merge_category(self, client):
        r = client.get(f"{API}/v2/w/{PID}/categories", timeout=LLM_TIMEOUT)
        cats = r.json().get("categories") or []
        assert len(cats) >= 2
        src = cats[-1]["key"]
        dst = cats[0]["key"]
        rm = client.post(f"{API}/v2/w/{PID}/categories/{src}/merge", json={"into": dst}, timeout=LLM_TIMEOUT)
        assert rm.status_code == 200, rm.text
        body = rm.json()
        assert body.get("ok") is True
        new_cats = body.get("categories") or []
        keys = {c["key"] for c in new_cats}
        assert src not in keys, f"source key {src} still present after merge"
        assert dst in keys

    def test_suggest_category(self, client):
        name = "Risks"
        rs = client.post(f"{API}/v2/w/{PID}/categories/suggest", json={"name": name}, timeout=LLM_TIMEOUT)
        assert rs.status_code == 200, rs.text
        body = rs.json()
        assert body.get("ok") is True
        new_cats = body.get("categories") or []
        keys = {c["key"] for c in new_cats}
        assert "risks" in keys, f"risks not in cats: {keys}"


# ---------------------------------------------------------- Review apply ---
class TestReviewApply:
    def _fresh_review(self, client):
        r = client.get(f"{API}/v2/w/{PID}/reviews", timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        items = r.json().get("items") or r.json().get("reviews") or []
        if not items and isinstance(r.json(), list):
            items = r.json()
        assert items, "no detected reviews available — seed/promote something first"
        return items[0]

    def test_accept_with_edit_and_undo(self, client):
        rv = self._fresh_review(client)
        rid = rv["id"]
        edited = f"TEST edited review title {int(time.time())}"
        payload = {"selected": [f"pp_{rid}"], "edits": {f"pp_{rid}": edited}}
        r = client.post(f"{API}/v2/w/{PID}/reviews/{rid}/accept", json=payload, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("applied") is True
        assert body.get("accepted") >= 1
        # Verify via memory
        rm = client.get(f"{API}/v2/w/{PID}/memory", timeout=LLM_TIMEOUT)
        assert rm.status_code == 200
        items = rm.json().get("items") or []
        hit = next((m for m in items if m.get("id") == rid), None)
        assert hit, f"memory id {rid} not returned by /memory"
        assert hit.get("title") == edited, f"title not applied: got {hit.get('title')!r}"
        assert hit.get("status") in ("confirmed", "current"), f"status not confirmed/current: {hit.get('status')}"
        # Direct DB check for versions[] side-effect (not exposed via memory API)
        try:
            import pymongo
            mongo_url, db_name = None, None
            with open("/app/backend/.env") as f:
                for line in f:
                    if line.startswith("MONGO_URL="):
                        mongo_url = line.split("=", 1)[1].strip().strip('"')
                    elif line.startswith("DB_NAME="):
                        db_name = line.split("=", 1)[1].strip().strip('"')
            if mongo_url and db_name:
                mc = pymongo.MongoClient(mongo_url)
                doc = mc[db_name].project_memory.find_one({"id": rid, "project_id": PID}, {"_id": 0, "versions": 1, "status": 1, "pre_accept_title": 1})
                mc.close()
                assert doc, "memory doc missing in DB"
                assert doc.get("versions"), f"DB versions[] empty: {doc}"
                assert doc.get("status") == "confirmed", f"DB status != confirmed: {doc}"
                assert "pre_accept_title" in doc, "pre_accept_title not stored for undo"
        except AssertionError:
            raise
        except Exception as e:
            print(f"[warn] direct DB versions check skipped: {e}")

        # Undo
        ru = client.post(f"{API}/v2/w/{PID}/reviews/{rid}/undo", json={}, timeout=LLM_TIMEOUT)
        assert ru.status_code == 200, ru.text
        assert ru.json().get("ok") is True
        rm2 = client.get(f"{API}/v2/w/{PID}/memory", timeout=LLM_TIMEOUT)
        hit2 = next((m for m in (rm2.json().get("items") or []) if m.get("id") == rid), None)
        assert hit2, "memory lost after undo"
        assert hit2.get("title") != edited, "title was not restored after undo"
        assert hit2.get("status") in ("detected", "pending"), f"status not detected/pending after undo: {hit2.get('status')}"

    def test_accept_stale_review_returns_409(self, client):
        fake_rid = "does-not-exist-" + str(int(time.time()))
        r = client.post(f"{API}/v2/w/{PID}/reviews/{fake_rid}/accept",
                        json={"selected": [f"pp_{fake_rid}"], "edits": {}}, timeout=30)
        assert r.status_code == 409, f"expected 409 got {r.status_code}: {r.text}"


# ------------------------------------------------------- Connect / OAuth ---
class TestConnect:
    def test_providers_directory(self, client):
        r = client.get(f"{API}/connect/providers", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        provs = {p["key"]: p for p in data.get("providers", [])}
        for k in ("gmail", "slack", "figma", "github", "notion"):
            assert k in provs, f"{k} missing"
        for k in ("gmail", "slack", "figma", "github"):
            # may be 'available' or 'connected' if user already linked it
            assert provs[k]["status"] in ("available", "connected"), f"{k} status={provs[k]['status']}"
        assert provs["notion"]["status"] == "setup_required", f"notion status={provs['notion']['status']}"

    def test_gmail_auth_url(self, client):
        r = client.get(f"{API}/connect/gmail/auth-url", timeout=15)
        assert r.status_code == 200, r.text
        url = r.json().get("url", "")
        assert "accounts.google.com" in url, f"unexpected auth url: {url}"
        assert "state=" in url and "redirect_uri=" in url
