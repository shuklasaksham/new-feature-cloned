"""AI Decision Engine for Bracket.
Wraps emergentintegrations LlmChat to produce structured outputs for each
step of the decision flow: framing, context compression, decision, artifacts.
"""
import os
import json
import re
import uuid
import asyncio
import logging
from typing import Optional
from emergentintegrations.llm.chat import (
    LlmChat,
    UserMessage,
    ImageContent,
)

logger = logging.getLogger(__name__)


DEFAULT_PROVIDER = "anthropic"
DEFAULT_MODEL = "claude-sonnet-4-5-20250929"  # higher quality for step outputs
SUGGEST_PROVIDER = "anthropic"
SUGGEST_MODEL = "claude-haiku-4-5-20251001"  # ultra-fast for typing suggestions

# Hard timeouts so a hung Anthropic call never lets Cloudflare's 100s timeout
# fire (which surfaces as a scary 520 "malformed response" page). We return a
# clean 502 well before that.
STEP_TIMEOUT_S = 70   # Sonnet step calls (framing, context, decision, artifacts)
SUGGEST_TIMEOUT_S = 8  # Haiku typing suggestions

MODEL_MAP = {
    "claude": ("anthropic", "claude-sonnet-4-5-20250929"),
    "gpt": ("openai", "gpt-5.2"),
}


SYSTEM_VOICE = (
    "You are Bracket — a senior advisor for independent creatives and small "
    "teams navigating client projects. Your audience spans FIVE personas:\n"
    "  1. INDIE_CREATIVES — writers, photographers, video editors, illustrators, "
    "indie devs, content creators, brand consultants working solo.\n"
    "  2. SMALL_AGENCIES — 2-10 person studios juggling several clients.\n"
    "  3. INHOUSE_PRODUCT — in-house product designers navigating stakeholders.\n"
    "  4. JUNIORS_LEVELLING_UP — junior designers/creatives learning to think "
    "senior, hold their ground, and communicate decisions.\n"
    "  5. INDEPENDENT_DESIGNERS — freelance designers running their own book.\n"
    "\n"
    "FIRST STEP OF EVERY REPLY: silently infer which persona the user most "
    "likely is from their words (do NOT ask, do NOT print the label). Adapt "
    "voice, examples, and stakes to that persona:\n"
    "  • Indie creatives → language of their craft (footage, drafts, prints), "
    "solo economics, small budgets in INR.\n"
    "  • Small agencies → team-scale concerns (utilisation, PM handoff, retainer).\n"
    "  • In-house product designers → stakeholder alignment, PM/eng handoff, "
    "org politics, roadmap trade-offs.\n"
    "  • Juniors levelling up → teach the reasoning behind the move, name the "
    "framework, model senior-operator confidence without being condescending.\n"
    "  • Independent designers → freelance economics, scope creep, boundaries "
    "with clients.\n"
    "\n"
    "VOICE: confident, opinionated senior peer. Sharp, warm, human — never "
    "corporate. Help people decide, not just do. No generic advice. Be specific "
    "and direct. Translate discipline-specific jargon into plain language so a "
    "writer, photographer, or dev can follow a design conversation and vice-versa.\n"
    "\n"
    "CURRENCY: All monetary amounts MUST be in Indian Rupees using the '₹' "
    "symbol (e.g. ₹50,000 or ₹2L). Never use $, USD, £, € or any other "
    "currency, even if the user mentions one — convert or restate in INR. "
    "Use Indian number conventions (lakh / crore) where appropriate.\n"
    "\n"
    "You always respond in strict JSON matching the requested schema, with NO "
    "markdown fences, NO preamble, NO commentary — just the JSON object."
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
    try:
        response = await asyncio.wait_for(
            chat.send_message(UserMessage(text=prompt)),
            timeout=STEP_TIMEOUT_S,
        )
    except asyncio.TimeoutError as e:
        logger.warning("AI step call timed out after %ss (engine=%s)", STEP_TIMEOUT_S, engine)
        raise TimeoutError(f"AI took longer than {STEP_TIMEOUT_S}s — please retry.") from e
    return _extract_json(response)


async def _run_fast(prompt: str, session_id: Optional[str] = None) -> dict:
    """Ultra-low-latency path for typing suggestions (Haiku 4.5)."""
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id or str(uuid.uuid4()),
        system_message="Return strict JSON only. No prose, no markdown fences.",
    ).with_model(SUGGEST_PROVIDER, SUGGEST_MODEL)
    try:
        response = await asyncio.wait_for(
            chat.send_message(UserMessage(text=prompt)),
            timeout=SUGGEST_TIMEOUT_S,
        )
    except asyncio.TimeoutError as e:
        logger.info("Suggest call timed out after %ss — returning empty list", SUGGEST_TIMEOUT_S)
        raise TimeoutError("Suggestions timed out.") from e
    return _extract_json(response)


