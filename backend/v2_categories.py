"""Dynamic, AI-inferred memory categories per workspace.

Old Bracket had fixed categories (Scope/Deliverables/…). v2 infers a category
set tailored to each project's domain from its content (e.g. a cloth-manufacturing
project gets Specifications/Samples/Payments/Commitments). Categories are stored
on the project doc and may evolve as new kinds of information arrive; existing
memory items are mapped onto the live set.
"""
import logging
import re

from ai_engine import _run
from connectors import db

logger = logging.getLogger("bracket")

# Safety-net set used before any content exists / if the model is unavailable.
DEFAULT_CATS = [
    {"key": "scope", "label": "Scope", "singular": "Scope", "description": "What is and isn't part of this work."},
    {"key": "decision", "label": "Decisions", "singular": "Decision", "description": "Choices that were agreed, and who agreed them."},
    {"key": "deliverable", "label": "Deliverables", "singular": "Deliverable", "description": "What you'll hand over."},
    {"key": "requirement", "label": "Requirements", "singular": "Requirement", "description": "Conditions the work has to meet."},
    {"key": "commitment", "label": "Commitments", "singular": "Commitment", "description": "Promises made by you or the client."},
    {"key": "person", "label": "People", "singular": "Person", "description": "Everyone involved in this work."},
]

# Legacy fixed category -> reasonable default dynamic key (fallback mapping).
LEGACY_MAP = {
    "requirement": "requirement", "decision": "decision", "deliverable": "deliverable",
    "deadline": "commitment", "scope_change": "scope", "scope": "scope",
    "question": "decision", "commitment": "commitment", "person": "person",
    "risk": "requirement", "assumption": "requirement", "commercial": "commitment", "timeline": "commitment",
}


def _slug(label):
    return re.sub(r"[^a-z0-9]+", "_", (label or "").lower()).strip("_") or "other"


async def infer_categories(name, description, sample_titles):
    samples = "\n".join(f"- {t}" for t in sample_titles[:40]) or "- (no activity yet)"
    prompt = f"""You are Bracket. Choose the set of "memory categories" that best fit THIS project's domain.
Different work needs different buckets: a website project might use Scope, Deliverables, Decisions, Requirements, Commitments;
a cloth-manufacturing order might use Specifications, Samples, Payments, Commitments, People.

Project name: {name}
Description: {description or "(none)"}
Recent items extracted so far:
{samples}

Return 4-7 categories that a smart operator would actually use for this specific work.
ALWAYS include a "People" category. Keep labels short (1-2 words).
Return STRICT JSON only:
{{"categories": [{{"key": "snake_case", "label": "Short Plural", "singular": "Short Singular", "description": "one short sentence"}}]}}"""
    try:
        data = await _run(prompt, "sonnet")
        cats = (data or {}).get("categories") or []
        out = []
        seen = set()
        for c in cats:
            label = (c.get("label") or "").strip()
            if not label:
                continue
            key = _slug(c.get("key") or label)
            if key in seen:
                continue
            seen.add(key)
            out.append({"key": key, "label": label,
                        "singular": (c.get("singular") or label).strip(),
                        "description": (c.get("description") or "").strip()})
        if not any(c["key"] == "person" or c["label"].lower() == "people" for c in out):
            out.append(DEFAULT_CATS[-1])
        return out if len(out) >= 3 else DEFAULT_CATS
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[v2cats] infer failed: {e}")
        return DEFAULT_CATS


async def get_or_infer_categories(project):
    """Return the project's dynamic categories, inferring + storing on first use."""
    existing = project.get("v2_categories")
    if existing:
        return existing
    pid = project["id"]
    titles = []
    async for m in db.project_memory.find({"project_id": pid, "status": {"$ne": "ignored"}}, {"_id": 0, "title": 1}).limit(40):
        titles.append(m.get("title", ""))
    cats = await infer_categories(project.get("name", ""), project.get("description", ""), titles)
    await db.projects.update_one({"id": pid}, {"$set": {"v2_categories": cats}})
    return cats


