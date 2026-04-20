"""Feature routes: shareable links, exports, moments, templates, workspaces,
revisions, pushback simulator. Mounted under /api.
"""
import os
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from models import (
    MomentIn,
    MomentOut,
    TemplateIn,
    TemplateOut,
    WorkspaceIn,
    WorkspaceInvite,
    WorkspaceOut,
    ProjectOut,
    RevisionOut,
    EditAfterLockIn,
    _uuid,
    _now_iso,
)
from auth import get_current_user
from ai_engine import run_moment_advisor, run_pushback_simulator


def build_feature_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter()

    async def user_dep(request: Request):
        return await get_current_user(request, db)

    async def _get_project(project_id: str, user_id: str):
        p = await db.projects.find_one({"id": project_id, "user_id": user_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=404, detail="Project not found")
        return p

    # -------- SHARE LINKS --------
    @router.post("/projects/{project_id}/share", response_model=ProjectOut)
    async def create_share_link(project_id: str, user: dict = Depends(user_dep)):
        project = await _get_project(project_id, user["id"])
        if not project.get("artifacts"):
            raise HTTPException(status_code=400, detail="Generate artifacts before sharing.")
        token = project.get("share_token") or secrets.token_urlsafe(16)
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"share_token": token, "updated_at": _now_iso()}},
        )
        return await _get_project(project_id, user["id"])

    @router.delete("/projects/{project_id}/share")
    async def revoke_share(project_id: str, user: dict = Depends(user_dep)):
        await _get_project(project_id, user["id"])
        await db.projects.update_one({"id": project_id}, {"$set": {"share_token": None}})
        return {"ok": True}

    @router.get("/public/projects/{share_token}")
    async def public_project(share_token: str):
        project = await db.projects.find_one(
            {"share_token": share_token}, {"_id": 0, "user_id": 0}
        )
        if not project:
            raise HTTPException(status_code=404, detail="Not found or revoked.")
        # Only surface public-safe fields
        return {
            "name": project.get("name"),
            "status": project.get("status"),
            "framing": project.get("framing"),
            "decision": project.get("decision"),
            "artifacts": project.get("artifacts"),
            "locked_at": project.get("locked_at"),
        }

    # -------- EXPORT --------
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

    @router.get("/projects/{project_id}/export.md", response_class=PlainTextResponse)
    async def export_markdown(project_id: str, user: dict = Depends(user_dep)):
        project = await _get_project(project_id, user["id"])
        return PlainTextResponse(_markdown_for(project), media_type="text/markdown; charset=utf-8")

    @router.get("/public/projects/{share_token}/export.md", response_class=PlainTextResponse)
    async def export_markdown_public(share_token: str):
        project = await db.projects.find_one({"share_token": share_token}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Not found or revoked.")
        return PlainTextResponse(_markdown_for(project), media_type="text/markdown; charset=utf-8")

    # -------- MOMENT ADVISOR --------
    @router.post("/moments", response_model=MomentOut)
    async def create_moment(body: MomentIn, user: dict = Depends(user_dep)):
        try:
            output = await run_moment_advisor(body.model_dump(), body.engine if body.engine in ("claude", "gpt") else "claude")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
        doc = {
            "id": _uuid(),
            "user_id": user["id"],
            "moment": body.moment,
            "context": body.context or "",
            "engine": body.engine,
            "output": output,
            "created_at": _now_iso(),
        }
        await db.moments.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.get("/moments", response_model=List[MomentOut])
    async def list_moments(user: dict = Depends(user_dep)):
        rows = await db.moments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return rows

    @router.delete("/moments/{moment_id}")
    async def delete_moment(moment_id: str, user: dict = Depends(user_dep)):
        await db.moments.delete_one({"id": moment_id, "user_id": user["id"]})
        return {"ok": True}

    # -------- SIMULATOR --------
    @router.post("/projects/{project_id}/simulate", response_model=ProjectOut)
    async def simulate(project_id: str, user: dict = Depends(user_dep)):
        project = await _get_project(project_id, user["id"])
        if not project.get("decision"):
            raise HTTPException(status_code=400, detail="Need a decision before simulating pushback.")
        try:
            sim = await run_pushback_simulator(project, project.get("engine", "claude"))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI engine error: {e}")
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"simulation": sim, "updated_at": _now_iso()}},
        )
        return await _get_project(project_id, user["id"])

    # -------- TEMPLATES --------
    @router.post("/templates", response_model=TemplateOut)
    async def create_template(body: TemplateIn, user: dict = Depends(user_dep)):
        payload = {
            "id": _uuid(),
            "user_id": user["id"],
            "name": body.name,
            "description": body.description or "",
            "situation_input": None,
            "context_input": None,
            "decision_input": None,
            "created_at": _now_iso(),
        }
        if body.from_project_id:
            p = await _get_project(body.from_project_id, user["id"])
            payload["situation_input"] = p.get("situation_input")
            payload["context_input"] = p.get("context_input")
            payload["decision_input"] = p.get("decision_input")
        await db.templates.insert_one(payload)
        payload.pop("_id", None)
        return payload

    @router.get("/templates", response_model=List[TemplateOut])
    async def list_templates(user: dict = Depends(user_dep)):
        rows = await db.templates.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return rows

    @router.delete("/templates/{template_id}")
    async def delete_template(template_id: str, user: dict = Depends(user_dep)):
        await db.templates.delete_one({"id": template_id, "user_id": user["id"]})
        return {"ok": True}

    @router.post("/templates/{template_id}/apply", response_model=ProjectOut)
    async def apply_template(template_id: str, user: dict = Depends(user_dep)):
        tpl = await db.templates.find_one({"id": template_id, "user_id": user["id"]}, {"_id": 0})
        if not tpl:
            raise HTTPException(status_code=404, detail="Template not found")
        now = _now_iso()
        doc = {
            "id": _uuid(),
            "user_id": user["id"],
            "name": f"{tpl['name']} · new",
            "engine": "claude",
            "status": "draft",
            "step": 1,
            "situation_input": tpl.get("situation_input"),
            "framing": None,
            "context_input": tpl.get("context_input"),
            "context": None,
            "decision_input": tpl.get("decision_input"),
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

    # -------- WORKSPACES --------
    @router.post("/workspaces", response_model=WorkspaceOut)
    async def create_workspace(body: WorkspaceIn, user: dict = Depends(user_dep)):
        existing = await db.workspaces.find_one({"owner_id": user["id"]})
        if existing:
            existing.pop("_id", None)
            return existing
        ws = {
            "id": _uuid(),
            "owner_id": user["id"],
            "name": body.name,
            "member_emails": [user["email"]],
            "created_at": _now_iso(),
        }
        await db.workspaces.insert_one(ws)
        ws.pop("_id", None)
        return ws

    @router.get("/workspaces/mine", response_model=Optional[WorkspaceOut])
    async def my_workspace(user: dict = Depends(user_dep)):
        # Look up a workspace that owner or member.
        ws = await db.workspaces.find_one(
            {"$or": [{"owner_id": user["id"]}, {"member_emails": user["email"]}]},
            {"_id": 0},
        )
        return ws

    @router.post("/workspaces/{workspace_id}/invite", response_model=WorkspaceOut)
    async def invite_member(workspace_id: str, body: WorkspaceInvite, user: dict = Depends(user_dep)):
        ws = await db.workspaces.find_one({"id": workspace_id, "owner_id": user["id"]}, {"_id": 0})
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found or not owned by you.")
        email = body.email.lower().strip()
        if email not in ws["member_emails"]:
            ws["member_emails"].append(email)
            await db.workspaces.update_one({"id": workspace_id}, {"$set": {"member_emails": ws["member_emails"]}})
        return ws

    @router.delete("/workspaces/{workspace_id}/members/{email}", response_model=WorkspaceOut)
    async def remove_member(workspace_id: str, email: str, user: dict = Depends(user_dep)):
        ws = await db.workspaces.find_one({"id": workspace_id, "owner_id": user["id"]}, {"_id": 0})
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found.")
        email = email.lower().strip()
        if email == ws["member_emails"][0]:  # owner
            raise HTTPException(status_code=400, detail="Cannot remove the owner.")
        new_members = [e for e in ws["member_emails"] if e != email]
        await db.workspaces.update_one({"id": workspace_id}, {"$set": {"member_emails": new_members}})
        ws["member_emails"] = new_members
        return ws

    # -------- REVISIONS --------
    @router.post("/projects/{project_id}/edit-after-lock", response_model=ProjectOut)
    async def edit_after_lock(project_id: str, body: EditAfterLockIn, user: dict = Depends(user_dep)):
        project = await _get_project(project_id, user["id"])
        if project.get("status") != "locked":
            raise HTTPException(status_code=400, detail="Only locked projects create revisions.")
        version = (project.get("revision_count") or 0) + 1
        snapshot = {
            "framing": project.get("framing"),
            "context": project.get("context"),
            "decision": project.get("decision"),
            "artifacts": project.get("artifacts"),
            "locked_at": project.get("locked_at"),
        }
        await db.revisions.insert_one(
            {
                "id": _uuid(),
                "project_id": project_id,
                "version": version,
                "snapshot": snapshot,
                "note": body.note or "",
                "created_at": _now_iso(),
            }
        )
        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "status": "in_progress",
                    "step": 2,
                    "locked_at": None,
                    "revision_count": version,
                    "updated_at": _now_iso(),
                }
            },
        )
        return await _get_project(project_id, user["id"])

    @router.get("/projects/{project_id}/revisions", response_model=List[RevisionOut])
    async def list_revisions(project_id: str, user: dict = Depends(user_dep)):
        await _get_project(project_id, user["id"])
        rows = await db.revisions.find({"project_id": project_id}, {"_id": 0}).sort("version", -1).to_list(100)
        return rows

    return router
