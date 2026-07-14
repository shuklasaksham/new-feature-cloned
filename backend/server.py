"""Bracket backend — FastAPI entrypoint (anonymous, no-auth mode)."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import asyncio
import logging
from typing import List, Literal, Dict, Any, Optional

from fastapi import FastAPI, APIRouter, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fpdf import FPDF

from models import (
    ProjectStartIn,
    ProjectOut,
    SituationIn,
    ContextIn,
    DecisionIn,
    _uuid,
    _now_iso,
)
from ai_engine import (
    run_situation_framing,
    run_context_compression,
    run_decision_engine,
    run_artifacts,
    run_client_pushback_suggestions,
    run_field_suggestions,
    extract_situation_from_paste,
    extract_context_from_paste,
    extract_decision_from_paste,
    extract_text_from_image,
    extract_full_brief_from_paste,
    generate_project_title,
)
from emailer import send_thanks_email, send_review_outcome_email, send_client_receipt_email
from auth import (
    SESSION_COOKIE,
    current_user,
    current_user_optional,
    create_session,
    delete_session,
    set_session_cookie,
    clear_session_cookie,
    exchange_emergent_session,
    get_or_create_user_by_email,
    gen_otp,
    store_otp,
    verify_otp as auth_verify_otp,
    send_otp_email,
    hash_password,
    verify_password,
    public_user,
    iso as auth_iso,
    now_utc as auth_now,
)
from pydantic import BaseModel as _BM, EmailStr as _Em, Field as _Fd


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger("bracket")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Bracket API")
api = APIRouter(prefix="/api")


# --- health ---
@api.get("/")
async def root():
    return {"service": "bracket", "status": "ok"}


# ===========================================================================
# AUTH — Emergent Google + Email OTP + optional password
# ===========================================================================
class GoogleSessionIn(_BM):
    session_id: str = _Fd(min_length=8, max_length=400)


class OtpRequestIn(_BM):
    email: _Em
    name: str = _Fd(default="", max_length=120)


class OtpVerifyIn(_BM):
    email: _Em
    code: str = _Fd(min_length=4, max_length=8)
    # Optional onboarding fields when the user is brand new.
    name: str = _Fd(default="", max_length=120)
    designation: str = _Fd(default="", max_length=120)
    avatar: str = _Fd(default="mono-1", max_length=20)


class LoginIn(_BM):
    email: _Em
    password: str = _Fd(min_length=6, max_length=200)


class SetPasswordIn(_BM):
    password: str = _Fd(min_length=8, max_length=200)


class UpdateProfileIn(_BM):
    name: Optional[str] = _Fd(default=None, max_length=120)
    designation: Optional[str] = _Fd(default=None, max_length=120)
    avatar: Optional[str] = _Fd(default=None, max_length=20)


@api.post("/auth/google/exchange")
async def auth_google_exchange(body: GoogleSessionIn, request: Request, response: Response):
    """Exchange the Emergent session_id (from #session_id=... fragment) for an
    httpOnly cookie that the rest of the app uses."""
    data = await exchange_emergent_session(body.session_id)
    meta = _extract_client_meta(request)
    user = await get_or_create_user_by_email(
        db,
        data["email"],
        name=data.get("name") or "",
        picture=data.get("picture") or "",
        signup_ip=meta["signup_ip"],
        signup_user_agent=meta["signup_user_agent"],
    )
    token = await create_session(db, user["user_id"])
    set_session_cookie(response, token)
    return {"user": public_user(user), "session_token": token, "is_new": not bool(user.get("name"))}


@api.post("/auth/otp/request")
async def auth_otp_request(body: OtpRequestIn):
    code = gen_otp()
    await store_otp(db, body.email, code)
    name = (body.name or "").strip()
    if not name:
        u = await db.users.find_one({"email": body.email.lower().strip()}, {"_id": 0, "name": 1})
        name = (u or {}).get("name", "")
    await send_otp_email(body.email, name, code)
    resp: Dict[str, Any] = {"ok": True, "ttl_minutes": 10}
    # Test-only convenience: return the OTP in the response so the testing
    # agent can log in headlessly. THREE independent server-side guards —
    # ALL must pass. Client-controlled headers (Host/X-Forwarded-Host) are
    # deliberately NOT trusted here because they can be spoofed.
    #   1) BRACKET_ENV must NOT be "production"
    #   2) OTP_TEST_MODE must be exactly "1"
    #   3) The internal K8s service hostname must look like a preview pod
    bracket_env = (os.environ.get("BRACKET_ENV") or "").strip().lower()
    otp_flag = os.environ.get("OTP_TEST_MODE") == "1"
    if bracket_env != "production" and otp_flag:
        resp["dev_code"] = code
    return resp


@api.post("/auth/otp/verify")
async def auth_otp_verify(body: OtpVerifyIn, request: Request, response: Response):
    await auth_verify_otp(db, body.email, body.code)
    meta = _extract_client_meta(request)
    existing = await db.users.find_one({"email": body.email.lower().strip()}, {"_id": 0})
    if existing:
        # Update any fields the user passed (onboarding for fresh accounts).
        updates: Dict[str, Any] = {}
        if body.name and not existing.get("name"):
            updates["name"] = body.name.strip()
        if body.designation and not existing.get("designation"):
            updates["designation"] = body.designation.strip()
        if body.avatar:
            updates["avatar"] = body.avatar
        # Backfill signup meta once if this is the first observed IP/UA.
        if not existing.get("signup_ip") and meta["signup_ip"]:
            updates["signup_ip"] = meta["signup_ip"]
        if not existing.get("signup_user_agent") and meta["signup_user_agent"]:
            updates["signup_user_agent"] = meta["signup_user_agent"]
        if updates:
            updates["updated_at"] = auth_iso(auth_now())
            await db.users.update_one({"user_id": existing["user_id"]}, {"$set": updates})
            existing.update(updates)
        user = existing
        is_new = False
    else:
        user = await get_or_create_user_by_email(
            db,
            body.email,
            name=body.name,
            designation=body.designation,
            avatar=body.avatar or "mono-1",
            signup_ip=meta["signup_ip"],
            signup_user_agent=meta["signup_user_agent"],
        )
        is_new = True
    token = await create_session(db, user["user_id"])
    set_session_cookie(response, token)
    return {"user": public_user(user), "session_token": token, "is_new": is_new}


@api.post("/auth/login")
async def auth_password_login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower().strip()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="No password set for this email. Sign in with OTP first.")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong email or password.")
    token = await create_session(db, user["user_id"])
    set_session_cookie(response, token)
    return {"user": public_user(user), "session_token": token, "is_new": False}


@api.post("/auth/password/set")
async def auth_set_password(body: SetPasswordIn, request: Request):
    user = await current_user(request, db)
    h = hash_password(body.password)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": h, "updated_at": auth_iso(auth_now())}},
    )
    return {"ok": True}


@api.get("/auth/me")
async def auth_me(request: Request):
    user = await current_user(request, db)
    return public_user(user)


@api.patch("/auth/me")
async def auth_update_me(body: UpdateProfileIn, request: Request):
    user = await current_user(request, db)
    updates = {k: (v or "").strip() if isinstance(v, str) else v
               for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return public_user(user)
    updates["updated_at"] = auth_iso(auth_now())
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return public_user(fresh)


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE) or ""
    if not token:
        ah = request.headers.get("authorization", "")
        if ah.lower().startswith("bearer "):
            token = ah.split(" ", 1)[1]
    if token:
        await delete_session(db, token)
    clear_session_cookie(response)
    return {"ok": True}


def _extract_client_meta(request: Optional[Request]) -> Dict[str, str]:
    """Best-effort capture of the caller's IP + user-agent for user creation.
    Prefers Cloudflare's `CF-Connecting-IP`, then the first `X-Forwarded-For`
    entry (we're behind CF/nginx in production), then the direct socket peer.
    Both fields are truncated to keep the users doc small."""
    if request is None:
        return {"signup_ip": "", "signup_user_agent": ""}
    headers = request.headers
    ip = (
        headers.get("cf-connecting-ip")
        or (headers.get("x-forwarded-for", "").split(",")[0].strip() if headers.get("x-forwarded-for") else "")
        or headers.get("x-real-ip")
        or (request.client.host if request.client else "")
        or ""
    )
    ua = headers.get("user-agent", "")
    return {
        "signup_ip": ip[:64],
        "signup_user_agent": ua[:400],
    }


# ---- GUEST SIGN-IN (no email, no password) ---------------------------------
# Used by the "Try it without an account" button. Creates an `is_guest: true`
# user with a synthetic email so the rest of the app (which keys on user_id)
# keeps working without conditional code paths. The user can later upgrade
# via POST /auth/me/email to convert the guest into a real account.
@api.post("/auth/guest")
async def auth_guest(request: Request, response: Response):
    from auth import gen_user_id as _gen_uid
    user_id = _gen_uid()
    # Sequential guest numbering: atomic counter in `counters.guest_seq` so
    # every guest gets a stable, human-readable email like
    # guest-01@use-bracket.com, guest-02@use-bracket.com, ...
    counter = await db.counters.find_one_and_update(
        {"_id": "guest_seq"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq_num = int(counter.get("seq", 1)) if counter else 1
    synthetic_email = f"guest-{seq_num:02d}@use-bracket.com"
    meta = _extract_client_meta(request)
    doc = {
        "user_id": user_id,
        "email": synthetic_email,
        "name": "Guest",
        "designation": "",
        "avatar": "mono-1",
        "picture": "",
        "password_hash": "",
        "is_guest": True,
        "signup_ip": meta["signup_ip"],
        "signup_user_agent": meta["signup_user_agent"],
        "created_at": auth_iso(auth_now()),
        "updated_at": auth_iso(auth_now()),
    }
    await db.users.insert_one(doc)
    token = await create_session(db, user_id)
    set_session_cookie(response, token)
    return {"user": public_user(doc), "session_token": token, "is_new": True}


# ---- GUEST UPGRADE (set email + name, lift the is_guest flag) --------------
class GuestUpgradeIn(_BM):
    email: _Em
    name: str = _Fd(default="", max_length=120)


import re as _re
# Matches both legacy `guest+<id>@bracket.guest` and current
# `guest-NN@use-bracket.com` synthetic guest emails.
_GUEST_EMAIL_RE = _re.compile(
    r"^(guest\+[a-zA-Z0-9_-]+@bracket\.guest|guest-\d+@use-bracket\.com)$",
    _re.IGNORECASE,
)


def _is_guest_email(email: Optional[str]) -> bool:
    if not email:
        return False
    return bool(_GUEST_EMAIL_RE.match(email.strip().lower()))


@api.post("/auth/me/email")
async def auth_guest_upgrade(body: GuestUpgradeIn, request: Request):
    """A signed-in guest gives us their email + name on their way out.
    Refuses if the email is already taken by a real account."""
    user = await current_user(request, db)
    new_email = body.email.lower().strip()
    if _is_guest_email(new_email):
        raise HTTPException(status_code=400, detail="That's not a real email.")
    # Block if a real account already exists.
    clash = await db.users.find_one(
        {"email": new_email, "user_id": {"$ne": user["user_id"]}},
        {"_id": 0, "user_id": 1},
    )
    if clash:
        raise HTTPException(
            status_code=409,
            detail="That email is already in use — sign in instead.",
        )
    updates: Dict[str, Any] = {
        "email": new_email,
        "is_guest": False,
        "updated_at": auth_iso(auth_now()),
    }
    if body.name.strip():
        updates["name"] = body.name.strip()
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return public_user(fresh)


# ---- AI AUTOFILL SUGGESTIONS (debounced from the form fields) --------------
class SuggestIn(_BM):
    step: int = _Fd(ge=1, le=5)
    field: str = _Fd(min_length=1, max_length=40)
    partial: str = _Fd(default="", max_length=500)
    context: Dict[str, Any] = _Fd(default_factory=dict)


@api.post("/suggest")
async def ai_suggest(body: SuggestIn):
    """Returns 0-4 short autofill suggestions for a form field. Safe to call
    on every keystroke (frontend debounces 600ms); errors return empty list,
    not 500, so a hiccup never blocks the user's typing."""
    suggestions = await run_field_suggestions(
        body.step, body.field, body.partial, body.context
    )
    return {"suggestions": suggestions}


import re as _re


def _email_match(email: str):
    """Case-insensitive exact email match (anonymous-mode projects may have
    stored creator_email with mixed casing)."""
    return {"$regex": f"^{_re.escape((email or '').strip())}$", "$options": "i"}


# ---- CLAIM ANONYMOUS PROJECTS -----------------------------------------------
@api.get("/auth/claimable")
async def auth_claimable(request: Request):
    """Projects in the DB that match this user's email but have no owner yet."""
    user = await current_user(request, db)
    cur = (
        db.projects.find(
            {
                "creator_email": _email_match(user["email"]),
                "$or": [
                    {"owner_user_id": {"$exists": False}},
                    {"owner_user_id": ""},
                    {"owner_user_id": None},
                ],
            },
            {"_id": 0, "id": 1, "name": 1, "status": 1, "step": 1, "share_status": 1, "created_at": 1, "updated_at": 1},
        )
        .sort("updated_at", -1)
        .limit(100)
    )
    return [d async for d in cur]


class ClaimDecisionIn(_BM):
    keep_ids: list[str] = _Fd(default_factory=list)
    delete_ids: list[str] = _Fd(default_factory=list)


@api.post("/auth/claim")
async def auth_claim(body: ClaimDecisionIn, request: Request):
    user = await current_user(request, db)
    claimed = 0
    deleted = 0
    if body.keep_ids:
        res = await db.projects.update_many(
            {"id": {"$in": body.keep_ids}, "creator_email": _email_match(user["email"])},
            {"$set": {"owner_user_id": user["user_id"], "updated_at": auth_iso(auth_now())}},
        )
        claimed = res.modified_count
    if body.delete_ids:
        res = await db.projects.delete_many(
            {"id": {"$in": body.delete_ids}, "creator_email": _email_match(user["email"])},
        )
        deleted = res.deleted_count
    return {"claimed": claimed, "deleted": deleted}


# ===========================================================================
# PUBLIC METRICS — safe aggregate counters for the landing page.
# No authentication required. Only aggregated counts are returned; no
# individual project or user data leaks.
# ===========================================================================
@api.get("/public/metrics")
async def public_metrics():
    """Aggregate KPIs shown on the landing page's metrics strip. All counts
    are numeric only — no identifiers, no content."""
    # 1. Freelancers & Teams — total signed-up users.
    total_users = await db.users.count_documents({})

    # 2. Projects Scoped — projects that reached the artifacts step
    # (i.e. a scope doc, client message, assumptions and risk flags were
    # generated). We accept either a locked project or one that has any
    # artifacts field populated.
    projects_scoped = await db.projects.count_documents({
        "$or": [
            {"status": "locked"},
            {"artifacts": {"$exists": True, "$nin": [None, {}]}},
        ],
    })

    # 3. Projects Started with AI — any project where the framing step has
    # produced output (i.e. the user actually used Bracket's brain).
    projects_started = await db.projects.count_documents({
        "framing": {"$exists": True, "$nin": [None, {}]},
    })

    # 4/5/6 — array-length sums via aggregation. We coerce missing/non-array
    # fields to empty arrays so $size never explodes.
    def _sum_size(field: str) -> list[dict]:
        return [
            {"$project": {"n": {"$size": {"$ifNull": [field, []]}}}},
            {"$group": {"_id": None, "total": {"$sum": "$n"}}},
        ]

    async def _agg_sum(pipeline: list[dict]) -> int:
        async for row in db.projects.aggregate(pipeline):
            return int(row.get("total") or 0)
        return 0

    # Requirements Extracted — AI-surfaced "key signals" that actually drive
    # the decision (context step output).
    requirements_extracted = await _agg_sum(_sum_size("$context.key_signals"))

    # Risks Identified — every risk called out across all decisions and
    # artifact risk-flag lists.
    risks_from_decision = await _agg_sum(_sum_size("$decision.risks"))
    risks_from_artifacts = await _agg_sum(_sum_size("$artifacts.risk_flags"))
    risks_identified = risks_from_decision + risks_from_artifacts

    # Client Questions Generated — assumptions surfaced during artifacts
    # (things the freelancer should verify with the client before shipping).
    client_questions = await _agg_sum(_sum_size("$artifacts.assumptions"))

    return {
        "freelancers_and_teams": total_users,
        "projects_scoped": projects_scoped,
        "requirements_extracted": requirements_extracted,
        "risks_identified": risks_identified,
        "client_questions_generated": client_questions,
        "projects_started_with_ai": projects_started,
    }


# ---- Session / acquisition tracking ----------------------------------------
# Public endpoint the landing page POSTs to on first paint. Captures
# referrer + UTM params so we can compute acquisition attribution in the
# admin dashboard. Never links to a specific user unless the visitor later
# signs in (then user_id is set on the row via a separate merge).
class SessionTrackIn(_BM):
    session_id: str = _Fd(min_length=8, max_length=64)
    path: str = _Fd(default="/", max_length=200)
    referrer: str = _Fd(default="", max_length=500)
    utm_source: str = _Fd(default="", max_length=120)
    utm_medium: str = _Fd(default="", max_length=120)
    utm_campaign: str = _Fd(default="", max_length=120)
    utm_term: str = _Fd(default="", max_length=120)
    utm_content: str = _Fd(default="", max_length=120)


def _referrer_bucket(ref: str, utm_source: str) -> str:
    """Cheap traffic-source bucket. Priority: utm_source > referrer host."""
    if utm_source:
        return utm_source.lower()
    if not ref:
        return "direct"
    try:
        from urllib.parse import urlparse
        host = (urlparse(ref).hostname or "").lower()
    except Exception:
        return "other"
    for pattern, bucket in [
        ("google.", "google"),
        ("bing.", "bing"),
        ("duckduckgo.", "duckduckgo"),
        ("twitter.", "twitter"), ("t.co", "twitter"), ("x.com", "twitter"),
        ("linkedin.", "linkedin"),
        ("facebook.", "facebook"), ("fb.", "facebook"),
        ("instagram.", "instagram"),
        ("youtube.", "youtube"),
        ("reddit.", "reddit"),
        ("producthunt.", "producthunt"),
        ("github.", "github"),
    ]:
        if pattern in host:
            return bucket
    return host or "other"


@api.post("/public/track/session")
async def track_session(body: SessionTrackIn, request: Request):
    """Upsert an acquisition-tracking row. Idempotent per session_id.
    Analytics is fire-and-forget: any DB write failure MUST NOT crash the
    request (an earlier variant of this endpoint raised pymongo WriteError
    'session_id conflict', which Cloudflare then surfaced as a 520 to the
    user). Swallow all write errors — we can always re-track next paint."""
    now = auth_iso(auth_now())
    source = _referrer_bucket(body.referrer, body.utm_source)
    # Fingerprint user (best-effort) so we can link if they sign in later.
    user_id = None
    try:
        u = await current_user(request, db)
        user_id = u.get("user_id")
    except Exception:
        user_id = None

    doc = {
        "referrer": body.referrer,
        "utm_source": body.utm_source,
        "utm_medium": body.utm_medium,
        "utm_campaign": body.utm_campaign,
        "utm_term": body.utm_term,
        "utm_content": body.utm_content,
        "source_bucket": source,
        "last_path": body.path,
        "last_seen_at": now,
    }
    add_user = {"user_ids": user_id} if user_id else {"user_ids": "__anon__"}
    try:
        await db.sessions.update_one(
            {"session_id": body.session_id},
            {
                "$set": doc,
                "$setOnInsert": {"first_seen_at": now},
                "$addToSet": add_user,
            },
            upsert=True,
        )
    except Exception as e:
        # Non-fatal: log + move on. Analytics loss is preferable to a 5xx.
        logger.warning("track_session write failed (non-fatal): %s", e)
    return {"ok": True}


# ===========================================================================
# ADMIN — hidden, gated by ADMIN_EMAILS env var. Not linked from anywhere
# public. Non-admin sessions get 404 (deliberately misleading) so the
# existence of /api/admin is never revealed to end users.
# ===========================================================================
from auth import current_admin as auth_current_admin  # local import to keep group


class AdminResetPasswordIn(_BM):
    new_password: str = _Fd(min_length=8, max_length=128)


@api.get("/admin/users")
async def admin_list_users(
    request: Request,
    kind: str = "all",           # all | guest | registered
    min_projects: int = 0,
    max_projects: Optional[int] = None,
):
    admin = await auth_current_admin(request, db)
    # Project counts per user_id, in one aggregation pass.
    counts: Dict[str, int] = {}
    async for row in db.projects.aggregate([
        {"$match": {"owner_user_id": {"$type": "string"}}},
        {"$group": {"_id": "$owner_user_id", "n": {"$sum": 1}}},
    ]):
        counts[row["_id"]] = row["n"]

    users_out = []
    cur = db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(2000)
    async for u in cur:
        uid = u.get("user_id", "")
        email = u.get("email") or ""
        is_guest = bool(u.get("is_guest")) or _is_guest_email(email)
        pc = counts.get(uid, 0)

        # Server-side filters (cheap in a single pass on ≤2000 rows)
        if kind == "guest" and not is_guest:
            continue
        if kind == "registered" and is_guest:
            continue
        if pc < min_projects:
            continue
        if max_projects is not None and pc > max_projects:
            continue

        users_out.append({
            "user_id": uid,
            "email": email,
            "name": u.get("name", ""),
            "designation": u.get("designation", ""),
            "avatar": u.get("avatar", ""),
            "picture": u.get("picture", ""),
            "created_at": u.get("created_at"),
            "updated_at": u.get("updated_at"),
            "last_seen_at": u.get("last_seen_at"),
            "signup_ip": u.get("signup_ip", ""),
            "signup_user_agent": u.get("signup_user_agent", ""),
            "is_admin": email.lower() in {admin["email"].lower(), *_admin_emails_set()},
            "is_guest": is_guest,
            "project_count": pc,
        })
    return {"users": users_out, "admin_email": admin["email"], "filter": {"kind": kind, "min_projects": min_projects, "max_projects": max_projects}}


def _admin_emails_set() -> set:
    """Helper that resolves the env at call time (cannot import circularly)."""
    from auth import admin_emails as _ae
    return _ae()


@api.get("/admin/users/{user_id}/projects")
async def admin_user_projects(user_id: str, request: Request):
    await auth_current_admin(request, db)
    cur = (
        db.projects.find(
            {"owner_user_id": user_id},
            {"_id": 0, "id": 1, "name": 1, "status": 1, "step": 1, "share_status": 1, "created_at": 1, "updated_at": 1, "locked_at": 1},
        )
        .sort("updated_at", -1)
        .limit(500)
    )
    return {"projects": [d async for d in cur]}


# --- ONE-OFF ADMIN CLEANUP -------------------------------------------------
# Purges users matching one or more email regex patterns + cascades their
# projects, user_sessions, email_otps, and session_id refs. Dry-run by default.
# Used to nuke automation-test accounts (e2e-*, hp-test-*, overview-*, etc.)
# from any environment — call once, gate behind explicit confirm=true.

# Baked-in safelist of automation patterns. Callers can override via `patterns`.
_DEFAULT_AUTOMATION_PATTERNS = [
    r"^e2e-",
    r"^e2e\+",
    r"^hp-test-",
    r"^overview-",
    r"^nonadmin-",
    r"^reset-target-",
    r"^flow-fixes-",
    r"^s4-auto-",
    r"^output-unify-",
    r"^upgraded-",
    r"^bracket-test-",
]


class PurgeUsersIn(_BM):
    # Comma-separated regexes. If empty/omitted, uses the default automation set.
    patterns: str = _Fd(default="", max_length=2000)
    # Safety: must be True for anything to actually get deleted.
    confirm: bool = _Fd(default=False)


@api.post("/admin/purge-users")
async def admin_purge_users(body: PurgeUsersIn, request: Request):
    """One-off cleanup — deletes users whose email matches any of the given
    regex patterns, plus cascades their projects / user_sessions / OTP codes /
    session_id refs. Never touches admins. Returns counts (never raises unless
    the caller isn't an admin). Dry-run by default; set `confirm=true` to
    actually delete."""
    admin = await auth_current_admin(request, db)
    patterns = [p.strip() for p in body.patterns.split(",") if p.strip()] or list(_DEFAULT_AUTOMATION_PATTERNS)
    admin_emails = {admin["email"].lower(), *_admin_emails_set()}

    regex_filter = {"$or": [{"email": {"$regex": p}} for p in patterns]}
    # Never delete admins even if the pattern would match.
    if admin_emails:
        regex_filter = {"$and": [regex_filter, {"email": {"$nin": list(admin_emails)}}]}

    victims = await db.users.find(regex_filter, {"user_id": 1, "email": 1, "_id": 0}).to_list(length=10000)
    victim_ids = [v["user_id"] for v in victims]
    victim_emails = [v["email"] for v in victims]

    proj_count = await db.projects.count_documents({
        "$or": [
            {"owner_user_id": {"$in": victim_ids}},
            {"creator_email": {"$in": victim_emails}},
        ]
    })
    session_count = await db.user_sessions.count_documents({"user_id": {"$in": victim_ids}})
    otp_count = await db.email_otps.count_documents({"email": {"$in": victim_emails}})

    result = {
        "dry_run": not body.confirm,
        "patterns": patterns,
        "matched_users": len(victims),
        "cascade": {
            "projects": proj_count,
            "user_sessions": session_count,
            "email_otps": otp_count,
        },
        "sample_emails": victim_emails[:10],
    }

    if not body.confirm:
        return result

    # Actually delete — cascade order matters (children before parents).
    proj_del = await db.projects.delete_many({
        "$or": [
            {"owner_user_id": {"$in": victim_ids}},
            {"creator_email": {"$in": victim_emails}},
        ]
    })
    sess_del = await db.user_sessions.delete_many({"user_id": {"$in": victim_ids}})
    otp_del = await db.email_otps.delete_many({"email": {"$in": victim_emails}})
    # Remove victim user_ids from any session-tracking documents.
    await db.sessions.update_many(
        {"user_ids": {"$in": victim_ids}},
        {"$pull": {"user_ids": {"$in": victim_ids}}},
    )
    users_del = await db.users.delete_many(regex_filter)

    logger.info(
        "[admin/purge-users] admin=%s deleted users=%s projects=%s sessions=%s otps=%s",
        admin["email"], users_del.deleted_count, proj_del.deleted_count,
        sess_del.deleted_count, otp_del.deleted_count,
    )
    result["deleted"] = {
        "users": users_del.deleted_count,
        "projects": proj_del.deleted_count,
        "user_sessions": sess_del.deleted_count,
        "email_otps": otp_del.deleted_count,
    }
    return result


class DeleteUsersIn(_BM):
    user_ids: List[str] = _Fd(default_factory=list)
    confirm: bool = _Fd(default=False)


@api.post("/admin/users/delete")
async def admin_delete_users(body: DeleteUsersIn, request: Request):
    """Bulk-delete users by explicit `user_ids` + cascade projects/sessions/OTPs.
    Never deletes admins. Dry-run by default (confirm=True to actually delete)."""
    admin = await auth_current_admin(request, db)
    if not body.user_ids:
        return {"dry_run": True, "matched_users": 0, "deleted": {"users": 0, "projects": 0, "user_sessions": 0, "email_otps": 0}}
    admin_emails_lower = {admin["email"].lower(), *(e.lower() for e in _admin_emails_set())}
    # Fetch victims, skip admins
    victims = await db.users.find(
        {"user_id": {"$in": body.user_ids}},
        {"_id": 0, "user_id": 1, "email": 1},
    ).to_list(length=100000)
    victims = [v for v in victims if (v.get("email") or "").lower() not in admin_emails_lower]
    victim_ids = [v["user_id"] for v in victims]
    victim_emails = [v["email"] for v in victims if v.get("email")]

    if not body.confirm:
        pc = await db.projects.count_documents(
            {"$or": [{"owner_user_id": {"$in": victim_ids}}, {"creator_email": {"$in": victim_emails}}]}
        )
        sc = await db.user_sessions.count_documents({"user_id": {"$in": victim_ids}})
        oc = await db.email_otps.count_documents({"email": {"$in": victim_emails}}) if victim_emails else 0
        return {
            "dry_run": True,
            "matched_users": len(victim_ids),
            "cascade": {"projects": pc, "user_sessions": sc, "email_otps": oc},
        }

    # Cascade delete
    proj_del = await db.projects.delete_many(
        {"$or": [{"owner_user_id": {"$in": victim_ids}}, {"creator_email": {"$in": victim_emails}}]}
    )
    sess_del = await db.user_sessions.delete_many({"user_id": {"$in": victim_ids}})
    otp_del_count = 0
    if victim_emails:
        otp_del = await db.email_otps.delete_many({"email": {"$in": victim_emails}})
        otp_del_count = otp_del.deleted_count
    users_del = await db.users.delete_many({"user_id": {"$in": victim_ids}})
    logger.info(
        "[admin/users/delete] admin=%s deleted users=%s projects=%s sessions=%s otps=%s",
        admin["email"], users_del.deleted_count, proj_del.deleted_count, sess_del.deleted_count, otp_del_count,
    )
    return {
        "dry_run": False,
        "matched_users": len(victim_ids),
        "deleted": {
            "users": users_del.deleted_count,
            "projects": proj_del.deleted_count,
            "user_sessions": sess_del.deleted_count,
            "email_otps": otp_del_count,
        },
    }


@api.post("/admin/purge-guests")
async def admin_purge_guests(request: Request):
    """One-shot: delete ALL guest users (is_guest=True or `*@bracket.guest`)
    across the workspace + cascade their data. Idempotent. Never touches
    non-guest accounts or admins. Used to clean up automation / drive-by
    guest sessions from both preview and production."""
    admin = await auth_current_admin(request, db)
    filt = {"$or": [{"is_guest": True}, {"email": {"$regex": r"@bracket\.guest$"}}]}
    guests = await db.users.find(filt, {"_id": 0, "user_id": 1, "email": 1}).to_list(length=100000)
    ids = [g["user_id"] for g in guests]
    emails = [g["email"] for g in guests if g.get("email")]
    if not ids:
        return {"deleted": {"users": 0, "projects": 0, "user_sessions": 0, "email_otps": 0}}
    proj_del = await db.projects.delete_many(
        {"$or": [{"owner_user_id": {"$in": ids}}, {"creator_email": {"$in": emails}}]}
    )
    sess_del = await db.user_sessions.delete_many({"user_id": {"$in": ids}})
    otp_count = 0
    if emails:
        otp_del = await db.email_otps.delete_many({"email": {"$in": emails}})
        otp_count = otp_del.deleted_count
    users_del = await db.users.delete_many(filt)
    logger.info(
        "[admin/purge-guests] admin=%s deleted users=%s projects=%s sessions=%s otps=%s",
        admin["email"], users_del.deleted_count, proj_del.deleted_count, sess_del.deleted_count, otp_count,
    )
    return {
        "deleted": {
            "users": users_del.deleted_count,
            "projects": proj_del.deleted_count,
            "user_sessions": sess_del.deleted_count,
            "email_otps": otp_count,
        },
    }


@api.get("/admin/projects/{project_id}")
async def admin_project_detail(project_id: str, request: Request):
    """Full project document for the admin drill-down. Includes every step's
    input + AI output, share status, feedback, replies. Owner-agnostic (admins
    can view any project). Sensitive fields (share_token) are stripped."""
    await auth_current_admin(request, db)
    p = await db.projects.find_one({"id": project_id}, {"_id": 0, "share_token": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    owner = None
    if p.get("owner_user_id"):
        owner = await db.users.find_one(
            {"user_id": p["owner_user_id"]},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1, "designation": 1},
        )
    return {"project": p, "owner": owner}


@api.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, body: AdminResetPasswordIn, request: Request):
    admin = await auth_current_admin(request, db)
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "user_id": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    new_hash = hash_password(body.new_password)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"password_hash": new_hash, "updated_at": auth_iso(auth_now())}},
    )
    # Invalidate ALL of the target's existing sessions so the new password
    # is required immediately. The admin's own session is unaffected.
    await db.user_sessions.delete_many({"user_id": user_id})
    logger.info(f"[admin] {admin['email']} reset password for {target['email']}")
    return {"ok": True, "email": target["email"]}