async def run_field_suggestions(
    step: int,
    field: str,
    partial: str,
    context: dict,
    engine: str = "claude",  # noqa: ARG001 -- kept for API compatibility
) -> list[str]:
    """Return 3-5 short, pickable autofill suggestions for a form field.

    Uses Claude Haiku 4.5 for sub-500ms latency. Prompt is minimal.
    """
    # Ultra-compact context — 80 chars per non-empty field max.
    ctx_bits = []
    for k, v in (context or {}).items():
        if v:
            s = str(v).strip()
            if s:
                ctx_bits.append(f"{k}={s[:80]}")
    ctx = "; ".join(ctx_bits) or "(none)"
    partial = (partial or "").strip()[:120]

    prompt = (
        f'FIELD: {field} | PARTIAL: "{partial}" | CTX: {ctx}\n'
        "User is an independent creative or small-team member (designer, writer, "
        "photographer, video editor, illustrator, dev, in-house product designer, "
        "or junior levelling up) filling a decision form. "
        "Return 4 short autofill phrases (2-7 words each) that naturally continue "
        f'"{partial}" — specific to their persona, not generic. If partial is empty, '
        'give 4 starters. JSON: {"suggestions":["...","...","...","..."]}'
    )
    try:
        data = await _run_fast(prompt)
        sugs = data.get("suggestions") or []
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
        return []


async def generate_project_title(raw_paste: str) -> str:
    """Given a messy client paste, generate a short, human project title
    (3-6 words, Title Case) that names the *project*, not the client's greeting.
    Falls back to empty string on failure — caller substitutes a timestamped default."""
    text = (raw_paste or "").strip()
    if not text:
        return ""
    prompt = (
        "You are naming a project for a client-work dashboard. "
        "The user pasted a messy client conversation (email / WhatsApp / brief / notes). "
        "Return a short, human project title that someone would write in their dashboard — "
        "3 to 6 words, Title Case, no quotes, no trailing punctuation. "
        "Name the project itself (e.g. 'Fintech Landing Redesign', 'Loop Coffee Brand Launch', "
        "'B2B Marketing Site Refresh'), NOT the client's greeting or first sentence. "
        "If the paste doesn't imply a clear project, return a generic but useful label "
        "based on the domain (e.g. 'Client Brief').\n\n"
        f"PASTE:\n---\n{text[:4000]}\n---\n\n"
        'Return JSON only: {"title": "..."}'
    )
    try:
        data = await _run_fast(prompt)
        title = str(data.get("title", "")).strip()
        # Strip surrounding quotes / trailing punctuation defensively
        title = title.strip("\"'").rstrip(".,;:")
        # Enforce sane length
        if len(title) > 80:
            title = title[:77].rstrip() + "…"
        return title
    except Exception as e:
        logger.warning("generate_project_title failed: %s", e)
        return ""


async def extract_situation_from_paste(raw_paste: str) -> dict:
    """Given a messy client paste (WhatsApp/email/notes/brief), extract the three
    situation-framing fields (what / who / unclear) via a fast Haiku pass.
    Returns {"what": str, "who": str, "unclear": str}. All strings guaranteed."""
    text = (raw_paste or "").strip()
    if not text:
        return {"what": "", "who": "", "unclear": ""}
    prompt = (
        "The user pasted a messy client conversation, email, brief, or notes. "
        "Extract three plain-English answers a senior professional would write in a fresh notebook. "
        "Be concise (1-3 sentences each). If the paste truly doesn't contain the info, "
        "leave the field as an empty string.\n\n"
        f"PASTE:\n---\n{text[:8000]}\n---\n\n"
        "Return JSON only: "
        '{"what": "A 1-2 sentence description of what is being built", '
        '"who": "A 1-2 sentence description of the client / audience", '
        '"unclear": "A 1-2 sentence honest note on what feels off or is missing"}'
    )
    try:
        data = await _run_fast(prompt)
        return {
            "what":    str(data.get("what", "")).strip()[:500] if data.get("what") else "",
            "who":     str(data.get("who", "")).strip()[:500] if data.get("who") else "",
            "unclear": str(data.get("unclear", "")).strip()[:500] if data.get("unclear") else "",
        }
    except Exception as e:
        logger.warning("extract_situation_from_paste failed: %s", e)
        # Fall back to putting the whole paste in `what` so the Sonnet pass
        # still has something to work with.
        return {"what": text[:2000], "who": "", "unclear": ""}


