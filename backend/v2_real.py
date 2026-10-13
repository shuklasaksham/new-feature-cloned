"""Builders that turn a real Bracket project (project_memory, source_events,
source_connections, notifications) into the v2 workspace response shapes, with
dynamic categories. Reuses the existing AI (ask / suggest-reply)."""
from datetime import datetime, timezone, timedelta

from connectors import db, parse_digest_messages
from connect_ai import answer_project_question, suggest_project_reply
from v2_categories import get_or_infer_categories, classify_items


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _parse(s):
    try:
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def attention_state(pid):
    out = {}
    async for s in db.v2_attention_state.find({"project_id": pid}, {"_id": 0}):
        out[s["aid"]] = s
    return out


async def set_attention_state(pid, aid, state, until=None):
    await db.v2_attention_state.update_one(
        {"project_id": pid, "aid": aid},
        {"$set": {"project_id": pid, "aid": aid, "state": state, "until": until, "updated_at": _now_iso()}},
        upsert=True)


async def clear_attention_state(pid, aid):
    await db.v2_attention_state.delete_one({"project_id": pid, "aid": aid})


async def partition_attention(project):
    """Split attention items into active / snoozed / saved using per-item state.
    An elapsed snooze flows back into the active list automatically."""
    items = await build_attention(project)
    state = await attention_state(project["id"])
    now = datetime.now(timezone.utc)
    active, snoozed, saved = [], [], []
    for it in items:
        s = state.get(it["id"])
        st = s.get("state") if s else None
        if st == "saved":
            saved.append({**it, "saved": True})
        elif st == "snoozed":
            until = s.get("until")
            exp = _parse(until) if until else None
            if until and exp and exp <= now:
                active.append(it)
            else:
                snoozed.append({**it, "snoozed_until": until})
        else:
            active.append(it)
    return active, snoozed, saved

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
        "versions": m.get("versions") or [],
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
    active, snoozed, saved = await partition_attention(project)
    return {"workspace": _workspace(project), "attention": active, "snoozed": len(snoozed), "saved": len(saved),
            "categories": [c for c in cats if not c.get("hidden")], "sources": sources, "coming_up": coming, "since_last_visit": recent}


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


_CAT_EVENT = {
    "scope": ("Scope learned", "info"), "scope_change": ("Scope change", "warning"),
    "decision": ("Decision", "info"), "deliverable": ("Deliverable", "info"),
    "requirement": ("Requirement", "info"), "commitment": ("Commitment", "info"),
    "deadline": ("Deadline", "warning"), "person": ("Person", None), "timeline": ("Timeline", "info"),
}