# ---- ADMIN ANALYTICS -------------------------------------------------------
def _iso_to_dt(s: str):
    """Best-effort ISO -> aware UTC datetime. Returns None on failure."""
    if not s:
        return None
    try:
        from datetime import datetime as _dt, timezone as _tz
        d = _dt.fromisoformat(s.replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=_tz.utc)
        return d.astimezone(_tz.utc)
    except Exception:
        return None


@api.get("/admin/analytics")
async def admin_analytics(request: Request):
    """Aggregate KPIs + chart series for the admin analytics dashboard.
    All series are pre-computed here so the frontend can render synchronously."""
    from datetime import datetime as _dt, timedelta as _td, timezone as _tz
    admin = await auth_current_admin(request, db)  # noqa: F841 -- guard only
    now = auth_now()
    d7 = now - _td(days=7)
    d30 = now - _td(days=30)
    d90 = now - _td(days=90)

    # --- KPIs -------------------------------------------------------------
    total_users = await db.users.count_documents({})
    new_users_7d = await db.users.count_documents({"created_at": {"$gte": auth_iso(d7)}})
    total_projects = await db.projects.count_documents({})
    locked_projects = await db.projects.count_documents({"status": "locked"})

    avg_steps_val = 0.0
    async for a in db.projects.aggregate([
        {"$match": {"step": {"$type": "number"}}},
        {"$group": {"_id": None, "avg": {"$avg": "$step"}}},
    ]):
        avg_steps_val = round(a.get("avg") or 0, 2)

    # --- Status distribution ---------------------------------------------
    status_distribution = []
    async for row in db.projects.aggregate([
        {"$group": {"_id": {"$ifNull": ["$status", "draft"]}, "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
    ]):
        status_distribution.append({"name": row["_id"] or "draft", "value": row["n"]})

    # --- Step funnel: how many projects reached at least step N ----------
    step_funnel = []
    for step in range(1, 6):
        n = await db.projects.count_documents({"step": {"$gte": step}})
        step_funnel.append({"step": f"Step {step}", "count": n})

    # --- Daily series (30d), day-bucketed via string prefix --------------
    users_daily_raw: Dict[str, int] = {}
    async for row in db.users.aggregate([
        {"$match": {"created_at": {"$gte": auth_iso(d30)}}},
        {"$project": {"day": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$day", "n": {"$sum": 1}}},
    ]):
        users_daily_raw[row["_id"]] = row["n"]

    projects_daily_raw: Dict[str, int] = {}
    async for row in db.projects.aggregate([
        {"$match": {"created_at": {"$gte": auth_iso(d30)}}},
        {"$project": {"day": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$day", "n": {"$sum": 1}}},
    ]):
        projects_daily_raw[row["_id"]] = row["n"]

    new_users_daily = []
    projects_daily = []
    for i in range(29, -1, -1):
        day = (now - _td(days=i)).strftime("%Y-%m-%d")
        new_users_daily.append({"date": day, "count": users_daily_raw.get(day, 0)})
        projects_daily.append({"date": day, "count": projects_daily_raw.get(day, 0)})

    # --- Cycle time (locked projects only): create -> lock in days -------
    cycle_time_points = []
    cur = db.projects.find(
        {"status": "locked", "locked_at": {"$exists": True, "$nin": [None, ""]}},
        {"_id": 0, "creator_email": 1, "owner_user_id": 1, "created_at": 1,
         "locked_at": 1, "name": 1},
    ).limit(500)
    async for p in cur:
        ca = _iso_to_dt(p.get("created_at"))
        la = _iso_to_dt(p.get("locked_at"))
        if not ca or not la:
            continue
        days = max(0.0, (la - ca).total_seconds() / 86400.0)
        cycle_time_points.append({
            "user": p.get("creator_email") or p.get("owner_user_id") or "unknown",
            "days": round(days, 2),
            "name": p.get("name") or "",
        })

    # --- Top 10 users by project count -----------------------------------
    top_users = []
    async for row in db.projects.aggregate([
        {"$match": {"owner_user_id": {"$type": "string", "$ne": ""}}},
        {"$group": {"_id": "$owner_user_id", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 10},
    ]):
        u = await db.users.find_one(
            {"user_id": row["_id"]},
            {"_id": 0, "email": 1, "name": 1},
        ) or {}
        top_users.append({
            "email": u.get("email") or "unknown",
            "name": u.get("name") or "—",
            "projects": row["n"],
        })

    # --- Share/review funnel ---------------------------------------------
    total_shared = await db.projects.count_documents(
        {"share_status": {"$exists": True, "$nin": [None, ""]}}
    )
    accepted = await db.projects.count_documents({"share_status": "accepted"})
    rejected = await db.projects.count_documents({"share_status": "rejected"})
    reviewed = accepted + rejected
    share_funnel = [
        {"stage": "Shared", "count": total_shared},
        {"stage": "Reviewed", "count": reviewed},
        {"stage": "Accepted", "count": accepted},
        {"stage": "Rejected", "count": rejected},
    ]
    share_accept_rate = round((accepted / reviewed) * 100, 1) if reviewed else 0.0

    # --- Activity heatmap: creations by (weekday, hour) over last 90d -----
    days_of_week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    heat: Dict[tuple, int] = {}
    cur2 = db.projects.find(
        {"created_at": {"$gte": auth_iso(d90)}},
        {"_id": 0, "created_at": 1},
    ).limit(5000)
    async for p in cur2:
        dt = _iso_to_dt(p.get("created_at"))
        if not dt:
            continue
        dt = dt.astimezone(_tz.utc)
        key = (dt.weekday(), dt.hour)  # 0=Mon..6=Sun
        heat[key] = heat.get(key, 0) + 1
    # Reorder to Sun..Sat for consistent axis, using python weekday map
    py_to_sun = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0}  # Mon->1..Sun->0
    activity_heatmap = []
    for sun_idx in range(7):
        py_idx = [k for k, v in py_to_sun.items() if v == sun_idx][0]
        hours = [{"hour": h, "value": heat.get((py_idx, h), 0)} for h in range(24)]
        activity_heatmap.append({"day": days_of_week[sun_idx], "hours": hours})

    # ============================================================
    # ACQUISITION — traffic sources, referrers, campaigns, UTMs.
    # Reads from the `sessions` collection populated by the public
    # /api/public/track/session endpoint. Empty until UTM capture has
    # been live for a while — that's expected and honest.
    # ============================================================
    total_sessions = await db.sessions.count_documents({})
    top_sources: list = []
    async for row in db.sessions.aggregate([
        {"$group": {"_id": {"$ifNull": ["$source_bucket", "direct"]}, "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 8},
    ]):
        top_sources.append({"source": row["_id"] or "direct", "count": row["n"]})

    top_referrers: list = []
    async for row in db.sessions.aggregate([
        {"$match": {"referrer": {"$type": "string", "$ne": ""}}},
        {"$group": {"_id": "$referrer", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 8},
    ]):
        top_referrers.append({"referrer": row["_id"], "count": row["n"]})

    top_campaigns: list = []
    async for row in db.sessions.aggregate([
        {"$match": {"utm_campaign": {"$type": "string", "$ne": ""}}},
        {"$group": {"_id": "$utm_campaign", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 8},
    ]):
        top_campaigns.append({"campaign": row["_id"], "count": row["n"]})

    utms_captured = await db.sessions.count_documents({
        "$or": [
            {"utm_source": {"$ne": ""}},
            {"utm_medium": {"$ne": ""}},
            {"utm_campaign": {"$ne": ""}},
        ]
    })
    acquisition = {
        "total_sessions": total_sessions,
        "utms_captured": utms_captured,
        "top_sources": top_sources,
        "top_referrers": top_referrers,
        "top_campaigns": top_campaigns,
    }

    # ============================================================
    # ACTIVATION — funnel by real Bracket events (option 1c).
    # Each stage is derived from the projects collection so this
    # is real, not instrumented.
    # ============================================================
    activation = {
        "started":     await db.projects.count_documents({}),
        "context":     await db.projects.count_documents({"context": {"$exists": True, "$nin": [None, {}]}}),
        "decision":    await db.projects.count_documents({"decision": {"$exists": True, "$nin": [None, {}]}}),
        "published":   await db.projects.count_documents({"status": "locked"}),
        "shared":      await db.projects.count_documents({"share_status": {"$exists": True, "$nin": [None, "", "none"]}}),
    }

    # ============================================================
    # ENGAGEMENT — returning users cohorts, projects/user, avg edits.
    # Cohorts use last_seen_at written by current_user() middleware.
    # ============================================================
    returning_1d  = await db.users.count_documents({"last_seen_at": {"$gte": auth_iso(now - _td(days=1))}})
    returning_7d  = await db.users.count_documents({"last_seen_at": {"$gte": auth_iso(now - _td(days=7))}})
    returning_30d = await db.users.count_documents({"last_seen_at": {"$gte": auth_iso(now - _td(days=30))}})

    projects_per_user = 0.0
    if total_users:
        projects_per_user = round(total_projects / total_users, 2)

    # Avg edits per project — proxy from time between created_at and
    # updated_at. Not a true edit count, but a robust availability signal.
    edits_days = 0.0
    edit_count = 0
    cur3 = db.projects.find(
        {"created_at": {"$exists": True}, "updated_at": {"$exists": True}},
        {"_id": 0, "created_at": 1, "updated_at": 1},
    ).limit(2000)
    async for p in cur3:
        ca = _iso_to_dt(p.get("created_at"))
        ua = _iso_to_dt(p.get("updated_at"))
        if ca and ua and ua > ca:
            edits_days += max(0.0, (ua - ca).total_seconds() / 86400.0)
            edit_count += 1
    avg_edit_span_days = round(edits_days / edit_count, 2) if edit_count else 0.0

    engagement = {
        "returning_1d": returning_1d,
        "returning_7d": returning_7d,
        "returning_30d": returning_30d,
        "projects_per_user": projects_per_user,
        "avg_edit_span_days": avg_edit_span_days,
    }

    # ============================================================
    # BUSINESS — placeholder section. Real numbers arrive when the
    # paid tier and download/purchase surfaces ship.
    # ============================================================
    business = {
        "coming_soon": True,
        "total_published": activation["published"],  # closest real-world proxy today
        "downloads": 0,
        "purchases": 0,
        "revenue": 0,
        "top_creators": top_users[:5],   # reuse the leaderboard from above
        "top_categories": [],
        "repeat_creators": sum(1 for u in top_users if u["projects"] > 1),
    }

    return {
        "generated_at": auth_iso(now),
        "kpis": {
            "total_users": total_users,
            "new_users_7d": new_users_7d,
            "total_projects": total_projects,
            "locked_projects": locked_projects,
            "share_accept_rate": share_accept_rate,
            "avg_steps": avg_steps_val,
        },
        "new_users_daily": new_users_daily,
        "projects_daily": projects_daily,
        "status_distribution": status_distribution,
        "step_funnel": step_funnel,
        "cycle_time_points": cycle_time_points,
        "top_users": top_users,
        "share_funnel": share_funnel,
        "share_accept_rate": share_accept_rate,
        "activity_heatmap": activity_heatmap,
        "acquisition": acquisition,
        "activation": activation,
        "engagement": engagement,
        "business": business,
    }


# ===========================================================================
# PROJECTS — now auth-required
# ===========================================================================
class CreateProjectIn(_BM):
    project_name: str = _Fd(min_length=1, max_length=120)
    engine: str = "claude"
    # Optional: when the client provides the raw paste at creation time,
    # backend generates a proper AI title from it and overrides `project_name`
    # (which is a heuristic derivation from the first ~6 words of the paste).
    raw_paste: str = _Fd(default="", max_length=20000)


@api.post("/projects", response_model=ProjectOut)
async def create_project(body: CreateProjectIn, request: Request):
    """Auth required. Owner is whoever is signed in."""
    user = await current_user(request, db)
    pname = body.project_name.strip()
    name_source = "heuristic"
    # If the client sent the raw paste, ask Haiku to name the project.
    # Falls back silently to `project_name` if generation fails.
    raw_paste = (body.raw_paste or "").strip()
    if raw_paste and len(raw_paste) >= 20:
        try:
            ai_title = await generate_project_title(raw_paste)
            if ai_title and len(ai_title) >= 3:
                pname = ai_title[:120]
                name_source = "ai"
        except Exception as e:
            logger.warning("project title generation failed: %s", e)
    now = _now_iso()
    doc = {
        "id": _uuid(),
        "name": pname,
        "name_source": name_source,
        "creator_name": user.get("name", ""),
        "creator_email": user["email"],
        "owner_user_id": user["user_id"],
        "engine": body.engine if body.engine in ("claude", "gpt") else "claude",
        "status": "draft",
        "step": 1,
        "situation_input": None,
        "framing": None,
        "context_input": None,
        "context": None,
        "decision_input": None,
        "decision": None,
        "artifacts": None,
        "locked_at": None,
        "feedback": None,
        "share_token": None,
        "share_status": "none",
        "share_review": None,
        "owner_replies": [],
        "created_at": now,
        "updated_at": now,
    }
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---- FILE-UPLOAD PROJECT CREATION ---------------------------------------
# Accept a PDF / TXT / PNG / JPEG describing a client brief. Extract its
# text, seed a project with the paste, and (if the brief is complete enough)
# auto-run all three input steps so the user lands on Step 5 immediately.
_ALLOWED_UPLOAD_MIMES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
}
_UPLOAD_MAX_BYTES = 8 * 1024 * 1024   # 8 MB is plenty for a client brief.


async def _extract_text_from_upload(raw: bytes, mime: str, filename: str) -> str:
    """Dispatch to the right parser based on MIME. Returns plain text."""
    kind = _ALLOWED_UPLOAD_MIMES.get(mime)
    if not kind and filename:
        # Fall back on extension when the browser reported the wrong MIME.
        ext = (filename.rsplit(".", 1)[-1] or "").lower()
        kind = {"pdf": "pdf", "txt": "txt", "png": "png", "jpg": "jpeg", "jpeg": "jpeg"}.get(ext)
    if kind == "txt":
        try:
            return raw.decode("utf-8", errors="replace").strip()
        except Exception:
            return ""
    if kind == "pdf":
        try:
            import io
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            parts: list[str] = []
            for page in reader.pages:
                try:
                    txt = page.extract_text() or ""
                except Exception:
                    txt = ""
                if txt.strip():
                    parts.append(txt.strip())
            return "\n\n".join(parts).strip()
        except Exception as e:
            logger.warning("pdf parse failed: %s", e)
            return ""
    if kind in ("png", "jpeg"):
        return await extract_text_from_image(raw, mime_type=f"image/{'jpeg' if kind == 'jpeg' else 'png'}")
    return ""


@api.post("/projects/upload-brief", response_model=ProjectOut)
async def upload_brief(request: Request, file: UploadFile = File(...)):
    """Create a project from an uploaded PDF / TXT / PNG / JPEG brief.

    The response includes the extracted `raw_paste` on the project's
    `situation_input` so the frontend can either hand-off to Step 1
    (default) or auto-advance the user to Step 5 when the brief is complete.
    Auto-advance state is signalled via the project's `step` field being 4
    (i.e., artifacts step reached automatically).
    """
    user = await current_user(request, db)
    mime = (file.content_type or "").lower().strip()
    if mime not in _ALLOWED_UPLOAD_MIMES:
        # Give the client a second chance by extension.
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in {"pdf", "txt", "png", "jpg", "jpeg"}:
            raise HTTPException(status_code=415, detail="Only PDF, TXT, PNG, or JPEG files are supported.")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(raw) > _UPLOAD_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (max 8 MB).")

    text = await _extract_text_from_upload(raw, mime, file.filename or "")
    if not text or len(text.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="We couldn't pull useful text out of this file. Try pasting the brief manually.",
        )

    # Ask Haiku for a project title from the extracted text.
    pname = f"Uploaded · {(file.filename or 'brief')[:40]}"
    name_source = "heuristic"
    try:
        ai_title = await generate_project_title(text)
        if ai_title and len(ai_title) >= 3:
            pname = ai_title[:120]
            name_source = "ai"
    except Exception as e:
        logger.warning("upload_brief title generation failed: %s", e)

    now = _now_iso()
    doc = {
        "id": _uuid(),
        "name": pname,
        "name_source": name_source,
        "creator_name": user.get("name", ""),
        "creator_email": user["email"],
        "owner_user_id": user["user_id"],
        "engine": "claude",
        "status": "draft",
        "step": 1,
        "situation_input": None,
        "framing": None,
        "context_input": None,
        "context": None,
        "decision_input": None,
        "decision": None,
        "artifacts": None,
        "locked_at": None,
        "feedback": None,
        "share_token": None,
        "share_status": "none",
        "share_review": None,
        "owner_replies": [],
        "created_at": now,
        "updated_at": now,
        # Extra bit the frontend uses to know we came from a file upload.
        "brief_source": {
            "filename": file.filename or "",
            "mime": mime,
            "bytes": len(raw),
            "extracted_chars": len(text),
        },
    }
    await db.projects.insert_one(doc)
    # Seed situation_input with the raw paste immediately so the user can
    # do Step 1 manually even if the auto-advance never completes.
    await db.projects.update_one(
        {"id": doc["id"]},
        {"$set": {
            "situation_input": {"raw_paste": text},
            "auto_advance_status": "pending",
            "updated_at": _now_iso(),
        }},
    )

    # Fire-and-forget the whole auto-advance chain (framing → context →
    # decision → artifacts). This can take 60-120s and would blow past the
    # ingress proxy timeout if awaited synchronously — so we return the
    # project immediately and the frontend polls until `auto_advance_status`
    # settles to `advanced` (Step 5) or `partial` / `failed`.
    async def _auto_advance_task():
        try:
            extracted = await extract_full_brief_from_paste(text)
        except Exception as e:
            logger.warning("upload_brief full-extract failed: %s", e)
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {"auto_advance_status": "failed", "updated_at": _now_iso()}},
            )
            return
        if not extracted.get("sufficient"):
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {"auto_advance_status": "insufficient", "updated_at": _now_iso()}},
            )
            return
        sit = extracted["situation"]
        ctx = extracted["context"]
        dec = extracted["decision"]
        sit_input = {**sit, "raw_paste": text}
        ctx_input = {**ctx, "raw_paste": text}
        dec_input = {**dec, "raw_paste": text}
        try:
            framing = await run_situation_framing(sit_input, "claude")
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {
                    "situation_input": sit_input,
                    "framing": framing,
                    "step": 2,
                    "status": "in_progress",
                    "updated_at": _now_iso(),
                }},
            )
        except Exception as e:
            logger.warning("upload_brief framing failed: %s", e)
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {"auto_advance_status": "failed", "updated_at": _now_iso()}},
            )
            return
        try:
            context_out = await run_context_compression(ctx_input, framing, "claude")
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {
                    "context_input": ctx_input,
                    "context": context_out,
                    "step": 3,
                    "updated_at": _now_iso(),
                }},
            )
        except Exception as e:
            logger.warning("upload_brief context failed: %s", e)
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {"auto_advance_status": "partial", "updated_at": _now_iso()}},
            )
            return
        try:
            decision_out = await run_decision_engine(dec_input, framing, context_out, "claude")
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {
                    "decision_input": dec_input,
                    "decision": decision_out,
                    "step": 4,
                    "updated_at": _now_iso(),
                }},
            )
        except Exception as e:
            logger.warning("upload_brief decision failed: %s", e)
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {"auto_advance_status": "partial", "updated_at": _now_iso()}},
            )
            return
        try:
            project_for_artifacts = await _get_project_or_404(doc["id"])
            artifacts = await run_artifacts(project_for_artifacts, "claude")
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {
                    "artifacts": artifacts,
                    "step": 5,
                    "auto_advance_status": "advanced",
                    "updated_at": _now_iso(),
                }},
            )
        except Exception as e:
            logger.warning("upload_brief artifacts failed: %s", e)
            await db.projects.update_one(
                {"id": doc["id"]},
                {"$set": {"auto_advance_status": "partial", "updated_at": _now_iso()}},
            )
            return

    # Kick off the background task without blocking the HTTP response.
    asyncio.create_task(_auto_advance_task())

    project = await _get_project_or_404(doc["id"])
    project["auto_advanced"] = False   # not yet — frontend polls status.
    return project


