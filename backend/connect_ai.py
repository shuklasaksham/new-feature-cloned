"""AI extraction layer for Connected Work sources. Uses the same Haiku
pipeline (thread-pool + backpressure) as the rest of Bracket via _run."""
import json
import logging

from ai_engine import _run

logger = logging.getLogger("bracket")

_MAX_CONTENT = 12000


async def analyze_connected_source(provider: str, source_name: str, content: str, candidates: list) -> dict:
    """First-pass understanding of a freshly selected source. Returns project
    suggestion, extracted items (each confirmed|detected), and a possible
    match against the user's existing projects."""
    cand_lines = "\n".join(
        f'- id: {c["id"]} | name: {c["name"]} | client: {c.get("client") or "unknown"}' for c in candidates[:25]
    ) or "- (none)"
    prompt = f"""You are Bracket, an intelligence layer that turns scattered client work into structured projects.
Analyze this {provider} source titled "{source_name}" and extract project intelligence.

CRITICAL RULES:
- NEVER invent decisions, requirements, deadlines, approvals or scope. Only extract what the content supports.
- Classify each item's status: "confirmed" ONLY when explicitly agreed/approved/stated as final; otherwise "detected".
- Casual mentions ("maybe we could add dark mode") are "detected", never "confirmed".
- If the content is thin, return fewer items. Empty arrays are fine.

EXISTING PROJECTS (for matching — use client names, participants, keywords, titles):
{cand_lines}

SOURCE CONTENT:
{content[:_MAX_CONTENT]}

Return STRICT JSON only:
{{
  "project": {{
    "name": "short project name extracted from the work (e.g. 'Acme Website Redesign')",
    "client": "client/company name or empty string",
    "description": "1-2 sentence project description based on the source"
  }},
  "requirements": [{{"title": "short", "detail": "1 sentence with evidence", "status": "confirmed|detected"}}],
  "decisions": [{{"title": "short", "detail": "who decided what", "status": "confirmed|detected"}}],
  "deliverables": [{{"title": "short", "detail": "1 sentence", "status": "confirmed|detected"}}],
  "deadlines": [{{"title": "what is due", "detail": "date or timeframe as stated", "status": "confirmed|detected"}}],
  "open_questions": [{{"title": "the unresolved question", "detail": "", "status": "detected"}}],
  "match": {{"project_id": "id from existing projects list or null", "confidence": 0, "reason": "1 sentence"}}
}}"""
    data = await _run(prompt, "haiku")
    return data if isinstance(data, dict) else {}


async def detect_source_updates(provider: str, source_label: str, project_name: str,
                                memory_titles: list, new_digest: str) -> dict:
    """Compare fresh source content against what the project already knows.
    Surfaces only meaningful NEW information."""
    known = "\n".join(f"- {t}" for t in memory_titles[:60]) or "- (nothing yet)"
    prompt = f"""You are Bracket's change-detection engine for project "{project_name}".
A connected {provider} source ("{source_label}") just synced with fresh content.

The project ALREADY KNOWS these items (do NOT repeat them):
{known}

FRESH SOURCE CONTENT:
{new_digest[:_MAX_CONTENT]}

Identify only MEANINGFUL new information: new requests, decisions, deliverables, deadline changes,
potential scope creep (requests outside known scope), approvals, blockers.
- status "confirmed" ONLY for explicit agreements; ambiguous statements are "detected".
- If nothing meaningful is new, return empty arrays.

Return STRICT JSON only:
{{
  "events": [{{"summary": "1 short sentence, e.g. 'Client requested a testimonials section'", "event_type": "REQUIREMENT_DETECTED|DECISION_DETECTED|SCOPE_CHANGE_DETECTED|DEADLINE_CHANGED|DELIVERABLE_STATUS_DETECTED|ACTIVITY"}}],
  "new_items": [{{"category": "requirement|decision|deliverable|deadline|scope_change|question", "title": "short", "detail": "1 sentence with evidence", "status": "confirmed|detected"}}]
}}"""
    data = await _run(prompt, "haiku")
    return data if isinstance(data, dict) else {"events": [], "new_items": []}


async def answer_project_question(project_name: str, question: str,
                                  memory_items: list, source_digests: list) -> dict:
    """Ask Bracket — answers grounded in connected-source memory, with sources."""
    mem = "\n".join(
        f'- [{m.get("category","?").upper()} · {m.get("status","?")}] {m.get("title","")} — {m.get("detail","")} (source: {m.get("source_label","?")}, {m.get("provider","?")})'
        for m in memory_items[:80]
    ) or "- (no memory yet)"
    digests = "\n\n".join(
        f'SOURCE "{d["label"]}" ({d["provider"]}):\n{(d.get("content") or "")[:3500]}' for d in source_digests[:4]
    ) or "(no connected source content)"
    prompt = f"""You are Bracket, answering a question about project "{project_name}" using ONLY the connected-source intelligence below.

RULES:
- Never invent decisions, approvals, deadlines or scope. If you cannot find a confirmed answer, say so plainly.
- Every claim must cite the source it came from.
- Keep the answer short (2-4 sentences).

PROJECT MEMORY:
{mem}

RAW SOURCE EXCERPTS:
{digests}

QUESTION: {question}

Return STRICT JSON only:
{{
  "answer": "the concise answer, or a plain statement that no confirmed answer exists",
  "confidence": "high|medium|low",
  "sources": [{{"label": "source name", "provider": "gmail|figma|github|notion|...", "detail": "what this source contributes"}}]
}}"""
    data = await _run(prompt, "haiku")
    return data if isinstance(data, dict) else {"answer": "I couldn't analyze this right now.", "confidence": "low", "sources": []}


async def suggest_reply_for_change(project_name: str, client_name: str, change: dict,
                                   related_memory: list) -> dict:
    """For a single detected change (scope shift, new requirement, deadline change, …),
    generate a short, professional client-facing reply the user can copy/send.
    Also enumerate the impacts and the recommended memory updates so the UI can
    show 'here's what changed, here's what I'll do, here's what you should say'."""
    context = "\n".join(
        f'- [{m.get("category","?").upper()}] {m.get("title","")}' for m in related_memory[:20]
    ) or "- (nothing relevant yet)"
    prompt = f"""You are Bracket, helping a designer respond to a client for project "{project_name}"
(client: {client_name or "the client"}).

A change was just detected in the connected work:
- Category: {change.get("category", "requirement")}
- Title:    {change.get("title", "")}
- Detail:   {change.get("detail", "")}
- Source:   {change.get("source_label", "?")} ({change.get("provider", "?")})

Related project memory:
{context}

Write a short (2-4 sentence) reply the designer could send to the client. It must:
- Acknowledge the request clearly.
- State what the designer will do next (concrete, not vague).
- If the change likely expands scope or shifts the timeline, say so professionally — never combative.
- No jargon, no filler. First-person "I".

Also enumerate the concrete IMPACTS this change has on the project (scope, time, cost, risk) and the
memory updates Bracket should apply if the designer accepts.

Return STRICT JSON only:
{{
  "reply": "the copy-ready reply text",
  "impacts": [
    {{"kind": "scope|timeline|effort|cost|risk", "detail": "1 short sentence, quantified when possible"}}
  ],
  "priority": "low|medium|high",
  "memory_updates": [
    {{"category": "scope|deliverable|timeline|decision|risk|assumption|commercial|requirement", "action": "add|update|remove", "title": "short", "detail": "1 sentence"}}
  ]
}}"""
    data = await _run(prompt, "haiku")
    if not isinstance(data, dict):
        return {"reply": "", "impacts": [], "priority": "medium", "memory_updates": []}
    return data