async def build_timeline(project):
    """Everything that happened in this workspace: the connect/sync events AND
    what Bracket learned from inside each connected thread (one event per memory
    item, timestamped to when it happened in the conversation)."""
    pid = project["id"]
    events = []
    # 1) Source events (connected, synced, …)
    for e in await _events(pid, 100):
        prov = e.get("provider", "notes")
        label = e.get("source_label", "")
        at = e.get("occurred_at")
        events.append({
            "id": e["id"], "at": at, "kind": (e.get("event_type") or "activity").lower(),
            "title": e.get("summary", ""), "actor": {"provider": prov, "label": label},
            "meta": _PROVIDER_LABEL.get(prov, ""), "source": prov, "system": True,
            "detail": {"heading": e.get("summary", ""), "eyebrow": "Source", "when": at,
                       "source": {"provider": prov, "label": label} if label else None},
        })
    # 2) What Bracket learned from the threads — one event per memory item.
    async for m in db.project_memory.find({"project_id": pid, "status": {"$ne": "ignored"}}, {"_id": 0}).sort("occurred_at", -1).limit(300):
        cat = m.get("category", "")
        kind_label, dot = _CAT_EVENT.get(cat, ("Learned", "info"))
        if m.get("is_conflict"):
            kind_label, dot = "Conflict", "danger"
        prov = m.get("provider", "notes")
        label = m.get("source_label", "") or m.get("requested_by", "")
        at = m.get("occurred_at") or m.get("created_at")
        verb = "Change detected" if m.get("status") == "detected" else kind_label
        events.append({
            "id": m["id"], "at": at, "kind": cat or "memory",
            "title": f"{kind_label} — {m.get('title', '')}",
            "actor": {"provider": prov, "label": label},
            "meta": verb, "source": prov, "dot": dot, "memory": True, "memory_id": m["id"],
            "detail": {"heading": m.get("title", ""), "eyebrow": kind_label, "when": at,
                       "rows": [["Category", kind_label], ["Found in", _PROVIDER_LABEL.get(prov, prov.title())]] + ([["Mentioned by", m.get("requested_by")]] if m.get("requested_by") else []),
                       "result": [{"category": kind_label, "text": m.get("detail", "") or m.get("title", "")}],
                       "source": {"provider": prov, "label": label, "quote": m.get("detail", "")} if label or m.get("detail") else None},
        })
    # Newest first across both kinds.
    events.sort(key=lambda x: _parse(x.get("at")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return events


def _event_type(e):
    """Coarse type tag used by the Timeline filter."""
    if e.get("system"):
        return "sources"
    prov = e.get("source")
    if prov in ("notes", "file"):
        return "notes"
    if e.get("meta") == "Change detected" or e.get("dot") == "danger" or e.get("kind") in ("scope_change", "conflict"):
        return "changes"
    return "memory"


def filter_timeline(events, type="all", source="all", range="all", memory_only=False, q=""):
    q = (q or "").strip().lower()
    cutoff = None
    days = {"7d": 7, "30d": 30, "90d": 90}.get(range)
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    out = []
    for e in events:
        if source and source != "all" and e.get("source") != source:
            continue
        if memory_only and not e.get("memory"):
            continue
        if type and type != "all" and _event_type(e) != type:
            continue
        if cutoff:
            at = _parse(e.get("at"))
            if at and at < cutoff:
                continue
        if q:
            hay = (e.get("title", "") + " " + (e.get("meta", "") or "") + " " + str((e.get("actor") or {}).get("label", ""))).lower()
            if q not in hay:
                continue
        out.append(e)
    return out


def timeline_counts(events):
    c = {"all": len(events), "changes": 0, "memory": 0, "notes": 0, "sources": 0, "messages": 0}
    for e in events:
        c[_event_type(e)] = c.get(_event_type(e), 0) + 1
    return c


async def build_sources(project):
    out = []
    for c in await _connections(project["id"]):
        prov = c["provider"]
        mem_count = await db.project_memory.count_documents({"connection_id": c["id"], "status": {"$ne": "ignored"}})
        msg_count = len(parse_digest_messages(prov, c.get("content_cache") or "")) or c.get("message_count") or 0
        acts = []
        async for e in db.source_events.find({"connection_id": c["id"]}, {"_id": 0}).sort("occurred_at", -1).limit(5):
            acts.append({"at": e.get("occurred_at"), "text": e.get("summary", "")})
        thread_item = {"id": c["id"], "title": c.get("source_name", ""), "subject": c.get("source_name", ""),
                       "name": c.get("source_name", ""), "from": c.get("client_email") or _PROVIDER_LABEL.get(prov, prov.title()),
                       "messages": msg_count, "memories": mem_count,
                       "reading": False, "at": c.get("last_activity_at") or c.get("created_at")}
        key = "channels" if prov == "slack" else "notes" if prov == "notes" else "threads"
        out.append({"id": c["id"], "provider": prov, "label": _PROVIDER_LABEL.get(prov, prov.title()),
                    "account": c.get("source_name", ""), "connected_at": c.get("created_at"), "connected_by": "",
                    "status": c.get("status", "connected"), "last_sync_at": c.get("last_synced_at"),
                    "messages": msg_count, key: [thread_item], "health": "ok", "reads_summary": c.get("source_name", ""),
                    "permissions": {"read": True, "send": prov in ("gmail", "slack")},
                    "learned": {"total": mem_count, "by": {}, "corroborated": 0}, "activity": acts})
    return out


async def build_threads(project):
    """One thread per source connection, with the REAL messages (and their real
    dates) recovered from the stored content_cache digest."""
    out = []
    for c in await _connections(project["id"]):
        prov = c.get("provider")
        parsed = parse_digest_messages(prov, c.get("content_cache") or "")
        msgs = []
        for i, pm in enumerate(parsed):
            msgs.append({"id": f"{c['id']}-{i}", "author": pm.get("author", ""),
                         "at": pm.get("at") or c.get("last_activity_at") or c.get("created_at"),
                         "body": [{"text": pm.get("text", "")}]})
        if not msgs:
            # Fallback: synthesize from source events when no digest is stored.
            async for e in db.source_events.find({"connection_id": c["id"]}, {"_id": 0}).sort("occurred_at", -1).limit(8):
                msgs.append({"id": e["id"], "author": e.get("source_label", ""), "at": e.get("occurred_at"),
                             "body": [{"text": e.get("summary", "")}]})
            msgs = list(reversed(msgs))
        if not msgs:
            continue
        who = c.get("source_name", "") or _PROVIDER_LABEL.get(prov, prov)
        out.append({"id": c["id"], "provider": prov, "kind": "email" if prov == "gmail" else prov,
                    "title": c.get("source_name", ""), "who": who, "participants": who,
                    "count": len(msgs), "at": msgs[-1]["at"], "started_at": msgs[0]["at"],
                    "preview": (msgs[-1]["body"][0]["text"] or "")[:100],
                    "needs_reply": prov == "gmail", "messages": msgs,
                    "would_change": [], "created": [], "referenced": [], "can_send": prov in ("gmail", "slack")})
    return out


async def build_reviews(project):
    """Each detected / conflict memory item becomes a reviewable change."""
    pid = project["id"]
    cats = await get_or_infer_categories(project)
    cat_label = {c["key"]: c["singular"] for c in cats}
    # recipient + provider per connection, so an accepted review can be replied to
    conn_map = {}
    async for c in db.source_connections.find({"project_id": pid}, {"_id": 0, "id": 1, "client_email": 1, "provider": 1, "source_name": 1}):
        conn_map[c["id"]] = c
    reviews = []
    async for m in db.project_memory.find({"project_id": pid, "status": "detected"}, {"_id": 0}).sort("occurred_at", -1).limit(20):
        conn = conn_map.get(m.get("connection_id")) or {}
        reviews.append({
            "id": m["id"], "kind": "scope_change" if m.get("is_conflict") else "decision",
            "status": "pending", "label": "Conflict" if m.get("is_conflict") else "Proposed change",
            "title": m.get("title", ""),
            "detected": {"count": 1, "unit": m.get("provider", "update"), "at": m.get("occurred_at")},
            "interpretation": m.get("detail", ""),
            "category": m.get("category", "requirement"),
            "connection_id": m.get("connection_id"),
            "provider": conn.get("provider", m.get("provider", "gmail")),
            "to": conn.get("client_email", ""),
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
    res = res or {}
    srcs = res.get("sources") or []
    sources = [{"n": i + 1, "provider": s.get("provider", "notes"),
                "label": s.get("title", s.get("label", "")), "meta": s.get("meta", ""),
                "memory_id": s.get("id", "")}
               for i, s in enumerate(srcs)][:6]
    answer_text = res.get("answer") or ""
    if not answer_text:
        return {"id": "q_live", "question": question, "status": "no_answer",
                "title": "No answer yet",
                "answer": "Bracket couldn't find enough in this project's memory to answer that yet. Connect a source or add a note so it has something to read.",
                "basis": {"memories": len(mem), "sources": 0},
                "confidence": "low", "sources": [], "next": [], "at": project.get("updated_at")}
    return {"id": "q_live", "question": question,
            "lead": answer_text, "answer": answer_text, "paragraphs": [],
            "confidence": res.get("confidence", "medium"),
            "basis": {"memories": len(mem), "sources": len(sources)},
            "sources": sources, "next": [], "at": project.get("updated_at")}


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
    prov = (conn or {}).get("provider")
    via = prov if prov in ("gmail", "slack") else "copy"
    to = (conn or {}).get("client_email") if prov == "gmail" else (conn or {}).get("source_name", "")
    return {"body": body, "to": to or (conn or {}).get("source_name", ""),
            "via": via, "based_on": [], "note": ""}



async def accept_review(project, rid, selected, edits):
    """Apply a reviewed change to the exact memory field.

    For real projects each review id IS the memory id and carries one proposal
    (`pp_<memory_id>`). We apply the (possibly edited) proposed text to the
    memory's title, keep the previous version in history, and confirm it."""
    pid = project["id"]
    selected = selected or []
    edits = edits or {}
    reviews = await build_reviews(project)
    review = next((r for r in reviews if r["id"] == rid), None)
    if not review:
        return {"accepted": 0, "impact": "", "applied": False}

    m = await db.project_memory.find_one({"id": rid, "project_id": pid}, {"_id": 0})
    if not m:
        return {"accepted": 0, "impact": "", "applied": False}

    proposals = review.get("proposals") or []
    chosen = [p for p in proposals if (not selected or p["id"] in selected)]
    if not chosen:
        return {"accepted": 0, "impact": "", "applied": False}

    # One memory per real review — take the (edited) text of the first chosen.
    p = chosen[0]
    after = (edits.get(p["id"]) or p.get("after") or m.get("title") or "").strip()
    old_title = m.get("title", "")
    versions = list(m.get("versions") or [])
    history = list(m.get("history") or [])
    changed = bool(after) and after != old_title
    now = _now_iso()
    was_confirmed = m.get("status") == "confirmed"
    if changed:
        versions.append({"at": m.get("updated_at") or m.get("created_at") or now,
                         "title": old_title, "superseded_at": now})
        history.insert(0, {"at": now, "text": f"Accepted change: now “{after}”"})
    else:
        history.insert(0, {"at": now, "text": "Change accepted"})

    set_fields = {"title": after or old_title, "status": "confirmed", "is_conflict": False,
                  "versions": versions, "history": history, "updated_at": now}
    # Only capture the true original the first time (so repeated accepts don't
    # clobber the value undo should restore to).
    if not was_confirmed:
        set_fields["pre_accept_title"] = old_title
    await db.project_memory.update_one(
        {"id": rid, "project_id": pid},
        {"$set": set_fields, "$unset": {"conflict_values": ""}})

    cats = await get_or_infer_categories(project)
    label = next((c["singular"] for c in cats if c["key"] == p.get("category")), p.get("category", "memory"))
    return {"accepted": len(chosen), "impact": f"{label} updated +{len(chosen)}", "applied": True}


async def undo_review(project, rid):
    """Restore the pre-accept title for a memory that was just accepted."""
    pid = project["id"]
    m = await db.project_memory.find_one({"id": rid, "project_id": pid}, {"_id": 0})
    if not m or "pre_accept_title" not in m:
        return {"ok": True}
    versions = [v for v in (m.get("versions") or []) if v.get("title") != m.get("pre_accept_title")]
    await db.project_memory.update_one(
        {"id": rid, "project_id": pid},
        {"$set": {"title": m["pre_accept_title"], "status": "detected",
                  "versions": versions, "updated_at": _now_iso()},
         "$unset": {"pre_accept_title": ""}})
    return {"ok": True}