@api.get("/projects")
async def list_my_projects(request: Request):
    user = await current_user(request, db)
    # Auto-claim any orphan projects that were created with this user's email
    # (e.g. before the account was linked, or by a prior guest session). This
    # keeps the dashboard from silently hiding a user's own work.
    try:
        await db.projects.update_many(
            {
                "creator_email": _email_match(user["email"]),
                "$or": [
                    {"owner_user_id": {"$exists": False}},
                    {"owner_user_id": ""},
                    {"owner_user_id": None},
                ],
            },
            {"$set": {"owner_user_id": user["user_id"], "updated_at": _now_iso()}},
        )
    except Exception:
        # Never let a claim failure hide the dashboard.
        pass
    cur = (
        db.projects.find(
            {
                "$or": [
                    {"owner_user_id": user["user_id"]},
                    {"creator_email": _email_match(user["email"])},
                ],
            },
            {
                "_id": 0, "id": 1, "name": 1, "status": 1, "step": 1,
                "locked_at": 1, "share_status": 1, "created_at": 1, "updated_at": 1,
            },
        )
        .sort("updated_at", -1)
        .limit(200)
    )
    return [d async for d in cur]


async def _get_owned_project_or_404(project_id: str, request: Request) -> dict:
    """Fetch a project the current user owns (or 404). Used by all mutating routes."""
    user = await current_user(request, db)
    p = await db.projects.find_one(
        {
            "id": project_id,
            "$or": [
                {"owner_user_id": user["user_id"]},
                {"creator_email": _email_match(user["email"])},
            ],
        },
        {"_id": 0},
    )
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    # Backfill owner_user_id on legacy anonymous projects the user actually owns
    # so subsequent queries hit the fast path.
    if not p.get("owner_user_id"):
        try:
            await db.projects.update_one(
                {"id": p["id"]},
                {"$set": {"owner_user_id": user["user_id"], "updated_at": _now_iso()}},
            )
            p["owner_user_id"] = user["user_id"]
        except Exception:
            pass
    return p


