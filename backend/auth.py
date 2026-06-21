"""Auth helpers for Bracket — Emergent Google + Email OTP + optional password.

Single source of truth: a `session_token` cookie issued either after Google OAuth,
after OTP verification, or after email/password login. All paths land in the same
`user_sessions` collection so the rest of the app has one auth contract.

REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS,
THIS BREAKS THE EMERGENT GOOGLE AUTH FLOW.
"""
from __future__ import annotations

import os
import secrets
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import httpx
import resend
from fastapi import Request, HTTPException, Response
from passlib.hash import bcrypt as _bcrypt

logger = logging.getLogger("bracket.auth")

SESSION_COOKIE = "session_token"
SESSION_TTL_DAYS = 7
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 30

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


# ---------- ids + helpers ----------
def gen_user_id() -> str:
    return f"user_{secrets.token_hex(6)}"


def gen_session_token() -> str:
    return f"st_{secrets.token_urlsafe(28)}"


def gen_otp() -> str:
    # 6-digit zero-padded numeric code
    return f"{secrets.randbelow(1_000_000):06d}"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


def aware(dt: Any) -> Optional[datetime]:
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return None
    if isinstance(dt, datetime) and dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def hash_password(plain: str) -> str:
    return _bcrypt.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.verify(plain, hashed)
    except Exception:
        return False


# ---------- session cookie ----------
def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_TTL_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="none", secure=True)


# ---------- session store ----------
async def create_session(db, user_id: str) -> str:
    token = gen_session_token()
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": iso(now_utc() + timedelta(days=SESSION_TTL_DAYS)),
        "created_at": iso(now_utc()),
    })
    return token


async def get_session(db, token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    s = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not s:
        return None
    expires = aware(s.get("expires_at"))
    if not expires or expires < now_utc():
        return None
    return s


async def delete_session(db, token: str) -> None:
    if token:
        await db.user_sessions.delete_one({"session_token": token})


# ---------- current user dependency ----------
def _bearer_from_header(request: Request) -> Optional[str]:
    auth_h = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_h and auth_h.lower().startswith("bearer "):
        return auth_h.split(" ", 1)[1].strip()
    return None


async def current_user_optional(request: Request, db) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(SESSION_COOKIE) or _bearer_from_header(request)
    session = await get_session(db, token)
    if not session:
        return None
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0, "password_hash": 0},
    )
    if not user:
        return None
    return user


async def current_user(request: Request, db) -> Dict[str, Any]:
    user = await current_user_optional(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    return user


# ---------- users ----------
def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """Strip sensitive fields and add has_password flag for the UI."""
    out = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    out["has_password"] = bool(user.get("password_hash"))
    return out


async def get_or_create_user_by_email(
    db,
    email: str,
    *,
    name: Optional[str] = None,
    avatar: Optional[str] = None,
    designation: Optional[str] = None,
    picture: Optional[str] = None,
) -> Dict[str, Any]:
    email = email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        # Soft-update name/picture if we just got better data from Google.
        update: Dict[str, Any] = {"updated_at": iso(now_utc())}
        if picture and not existing.get("picture"):
            update["picture"] = picture
        if name and not existing.get("name"):
            update["name"] = name
        await db.users.update_one({"user_id": existing["user_id"]}, {"$set": update})
        existing.update(update)
        return existing

    user_id = gen_user_id()
    doc = {
        "user_id": user_id,
        "email": email,
        "name": (name or "").strip(),
        "designation": (designation or "").strip(),
        "avatar": avatar or "mono-1",  # default brutalist avatar
        "picture": picture or "",
        "password_hash": "",
        "created_at": iso(now_utc()),
        "updated_at": iso(now_utc()),
    }
    await db.users.insert_one(doc)
    return doc


# ---------- google session exchange ----------
async def exchange_emergent_session(session_id: str) -> Dict[str, Any]:
    """Call Emergent's session endpoint with the X-Session-ID from the URL fragment.
    Returns the {id,email,name,picture,session_token} envelope."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Try again.")
    data = r.json()
    if not data.get("email"):
        raise HTTPException(status_code=401, detail="Google session missing email.")
    return data


# ---------- OTP ----------
async def store_otp(db, email: str, code: str) -> None:
    email = email.lower().strip()
    await db.email_otps.update_one(
        {"email": email},
        {
            "$set": {
                "email": email,
                "code_hash": hash_password(code),
                "expires_at": iso(now_utc() + timedelta(minutes=OTP_TTL_MINUTES)),
                "attempts": 0,
                "issued_at": iso(now_utc()),
            }
        },
        upsert=True,
    )


async def verify_otp(db, email: str, code: str) -> bool:
    email = email.lower().strip()
    rec = await db.email_otps.find_one({"email": email}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=400, detail="Request a code first.")
    expires = aware(rec.get("expires_at"))
    if not expires or expires < now_utc():
        await db.email_otps.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Code expired. Send a new one.")
    if rec.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        await db.email_otps.delete_one({"email": email})
        raise HTTPException(status_code=429, detail="Too many wrong tries. Send a new code.")
    if not verify_password(code, rec.get("code_hash", "")):
        await db.email_otps.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Wrong code. Check the email again.")
    # success — burn the code
    await db.email_otps.delete_one({"email": email})
    return True


def _otp_html(name: str, code: str) -> str:
    display = (name or "there").strip() or "there"
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#F4F4F0;font-family:-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#0A0A0A;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F0;padding:40px 16px;">
<tr><td align="center">
<table width="480" style="max-width:480px;background:#fff;border:1px solid #0A0A0A;">
<tr><td style="padding:28px 28px 0;">
<p style="margin:0;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#525252;">
{{ bracket &middot; sign-in code }}</p></td></tr>
<tr><td style="padding:16px 28px 0;">
<h1 style="margin:0;font-size:28px;line-height:1.1;font-weight:900;color:#0A0A0A;">Hi {display},<br/>
<span style="color:#0033FF;">your code</span> is below.</h1></td></tr>
<tr><td style="padding:20px 28px 0;">
<p style="margin:0;font-size:15px;line-height:1.55;">Type this into Bracket. Expires in 10 minutes.</p></td></tr>
<tr><td style="padding:16px 28px 0;">
<div style="display:inline-block;background:#0A0A0A;color:#fff;padding:18px 28px;font-family:'JetBrains Mono',monospace;font-size:32px;letter-spacing:0.6em;font-weight:700;">{code}</div>
</td></tr>
<tr><td style="padding:18px 28px 28px;">
<p style="margin:0;font-size:13px;color:#525252;">Didn't ask for this? Ignore the email — your account is safe.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


async def send_otp_email(to_email: str, name: str, code: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning(f"[OTP DEV] {to_email} -> {code}")  # dev fallback
        return False
    resend.api_key = api_key
    sender_email = os.environ.get("SENDER_EMAIL", "")
    sender_name = os.environ.get("SENDER_NAME", "Bracket")
    sender = f"{sender_name} <{sender_email}>" if sender_email else "Bracket <onboarding@resend.dev>"
    params = {
        "from": sender,
        "to": [to_email],
        "subject": f"Your Bracket code: {code}",
        "html": _otp_html(name, code),
        "text": f"Your Bracket sign-in code is {code}. Expires in 10 minutes.",
        "reply_to": sender_email or "",
    }
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        logger.exception(f"OTP email failed for {to_email}: {e}")
        # Don't reveal failure to client — they can retry. Print to log for ops.
        logger.warning(f"[OTP FALLBACK] {to_email} -> {code}")
        return False