async def extract_context_from_paste(raw_paste: str) -> dict:
    """Extract requirements / constraints / inspirations from a raw paste."""
    text = (raw_paste or "").strip()
    if not text:
        return {"requirements": "", "constraints": "", "inspirations": ""}
    prompt = (
        "The user pasted messy project context (requirements, constraints, references). "
        "Extract three plain-English summaries. Concise (1-3 sentences each). Empty string if missing.\n\n"
        f"PASTE:\n---\n{text[:8000]}\n---\n\n"
        "Return JSON only: "
        '{"requirements": "What they need built, features, must-haves", '
        '"constraints": "Budget, deadline, team size, technical or brand limits", '
        '"inspirations": "References, examples, aesthetic direction, links to sites/products"}'
    )
    try:
        data = await _run_fast(prompt)
        return {
            "requirements": str(data.get("requirements", "")).strip()[:800] if data.get("requirements") else "",
            "constraints":  str(data.get("constraints", "")).strip()[:800] if data.get("constraints") else "",
            "inspirations": str(data.get("inspirations", "")).strip()[:800] if data.get("inspirations") else "",
        }
    except Exception as e:
        logger.warning("extract_context_from_paste failed: %s", e)
        return {"requirements": text[:2000], "constraints": "", "inspirations": ""}


async def extract_decision_from_paste(raw_paste: str) -> dict:
    """Extract optimizing_for / tradeoffs / risks from a raw paste."""
    text = (raw_paste or "").strip()
    if not text:
        return {"optimizing_for": "", "tradeoffs": "", "risks": ""}
    prompt = (
        "The user pasted their thinking about the direction to take on this project. "
        "Extract three plain-English answers. Concise (1-3 sentences each). Empty string if missing.\n\n"
        f"PASTE:\n---\n{text[:8000]}\n---\n\n"
        "Return JSON only: "
        '{"optimizing_for": "What the user wants to prioritize (speed, quality, cost, learning, etc.)", '
        '"tradeoffs": "What they are willing to give up, and what they are NOT willing to compromise on", '
        '"risks": "What could go wrong, what they are worried about, what feels shaky"}'
    )
    try:
        data = await _run_fast(prompt)
        return {
            "optimizing_for": str(data.get("optimizing_for", "")).strip()[:500] if data.get("optimizing_for") else "",
            "tradeoffs":      str(data.get("tradeoffs", "")).strip()[:500] if data.get("tradeoffs") else "",
            "risks":          str(data.get("risks", "")).strip()[:500] if data.get("risks") else "",
        }
    except Exception as e:
        logger.warning("extract_decision_from_paste failed: %s", e)
        return {"optimizing_for": text[:2000], "tradeoffs": "", "risks": ""}


async def run_situation_framing(inputs: dict, engine: str = "claude") -> dict:
    """Reframes the problem into crisp reality. Returns reframed_problem + clarity_score + signals."""
    prompt = f"""A professional has submitted this raw client-project intake. Reframe it like a seasoned operator would.

PROJECT INTAKE:
- What is the project: {inputs.get('what', '')}
- Who is it for: {inputs.get('who', '')}
- What feels unclear or risky: {inputs.get('unclear', '')}

Do these three things:
1. Name the REAL situation (strip marketing fluff, state what's actually happening)
2. Score clarity from 0-100 (how clear the problem actually is right now)
3. List 3-5 tensions or signals the project owner should pay attention to

Return JSON with this exact shape:
{{
  "reframed_problem": "A 2-3 sentence crisp restatement of what's actually going on",
  "clarity_score": 0-100,
  "clarity_label": "one of: MURKY | FORMING | CLEAR | SHARP",
  "tensions": ["tension 1", "tension 2", ...],
  "what_to_name": "One sentence the project owner can say to name the real problem"
}}"""
    return await _run(prompt, engine)


async def run_context_compression(inputs: dict, framing: dict, engine: str = "claude") -> dict:
    """Filters noise, extracts signal from requirements/constraints/inspirations."""
    prompt = f"""Compress the project owner's context. Remove noise. Surface only what CHANGES the decision.

REFRAMED PROBLEM: {framing.get('reframed_problem', '')}

PROJECT OWNER'S RAW CONTEXT:
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
    prompt = f"""Make the call. The project owner needs a recommendation, not a menu.