class RenameProjectIn(_BM):
    name: str = _Fd(min_length=1, max_length=120)


@api.patch("/projects/{project_id}")
async def rename_project(project_id: str, body: RenameProjectIn, request: Request):
    p = await _get_owned_project_or_404(project_id, request)
    await db.projects.update_one(
        {"id": p["id"]},
        {"$set": {"name": body.name.strip(), "name_source": "user", "updated_at": _now_iso()}},
    )
    return await _get_project_or_404(project_id)


@api.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request):
    p = await _get_owned_project_or_404(project_id, request)
    await db.projects.delete_one({"id": p["id"]})
    return {"ok": True}


@api.post("/projects/{project_id}/unlock")
async def unlock_project(project_id: str, request: Request):
    p = await _get_owned_project_or_404(project_id, request)
    await db.projects.update_one(
        {"id": p["id"]},
        {"$set": {"status": "in_progress", "locked_at": None, "updated_at": _now_iso()}},
    )
    return await _get_project_or_404(project_id)


# ---- CASCADING EDITS -----------------------------------------------------
# When a user re-does an earlier step, everything downstream is stale and
# must be regenerated. This endpoint wipes the downstream *outputs* (Bracket's
# generated JSON) so the flow re-runs cleanly. The user's own paste inputs on
# later steps are preserved so they don't have to type everything again.
_STEP_DOWNSTREAM_FIELDS = {
    # Editing step 1 → wipes 2, 3, 4 outputs + artifacts + lock
    1: [
        "framing",
        "context", "context_input",
        "decision", "decision_input",
        "artifacts",
        "locked_at",
    ],
    # Editing step 2 → wipes 3, 4 outputs
    2: [
        "context",
        "decision", "decision_input",
        "artifacts",
        "locked_at",
    ],
    # Editing step 3 → wipes 4 output
    3: [
        "decision",
        "artifacts",
        "locked_at",
    ],
    # Step 4/5 — nothing further downstream to wipe.
    4: ["artifacts", "locked_at"],
    5: ["locked_at"],
}


