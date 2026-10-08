"""Builders that turn a real Bracket project (project_memory, source_events,
source_connections, notifications) into the v2 workspace response shapes, with
dynamic categories. Reuses the existing AI (ask / suggest-reply)."""
from connectors import db
from connect_ai import answer_project_question, suggest_project_reply
from v2_categories import get_or_infer_categories, classify_items

_TONE = {"scope_creep": "warning", "conflict": "danger", "deadline": "warning"}
_PROVIDER_LABEL = {"gmail": "Gmail", "slack": "Slack", "figma": "Figma", "github": "GitHub", "meeting": "Notes", "notes": "Notes"}


def _initials(name):
    parts = (name or "").split()
    return ("".join(p[0] for p in parts[:2]).upper()) or "B"


async def _memory(pid):
    out = []
    async for m in db.project_memory.find({"project_id": pid, "status": {"$ne": "ignored"}}, {"_id": 0}).sort("occurred_at", -1):
        out.append(m)
    return out


def _evidence(m):
    return [{"provider": m.get("provider", "notes"), "author": m.get("requested_by", "") or "—",
             "where": m.get("source_label", ""), "at": m.get("occurred_at") or m.get("created_at"),
             "quote": m.get("detail", ""), "source_id": m.get("connection_id", "")}]


def _mem_item(m, cat_key):
    status = "current" if m.get("status") == "confirmed" else "pending"
    item = {
        "id": m["id"], "category": cat_key, "title": m.get("title", ""), "detail": m.get("detail", ""),
        "status": "conflict" if m.get("is_conflict") else status,
        "confidence": "high" if m.get("status") == "confirmed" else "medium",
        "created_at": m.get("created_at"), "changed_at": m.get("updated_at") or m.get("created_at"),
        "history": m.get("history") or [], "related": [], "evidence": _evidence(m),
        "owner": m.get("requested_by", ""),
    }
    if m.get("is_conflict"):
        item["conflict_values"] = m.get("conflict_values", [])
    return item


async def build_categories(project):
    cats = await get_or_infer_categories(project)
    mem = await _memory(project["id"])
    cmap = await classify_items(project, cats, mem)
    counts = {}
    for m in mem:
        k = cmap.get(m["id"])
        counts[k] = counts.get(k, 0) + 1
    return [{**c, "n": counts.get(c["key"], 0), "count": counts.get(c["key"], 0)} for c in cats], cats, mem, cmap


async def build_memory(project, category="", q=""):
    _, cats, mem, cmap = await build_categories(project)
    items = []
    for m in mem:
        k = cmap.get(m["id"]) or (cats[0]["key"] if cats else "scope")
        if category and k != category:
            continue
        if q and q.lower() not in (m.get("title", "") + m.get("detail", "")).lower():
            continue
        items.append(_mem_item(m, k))
    return items


async def _events(pid, limit=80):
    out = []
    async for e in db.source_events.find({"project_id": pid}, {"_id": 0}).sort("occurred_at", -1).limit(limit):
        out.append(e)
    return out


async def _connections(pid):
    out = []
    async for c in db.source_connections.find({"project_id": pid}, {"_id": 0}).sort("created_at", 1):
        out.append(c)
    return out


async def _notifications(pid):
    out = []
    async for n in db.notifications.find({"project_id": pid}, {"_id": 0}).sort("created_at", -1).limit(50):
        out.append(n)
    return out


def _workspace(project):
    name = project.get("name", "Untitled")
    return {"id": project["id"], "name": name, "client_name": project.get("client_name", ""),
            "business": project.get("client_name", "") or "Personal", "initials": _initials(name),
            "role": "owner", "status": "active", "summary": project.get("description", ""),
            "created_at": project.get("created_at"), "memory_updated_at": project.get("updated_at"),
            "last_seen_prev": project.get("updated_at"), "is_demo": project.get("is_demo", False)}


