"""AI Decision Engine for Bracket.
Wraps emergentintegrations LlmChat to produce structured outputs for each
step of the decision flow: framing, context compression, decision, artifacts.
"""
import os
import json
import re
import uuid
from typing import Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage


DEFAULT_PROVIDER = "anthropic"
DEFAULT_MODEL = "claude-sonnet-4-5-20250929"

MODEL_MAP = {
    "claude": ("anthropic", "claude-sonnet-4-5-20250929"),
    "gpt": ("openai", "gpt-5.2"),
}


SYSTEM_VOICE = (
    "You are Bracket — a senior design advisor. You speak like a confident, "
    "opinionated senior designer mentoring a peer. Sharp, warm, never corporate. "
    "You help designers decide, not just do. Avoid generic advice. Be specific, "
    "direct, and human. You always respond in strict JSON matching the requested schema, "
    "with NO markdown fences, NO preamble, NO commentary — just the JSON object."
)


def _extract_json(text: str) -> dict:
    """Pull the first JSON object out of the model response."""
    if not text:
        raise ValueError("Empty AI response")
    text = text.strip()
    # strip markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # find first { ... last }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON in AI response: {text[:200]}")
    return json.loads(text[start : end + 1])


async def _run(prompt: str, engine: str = "claude", session_id: Optional[str] = None) -> dict:
    provider, model = MODEL_MAP.get(engine, (DEFAULT_PROVIDER, DEFAULT_MODEL))
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id or str(uuid.uuid4()),
        system_message=SYSTEM_VOICE,
    ).with_model(provider, model)
    response = await chat.send_message(UserMessage(text=prompt))
    return _extract_json(response)


async def run_situation_framing(inputs: dict, engine: str = "claude") -> dict:
    """Reframes the problem into crisp reality. Returns reframed_problem + clarity_score + signals."""
    prompt = f"""A designer has submitted this raw project intake. Reframe it like a senior designer would.

PROJECT INTAKE:
- What is the project: {inputs.get('what', '')}
- Who is it for: {inputs.get('who', '')}
- What feels unclear or risky: {inputs.get('unclear', '')}

Do these three things:
1. Name the REAL situation (strip marketing fluff, state what's actually happening)
2. Score clarity from 0-100 (how clear the problem actually is right now)
3. List 3-5 tensions or signals the designer should pay attention to

Return JSON with this exact shape:
{{
  "reframed_problem": "A 2-3 sentence crisp restatement of what's actually going on",
  "clarity_score": 0-100,
  "clarity_label": "one of: MURKY | FORMING | CLEAR | SHARP",
  "tensions": ["tension 1", "tension 2", ...],
  "what_to_name": "One sentence the designer can say to name the real problem"
}}"""
    return await _run(prompt, engine)


async def run_context_compression(inputs: dict, framing: dict, engine: str = "claude") -> dict:
    """Filters noise, extracts signal from requirements/constraints/inspirations."""
    prompt = f"""Compress the designer's context. Remove noise. Surface only what CHANGES the decision.

REFRAMED PROBLEM: {framing.get('reframed_problem', '')}

DESIGNER'S RAW CONTEXT:
- Requirements: {inputs.get('requirements', '')}
- Constraints: {inputs.get('constraints', '')}
- Inspirations / references: {inputs.get('inspirations', '')}

Return JSON:
{{
  "key_signals": ["signal 1 (what actually matters)", ...],
  "noise_removed": ["item 1 that was noise", ...],
  "what_actually_matters": "One sharp paragraph naming the 1-2 things that drive this decision",
  "hidden_assumptions": ["assumption 1", ...]
}}"""
    return await _run(prompt, engine)


async def run_decision_engine(inputs: dict, framing: dict, context: dict, engine: str = "claude") -> dict:
    """Returns recommended direction, alternatives, trade-offs, risks."""
    prompt = f"""Make the call. The designer needs a recommendation, not a menu.

REFRAMED PROBLEM: {framing.get('reframed_problem', '')}
WHAT MATTERS: {context.get('what_actually_matters', '')}
KEY SIGNALS: {json.dumps(context.get('key_signals', []))}

DESIGNER'S DECISION INPUTS:
- Optimizing for: {inputs.get('optimizing_for', '')}
- Known trade-offs on their mind: {inputs.get('tradeoffs', '')}
- Risks they suspect: {inputs.get('risks', '')}

Return JSON:
{{
  "recommendation": {{
    "title": "Short directive title",
    "rationale": "2-3 sentence why this is the move",
    "confidence": 0-100
  }},
  "alternatives": [
    {{"title": "Alt 1", "when_to_choose": "when this becomes the right call", "cost": "what you give up"}}
  ],
  "tradeoffs": ["trade-off statement 1", ...],
  "risks": [
    {{"risk": "risk description", "severity": "LOW|MEDIUM|HIGH", "mitigation": "how to de-risk"}}
  ]
}}"""
    return await _run(prompt, engine)


async def run_artifacts(project: dict, engine: str = "claude") -> dict:
    """Generate scope doc, client message, assumptions, risk flags."""
    framing = project.get("framing", {})
    decision = project.get("decision", {})
    prompt = f"""Generate the artifacts a designer needs to protect their decision.

PROJECT: {project.get('name', '')}
REFRAMED PROBLEM: {framing.get('reframed_problem', '')}
RECOMMENDATION: {json.dumps(decision.get('recommendation', {}))}
TRADE-OFFS: {json.dumps(decision.get('tradeoffs', []))}
RISKS: {json.dumps(decision.get('risks', []))}

Return JSON:
{{
  "scope_doc": {{
    "title": "Project scope title",
    "in_scope": ["item", ...],
    "out_of_scope": ["item", ...],
    "deliverables": ["deliverable", ...],
    "timeline_note": "One line on timeline posture"
  }},
  "client_message": "A ready-to-send message (3-5 short paragraphs) explaining direction, boundaries, and next steps. Warm, clear, confident. No corporate fluff.",
  "assumptions": ["explicit assumption", ...],
  "risk_flags": [
    {{"flag": "short flag name", "why": "why it matters", "severity": "LOW|MEDIUM|HIGH"}}
  ]
}}"""
    return await _run(prompt, engine)
