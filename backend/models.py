"""Pydantic models for Bracket."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Auth ---
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: Optional[str] = None
    created_at: str
    onboarded: bool = False
    work_type: Optional[str] = None  # freelance | agency | in-house
    struggle: Optional[str] = None  # scope | client-clarity | decision-making
    tier: str = "free"
    active_until: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserOut
    token: str


# --- Onboarding ---
class OnboardingIn(BaseModel):
    work_type: str
    struggle: str


# --- Project ---
class ProjectCreateIn(BaseModel):
    name: str
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
    user_id: str
    workspace_id: Optional[str] = None
    name: str
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
    simulation: Optional[Dict[str, Any]] = None
    share_token: Optional[str] = None
    revision_count: int = 0
    locked_at: Optional[str] = None
    created_at: str
    updated_at: str


# --- Moment Advisor ---
class MomentIn(BaseModel):
    moment: str = Field(min_length=5)
    context: Optional[str] = ""
    engine: str = "claude"


class MomentOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    moment: str
    context: Optional[str] = ""
    engine: str = "claude"
    output: Optional[Dict[str, Any]] = None
    created_at: str


# --- Templates ---
class TemplateIn(BaseModel):
    name: str
    description: Optional[str] = ""
    from_project_id: Optional[str] = None


class TemplateOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = ""
    situation_input: Optional[Dict[str, Any]] = None
    context_input: Optional[Dict[str, Any]] = None
    decision_input: Optional[Dict[str, Any]] = None
    created_at: str


# --- Workspaces ---
class WorkspaceIn(BaseModel):
    name: str


class WorkspaceInvite(BaseModel):
    email: EmailStr


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    owner_id: str
    name: str
    member_emails: List[str] = []
    created_at: str


# --- Billing ---
class CheckoutRequest(BaseModel):
    tier: str  # pro | studio
    currency: str = "USD"  # USD | INR
    origin_url: str


class BillingStatus(BaseModel):
    tier: str = "free"  # free | pro | studio
    active_until: Optional[str] = None
    last_session_id: Optional[str] = None


# --- Revisions ---
class RevisionOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    project_id: str
    version: int
    snapshot: Dict[str, Any]
    created_at: str
    note: Optional[str] = ""


class EditAfterLockIn(BaseModel):
    note: Optional[str] = ""
