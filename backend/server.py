"""Bracket backend — FastAPI entrypoint."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from models import (
    SignupIn,
    LoginIn,
    UserOut,
    AuthResponse,
    OnboardingIn,
    ProjectCreateIn,
    ProjectOut,
    SituationIn,
    ContextIn,
    DecisionIn,
    _uuid,
    _now_iso,
)
from pydantic import BaseModel, EmailStr
from typing import Optional as _Optional


class WaitlistIn(BaseModel):
    email: EmailStr
    name: _Optional[str] = ""
    role: _Optional[str] = "other"
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from ai_engine import (
    run_situation_framing,
    run_context_compression,
    run_decision_engine,
    run_artifacts,
)
from routes_features import build_feature_router
from routes_billing import build_billing_router
from emailer import send_waitlist_welcome


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger("bracket")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Bracket API")
api = APIRouter(prefix="/api")


# --- helpers ---
async def _user_dep(request: Request):
    return await get_current_user(request, db)


def _set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


# --- health ---
@api.get("/")
async def root():
    return {"service": "bracket", "status": "ok"}


# --- WAITLIST ---
@api.post("/waitlist")
async def join_waitlist(body: WaitlistIn):
    email = body.email.lower().strip()
    existing = await db.waitlist.find_one({"email": email}, {"_id": 0})
    if existing:
        # Already registered — surface this as a friendly error to the UI.
        raise HTTPException(
            status_code=409,
            detail="You're already on the waitlist. We'll be in touch soon.",
        )
    count = await db.waitlist.count_documents({})
    position = count + 1
    name = (body.name or "").strip()
    doc = {
        "id": _uuid(),
        "email": email,
        "name": name,
        "role": body.role or "other",
        "position": position,
        "welcomed": False,
        "created_at": _now_iso(),
    }
    await db.waitlist.insert_one(doc)
    # Fire-and-forget welcome email; never block the response on it.
    try:
        sent = await send_waitlist_welcome(email, name, position)
        if sent:
            await db.waitlist.update_one({"email": email}, {"$set": {"welcomed": True}})
    except Exception as e:
        logger.warning(f"waitlist welcome email crashed: {e}")
    return {"ok": True, "already": False, "position": position}


@api.get("/waitlist/count")
async def waitlist_count():
    count = await db.waitlist.count_documents({})
    return {"count": count}


# --- AUTH ---
@api.post("/auth/register", response_model=AuthResponse)
async def register(body: SignupIn, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    user_id = _uuid()
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name or email.split("@")[0],
        "password_hash": hash_password(body.password),
        "created_at": _now_iso(),
        "onboarded": False,
        "work_type": None,
        "struggle": None,
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    _set_auth_cookie(response, token)
    user_out = {k: v for k, v in doc.items() if k != "password_hash"}
    return {"user": user_out, "token": token}


@api.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user["id"], email)
    _set_auth_cookie(response, token)
    user.pop("_id", None)
    user.pop("password_hash", None)
    return {"user": user, "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(_user_dep)):
    return user


# --- ONBOARDING ---
@api.post("/onboarding", response_model=UserOut)
async def save_onboarding(body: OnboardingIn, user: dict = Depends(_user_dep)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"work_type": body.work_type, "struggle": body.struggle, "onboarded": True}},
    )
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


# --- PROJECTS ---
@api.get("/projects", response_model=List[ProjectOut])
async def list_projects(user: dict = Depends(_user_dep)):
    rows = await db.projects.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return rows


@api.post("/projects", response_model=ProjectOut)
async def create_project(body: ProjectCreateIn, user: dict = Depends(_user_dep)):
    now = _now_iso()
    doc = {
        "id": _uuid(),
        "user_id": user["id"],
        "workspace_id": None,
        "name": body.name,
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
        "simulation": None,
        "share_token": None,
        "revision_count": 0,
        "locked_at": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def _get_project_or_404(project_id: str, user_id: str) -> dict:
    project = await db.projects.find_one({"id": project_id, "user_id": user_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@api.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, user: dict = Depends(_user_dep)):
    return await _get_project_or_404(project_id, user["id"])


@api.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(_user_dep)):
    await db.projects.delete_one({"id": project_id, "user_id": user["id"]})
    return {"ok": True}


# --- STEP 1: SITUATION FRAMING ---
@api.post("/projects/{project_id}/situation", response_model=ProjectOut)
async def step_situation(project_id: str, body: SituationIn, user: dict = Depends(_user_dep)):
    project = await _get_project_or_404(project_id, user["id"])
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
    return await _get_project_or_404(project_id, user["id"])


# --- STEP 2: CONTEXT COMPRESSION ---
@api.post("/projects/{project_id}/context", response_model=ProjectOut)
async def step_context(project_id: str, body: ContextIn, user: dict = Depends(_user_dep)):
    project = await _get_project_or_404(project_id, user["id"])
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
    return await _get_project_or_404(project_id, user["id"])


# --- STEP 3: DECISION ENGINE ---
@api.post("/projects/{project_id}/decision", response_model=ProjectOut)
async def step_decision(project_id: str, body: DecisionIn, user: dict = Depends(_user_dep)):
    project = await _get_project_or_404(project_id, user["id"])
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
    return await _get_project_or_404(project_id, user["id"])


# --- STEP 4: ARTIFACTS ---
@api.post("/projects/{project_id}/artifacts", response_model=ProjectOut)
async def step_artifacts(project_id: str, user: dict = Depends(_user_dep)):
    project = await _get_project_or_404(project_id, user["id"])
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
    return await _get_project_or_404(project_id, user["id"])


# --- STEP 5: CONFIDENCE LOCK-IN ---
@api.post("/projects/{project_id}/lock", response_model=ProjectOut)
async def step_lock(project_id: str, user: dict = Depends(_user_dep)):
    project = await _get_project_or_404(project_id, user["id"])
    if not project.get("artifacts"):
        raise HTTPException(status_code=400, detail="Generate artifacts first.")
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"status": "locked", "locked_at": _now_iso(), "updated_at": _now_iso()}},
    )
    return await _get_project_or_404(project_id, user["id"])


# --- Mount router ---
app.include_router(api)
app.include_router(build_feature_router(db), prefix="/api")
app.include_router(build_billing_router(db), prefix="/api")

_cors_env = os.environ.get("CORS_ORIGINS", "*").strip()
if _cors_env in ("", "*"):
    # Credentialed CORS requires explicit origins (or a regex). A wildcard
    # works for simple requests but browsers reject credentialed responses.
    # Use a permissive regex that still lets browsers accept credentialed responses.
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
    await db.users.create_index("email", unique=True)
    await db.projects.create_index([("user_id", 1), ("updated_at", -1)])
    logger.info("bracket api ready")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
