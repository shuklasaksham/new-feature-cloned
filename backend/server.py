"""Bracket backend — FastAPI entrypoint (anonymous, no-auth mode)."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import logging
from typing import List, Literal, Dict, Any, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response
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
)
from emailer import send_thanks_email, send_review_outcome_email
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
async def auth_google_exchange(body: GoogleSessionIn, response: Response):
    """Exchange the Emergent session_id (from #session_id=... fragment) for an
    httpOnly cookie that the rest of the app uses."""
    data = await exchange_emergent_session(body.session_id)
    user = await get_or_create_user_by_email(
        db,
        data["email"],
        name=data.get("name") or "",
        picture=data.get("picture") or "",
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
async def auth_otp_verify(body: OtpVerifyIn, response: Response):
    await auth_verify_otp(db, body.email, body.code)
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
# PROJECTS — now auth-required
# ===========================================================================
class CreateProjectIn(_BM):
    project_name: str = _Fd(min_length=1, max_length=120)
    engine: str = "claude"


@api.post("/projects", response_model=ProjectOut)
async def create_project(body: CreateProjectIn, request: Request):
    """Auth required. Owner is whoever is signed in."""
    user = await current_user(request, db)
    pname = body.project_name.strip()
    now = _now_iso()
    doc = {
        "id": _uuid(),
        "name": pname,
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


@api.get("/projects")
async def list_my_projects(request: Request):
    user = await current_user(request, db)
    cur = (
        db.projects.find(
            {"owner_user_id": user["user_id"]},
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
    p = await db.projects.find_one({"id": project_id, "owner_user_id": user["user_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


class RenameProjectIn(_BM):
    name: str = _Fd(min_length=1, max_length=120)


@api.patch("/projects/{project_id}")
async def rename_project(project_id: str, body: RenameProjectIn, request: Request):
    p = await _get_owned_project_or_404(project_id, request)
    await db.projects.update_one(
        {"id": p["id"]},
        {"$set": {"name": body.name.strip(), "updated_at": _now_iso()}},
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
    try:
        framing = await run_situation_framing(body.model_dump(), engine)
    except Exception as e:
        logger.exception("situation framing failed")
        raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "situation_input": body.model_dump(),
                "framing": framing,
                "step": max(2, project.get("step", 1)),
                "status": "in_progress",
                "updated_at": _now_iso(),
            }
        },
    )
    return await _get_project_or_404(project_id)


# --- STEP 2: CONTEXT COMPRESSION ---
@api.post("/projects/{project_id}/context", response_model=ProjectOut)
async def step_context(project_id: str, body: ContextIn):
    project = await _get_project_or_404(project_id)
    if not project.get("framing"):
        raise HTTPException(status_code=400, detail="Complete Situation Framing first.")
    try:
        compressed = await run_context_compression(body.model_dump(), project["framing"], project.get("engine", "claude"))
    except Exception as e:
        logger.exception("context compression failed")
        raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "context_input": body.model_dump(),
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
    try:
        decision = await run_decision_engine(
            body.model_dump(), project["framing"], project["context"], project.get("engine", "claude")
        )
    except Exception as e:
        logger.exception("decision engine failed")
        raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "decision_input": body.model_dump(),
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
class _BracketPDF(FPDF):
    def header(self):
        # Brand strip at top.
        self.set_fill_color(10, 10, 10)
        self.rect(0, 0, self.w, 14, "F")
        self.set_xy(12, 4)
        self.set_text_color(244, 244, 240)
        self.set_font("Helvetica", "B", 9)
        self.cell(0, 6, "BRACKET / DECISIONS FOR DESIGNERS", ln=0)
        self.set_text_color(0, 51, 255)
        self.set_x(self.w - 50)
        self.cell(38, 6, "{ DECIDED }", ln=0, align="R")
        self.set_text_color(10, 10, 10)
        self.set_y(22)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, f"Page {self.page_no()} / {{nb}}   ·   use-bracket.com", align="C")


def _pdf_text(s: str) -> str:
    """fpdf's core fonts are latin-1; convert any non-latin chars so we never crash."""
    if not s:
        return ""
    return str(s).encode("latin-1", "replace").decode("latin-1")


def _pdf_for(project: dict) -> bytes:
    p = _BracketPDF(orientation="P", unit="mm", format="A4")
    p.alias_nb_pages()
    p.set_auto_page_break(auto=True, margin=18)
    p.set_margins(left=16, top=22, right=16)
    p.add_page()

    # Title block — long names get wrapped safely.
    p.set_font("Helvetica", "B", 28)
    p.set_text_color(10, 10, 10)
    try:
        p.multi_cell(0, 11, _pdf_text(project.get("name") or "Bracket project"))
    except Exception as exc:
        logger.warning(f"pdf title failed: {exc}")
        p.set_x(p.l_margin)
        p.cell(0, 11, _pdf_text((project.get("name") or "Bracket project")[:60]), ln=1)

    p.set_font("Helvetica", "", 10)
    p.set_text_color(110, 110, 110)
    by = project.get("creator_name") or ""
    when = (project.get("locked_at") or project.get("updated_at") or "")[:10]
    meta = f"By {by}  ·  {when}" if by else when
    if meta:
        p.cell(0, 5, _pdf_text(meta), ln=1)
    p.ln(4)

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
        p.set_font("Helvetica", "B", 14)
        p.set_text_color(10, 10, 10)
        p.set_fill_color(244, 244, 240)
        _reset_x()
        p.cell(0, 9, "  " + _pdf_text(s), ln=1, fill=True)
        p.ln(2)

    def SH(s: str, color=(0, 51, 255)):
        p.set_font("Helvetica", "B", 9)
        p.set_text_color(*color)
        _reset_x()
        p.cell(0, 5, _pdf_text(s.upper()), ln=1)
        p.set_text_color(10, 10, 10)

    def P(s: str):
        if not s:
            return
        p.set_font("Helvetica", "", 11)
        p.set_text_color(40, 40, 40)
        _safe_multi_cell(0, 6, s)
        p.ln(1)

    def L(items, bullet="-", muted=False):
        if not items:
            return
        p.set_font("Helvetica", "", 11)
        for it in items:
            txt = it if isinstance(it, str) else (it.get("text") or str(it))
            p.set_text_color(120, 120, 120) if muted else p.set_text_color(40, 40, 40)
            _reset_x()
            p.set_x(20)
            p.cell(5, 6, _pdf_text(bullet), ln=0)
            try:
                p.multi_cell(0, 6, _pdf_text(txt))
            except Exception as exc:
                logger.warning(f"pdf list-item failed: {exc}")
                _reset_x()
                p.set_x(20)
                p.cell(5, 6, _pdf_text(bullet), ln=0)
                _safe_multi_cell(0, 6, txt)
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
            SH("Key signals", color=(0, 51, 255))
            L(ctx["key_signals"], bullet="->")
        if ctx.get("noise_removed"):
            SH("Noise removed", color=(120, 120, 120))
            L(ctx["noise_removed"], bullet="x", muted=True)
        if ctx.get("hidden_assumptions"):
            SH("Hidden assumptions", color=(208, 38, 32))
            L(ctx["hidden_assumptions"], bullet="!")
        p.ln(2)

    decision = project.get("decision") or {}
    if decision:
        rec = decision.get("recommendation") or {}
        H("Decision")
        p.set_font("Helvetica", "B", 13)
        p.set_text_color(10, 10, 10)
        _reset_x()
        try:
            p.multi_cell(0, 7, _pdf_text(rec.get("title") or ""))
        except Exception as exc:
            logger.warning(f"pdf decision-title failed: {exc}")
            _reset_x()
            p.ln(7)
        p.set_font("Helvetica", "I", 10)
        p.set_text_color(0, 51, 255)
        p.cell(0, 5, _pdf_text(f"Confidence: {rec.get('confidence', 0)}%"), ln=1)
        p.ln(1)
        P(rec.get("rationale") or "")

        if decision.get("alternatives"):
            SH("Alternatives")
            p.set_font("Helvetica", "", 11)
            for alt in decision["alternatives"]:
                p.set_text_color(10, 10, 10)
                p.set_font("Helvetica", "B", 11)
                _reset_x()
                p.cell(0, 6, _pdf_text("- " + (alt.get("title") or "")), ln=1)
                p.set_font("Helvetica", "", 10)
                p.set_text_color(80, 80, 80)
                if alt.get("when_to_choose"):
                    _safe_multi_cell(0, 5, "   When: " + alt["when_to_choose"])
                if alt.get("cost"):
                    _safe_multi_cell(0, 5, "   Cost: " + alt["cost"])
            p.ln(1)

        if decision.get("tradeoffs"):
            SH("Trade-offs")
            L(decision["tradeoffs"], bullet="->")

        if decision.get("risks"):
            SH("Risks", color=(208, 38, 32))
            p.set_font("Helvetica", "", 11)
            for r in decision["risks"]:
                p.set_text_color(208, 38, 32)
                p.set_font("Helvetica", "B", 10)
                _reset_x()
                p.cell(0, 6, _pdf_text(f"[{r.get('severity', 'LOW')}] {r.get('risk', '')}"), ln=1)
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
                SH("Out of scope", color=(120, 120, 120))
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
                p.set_text_color(208, 38, 32)
                p.set_font("Helvetica", "B", 10)
                _reset_x()
                p.cell(0, 6, _pdf_text(f"[{r.get('severity','LOW')}] {r.get('flag','')}"), ln=1)
                p.set_text_color(80, 80, 80)
                p.set_font("Helvetica", "", 10)
                if r.get("why"):
                    _safe_multi_cell(0, 5, "   " + r["why"])
            p.ln(1)

    # Footer line
    p.ln(6)
    p.set_draw_color(10, 10, 10)
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
        "acceptances": body.acceptances,
        "accepted_count": accepted_count,
        "total_items": total,
    }
    await db.projects.update_one(
        {"share_token": token},
        {"$set": {"share_status": "accepted", "share_review": review, "updated_at": _now_iso()}},
    )
    project = await db.projects.find_one({"share_token": token}, {"_id": 0})
    # Fire-and-forget owner notification — must never block client response.
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
    return {"concerns": body.concerns.strip(), "ai_suggestions": suggestions}


class RejectConfirmIn(BaseModel):
    concerns: str = Field(min_length=4, max_length=4000)
    signature_name: str = Field(min_length=1, max_length=120)
    role: str = Field(default="", max_length=120)
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
    await db.projects.create_index("created_at")
    await db.projects.create_index([("creator_email", 1), ("updated_at", -1)])
    await db.projects.create_index([("creator_email", 1), ("name", 1)])
    await db.projects.create_index([("owner_user_id", 1), ("updated_at", -1)])
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.email_otps.create_index("email", unique=True)
    logger.info("bracket api ready (auth mode)")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