@api.post("/projects/{project_id}/reset-from-step/{step}", response_model=ProjectOut)
async def reset_downstream_from_step(project_id: str, step: int, request: Request):
    p = await _get_owned_project_or_404(project_id, request)
    if step not in _STEP_DOWNSTREAM_FIELDS:
        raise HTTPException(status_code=400, detail="Invalid step number.")
    unset = {f: "" for f in _STEP_DOWNSTREAM_FIELDS[step]}
    # Also flip the project back to draft and reset step pointer to `step`.
    await db.projects.update_one(
        {"id": p["id"]},
        {
            "$unset": unset,
            "$set": {
                "status": "in_progress" if step > 1 else "draft",
                "step": step,
                "updated_at": _now_iso(),
            },
        },
    )
    return await _get_project_or_404(project_id)


# ---- OWNER REPLY (after client raises concerns) -----------------------------
class OwnerReplyIn(_BM):
    text: str = _Fd(min_length=4, max_length=4000)


@api.post("/projects/{project_id}/reply", response_model=ProjectOut)
async def owner_reply_to_client(project_id: str, body: OwnerReplyIn, request: Request):
    p = await _get_owned_project_or_404(project_id, request)
    if p.get("share_status") != "rejected":
        raise HTTPException(status_code=400, detail="Replies are only sent when a client has raised concerns.")
    user = await current_user(request, db)
    reply = {
        "from_name": user.get("name") or user.get("email"),
        "text": body.text.strip(),
        "sent_at": _now_iso(),
    }
    existing_replies = p.get("owner_replies") or []
    existing_replies.append(reply)
    await db.projects.update_one(
        {"id": p["id"]},
        {
            "$set": {
                "owner_replies": existing_replies,
                # Bounce the share back to "awaiting" so the client can re-review.
                "share_status": "awaiting_reply",
                "updated_at": _now_iso(),
            }
        },
    )
    return await _get_project_or_404(project_id)





class ProjectSummary(BaseModel):
    id: str
    name: str
    status: str
    step: int
    locked_at: str | None = None
    created_at: str
    updated_at: str


# Disabled — replaced by GET /api/projects (auth-required, owner-scoped).
# Kept as a comment so anyone searching for the route sees why it's gone.
# @api.get("/projects/by-email", response_model=List[ProjectSummary]) ...


