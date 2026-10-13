"""Verify OTP login flow still works after spam-fix (test mode no email send)."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://design-decided.preview.emergentagent.com").rstrip("/")
EMAIL = "pro@use-bracket.com"


def _request_otp():
    r = requests.post(f"{BASE_URL}/api/auth/otp/request", json={"email": EMAIL}, timeout=20)
    return r


def test_otp_request_returns_dev_code():
    r = _request_otp()
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    assert "dev_code" in data, f"dev_code missing (test_mode may be off): {data}"
    assert isinstance(data["dev_code"], str) and len(data["dev_code"]) >= 4


def test_otp_request_repeated_no_throttle_in_test_mode():
    codes = []
    for _ in range(5):
        r = _request_otp()
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "throttled" not in data or data.get("throttled") is not True, f"should not be throttled in test mode: {data}"
        assert "dev_code" in data
        codes.append(data["dev_code"])
    # At least succeeded 5x without error
    assert len(codes) == 5


def test_otp_verify_logs_in_and_authed_endpoint_works():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/otp/request", json={"email": EMAIL}, timeout=20)
    assert r.status_code == 200, r.text
    code = r.json()["dev_code"]

    v = s.post(f"{BASE_URL}/api/auth/otp/verify", json={"email": EMAIL, "code": code}, timeout=20)
    assert v.status_code == 200, v.text
    # Session cookie should be set
    cookie_names = [c.name for c in s.cookies]
    assert any("session" in n.lower() or "bracket" in n.lower() or "token" in n.lower() for n in cookie_names), \
        f"no session-like cookie set: {cookie_names}"

    # Authenticated endpoint
    w = s.get(f"{BASE_URL}/api/v2/workspaces", timeout=20)
    assert w.status_code == 200, f"authed endpoint failed: {w.status_code} {w.text}"
