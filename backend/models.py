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
    locked_at: Optional[str] = None
    created_at: str
    updated_at: str