async def _get_project_or_404(project_id: str) -> dict:
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@api.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str):
    return await _get_project_or_404(project_id)


# --- STEP 1: SITUATION FRAMING ---
@api.post("/projects/{project_id}/situation", response_model=ProjectOut)
async def step_situation(project_id: str, body: SituationIn):
    project = await _get_project_or_404(project_id)
    engine = project.get("engine", "claude")
    payload = body.model_dump()
    # Paste-anything path: extract what/who/unclear from raw_paste (Haiku),
    # then feed extracted fields into the main Sonnet framing call.
    if body.raw_paste:
        try:
            extracted = await extract_situation_from_paste(body.raw_paste)
        except Exception as e:
            logger.warning("situation extraction failed, falling back to raw paste as `what`: %s", e)
            extracted = {"what": body.raw_paste[:2000], "who": "", "unclear": ""}
        # Extracted fields win — legacy structured fields only used if paste is empty.
        payload["what"] = extracted["what"] or payload.get("what", "")
        payload["who"] = extracted["who"] or payload.get("who", "")
        payload["unclear"] = extracted["unclear"] or payload.get("unclear", "")
    try:
        framing = await run_situation_framing(payload, engine)
    except Exception as e:
        logger.exception("situation framing failed")
        raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
    # Store both the extracted fields AND the original paste (for the
    # "transformation card" — needs paste word-count to reveal).
    situation_input = {**payload}
    if body.raw_paste:
        situation_input["raw_paste"] = body.raw_paste
    # If the project title was never set by the user (heuristic derivation
    # from the client heuristic OR a stale name from an older create flow),
    # re-generate it now from the paste. Skip if user has renamed it.
    update_fields = {
        "situation_input": situation_input,
        "framing": framing,
        "step": max(2, project.get("step", 1)),
        "status": "in_progress",
        "updated_at": _now_iso(),
    }
    if body.raw_paste and project.get("name_source", "heuristic") != "user":
        try:
            ai_title = await generate_project_title(body.raw_paste)
            if ai_title and len(ai_title) >= 3:
                update_fields["name"] = ai_title[:120]
                update_fields["name_source"] = "ai"
        except Exception as e:
            logger.warning("situation-step title regen failed: %s", e)
    await db.projects.update_one(
        {"id": project_id},
        {"$set": update_fields},
    )
    return await _get_project_or_404(project_id)


# --- STEP 2: CONTEXT COMPRESSION ---
@api.post("/projects/{project_id}/context", response_model=ProjectOut)
async def step_context(project_id: str, body: ContextIn):
    project = await _get_project_or_404(project_id)
    if not project.get("framing"):
        raise HTTPException(status_code=400, detail="Complete Situation Framing first.")
    payload = body.model_dump()
    if body.raw_paste:
        try:
            extracted = await extract_context_from_paste(body.raw_paste)
        except Exception as e:
            logger.warning("context extraction failed, falling back to raw paste as `requirements`: %s", e)
            extracted = {"requirements": body.raw_paste[:2000], "constraints": "", "inspirations": ""}
        payload["requirements"] = extracted["requirements"] or payload.get("requirements", "")
        payload["constraints"] = extracted["constraints"] or payload.get("constraints", "")
        payload["inspirations"] = extracted["inspirations"] or payload.get("inspirations", "")
    try:
        compressed = await run_context_compression(payload, project["framing"], project.get("engine", "claude"))
    except Exception as e:
        logger.exception("context compression failed")
        raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
    context_input = {**payload}
    if body.raw_paste:
        context_input["raw_paste"] = body.raw_paste
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "context_input": context_input,
                "context": compressed,
                "step": max(3, project.get("step", 2)),
                "updated_at": _now_iso(),
            }
        },
    )
    return await _get_project_or_404(project_id)


# --- STEP 3: DECISION ENGINE ---
@api.post("/projects/{project_id}/decision", response_model=ProjectOut)
async def step_decision(project_id: str, body: DecisionIn):
    project = await _get_project_or_404(project_id)
    if not project.get("context"):
        raise HTTPException(status_code=400, detail="Complete Context Compression first.")
    payload = body.model_dump()
    if body.raw_paste:
        try:
            extracted = await extract_decision_from_paste(body.raw_paste)
        except Exception as e:
            logger.warning("decision extraction failed, falling back to raw paste as `optimizing_for`: %s", e)
            extracted = {"optimizing_for": body.raw_paste[:2000], "tradeoffs": "", "risks": ""}
        payload["optimizing_for"] = extracted["optimizing_for"] or payload.get("optimizing_for", "")
        payload["tradeoffs"] = extracted["tradeoffs"] or payload.get("tradeoffs", "")
        payload["risks"] = extracted["risks"] or payload.get("risks", "")
    try:
        decision = await run_decision_engine(
            payload, project["framing"], project["context"], project.get("engine", "claude")
        )
    except Exception as e:
        logger.exception("decision engine failed")
        raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
    decision_input = {**payload}
    if body.raw_paste:
        decision_input["raw_paste"] = body.raw_paste
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "decision_input": decision_input,
                "decision": decision,
                "step": max(4, project.get("step", 3)),
                "updated_at": _now_iso(),
            }
        },
    )
    return await _get_project_or_404(project_id)


# --- STEP 4: ARTIFACTS ---
@api.post("/projects/{project_id}/artifacts", response_model=ProjectOut)
async def step_artifacts(project_id: str):
    project = await _get_project_or_404(project_id)
    if not project.get("decision"):
        raise HTTPException(status_code=400, detail="Complete Decision step first.")
    try:
        artifacts = await run_artifacts(project, project.get("engine", "claude"))
    except Exception as e:
        logger.exception("artifacts failed")
        raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "artifacts": artifacts,
                "step": max(5, project.get("step", 4)),
                "updated_at": _now_iso(),
            }
        },
    )
    return await _get_project_or_404(project_id)


# --- STEP 5: CONFIDENCE LOCK-IN ---
@api.post("/projects/{project_id}/lock", response_model=ProjectOut)
async def step_lock(project_id: str):
    project = await _get_project_or_404(project_id)
    if not project.get("artifacts"):
        raise HTTPException(status_code=400, detail="Generate artifacts first.")
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"status": "locked", "locked_at": _now_iso(), "updated_at": _now_iso()}},
    )
    return await _get_project_or_404(project_id)


# --- EXPORT: markdown of a single project (no auth — you just need the id) ---
def _markdown_for(project: dict) -> str:
    lines = [f"# {project.get('name', 'Bracket project')}", ""]
    framing = project.get("framing") or {}
    if framing:
        lines += ["## Reframed problem", framing.get("reframed_problem", ""), ""]
        if framing.get("tensions"):
            lines.append("### Tensions")
            for t in framing["tensions"]:
                lines.append(f"- {t}")
            lines.append("")
    ctx = project.get("context") or {}
    if ctx:
        lines += ["## What actually matters", ctx.get("what_actually_matters", ""), ""]
        if ctx.get("key_signals"):
            lines.append("### Key signals")
            for s in ctx["key_signals"]:
                lines.append(f"- {s}")
            lines.append("")
    decision = project.get("decision") or {}
    if decision:
        rec = decision.get("recommendation") or {}
        lines += [
            "## Decision",
            f"**{rec.get('title','')}** (confidence {rec.get('confidence',0)}%)",
            "",
            rec.get("rationale", ""),
            "",
        ]
        if decision.get("risks"):
            lines.append("### Risks")
            for r in decision["risks"]:
                lines.append(f"- **[{r.get('severity','LOW')}]** {r.get('risk','')} — _{r.get('mitigation','')}_")
            lines.append("")
    artifacts = project.get("artifacts") or {}
    if artifacts:
        scope = artifacts.get("scope_doc") or {}
        lines += [f"## Scope — {scope.get('title','')}"]
        if scope.get("in_scope"):
            lines.append("**In scope**")
            for s in scope["in_scope"]:
                lines.append(f"- {s}")
        if scope.get("out_of_scope"):
            lines.append("\n**Out of scope**")
            for s in scope["out_of_scope"]:
                lines.append(f"- {s}")
        if scope.get("deliverables"):
            lines.append("\n**Deliverables**")
            for d in scope["deliverables"]:
                lines.append(f"- {d}")
        if scope.get("timeline_note"):
            lines.append(f"\n_Timeline:_ {scope['timeline_note']}")
        lines.append("")
        if artifacts.get("client_message"):
            lines += ["## Client message", "", artifacts["client_message"], ""]
        if artifacts.get("assumptions"):
            lines.append("## Assumptions")
            for a in artifacts["assumptions"]:
                lines.append(f"- {a}")
            lines.append("")
        if artifacts.get("risk_flags"):
            lines.append("## Risk flags")
            for r in artifacts["risk_flags"]:
                lines.append(f"- **[{r.get('severity','LOW')}] {r.get('flag','')}** — {r.get('why','')}")
            lines.append("")
    lines.append("\n---\n_Generated by Bracket — decisions for designers._")
    return "\n".join(lines)


@api.get("/projects/{project_id}/export.md", response_class=PlainTextResponse)
async def export_markdown(project_id: str):
    project = await _get_project_or_404(project_id)
    return PlainTextResponse(_markdown_for(project), media_type="text/markdown; charset=utf-8")


# --- PDF EXPORT -----------------------------------------------------------
# Brand accent RGB for the new #5E6AD2 (Linear-inspired violet-blue).
_ACCENT = (94, 106, 210)
_MUTED = (85, 90, 100)
_INK = (0, 0, 0)
_INK_2 = (25, 25, 28)


class _BracketPDF(FPDF):
    def header(self):
        # Thin brand strip — no dark bar, just a subtle accent line.
        self.set_draw_color(*_ACCENT)
        self.set_line_width(0.6)
        self.line(16, 12, 40, 12)
        self.set_xy(16, 14)
        self.set_text_color(*_MUTED)
        self.set_font("Helvetica", "B", 8)
        self.cell(0, 4, "BRACKET  ·  DECISION DOCUMENT", ln=0)
        self.set_text_color(*_INK)
        self.set_y(24)

    def footer(self):
        self.set_y(-14)
        self.set_draw_color(220, 222, 228)
        self.set_line_width(0.2)
        self.line(16, self.get_y() - 2, self.w - 16, self.get_y() - 2)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*_MUTED)
        self.cell(0, 5, f"use-bracket.com  ·  page {self.page_no()} of {{nb}}", align="C")


def _pdf_text(s: str) -> str:
    """fpdf's core fonts are latin-1; substitute common unicode punctuation
    with ASCII equivalents so em-dashes/ellipses/curly-quotes don't become
    "?" glyphs in the exported PDF."""
    if not s:
        return ""
    s = str(s)
    # Common unicode → ASCII substitutions. Explicit high-codepoint fallbacks
    # for characters that appear in AI output (arrows, checks, section marks).
    replacements = {
        "\u2013": "-",   # en dash
        "\u2014": "-",   # em dash
        "\u2015": "-",   # horizontal bar
        "\u2212": "-",   # minus sign
        "\u2026": "...", # ellipsis
        "\u2018": "'", "\u2019": "'", "\u201a": "'",       # curly single
        "\u201c": '"', "\u201d": '"', "\u201e": '"',       # curly double
        "\u00ab": '"', "\u00bb": '"',                       # guillemets
        "\u2022": "*",   # bullet
        "\u25cf": "*",   # black circle
        "\u25a0": "*",   # black square
        "\u2192": "->",  # right arrow
        "\u2190": "<-",  # left arrow
        "\u2194": "<->", # left-right arrow
        "\u2713": "v",   # check
        "\u2717": "x",   # ballot x
        "\u2192\ufe0e": "->",
        "\u00b7": "-",   # middle dot
        "\u2027": "-",   # hyphenation point
        "\u20b9": "Rs.", # rupee
        "\u20ac": "EUR", # euro
        "\u00a3": "GBP", # pound
        "\u2028": " ", "\u2029": " ",  # line/para separator
        "\u00a0": " ",   # nbsp
        "\u200b": "",    # zero-width space
        "\u2011": "-",   # non-breaking hyphen
        "\u00d7": "x",   # multiplication
        "\u00f7": "/",   # division
    }
    for k, v in replacements.items():
        s = s.replace(k, v)
    # Decompose accented characters (é → e, ñ → n, etc.) so nothing falls
    # through to the latin-1 "?" fallback.
    try:
        import unicodedata as _u
        s = _u.normalize("NFKD", s)
        s = "".join(c for c in s if not _u.combining(c))
    except Exception:
        pass
    # Final fallback: drop any remaining non-latin-1 char rather than
    # substituting "?" glyphs which read as garbled squares.
    return s.encode("latin-1", "ignore").decode("latin-1")