async def build_attention(project):
    pid = project["id"]
    items = []
    # Conflicts first
    async for m in db.project_memory.find({"project_id": pid, "is_conflict": True}, {"_id": 0}):
        items.append({"id": "att_" + m["id"], "kind": "conflict", "tone": "danger", "eyebrow": "Conflicting information",
                      "title": m.get("title", ""), "detail": m.get("detail", ""),
                      "chip": {"provider": m.get("provider", "gmail"), "label": m.get("source_label", ""), "at": m.get("occurred_at")},
                      "action": {"label": "Resolve", "kind": "resolve", "target": m["id"]}})
    # Unread change notifications
    for n in await _notifications(pid):
        if n.get("read"):
            continue
        items.append({"id": "att_" + n["id"], "kind": "scope_change", "tone": _TONE.get(n.get("type"), "warning"),
                      "eyebrow": "Change detected", "title": n.get("title", ""), "detail": n.get("detail", ""),
                      "chip": {"provider": n.get("provider", "gmail"), "label": n.get("source_label", ""), "at": n.get("created_at")},
                      "action": {"label": "Review", "kind": "review", "target": n.get("memory_id") or n["id"], "primary": True}})
    # Detected items awaiting confirmation
    async for m in db.project_memory.find({"project_id": pid, "status": "detected", "is_conflict": {"$ne": True}}, {"_id": 0}).limit(8):
        items.append({"id": "att_" + m["id"], "kind": "reply", "tone": "neutral", "eyebrow": "Needs your review",
                      "title": m.get("title", ""), "detail": m.get("detail", ""),
                      "chip": {"provider": m.get("provider", "gmail"), "label": m.get("source_label", ""), "at": m.get("occurred_at")},
                      "action": {"label": "Review", "kind": "review", "target": m["id"]}})
    return items


async def build_overview(project):
    cats, _, mem, _ = await build_categories(project)
    sources = [{"id": c["id"], "provider": c["provider"], "label": _PROVIDER_LABEL.get(c["provider"], c["provider"].title()),
                "status": c.get("status", "connected"), "last_sync_at": c.get("last_synced_at")} for c in await _connections(project["id"])]
    coming = [{"id": m["id"], "title": m.get("title", ""), "at": m.get("occurred_at"), "owner": m.get("requested_by", ""), "state": "open"}
              for m in mem if m.get("category") == "deadline"][:6]
    recent = [{"id": e["id"], "at": e.get("occurred_at"), "text": e.get("summary", "")} for e in (await _events(project["id"], 6))]
    att = await build_attention(project)
    return {"workspace": _workspace(project), "attention": att, "snoozed": 0, "saved": 0,
            "categories": cats, "sources": sources, "coming_up": coming, "since_last_visit": recent}


async def build_people(project):
    pid = project["id"]
    names = {}
    async for m in db.project_memory.find({"project_id": pid, "requested_by": {"$nin": ["", None]}}, {"_id": 0, "requested_by": 1, "provider": 1}):
        nm = m["requested_by"]
        names.setdefault(nm, {"id": "pe_" + str(abs(hash(nm)) % 100000), "name": nm, "role": "", "org": "",
                              "messages": 0, "summary": "", "role_in_work": "", "approves": "", "prefers": ""})
        names[nm]["messages"] += 1
    for p in names.values():
        p["summary"] = f'{p["messages"]} mentions'
    return list(names.values())


async def build_timeline(project):
    events = []
    for e in await _events(project["id"], 100):
        events.append({"id": e["id"], "at": e.get("occurred_at"), "kind": (e.get("event_type") or "activity").lower(),
                       "title": e.get("summary", ""), "actor": {"provider": e.get("provider", "notes"), "label": e.get("source_label", "")},
                       "meta": _PROVIDER_LABEL.get(e.get("provider"), ""), "source": e.get("provider")})
    return events


async def build_sources(project):
    out = []
    for c in await _connections(project["id"]):
        ev_count = await db.source_events.count_documents({"connection_id": c["id"]})
        mem_count = await db.project_memory.count_documents({"connection_id": c["id"], "status": {"$ne": "ignored"}})
        acts = []
        async for e in db.source_events.find({"connection_id": c["id"]}, {"_id": 0}).sort("occurred_at", -1).limit(5):
            acts.append({"at": e.get("occurred_at"), "text": e.get("summary", "")})
        out.append({"id": c["id"], "provider": c["provider"], "label": _PROVIDER_LABEL.get(c["provider"], c["provider"].title()),
                    "account": c.get("source_name", ""), "connected_at": c.get("created_at"), "connected_by": "",
                    "status": c.get("status", "connected"), "last_sync_at": c.get("last_synced_at"),
                    "messages": ev_count, "health": "ok", "reads_summary": c.get("source_name", ""),
                    "permissions": {"read": True, "send": c["provider"] == "gmail"},
                    "learned": {"total": mem_count, "by": {}, "corroborated": 0}, "activity": acts})
    return out


