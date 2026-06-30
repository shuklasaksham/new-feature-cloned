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
    "You are Bracket — a senior advisor for designers, freelancers, and "
    "independent creative pros (illustrators, copywriters, photographers, "
    "video editors, indie devs, content creators, brand consultants). "
    "You speak like a confident, opinionated senior peer mentoring someone "
    "working solo or in a small shop. Sharp, warm, never corporate. "
    "You help people decide, not just do. Avoid generic advice. Be specific, "
    "direct, and human. "
    "AUDIENCE: do NOT assume only visual design. Your suggestions and "
    "examples must work for any independent creative discipline. Translate "
    "design jargon into plain language when relevant. "
    "CURRENCY: All monetary amounts MUST be in Indian Rupees using the '₹' "
    "symbol (e.g. ₹50,000 or ₹2L). Never use $, USD, £, € or any other "
    "currency, even if the user mentions one — convert or restate in INR. "
    "Use Indian number conventions (lakh / crore) where appropriate. "
    "You always respond in strict JSON matching the requested schema, "
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


async def run_field_suggestions(
    step: int,
    field: str,
    partial: str,
    context: dict,
    engine: str = "claude",
) -> list[str]:
    """Return 3-5 short, pickable autofill suggestions for a form field.

    The frontend calls this as the user types (debounced 600ms). The model
    has to respond fast and cheap, so the prompt is short and the JSON
    schema is tight.
    """
    ctx_compact = {k: (v or "")[:200] for k, v in (context or {}).items() if v}
    partial = (partial or "").strip()[:300]
    prompt = f"""A designer or freelancer is filling out a form to think through a project decision.

CURRENT FIELD: {field} (step {step} of 5)
WHAT THEY'VE TYPED SO FAR: "{partial}"
OTHER FIELDS THEY'VE ALREADY FILLED: {json.dumps(ctx_compact, ensure_ascii=False)}

Suggest exactly 4 short autofill phrases (each between 2-7 words) that would
naturally complete or extend what they're typing. Be specific to their input —
NOT generic. If "WHAT THEY'VE TYPED SO FAR" is empty, give 4 broadly relevant
starting points based on the other filled fields and the field's purpose.

The user is a designer, illustrator, copywriter, photographer, video editor,
indie dev, content creator, brand consultant, or similar independent creative
pro — phrase suggestions to work for any of them.

Return strict JSON only: {{"suggestions": ["...", "...", "...", "..."]}}
"""
    try:
        data = await _run(prompt, engine)
        sugs = data.get("suggestions") or []
        # Defensive normalization — strip, dedupe, cap length.
        seen = set()
        out: list[str] = []
        for s in sugs:
            if not isinstance(s, str):
                continue
            s = s.strip().strip(",.;")
            if not s or len(s) > 80:
                continue
            key = s.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(s)
            if len(out) >= 4:
                break
        return out
    except Exception:
        # Don't break the typing UX if AI hiccups — return empty list, the
        # client gracefully shows nothing.
        return []


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


async def run_moment_advisor(inputs: dict, engine: str = "claude") -> dict:
    """Moment Advisor — a designer pastes a client message or describes a moment,
    Bracket recommends how to respond."""
    prompt = f"""A designer is facing a client moment. They need a stance, not an essay.

THE MOMENT (what the client said or what's happening):
\"\"\"{inputs.get('moment', '')}\"\"\"

CONTEXT THE DESIGNER GAVE (optional):
{inputs.get('context', '') or '(none)'}

Decide:
1. Respond now, or respond later (with a cooling window)?
2. Clarify, or push back?
3. Soften the tone, or firm it up?

Return JSON:
{{
  "read": "One line: what's actually happening underneath the client message",
  "timing": "NOW | LATER",
  "timing_why": "One sentence reason",
  "posture": "CLARIFY | PUSH_BACK | HOLD",
  "posture_why": "One sentence reason",
  "tone": "SOFTEN | FIRM_UP | KEEP",
  "tone_why": "One sentence reason",
  "response_draft": "A 2-4 short-paragraph message the designer can send. Warm, direct, no fluff.",
  "what_not_to_do": ["One pitfall to avoid", ...]
}}"""
    return await _run(prompt, engine)


async def run_pushback_simulator(project: dict, engine: str = "claude") -> dict:
    """Simulates likely client reactions to the locked decision and drafts responses."""
    framing = project.get("framing", {})
    decision = project.get("decision", {})
    artifacts = project.get("artifacts", {})
    prompt = f"""Play the client. Predict how they'll push back on this decision.

PROJECT: {project.get('name', '')}
REFRAMED PROBLEM: {framing.get('reframed_problem', '')}
RECOMMENDATION: {json.dumps(decision.get('recommendation', {}))}
SCOPE IN: {json.dumps(artifacts.get('scope_doc', {}).get('in_scope', []))}
SCOPE OUT: {json.dumps(artifacts.get('scope_doc', {}).get('out_of_scope', []))}

Return JSON simulating 4 likely reactions. Mix: silence, "can we reduce this", scope expansion attempts, timeline pressure, taste disagreements.

{{
  "scenarios": [
    {{
      "trigger": "The exact thing the client is likely to say or do",
      "why": "Why they'll say it — the underlying pressure",
      "best_move": "What the designer should do",
      "response_draft": "A short reply the designer can send (or say in a meeting)",
      "what_not_to_do": "The common mistake to avoid"
    }},
    ...
  ]
}}"""
    return await _run(prompt, engine)


async def run_client_pushback_suggestions(project: dict, concerns: str, engine: str = "claude") -> dict:
    """A client raised concerns on the shared document. Generate calm, specific suggestions
    the designer can offer to move the conversation forward without collapsing the stance."""
    context = project.get("context") or {}
    decision = project.get("decision") or {}
    rec = (decision.get("recommendation") or {})
    artifacts = project.get("artifacts") or {}
    scope = (artifacts.get("scope_doc") or {})
    prompt = f"""A client has reviewed a sign-off document and raised concerns.
Your job is to give the designer (the project owner) three short, specific suggestions
to address the concerns WITHOUT collapsing on the original stance.

PROJECT: {project.get('name', '')}
DECISION: {rec.get('title', '')}
WHY WE CHOSE THIS: {rec.get('rationale', '')}
WHAT ACTUALLY MATTERS: {context.get('what_actually_matters', '')}
IN SCOPE: {json.dumps(scope.get('in_scope', []))}
DELIVERABLES: {json.dumps(scope.get('deliverables', []))}

CLIENT'S CONCERNS (verbatim):
\"\"\"{concerns}\"\"\"

Return STRICT JSON:
{{
  "summary": "One calm sentence reading back what the client is actually worried about.",
  "suggestions": [
    {{
      "title": "Short label, max 8 words",
      "what_to_say": "1-3 sentences the designer can paste back to the client",
      "what_to_change": "The smallest change that addresses the concern without losing the stance, or 'No change — defend the stance because…' if defense is the right move"
    }}
  ],
  "watch_for": "One short warning about what NOT to concede on, so the designer doesn't unravel the whole decision."
}}

3 suggestions exactly. Pure JSON only."""
    return await _run(prompt, engine)
