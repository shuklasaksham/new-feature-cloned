"""Pydantic models for Bracket (anonymous / no-auth mode)."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Project lifecycle ---
class ProjectStartIn(BaseModel):
    """Lightweight identity capture when a user begins a project."""
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    project_name: str = Field(min_length=1, max_length=120)
    engine: str = "claude"  # claude | gpt


class SituationIn(BaseModel):
    what: str
    who: str
    unclear: str


class ContextIn(BaseModel):
    requirements: str = ""
    constraints: str = ""
    inspirations: str = ""


class DecisionIn(BaseModel):
    optimizing_for: str
    tradeoffs: str = ""
    risks: str = ""


class ProjectOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    creator_name: Optional[str] = ""
    creator_email: Optional[str] = ""
    engine: str = "claude"
    status: str = "draft"  # draft | in_progress | locked
    step: int = 1  # 1..5
    situation_input: Optional[Dict[str, Any]] = None
    framing: Optional[Dict[str, Any]] = None
    context_input: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None
    decision_input: Optional[Dict[str, Any]] = None
    decision: Optional[Dict[str, Any]] = None
    artifacts: Optional[Dict[str, Any]] = None
    locked_at: Optional[str] = None
    feedback: Optional[Dict[str, Any]] = None
    share_token: Optional[str] = None
    share_status: str = "none"  # none | sent | accepted | rejected
    share_review: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str