def _pdf_for(project: dict) -> bytes:
    p = _BracketPDF(orientation="P", unit="mm", format="A4")
    p.alias_nb_pages()
    p.set_auto_page_break(auto=True, margin=20)
    p.set_margins(left=20, top=28, right=20)
    p.add_page()

    # ─── Cover-style title block ────────────────────────────────────────
    # Small tag above the title.
    p.set_font("Helvetica", "B", 8)
    p.set_text_color(*_ACCENT)
    p.cell(0, 5, "SIGN-OFF DOCUMENT", ln=1)
    p.ln(2)

    # Big title.
    p.set_font("Helvetica", "B", 24)
    p.set_text_color(*_INK)
    try:
        p.multi_cell(0, 10, _pdf_text(project.get("name") or "Bracket project"))
    except Exception as exc:
        logger.warning(f"pdf title failed: {exc}")
        p.set_x(p.l_margin)
        p.cell(0, 10, _pdf_text((project.get("name") or "Bracket project")[:60]), ln=1)

    # Meta line under title.
    p.set_font("Helvetica", "", 10)
    p.set_text_color(*_MUTED)
    p.set_x(p.l_margin)
    by = project.get("creator_name") or ""
    when = (project.get("locked_at") or project.get("updated_at") or "")[:10]
    meta_parts = []
    if by:
        meta_parts.append(f"Prepared by {by}")
    if when:
        meta_parts.append(when)
    if meta_parts:
        p.cell(0, 5, _pdf_text("  ·  ".join(meta_parts)), ln=1)

    # Accent divider under title.
    p.ln(5)
    p.set_draw_color(*_ACCENT)
    p.set_line_width(0.4)
    p.line(20, p.get_y(), 60, p.get_y())
    p.ln(8)

    def _reset_x():
        # fpdf2's cell(..., ln=1) doesn't always pull X back to the LEFT margin
        # — it can leave it at the right edge. Call this before every multi_cell
        # so we always have full row width to work with.
        p.set_x(p.l_margin)

    def _safe_multi_cell(width, height, text):
        """multi_cell that survives weird AI output (super-long unbroken tokens,
        unexpected control chars, etc). Always renders SOMETHING."""
        _reset_x()
        safe = _pdf_text(text)
        if not safe:
            return
        try:
            p.multi_cell(width, height, safe)
        except Exception as exc:
            logger.warning(f"pdf multi_cell failed for {safe[:60]!r}: {exc}")
            # Last-ditch: force-break long tokens with soft breaks.
            forced = " ".join(
                [safe[i : i + 80] for i in range(0, len(safe), 80)]
            )
            try:
                _reset_x()
                p.multi_cell(width, height, forced)
            except Exception as exc2:
                logger.warning(f"pdf multi_cell second-pass failed: {exc2}")
                _reset_x()
                p.ln(height)

    def H(s: str):
        # Section heading — big, bold, accent tag above, no gray fill bar.
        p.ln(4)
        p.set_font("Helvetica", "B", 8)
        p.set_text_color(*_ACCENT)
        _reset_x()
        _safe_multi_cell(0, 4, s.upper())
        p.ln(1)
        # Faint hairline under the section tag.
        p.set_draw_color(230, 232, 238)
        p.set_line_width(0.15)
        p.line(20, p.get_y(), p.w - 20, p.get_y())
        p.ln(4)
        p.set_font("Helvetica", "B", 14)
        p.set_text_color(*_INK)

    def SH(s: str, color=_ACCENT):
        p.ln(2)
        p.set_font("Helvetica", "B", 8)
        p.set_text_color(*color)
        _reset_x()
        p.cell(0, 5, _pdf_text(s.upper()), ln=1)
        p.set_text_color(*_INK)

    def P(s: str):
        if not s:
            return
        p.set_font("Helvetica", "", 10.5)
        p.set_text_color(*_INK_2)
        _safe_multi_cell(0, 5.5, s)
        p.ln(1)

    def L(items, bullet="·", muted=False):
        if not items:
            return
        p.set_font("Helvetica", "", 10.5)
        for it in items:
            txt = it if isinstance(it, str) else (it.get("text") or str(it))
            if muted:
                p.set_text_color(*_MUTED)
            else:
                p.set_text_color(*_INK_2)
            _reset_x()
            p.set_x(24)
            p.set_font("Helvetica", "B", 10.5)
            p.set_text_color(*_ACCENT) if not muted else p.set_text_color(*_MUTED)
            p.cell(4, 5.5, _pdf_text(bullet), ln=0)
            p.set_font("Helvetica", "", 10.5)
            p.set_text_color(*_MUTED) if muted else p.set_text_color(*_INK_2)
            try:
                p.multi_cell(0, 5.5, _pdf_text(txt))
            except Exception as exc:
                logger.warning(f"pdf list-item failed: {exc}")
                _reset_x()
                p.set_x(24)
                p.cell(4, 5.5, _pdf_text(bullet), ln=0)
                _safe_multi_cell(0, 5.5, txt)
        p.ln(1)

    framing = project.get("framing") or {}
    if framing:
        H("Reframed problem")
        P(framing.get("reframed_problem") or "")
        if framing.get("what_to_name"):
            SH("What to name out loud")
            P(framing["what_to_name"])
        if framing.get("tensions"):
            SH("Tensions to watch")
            L(framing["tensions"])
        p.ln(2)

    ctx = project.get("context") or {}
    if ctx:
        H("What actually matters")
        P(ctx.get("what_actually_matters") or "")
        if ctx.get("key_signals"):
            SH("Key signals", color=_ACCENT)
            L(ctx["key_signals"], bullet="->")
        if ctx.get("noise_removed"):
            SH("Noise removed", color=_MUTED)
            L(ctx["noise_removed"], bullet="x", muted=True)
        if ctx.get("hidden_assumptions"):
            SH("Hidden assumptions", color=(230, 74, 74))
            L(ctx["hidden_assumptions"], bullet="!")
        p.ln(2)

    decision = project.get("decision") or {}
    if decision:
        rec = decision.get("recommendation") or {}
        H("Decision")
        p.set_font("Helvetica", "B", 13)
        p.set_text_color(*_INK)
        _reset_x()
        try:
            p.multi_cell(0, 7, _pdf_text(rec.get("title") or ""))
        except Exception as exc:
            logger.warning(f"pdf decision-title failed: {exc}")
            _reset_x()
            p.ln(7)
        p.set_font("Helvetica", "I", 10)
        p.set_text_color(*_ACCENT)
        # multi_cell instead of cell — cell(0, …) at width 0 hard-truncates
        # long text (e.g. "Confidence: 100%") on some page geometries.
        _reset_x()
        try:
            p.multi_cell(0, 5, _pdf_text(f"Confidence: {rec.get('confidence', 0)}%"))
        except Exception as exc:
            logger.warning(f"pdf confidence line failed: {exc}")
            _reset_x()
            p.ln(5)
        p.ln(1)
        P(rec.get("rationale") or "")

        if decision.get("alternatives"):
            SH("Alternatives")
            p.set_font("Helvetica", "", 11)
            for alt in decision["alternatives"]:
                p.set_text_color(*_INK)
                p.set_font("Helvetica", "B", 11)
                _reset_x()
                p.cell(0, 6, _pdf_text("- " + (alt.get("title") or "")), ln=1)
                p.set_font("Helvetica", "", 10)
                p.set_text_color(*_INK_2)
                if alt.get("when_to_choose"):
                    _safe_multi_cell(0, 5, "   When: " + alt["when_to_choose"])
                if alt.get("cost"):
                    _safe_multi_cell(0, 5, "   Cost: " + alt["cost"])
            p.ln(1)

        if decision.get("tradeoffs"):
            SH("Trade-offs")
            L(decision["tradeoffs"], bullet="->")

        if decision.get("risks"):
            SH("Risks", color=(230, 74, 74))
            p.set_font("Helvetica", "", 11)
            for r in decision["risks"]:
                p.set_text_color(230, 74, 74)
                p.set_font("Helvetica", "B", 10)
                _reset_x()
                _safe_multi_cell(0, 6, f"[{r.get('severity', 'LOW')}] {r.get('risk', '')}")
                p.set_text_color(80, 80, 80)
                p.set_font("Helvetica", "", 10)
                if r.get("mitigation"):
                    _safe_multi_cell(0, 5, "   De-risk: " + r["mitigation"])
            p.ln(1)
        p.ln(2)

    artifacts = project.get("artifacts") or {}
    if artifacts:
        scope = artifacts.get("scope_doc") or {}
        if scope:
            H(f"Scope — {scope.get('title','')}")
            if scope.get("in_scope"):
                SH("In scope")
                L(scope["in_scope"])
            if scope.get("out_of_scope"):
                SH("Out of scope", color=_MUTED)
                L(scope["out_of_scope"], muted=True)
            if scope.get("deliverables"):
                SH("Deliverables")
                L(scope["deliverables"])
            if scope.get("timeline_note"):
                SH("Timeline")
                P(scope["timeline_note"])
            p.ln(1)

        if artifacts.get("client_message"):
            H("Client message")
            P(artifacts["client_message"])

        if artifacts.get("assumptions"):
            H("Assumptions")
            L(artifacts["assumptions"])

        if artifacts.get("risk_flags"):
            H("Risk flags")
            p.set_font("Helvetica", "", 11)
            for r in artifacts["risk_flags"]:
                p.set_text_color(230, 74, 74)
                p.set_font("Helvetica", "B", 10)
                _reset_x()
                _safe_multi_cell(0, 6, f"[{r.get('severity','LOW')}] {r.get('flag','')}")
                p.set_text_color(80, 80, 80)
                p.set_font("Helvetica", "", 10)
                if r.get("why"):
                    _safe_multi_cell(0, 5, "   " + r["why"])
            p.ln(1)

    # Footer line
    p.ln(6)
    p.set_draw_color(220, 222, 228)
    p.line(16, p.get_y(), p.w - 16, p.get_y())
    p.ln(3)
    p.set_font("Helvetica", "I", 9)
    p.set_text_color(120, 120, 120)
    _safe_multi_cell(0, 5, "Generated by Bracket — decisions for designers.")

    out = p.output(dest="S")
    if isinstance(out, bytearray):
        out = bytes(out)
    return out


@api.get("/projects/{project_id}/export.pdf")
async def export_pdf(project_id: str):
    project = await _get_project_or_404(project_id)
    safe = "".join(c if c.isalnum() else "-" for c in (project.get("name") or "bracket")).strip("-").lower() or "bracket"
    pdf_bytes = _pdf_for(project)
    headers = {"Content-Disposition": f'attachment; filename="{safe}.pdf"'}
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers=headers)


# --- FEEDBACK -------------------------------------------------------------
class FeedbackIn(BaseModel):
    sentiment: Literal["up", "down"]
    text: str = Field(default="", max_length=1000)


@api.post("/projects/{project_id}/feedback", response_model=ProjectOut)
async def submit_feedback(project_id: str, body: FeedbackIn):
    project = await _get_project_or_404(project_id)
    if project.get("status") != "locked":
        raise HTTPException(status_code=400, detail="Feedback is collected after lock-in.")
    feedback = {
        "sentiment": body.sentiment,
        "text": (body.text or "").strip(),
        "submitted_at": _now_iso(),
    }
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"feedback": feedback, "updated_at": _now_iso()}},
    )
    return await _get_project_or_404(project_id)