REFRAMED PROBLEM: {framing.get('reframed_problem', '')}
WHAT MATTERS: {context.get('what_actually_matters', '')}
KEY SIGNALS: {json.dumps(context.get('key_signals', []))}

PROJECT OWNER'S DECISION INPUTS:
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
    prompt = f"""Generate the artifacts a project owner needs to protect their decision.

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
    """Moment Advisor — a user pastes a client message or describes a moment,
    Bracket recommends how to respond."""
    prompt = f"""A professional is facing a client moment. They need a stance, not an essay.

THE MOMENT (what the client said or what's happening):
\"\"\"{inputs.get('moment', '')}\"\"\"

CONTEXT THE PROJECT OWNER GAVE (optional):
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
  "response_draft": "A 2-4 short-paragraph message the user can send. Warm, direct, no fluff.",
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
      "best_move": "What the project owner should do",
      "response_draft": "A short reply the project owner can send (or say in a meeting)",
      "what_not_to_do": "The common mistake to avoid"
    }},
    ...
  ]
}}"""
    return await _run(prompt, engine)


async def run_client_pushback_suggestions(project: dict, concerns: str, engine: str = "claude") -> dict:
    """A client raised concerns on the shared document. Generate calm, specific suggestions
    the project owner can offer to move the conversation forward without collapsing the stance."""
    context = project.get("context") or {}
    decision = project.get("decision") or {}
    rec = (decision.get("recommendation") or {})
    artifacts = project.get("artifacts") or {}
    scope = (artifacts.get("scope_doc") or {})
    prompt = f"""A client has reviewed a sign-off document and raised concerns.
Your job is to give the project owner three short, specific suggestions
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
      "what_to_say": "1-3 sentences the project owner can paste back to the client",
      "what_to_change": "The smallest change that addresses the concern without losing the stance, or 'No change — defend the stance because…' if defense is the right move"
    }}
  ],
  "watch_for": "One short warning about what NOT to concede on, so the project owner doesn't unravel the whole decision."
}}

