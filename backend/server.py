"""Bracket backend — FastAPI entrypoint (anonymous, no-auth mode)."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

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
)
from emailer import send_thanks_email


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


# --- PROJECTS ---
@api.post("/projects", response_model=ProjectOut)
async def create_project(body: ProjectStartIn):
    """Anyone can start a project. We capture name+email silently and fire a
    'thanks for trying' email via Resend. No auth required."""
    now = _now_iso()
    doc = {
        "id": _uuid(),
        "name": body.project_name.strip(),
        "creator_name": (body.name or "").strip(),
        "creator_email": body.email.lower().strip(),
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
        "created_at": now,
        "updated_at": now,
    }
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    # Fire-and-forget thanks email; never block on it.
    try:
        await send_thanks_email(doc["creator_email"], doc["creator_name"], doc["name"])
    except Exception as e:
        logger.warning(f"thanks email crashed: {e}")
    return doc


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
    logger.info("bracket api ready (anonymous mode)")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