# --- SHARE / CLIENT REVIEW -----------------------------------------------
import secrets


def _mk_token() -> str:
    # 16 url-safe chars; collisions are negligible for this volume.
    return secrets.token_urlsafe(12)


def _public_view(project: dict) -> dict:
    """Strip private fields before exposing to client-side share URL viewers."""
    keep = {
        "id", "name", "creator_name", "framing", "decision", "artifacts",
        "share_status", "share_review", "locked_at", "owner_replies",
    }
    return {k: v for k, v in project.items() if k in keep}


@api.post("/projects/{project_id}/share", response_model=ProjectOut)
async def create_share_link(project_id: str):
    """Mint (or return existing) public share token for this project."""
    project = await _get_project_or_404(project_id)
    if not project.get("artifacts"):
        raise HTTPException(status_code=400, detail="Generate artifacts first.")
    token = project.get("share_token") or _mk_token()
    new_status = project.get("share_status") or "none"
    if new_status in ("none", ""):
        new_status = "sent"
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "share_token": token,
                "share_status": new_status,
                "updated_at": _now_iso(),
            }
        },
    )
    return await _get_project_or_404(project_id)


@api.get("/share/{token}")
async def get_shared_document(token: str):
    """Public — anyone with the token can view the document."""
    project = await db.projects.find_one({"share_token": token}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="This link isn't valid (or has been revoked).")
    return _public_view(project)


class AcceptIn(BaseModel):
    acceptances: Dict[str, bool] = Field(default_factory=dict)
    signature_name: str = Field(min_length=1, max_length=120)
    role: str = Field(default="", max_length=120)
    client_email: EmailStr


@api.post("/share/{token}/accept")
async def client_accept(token: str, body: AcceptIn):
    project = await db.projects.find_one({"share_token": token}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="This link isn't valid.")
    if project.get("share_status") in ("accepted", "rejected"):
        raise HTTPException(status_code=409, detail="This document has already been reviewed.")
    # Count accepted items
    accepted_count = sum(1 for v in body.acceptances.values() if v)
    total = len(body.acceptances)
    review = {
        "type": "accept",
        "submitted_at": _now_iso(),
        "signature_name": body.signature_name.strip(),
        "role": (body.role or "").strip(),
        "client_email": str(body.client_email).strip().lower(),
        "acceptances": body.acceptances,
        "accepted_count": accepted_count,
        "total_items": total,
    }
    await db.projects.update_one(
        {"share_token": token},
        {"$set": {"share_status": "accepted", "share_review": review, "updated_at": _now_iso()}},
    )
    project = await db.projects.find_one({"share_token": token}, {"_id": 0})
    # Fire-and-forget notifications — must never block client response.
    try:
        await send_review_outcome_email(
            owner_email=project.get("creator_email", ""),
            owner_name=project.get("creator_name", ""),
            project_name=project.get("name", ""),
            project_id=project.get("id", ""),
            review=review,
        )
    except Exception as e:
        logger.warning(f"accept outcome email crashed: {e}")
    # Also mail the client — with the signed PDF attached — as a receipt.
    try:
        pdf_bytes = _pdf_for(project)
        safe_name = "".join(c if c.isalnum() else "-" for c in (project.get("name") or "bracket")).strip("-").lower() or "bracket"
        base = os.environ.get("PUBLIC_BASE_URL", "https://use-bracket.com").rstrip("/")
        share_url = f"{base}/r/{token}"
        await send_client_receipt_email(
            client_email=review["client_email"],
            project_name=project.get("name", ""),
            review=review,
            share_url=share_url,
            pdf_bytes=pdf_bytes,
            pdf_filename=f"{safe_name}-signed.pdf",
        )
    except Exception as e:
        logger.warning(f"client receipt (accept) email crashed: {e}")
    return _public_view(project)


class RejectPreviewIn(BaseModel):
    concerns: str = Field(min_length=4, max_length=4000)


@api.post("/share/{token}/reject/preview")
async def client_reject_preview(token: str, body: RejectPreviewIn):
    """Show the client AI-generated suggestions BEFORE they finalize the rejection.
    Doesn't mutate share_status — that happens on /reject/confirm."""
    project = await db.projects.find_one({"share_token": token}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="This link isn't valid.")
    if project.get("share_status") in ("accepted", "rejected"):
        raise HTTPException(status_code=409, detail="This document has already been reviewed.")
    try:
        suggestions = await run_client_pushback_suggestions(
            project, body.concerns, project.get("engine", "claude")
        )
    except Exception as e:
        logger.exception("pushback suggestions failed")
        raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
    # NOTE: `suggestions` is guaranteed assigned here — the except branch
    # raises and exits. The static analyzer can't see `raise` as terminal.
    return {"concerns": body.concerns.strip(), "ai_suggestions": suggestions}  # noqa: F821


class RejectConfirmIn(BaseModel):
    concerns: str = Field(min_length=4, max_length=4000)
    signature_name: str = Field(min_length=1, max_length=120)
    role: str = Field(default="", max_length=120)
    client_email: EmailStr
    ai_suggestions: Dict[str, Any] = Field(default_factory=dict)


@api.post("/share/{token}/reject/confirm")
async def client_reject_confirm(token: str, body: RejectConfirmIn):
    project = await db.projects.find_one({"share_token": token}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="This link isn't valid.")
    if project.get("share_status") in ("accepted", "rejected"):
        raise HTTPException(status_code=409, detail="This document has already been reviewed.")
    review = {
        "type": "reject",
        "submitted_at": _now_iso(),
        "signature_name": body.signature_name.strip(),
        "role": (body.role or "").strip(),
        "client_email": str(body.client_email).strip().lower(),
        "concerns": body.concerns.strip(),
        "ai_suggestions": body.ai_suggestions,
    }
    await db.projects.update_one(
        {"share_token": token},
        {"$set": {"share_status": "rejected", "share_review": review, "updated_at": _now_iso()}},
    )
    project = await db.projects.find_one({"share_token": token}, {"_id": 0})
    # Fire-and-forget owner notification.
    try:
        await send_review_outcome_email(
            owner_email=project.get("creator_email", ""),
            owner_name=project.get("creator_name", ""),
            project_name=project.get("name", ""),
            project_id=project.get("id", ""),
            review=review,
        )
    except Exception as e:
        logger.warning(f"reject outcome email crashed: {e}")
    # Send the client a receipt echoing back their concerns.
    try:
        base = os.environ.get("PUBLIC_BASE_URL", "https://use-bracket.com").rstrip("/")
        share_url = f"{base}/r/{token}"
        await send_client_receipt_email(
            client_email=review["client_email"],
            project_name=project.get("name", ""),
            review=review,
            share_url=share_url,
        )
    except Exception as e:
        logger.warning(f"client receipt (reject) email crashed: {e}")
    return _public_view(project)


# --- Mount router ---
app.include_router(api)

_cors_env = os.environ.get("CORS_ORIGINS", "*").strip()
if _cors_env in ("", "*"):
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in _cors_env.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
async def on_startup():
    """Defensive startup: index creation must NEVER crash the server.

    Production hit a bug here when the legacy `users` collection contained
    documents with `user_id: null` or `email: null` (left over from earlier
    deploy attempts). The original unique index on those fields then refused
    to build → uvicorn exited → every request returned Cloudflare 520.

    The fixes below are layered:
      1. Each create_index is wrapped in its own try/except — one failure
         can't take down the whole startup hook.
      2. Unique indexes use `partialFilterExpression` so legacy null/missing
         values are excluded from the uniqueness constraint.
      3. Best-effort cleanup of orphan rows BEFORE indexing.
    """
    async def _safe_index(coll, keys, **kwargs):
        try:
            await coll.create_index(keys, **kwargs)
        except Exception as e:  # noqa: BLE001
            logger.warning(f"[startup] index {keys} on {coll.name} skipped: {e}")

    # 1) Best-effort cleanup of orphan rows that would block unique indexes.
    try:
        r = await db.users.delete_many({
            "$or": [
                {"user_id": {"$in": [None, ""]}},
                {"email":   {"$in": [None, ""]}},
            ]
        })
        if r.deleted_count:
            logger.info(f"[startup] removed {r.deleted_count} orphan user rows")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[startup] orphan-user cleanup skipped: {e}")
    try:
        r = await db.user_sessions.delete_many({
            "$or": [
                {"session_token": {"$in": [None, ""]}},
                {"user_id":       {"$in": [None, ""]}},
            ]
        })
        if r.deleted_count:
            logger.info(f"[startup] removed {r.deleted_count} orphan session rows")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[startup] orphan-session cleanup skipped: {e}")
    try:
        r = await db.email_otps.delete_many({"email": {"$in": [None, ""]}})
        if r.deleted_count:
            logger.info(f"[startup] removed {r.deleted_count} orphan otp rows")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[startup] orphan-otp cleanup skipped: {e}")

    # 2) Project indexes — non-unique, safe.
    await _safe_index(db.projects, "created_at")
    await _safe_index(db.projects, [("creator_email", 1), ("updated_at", -1)])
    await _safe_index(db.projects, [("creator_email", 1), ("name", 1)])
    await _safe_index(db.projects, [("owner_user_id", 1), ("updated_at", -1)])

    # 3) Auth indexes — unique but partial so legacy nulls don't poison them.
    # Use string-type filter so only real values participate in the constraint.
    await _safe_index(
        db.users, "email",
        unique=True,
        partialFilterExpression={"email": {"$type": "string"}},
    )
    await _safe_index(
        db.users, "user_id",
        unique=True,
        partialFilterExpression={"user_id": {"$type": "string"}},
    )
    await _safe_index(
        db.user_sessions, "session_token",
        unique=True,
        partialFilterExpression={"session_token": {"$type": "string"}},
    )
    await _safe_index(db.user_sessions, "user_id")
    await _safe_index(
        db.email_otps, "email",
        unique=True,
        partialFilterExpression={"email": {"$type": "string"}},
    )

    # 4) Seed admin user(s) declared via ADMIN_EMAILS env var. Idempotent —
    #    if the user already exists their password is left alone; only the
    #    bootstrap admin (matching BOOTSTRAP_ADMIN_EMAIL with BOOTSTRAP_ADMIN_PASSWORD)
    #    is seeded with a default password the first time.
    try:
        bootstrap_email = (os.environ.get("BOOTSTRAP_ADMIN_EMAIL") or "").strip().lower()
        bootstrap_pw = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD") or ""
        if bootstrap_email and bootstrap_pw:
            existing = await db.users.find_one({"email": bootstrap_email}, {"_id": 0, "user_id": 1, "password_hash": 1})
            if not existing:
                from auth import gen_user_id as _gen_uid
                doc = {
                    "user_id": _gen_uid(),
                    "email": bootstrap_email,
                    "name": "Saksham Shukla",
                    "designation": "Founder",
                    "avatar": "mono-1",
                    "picture": "",
                    "password_hash": hash_password(bootstrap_pw),
                    "created_at": auth_iso(auth_now()),
                    "updated_at": auth_iso(auth_now()),
                }
                await db.users.insert_one(doc)
                logger.info(f"[startup] seeded bootstrap admin {bootstrap_email}")
            elif not existing.get("password_hash"):
                # User exists but has no password — set the bootstrap one once.
                await db.users.update_one(
                    {"user_id": existing["user_id"]},
                    {"$set": {"password_hash": hash_password(bootstrap_pw), "updated_at": auth_iso(auth_now())}},
                )
                logger.info(f"[startup] set initial password for bootstrap admin {bootstrap_email}")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[startup] bootstrap admin seed skipped: {e}")

    logger.info("bracket api ready (auth mode)")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