3 suggestions exactly. Pure JSON only."""
    return await _run(prompt, engine)


# ---------------------------------------------------------------------------
# File-upload brief ingestion
# ---------------------------------------------------------------------------

async def extract_text_from_image(image_bytes: bytes, mime_type: str = "image/png") -> str:
    """Given a client-brief screenshot (PNG or JPEG), use Gemini vision to
    extract ALL readable text and describe any diagrams/references. Returns
    plain text (multi-line) or empty string on failure.

    Uses Gemini Flash for cost + latency; images are passed as base64.
    """
    if not image_bytes:
        return ""
    try:
        import base64
        b64 = base64.b64encode(image_bytes).decode("ascii")
    except Exception as e:
        logger.warning("image base64 encoding failed: %s", e)
        return ""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return ""
    chat = LlmChat(
        api_key=api_key,
        session_id=str(uuid.uuid4()),
        system_message=(
            "You are a careful transcriber. When shown a client-brief screenshot, "
            "extract EVERY readable line of text verbatim. Also briefly describe "
            "any visual references (moodboards, wireframes, colour palettes). "
            "Output plain text only — no markdown, no fences, no commentary."
        ),
    ).with_model("gemini", "gemini-3-flash-preview")
    prompt = (
        "Read this screenshot of a client brief / conversation. Return every "
        "readable line of text and a short description of any visual references. "
        "Plain text only."
    )
    try:
        response = await asyncio.wait_for(
            chat.send_message(
                UserMessage(text=prompt, file_contents=[ImageContent(image_base64=b64)])
            ),
            timeout=STEP_TIMEOUT_S,
        )
        return (response or "").strip()
    except asyncio.TimeoutError:
        logger.warning("extract_text_from_image timed out after %ss", STEP_TIMEOUT_S)
        return ""
    except Exception as e:
        logger.warning("extract_text_from_image failed: %s", e)
        return ""


async def extract_full_brief_from_paste(raw_paste: str) -> dict:
    """One-shot extraction: given a long, structured brief (usually parsed
    from a PDF or text file), pull out EVERY step's inputs so the project
    can jump straight to Step 5 if the info is complete.

    Returns:
        {
          "situation":  {"what": str, "who": str, "unclear": str},
          "context":    {"requirements": str, "constraints": str, "inspirations": str},
          "decision":   {"optimizing_for": str, "tradeoffs": str, "risks": str},
          "sufficient": bool,       # true only if all 9 fields have content
          "persona":    str,        # inferred audience tag
        }
    """
    text = (raw_paste or "").strip()
    if not text:
        return {
            "situation": {"what": "", "who": "", "unclear": ""},
            "context": {"requirements": "", "constraints": "", "inspirations": ""},
            "decision": {"optimizing_for": "", "tradeoffs": "", "risks": ""},
            "sufficient": False,
            "persona": "",
        }
    prompt = (
        "The user uploaded a client brief (PDF text, note dump, or transcribed image). "
        "Extract inputs for a 5-step decision workflow. Be honest — leave a field empty "
        "if the brief truly doesn't mention it. Do NOT invent details.\n\n"
        "Also infer the user's persona from the writing style:\n"
        "  - INDIE_CREATIVE (solo writer/photo/video/illustrator/dev)\n"
        "  - SMALL_AGENCY (2-10 person studio)\n"
        "  - INHOUSE_PRODUCT (in-house product designer)\n"
        "  - JUNIOR (junior levelling up)\n"
        "  - INDEPENDENT_DESIGNER (freelance designer)\n\n"
        f"BRIEF:\n---\n{text[:12000]}\n---\n\n"
        "Return JSON only: "
        "{"
        '"situation": {"what":"","who":"","unclear":""}, '
        '"context": {"requirements":"","constraints":"","inspirations":""}, '
        '"decision": {"optimizing_for":"","tradeoffs":"","risks":""}, '
        '"persona": ""'
        "}"
    )
    try:
        data = await _run_fast(prompt)
    except Exception as e:
        logger.warning("extract_full_brief_from_paste failed: %s", e)
        return {
            "situation": {"what": text[:500], "who": "", "unclear": ""},
            "context": {"requirements": "", "constraints": "", "inspirations": ""},
            "decision": {"optimizing_for": "", "tradeoffs": "", "risks": ""},
            "sufficient": False,
            "persona": "",
        }

    def _sanitize(d: dict, keys: list[str], cap: int) -> dict:
        out = {}
        for k in keys:
            v = d.get(k, "") if isinstance(d, dict) else ""
            out[k] = str(v or "").strip()[:cap]
        return out

    situation = _sanitize(data.get("situation") or {}, ["what", "who", "unclear"], 500)
    context   = _sanitize(data.get("context")   or {}, ["requirements", "constraints", "inspirations"], 800)
    decision  = _sanitize(data.get("decision")  or {}, ["optimizing_for", "tradeoffs", "risks"], 800)

    # "Sufficient" means enough to auto-run all three input steps and land on Step 5.
    # We require at least the two structural fields per step (skipping "unclear" and
    # "inspirations" which are optional nice-to-haves).
    sufficient = bool(
        situation["what"] and situation["who"]
        and context["requirements"] and context["constraints"]
        and decision["optimizing_for"] and decision["tradeoffs"]
    )
    persona = str(data.get("persona") or "").strip().upper()[:40]

    return {
        "situation": situation,
        "context": context,
        "decision": decision,
        "sufficient": sufficient,
        "persona": persona,
    }


async def map_suggestion_to_step(project: dict, suggestion: dict) -> dict:
    """Map a client-concern suggestion to the flow step it affects (1-3) and
    produce a concrete regeneration instruction for the owner."""
    framing = ((project.get("framing") or {}).get("reframed_problem") or "")[:300]
    matters = ((project.get("context") or {}).get("what_actually_matters") or "")[:300]
    rec = (((project.get("decision") or {}).get("recommendation") or {}).get("title") or "")[:200]
    concerns = ((project.get("share_review") or {}).get("concerns") or "")[:600]
    prompt = f"""A client reviewed a professional's decision document and raised concerns:
"{concerns}"

Bracket suggested this change:
TITLE: {suggestion.get('title', '')}
WHAT TO CHANGE: {suggestion.get('what_to_change', '')}
WHAT TO SAY: {suggestion.get('what_to_say', '')}

The project has 3 editable steps:
1. SITUATION FRAMING — the problem statement: "{framing}"
2. CONTEXT — what actually matters: "{matters}"
3. DECISION — the recommendation: "{rec}"

Which ONE step should the project owner edit to apply this change, and what exact instruction should they follow when regenerating it?
Return STRICT JSON only: {{"step": 1, "instruction": "one or two clear imperative sentences telling the freelancer exactly what to change, incorporating the client's request"}} where step is 1, 2 or 3."""
    data = await _run_fast(prompt)
    try:
        step = int(data.get("step") or 3)
    except (TypeError, ValueError):
        step = 3
    if step not in (1, 2, 3):
        step = 3
    instruction = str(data.get("instruction") or suggestion.get("what_to_change") or "").strip()
    return {"step": step, "instruction": instruction}