async def build_threads(project):
    """Lightweight: one thread per source connection, recent events as messages."""
    out = []
    for c in await _connections(project["id"]):
        msgs = []
        async for e in db.source_events.find({"connection_id": c["id"]}, {"_id": 0}).sort("occurred_at", -1).limit(8):
            msgs.append({"id": e["id"], "author": e.get("source_label", ""), "at": e.get("occurred_at"),
                         "body": [{"text": e.get("summary", "")}]})
        if not msgs:
            continue
        out.append({"id": c["id"], "provider": c["provider"], "kind": "email" if c["provider"] == "gmail" else c["provider"],
                    "title": c.get("source_name", ""), "who": c.get("source_name", ""), "participants": c.get("source_name", ""),
                    "count": len(msgs), "at": msgs[0]["at"], "preview": msgs[0]["body"][0]["text"][:100],
                    "needs_reply": c["provider"] == "gmail", "messages": list(reversed(msgs)),
                    "would_change": [], "created": [], "referenced": [], "can_send": c["provider"] == "gmail"})
    return out


async def build_reviews(project):
    """Each detected / conflict memory item becomes a reviewable change."""
    pid = project["id"]
    cats = await get_or_infer_categories(project)
    cat_label = {c["key"]: c["singular"] for c in cats}
    reviews = []
    async for m in db.project_memory.find({"project_id": pid, "status": "detected"}, {"_id": 0}).sort("occurred_at", -1).limit(20):
        reviews.append({
            "id": m["id"], "kind": "scope_change" if m.get("is_conflict") else "decision",
            "status": "pending", "label": "Conflict" if m.get("is_conflict") else "Proposed change",
            "title": m.get("title", ""),
            "detected": {"count": 1, "unit": m.get("provider", "update"), "at": m.get("occurred_at")},
            "interpretation": m.get("detail", ""),
            "trigger": {"provider": m.get("provider", "gmail"), "from": m.get("requested_by", ""), "to": "",
                        "at": m.get("occurred_at"), "subject": m.get("source_label", ""),
                        "body": [{"text": m.get("detail", "")}]},
            "compared": [], "reply_to": m.get("requested_by", ""),
            "proposals": [{"id": "pp_" + m["id"], "category": m.get("category", "requirement"), "op": "add",
                           "after": m.get("title", ""), "confidence": "medium", "rationale": m.get("detail", "")}],
        })
    return reviews


async def ask(project, question):
    pid = project["id"]
    mem = await _memory(pid)
    digests = []
    try:
        res = await answer_project_question(project.get("name", ""), question, mem, digests)
    except Exception:
        res = {}
    return {"id": "q_live", "question": question, "answer": (res or {}).get("answer", "I couldn't find enough in this project's memory to answer that yet."),
            "confidence": (res or {}).get("confidence", "medium"),
            "sources": [{"provider": s.get("provider", "notes"), "label": s.get("title", s.get("label", "")), "memory_id": s.get("id", "")}
                        for s in ((res or {}).get("sources") or [])][:6],
            "at": project.get("updated_at")}


async def draft(project, thread_id, instruction):
    conn = await db.source_connections.find_one({"id": thread_id, "project_id": project["id"]}, {"_id": 0})
    recent = []
    async for m in db.project_memory.find({"project_id": project["id"]}, {"_id": 0}).sort("occurred_at", -1).limit(20):
        recent.append(m)
    try:
        res = await suggest_project_reply(project.get("name", ""), project.get("client_name", ""), recent, instruction or "")
        body = (res or {}).get("reply") or (res or {}).get("body") or ""
    except Exception:
        body = ""
    if not body:
        body = "Thanks for the note — I'll follow up shortly with details."
    return {"draft": body, "to": (conn or {}).get("source_name", "")}