async def classify_items(project, categories, items, force=False):
    """Return {memory_id: category_key} for the given memory items, caching the
    mapping on the project doc and only classifying newly-seen items.
    When force=True, every item is re-classified from scratch (used after a
    user renames / merges / adds a category and asks to re-map memory)."""
    pid = project["id"]
    cat_map = {} if force else dict(project.get("v2_cat_map") or {})
    valid = {c["key"] for c in categories}
    unmapped = [it for it in items if it["id"] not in cat_map or cat_map[it["id"]] not in valid]

    # People items always map to the people category when present.
    people_key = next((c["key"] for c in categories if c["key"] == "person" or c["label"].lower() == "people"), None)

    to_llm = []
    for it in unmapped:
        if it.get("category") == "person" and people_key:
            cat_map[it["id"]] = people_key
        else:
            # heuristic fallback first
            cat_map[it["id"]] = _nearest(it, categories)
            to_llm.append(it)

    if to_llm and len(valid) > 1:
        lines = "\n".join(f'{it["id"]}: {it.get("title","")} — {it.get("detail","")[:80]}' for it in to_llm[:60])
        cat_lines = "\n".join(f'- {c["key"]}: {c["label"]} ({c["description"]})' for c in categories)
        prompt = f"""Classify each memory item into exactly one category key.
Categories:
{cat_lines}

Items (format "id: title — detail"):
{lines}

Return STRICT JSON only: {{"map": {{"<item_id>": "<category_key>"}}}}"""
        try:
            data = await _run(prompt, "sonnet")
            got = (data or {}).get("map") or {}
            for mid, key in got.items():
                k = _slug(key)
                if k in valid:
                    cat_map[mid] = k
        except Exception as e:  # noqa: BLE001
            logger.warning(f"[v2cats] classify failed: {e}")

    await db.projects.update_one({"id": pid}, {"$set": {"v2_cat_map": cat_map}})
    return cat_map


def _nearest(item, categories):
    """Heuristic: map legacy category to the closest dynamic key by name overlap."""
    legacy = item.get("category", "")
    # exact key match
    keys = {c["key"] for c in categories}
    if legacy in keys:
        return legacy
    target = LEGACY_MAP.get(legacy, legacy)
    if target in keys:
        return target
    # label token overlap
    for c in categories:
        if target and (target in c["key"] or c["key"] in target):
            return c["key"]
    return categories[0]["key"]



async def _mem_items(pid):
    out = []
    async for m in db.project_memory.find({"project_id": pid, "status": {"$ne": "ignored"}}, {"_id": 0}).sort("occurred_at", -1):
        out.append(m)
    return out


async def rename_category(project, key, label):
    """Rename a category in place (key stays stable so the memory map holds)."""
    label = (label or "").strip()
    if not label:
        return await get_or_infer_categories(project)
    cats = await get_or_infer_categories(project)
    for c in cats:
        if c["key"] == key:
            c["label"] = label
            c["singular"] = label
    await db.projects.update_one({"id": project["id"]}, {"$set": {"v2_categories": cats}})
    return cats


async def add_category(project, name, description=""):
    """Add a new category and re-map all memory so existing items can flow into
    it (and any other category). Returns the updated category set."""
    name = (name or "").strip()
    cats = await get_or_infer_categories(project)
    key = _slug(name)
    if not name or any(c["key"] == key for c in cats):
        return cats
    singular = name[:-1] if name.endswith("s") and len(name) > 3 else name
    cats = cats + [{"key": key, "label": name, "singular": singular, "description": (description or "").strip()}]
    await db.projects.update_one({"id": project["id"]}, {"$set": {"v2_categories": cats}})
    mem = await _mem_items(project["id"])
    await classify_items({**project, "v2_categories": cats}, cats, mem, force=True)
    return cats


async def merge_category(project, key, into):
    """Merge category `key` into `into`: remap every memory item and drop `key`."""
    cats = await get_or_infer_categories(project)
    if key == into or not any(c["key"] == into for c in cats):
        return cats
    cat_map = dict(project.get("v2_cat_map") or {})
    for mid, k in list(cat_map.items()):
        if k == key:
            cat_map[mid] = into
    cats = [c for c in cats if c["key"] != key]
    await db.projects.update_one({"id": project["id"]}, {"$set": {"v2_categories": cats, "v2_cat_map": cat_map}})
    return cats
