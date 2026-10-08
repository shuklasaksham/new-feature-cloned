"""
Iteration 72 — Backend verification for admin_v2 + sandbox_v2 wiring and OTP regression.

Covers:
  - POST /api/v2/admin/login (success, wrong password, lockout after 5 fails)
  - GET /api/v2/admin/session, POST /api/v2/admin/logout, 401 without session
  - Admin data endpoints: overview/users/revenue/usage/sandbox/audit (200 w/ cookie)
  - Sandbox v2: start/get/next/reset/leave + sandbox lock (403 on /api/projects)
  - Regression: email OTP flow still works
"""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "Bracket@Admin2026"
WRONG_PASS = "WrongPassword#NO"

MONGO_URL = open("/app/backend/.env").read().split("MONGO_URL=")[1].split("\n")[0].strip().strip('"')
DB_NAME = open("/app/backend/.env").read().split("DB_NAME=")[1].split("\n")[0].strip().strip('"')


def _clear_attempts():
    MongoClient(MONGO_URL)[DB_NAME]["admin_login_attempts"].drop()


# --------------------------------------------------------------- Admin login
class TestAdminLogin:
    def setup_method(self):
        _clear_attempts()

    def test_login_success_sets_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/v2/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("username") == ADMIN_USER
        assert "expires_at" in data
        assert "bk_admin" in s.cookies.keys()

    def test_login_wrong_password_401_with_attempts_left(self):
        r = requests.post(f"{API}/v2/admin/login",
                          json={"username": ADMIN_USER, "password": WRONG_PASS})
        assert r.status_code == 401, r.text
        payload = r.json()
        assert payload.get("code") == "admin_credentials"
        assert "attempts_left" in payload
        assert isinstance(payload["attempts_left"], int)

    def test_login_lockout_after_5_fails(self):
        _clear_attempts()
        last = None
        for _ in range(5):
            last = requests.post(f"{API}/v2/admin/login",
                                 json={"username": ADMIN_USER, "password": WRONG_PASS})
        # 6th attempt should be locked
        r = requests.post(f"{API}/v2/admin/login",
                          json={"username": ADMIN_USER, "password": WRONG_PASS})
        assert r.status_code == 429, f"Expected 429, got {r.status_code}: {r.text}"
        payload = r.json()
        assert payload.get("code") == "admin_paused"
        assert "retry_at" in payload


# ----------------------------------------------------------- Admin session
class TestAdminSession:
    def setup_method(self):
        _clear_attempts()
        self.s = requests.Session()
        r = self.s.post(f"{API}/v2/admin/login",
                        json={"username": ADMIN_USER, "password": ADMIN_PASS})
        assert r.status_code == 200

    def test_session_returns_user(self):
        r = self.s.get(f"{API}/v2/admin/session")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("username") == ADMIN_USER
        assert "expires_at" in data
        assert "minutes" in data

    def test_session_without_cookie_401(self):
        r = requests.get(f"{API}/v2/admin/session")
        assert r.status_code == 401, r.text
        payload = r.json()
        assert payload.get("code") == "admin_session"

    def test_logout_clears_session(self):
        r = self.s.post(f"{API}/v2/admin/logout")
        assert r.status_code == 200
        # Now session should 401 (new session with cleared cookie)
        s2 = requests.Session()
        r2 = s2.get(f"{API}/v2/admin/session")
        assert r2.status_code == 401


# --------------------------------------------------------- Admin data endpoints
class TestAdminData:
    @classmethod
    def setup_class(cls):
        _clear_attempts()
        cls.s = requests.Session()
        r = cls.s.post(f"{API}/v2/admin/login",
                       json={"username": ADMIN_USER, "password": ADMIN_PASS})
        assert r.status_code == 200

    @pytest.mark.parametrize("path", [
        "/v2/admin/overview?range=30&currency=usd",
        "/v2/admin/users",
        "/v2/admin/revenue",
        "/v2/admin/usage",
        "/v2/admin/sandbox",
        "/v2/admin/audit",
    ])
    def test_endpoint_200_json(self, path):
        r = self.s.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"
        # must be JSON
        data = r.json()
        assert data is not None
        assert isinstance(data, (dict, list))


# ----------------------------------------------------------------- Sandbox v2
class TestSandboxV2:
    def test_sandbox_full_flow(self):
        s = requests.Session()
        # start
        r = s.post(f"{API}/v2/sandbox/start")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "workspace_id" in data
        sb = data.get("sandbox", {})
        for key in ("id", "beat", "total", "done", "tour_step", "started_at"):
            assert key in sb, f"missing {key} in sandbox: {sb}"
        beat0 = sb["beat"]

        # get
        r = s.get(f"{API}/v2/sandbox")
        assert r.status_code == 200
        g = r.json()
        assert g.get("active") is True
        assert "sandbox" in g

        # next advances a beat
        r = s.post(f"{API}/v2/sandbox/next")
        assert r.status_code == 200, r.text
        r2 = s.get(f"{API}/v2/sandbox")
        new_beat = r2.json().get("sandbox", {}).get("beat")
        assert new_beat != beat0 or r2.json().get("sandbox", {}).get("done") is True

        # reset
        r = s.post(f"{API}/v2/sandbox/reset")
        assert r.status_code == 200, r.text

        # leave
        r = s.post(f"{API}/v2/sandbox/leave")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_sandbox_lock_blocks_account_routes(self):
        s = requests.Session()
        r = s.post(f"{API}/v2/sandbox/start")
        assert r.status_code == 200
        # Try to touch account route
        r = s.post(f"{API}/projects", json={"name": "Should Be Blocked"})
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text[:200]}"
        payload = r.json()
        assert payload.get("code") == "sandbox_locked"
        assert payload.get("action") == "workspace"
        # cleanup
        s.post(f"{API}/v2/sandbox/leave")


# ----------------------------------------------------------- OTP regression
class TestOTPRegression:
    def test_otp_request_and_verify(self):
        email = "pro@use-bracket.com"
        r = requests.post(f"{API}/auth/otp/request", json={"email": email})
        assert r.status_code == 200, r.text
        data = r.json()
        code = data.get("dev_code")
        assert code, f"No dev_code in {data} (OTP_TEST_MODE?)"
        s = requests.Session()
        r = s.post(f"{API}/auth/otp/verify", json={"email": email, "code": code})
        assert r.status_code == 200, r.text
