"""Connect Work — source connections layer.

ONE PROJECT → MANY SOURCE CONNECTIONS. One-click OAuth for end users
(Figma / Gmail / Slack / GitHub / Notion) — provider OAuth app credentials
are an ADMIN concern configured via backend env vars, never exposed to
users. Providers without configured credentials show "setup_required".

Privacy boundary: even when OAuth grants broader account access, Bracket
only ingests/stores/processes the specific sources the user selects.
"""
import asyncio
import base64
import hashlib
import json as _json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from auth import current_user
from connect_ai import analyze_connected_source, answer_project_question, detect_source_updates

logger = logging.getLogger("bracket")
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]

_fernet = Fernet(os.environ["CONNECT_TOKEN_KEY"].encode())

router = APIRouter(prefix="/api")

PUBLIC_BASE = (os.environ.get("PUBLIC_BASE_URL") or "").rstrip("/")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uuid() -> str:
    return str(uuid.uuid4())


def _enc(s: str) -> str:
    return _fernet.encrypt(s.encode()).decode()


def _dec(s: str) -> str:
    return _fernet.decrypt(s.encode()).decode()


def _hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8", errors="replace")).hexdigest()


# ---------------------------------------------------------------------------
# OAuth app credentials (admin-side, from env). A provider is "configured"
# when both its client id + secret exist.
# ---------------------------------------------------------------------------
OAUTH_CONF: Dict[str, Dict[str, str]] = {
    "figma":  {"id": os.environ.get("FIGMA_CLIENT_ID", ""),  "secret": os.environ.get("FIGMA_CLIENT_SECRET", "")},
    "gmail":  {"id": os.environ.get("GOOGLE_OAUTH_CLIENT_ID", ""), "secret": os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "")},
    "slack":  {"id": os.environ.get("SLACK_CLIENT_ID", ""),  "secret": os.environ.get("SLACK_CLIENT_SECRET", "")},
    "github": {"id": os.environ.get("GITHUB_CLIENT_ID", ""), "secret": os.environ.get("GITHUB_CLIENT_SECRET", "")},
    "notion": {"id": os.environ.get("NOTION_CLIENT_ID", ""), "secret": os.environ.get("NOTION_CLIENT_SECRET", "")},
}


def _configured(provider: str) -> bool:
    c = OAUTH_CONF.get(provider) or {}
    return bool(c.get("id") and c.get("secret"))


def _redirect_uri(provider: str, request: Optional[Request] = None) -> str:
    """Derive from the requesting host so OAuth works on preview AND production
    (both callback URLs must be registered in the provider's OAuth app)."""
    base = PUBLIC_BASE
    if request is not None:
        host = request.headers.get("x-forwarded-host") or ""
        if not host:
            host = request.headers.get("host") or ""
        if host and "cluster" not in host and "localhost" not in host:
            proto = request.headers.get("x-forwarded-proto", "https")
            base = f"{proto}://{host}"
    return f"{base}/api/connect/{provider}/callback"


PROVIDERS: Dict[str, Dict[str, Any]] = {
    "gmail":    {"label": "Gmail", "category": "Communication", "desc": "Connect a specific email conversation", "impl": "oauth",
                 "select_mode": "list", "select_hint": "Choose the email conversation you want Bracket to understand.", "multi": True},
    "slack":    {"label": "Slack", "category": "Communication", "desc": "Connect a specific channel, conversation or thread", "impl": "oauth",
                 "select_mode": "list", "select_hint": "Choose the channel or conversation Bracket should understand.", "multi": True},
    "whatsapp": {"label": "WhatsApp", "category": "Communication", "desc": "Connect a supported client conversation", "impl": "soon"},
    "teams":    {"label": "Microsoft Teams", "category": "Communication", "desc": "Connect a specific conversation", "impl": "soon"},
    "figma":    {"label": "Figma", "category": "Design", "desc": "Connect a specific design file", "impl": "oauth",
                 "select_mode": "figma", "select_hint": "Pick files from your team, or paste a file link.", "multi": True},
    "adobe":    {"label": "Adobe", "category": "Design", "desc": "Connect a specific design/project source", "impl": "soon"},
    "gdrive":   {"label": "Google Drive", "category": "Files & Knowledge", "desc": "Connect a specific file or folder", "impl": "soon"},
    "notion":   {"label": "Notion", "category": "Files & Knowledge", "desc": "Connect a specific page or workspace source", "impl": "oauth",
                 "select_mode": "list", "select_hint": "Pages you granted Bracket access to during authorization.", "multi": True},
    "dropbox":  {"label": "Dropbox", "category": "Files & Knowledge", "desc": "Connect a specific file or folder", "impl": "soon"},
    "github":   {"label": "GitHub", "category": "Development", "desc": "Connect a repository, issue or project", "impl": "oauth",
                 "select_mode": "list", "select_hint": "Your most recently active repositories.", "multi": True},
    "linear":   {"label": "Linear", "category": "Development", "desc": "Connect a project or issue", "impl": "soon"},
}

CATEGORY_ORDER = ["Communication", "Design", "Files & Knowledge", "Development"]


# ---------------------------------------------------------------------------
# Account token helpers — token_enc always stores a JSON blob:
#   {"access_token", "refresh_token"?, "expires_at"?}
# Legacy PAT accounts (raw string) are still readable.
# ---------------------------------------------------------------------------
def _read_blob(account: dict) -> dict:
    raw = _dec(account["token_enc"])
    try:
        blob = _json.loads(raw)
        if isinstance(blob, dict) and blob.get("access_token"):
            return blob
    except Exception:
        pass
    return {"access_token": raw}


async def _store_blob(user_id: str, provider: str, blob: dict, label: str):
    now = _now_iso()
    await db.integration_accounts.update_one(
        {"user_id": user_id, "provider": provider},
        {"$set": {"token_enc": _enc(_json.dumps(blob)), "label": label, "status": "connected", "updated_at": now},
         "$setOnInsert": {"id": _uuid(), "user_id": user_id, "provider": provider, "created_at": now}},
        upsert=True,
    )


async def _http() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=10.0))


async def _access_token(account: dict) -> str:
    """Live access token; refresh where the provider supports it."""
    blob = _read_blob(account)
    exp = blob.get("expires_at") or 0
    if not exp or exp > time.time() + 60:
        return blob["access_token"]
    provider = account["provider"]
    conf = OAUTH_CONF.get(provider) or {}
    async with await _http() as c:
        if provider == "gmail":
            r = await c.post("https://oauth2.googleapis.com/token", data={
                "client_id": conf["id"], "client_secret": conf["secret"],
                "refresh_token": blob.get("refresh_token", ""), "grant_type": "refresh_token"})
            if r.status_code == 200:
                tok = r.json()
                blob.update(access_token=tok["access_token"], expires_at=time.time() + int(tok.get("expires_in", 3600)))
        elif provider == "figma":
            r = await c.post("https://api.figma.com/v1/oauth/refresh", data={"refresh_token": blob.get("refresh_token", "")},
                             auth=(conf["id"], conf["secret"]))
            if r.status_code == 200:
                tok = r.json()
                blob.update(access_token=tok["access_token"], expires_at=time.time() + int(tok.get("expires_in", 7776000)))
                if tok.get("refresh_token"):
                    blob["refresh_token"] = tok["refresh_token"]
        else:
            return blob["access_token"]
    if blob.get("expires_at", 0) <= time.time():
        raise HTTPException(401, f"{PROVIDERS[provider]['label']} connection expired — please reconnect.")
    await db.integration_accounts.update_one({"id": account["id"]}, {"$set": {"token_enc": _enc(_json.dumps(blob))}})
    return blob["access_token"]


async def _get_account(user_id: str, provider: str) -> dict:
    acc = await db.integration_accounts.find_one({"user_id": user_id, "provider": provider}, {"_id": 0})
    if not acc:
        raise HTTPException(400, f"Connect your {PROVIDERS.get(provider, {}).get('label', provider)} account first.")
    return acc


# ---------------------------------------------------------------------------
# OAuth flow — generic start + per-provider callback exchange
# ---------------------------------------------------------------------------
from urllib.parse import urlencode


def _auth_url_for(provider: str, state: str, ru: str) -> str:
    conf = OAUTH_CONF[provider]
    if provider == "figma":
        return "https://www.figma.com/oauth?" + urlencode({
            "client_id": conf["id"], "redirect_uri": ru, "scope": "file_read",
            "state": state, "response_type": "code"})
    if provider == "gmail":
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
            "client_id": conf["id"], "redirect_uri": ru, "response_type": "code",
            "scope": "https://www.googleapis.com/auth/gmail.readonly",
            "access_type": "offline", "prompt": "consent", "state": state})
    if provider == "slack":
        return "https://slack.com/oauth/v2/authorize?" + urlencode({
            "client_id": conf["id"], "redirect_uri": ru, "state": state,
            "user_scope": "channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history,users:read"})
    if provider == "github":
        return "https://github.com/login/oauth/authorize?" + urlencode({
            "client_id": conf["id"], "redirect_uri": ru, "scope": "repo", "state": state})
    if provider == "notion":
        return "https://api.notion.com/v1/oauth/authorize?" + urlencode({
            "client_id": conf["id"], "redirect_uri": ru, "response_type": "code",
            "owner": "user", "state": state})
    raise HTTPException(400, "OAuth not supported for this provider.")


async def _exchange_code(provider: str, code: str, ru: str) -> dict:
    """Exchange auth code → token blob + account label."""
    conf = OAUTH_CONF[provider]
    async with await _http() as c:
        if provider == "figma":
            r = await c.post("https://api.figma.com/v1/oauth/token", data={
                "redirect_uri": ru, "code": code, "grant_type": "authorization_code"},
                auth=(conf["id"], conf["secret"]))
            if r.status_code != 200:
                raise HTTPException(400, "Figma authorization failed.")
            tok = r.json()
            blob = {"access_token": tok["access_token"], "refresh_token": tok.get("refresh_token", ""),
                    "expires_at": time.time() + int(tok.get("expires_in", 7776000))}
            me = await c.get("https://api.figma.com/v1/me", headers={"Authorization": f"Bearer {blob['access_token']}"})
            label = (me.json().get("email") if me.status_code == 200 else "") or "Figma account"
            return {"blob": blob, "label": label}
        if provider == "gmail":
            r = await c.post("https://oauth2.googleapis.com/token", data={
                "code": code, "client_id": conf["id"], "client_secret": conf["secret"],
                "redirect_uri": ru, "grant_type": "authorization_code"})
            if r.status_code != 200:
                raise HTTPException(400, "Gmail authorization failed.")
            tok = r.json()
            blob = {"access_token": tok.get("access_token", ""), "refresh_token": tok.get("refresh_token", ""),
                    "expires_at": time.time() + int(tok.get("expires_in", 3600))}
            prof = await c.get("https://gmail.googleapis.com/gmail/v1/users/me/profile",
                               headers={"Authorization": f"Bearer {blob['access_token']}"})
            label = (prof.json().get("emailAddress") if prof.status_code == 200 else "") or "Gmail"
            return {"blob": blob, "label": label}
        if provider == "slack":
            r = await c.post("https://slack.com/api/oauth.v2.access", data={
                "code": code, "client_id": conf["id"], "client_secret": conf["secret"], "redirect_uri": ru})
            data = r.json() if r.status_code == 200 else {}
            authed = (data.get("authed_user") or {})
            if not data.get("ok") or not authed.get("access_token"):
                raise HTTPException(400, "Slack authorization failed.")
            blob = {"access_token": authed["access_token"]}
            label = (data.get("team") or {}).get("name") or "Slack workspace"
            return {"blob": blob, "label": label}
        if provider == "github":
            r = await c.post("https://github.com/login/oauth/access_token", data={
                "code": code, "client_id": conf["id"], "client_secret": conf["secret"], "redirect_uri": ru},
                headers={"Accept": "application/json"})
            tok = r.json() if r.status_code == 200 else {}
            if not tok.get("access_token"):
                raise HTTPException(400, "GitHub authorization failed.")
            blob = {"access_token": tok["access_token"]}
            me = await c.get("https://api.github.com/user", headers=_gh_headers(blob["access_token"]))
            label = (me.json().get("login") if me.status_code == 200 else "") or "GitHub account"
            return {"blob": blob, "label": label}
        if provider == "notion":
            basic = base64.b64encode(f"{conf['id']}:{conf['secret']}".encode()).decode()
            r = await c.post("https://api.notion.com/v1/oauth/token",
                             headers={"Authorization": f"Basic {basic}", "Content-Type": "application/json"},
                             json={"grant_type": "authorization_code", "code": code, "redirect_uri": ru})
            tok = r.json() if r.status_code == 200 else {}
            if not tok.get("access_token"):
                raise HTTPException(400, "Notion authorization failed.")
            blob = {"access_token": tok["access_token"]}
            label = tok.get("workspace_name") or "Notion workspace"
            return {"blob": blob, "label": label}
    raise HTTPException(400, "OAuth not supported for this provider.")


@router.get("/connect/{provider}/auth-url")
async def oauth_auth_url(provider: str, request: Request):
    user = await current_user(request, db)
    if provider not in OAUTH_CONF:
        raise HTTPException(400, "This integration doesn't use OAuth.")
    if not _configured(provider):
        raise HTTPException(400, f"{PROVIDERS[provider]['label']} isn't configured yet — an admin needs to add its OAuth credentials.")
    state = _uuid()
    ru = _redirect_uri(provider, request)
    await db.oauth_states.insert_one({"state": state, "user_id": user["user_id"], "provider": provider,
                                      "redirect_uri": ru, "created_at": _now_iso()})
    return {"url": _auth_url_for(provider, state, ru)}


_CALLBACK_HTML = """<!doctype html><html><body style="background:#08090A;color:#E8E8EA;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:96vh">
<p>{msg}</p>
<script>
try {{ if (window.opener) window.opener.postMessage("bracket-oauth:{provider}:{result}", "*"); }} catch (e) {{}}
setTimeout(function() {{ window.close(); }}, 1200);
</script></body></html>"""


@router.get("/connect/{provider}/callback")
async def oauth_callback(provider: str, code: str = "", state: str = "", error: str = ""):
    if provider not in OAUTH_CONF:
        raise HTTPException(404, "Unknown provider")
    row = await db.oauth_states.find_one({"state": state, "provider": provider})
    if row:
        await db.oauth_states.delete_one({"state": state})
    if error or not code or not row:
        return HTMLResponse(_CALLBACK_HTML.format(msg="Authorization was cancelled. You can close this tab.", provider=provider, result="error"), status_code=400)
    try:
        result = await _exchange_code(provider, code, row.get("redirect_uri") or _redirect_uri(provider))
    except HTTPException:
        return HTMLResponse(_CALLBACK_HTML.format(msg="Authorization failed. You can close this tab and try again.", provider=provider, result="error"), status_code=400)
    await _store_blob(row["user_id"], provider, result["blob"], result["label"])
    return HTMLResponse(_CALLBACK_HTML.format(msg=f"{PROVIDERS[provider]['label']} connected — returning to Bracket…", provider=provider, result="ok"))


# ---------------------------------------------------------------------------
# Provider adapters — list sources / fetch digest
# ---------------------------------------------------------------------------
FIGMA_FILE_RE = re.compile(r"figma\.com/(?:file|design|board|proto)/([A-Za-z0-9]+)")
FIGMA_TEAM_RE = re.compile(r"figma\.com/files/(?:\d+/)?team/(\d+)")


def _fig_headers(token: str) -> dict:
    # OAuth tokens use Bearer; legacy PATs use X-Figma-Token. Bearer works for OAuth only,
    # so send both — Figma ignores the irrelevant one.
    return {"Authorization": f"Bearer {token}", "X-Figma-Token": token}


async def figma_list_sources(account: dict, q: str, url: str) -> List[dict]:
    token = await _access_token(account)
    h = _fig_headers(token)
    async with await _http() as c:
        # A pasted file link resolves directly to that one file.
        fm = FIGMA_FILE_RE.search(url or "")
        if fm:
            key = fm.group(1)
            r = await c.get(f"https://api.figma.com/v1/files/{key}?depth=1", headers=h)
            if r.status_code != 200:
                raise HTTPException(404 if r.status_code == 404 else 403, "Couldn't open that Figma file with your account.")
            f = r.json()
            return [{"id": key, "name": f.get("name") or "Figma file", "url": f"https://www.figma.com/design/{key}",
                     "meta": {"updated": f.get("lastModified", ""), "detail": "Figma file"}}]
        # A team link (or a remembered team) lists every file across its projects.
        tm = FIGMA_TEAM_RE.search(url or "")
        team_id = tm.group(1) if tm else (account.get("figma_team_id") or "")
        if not team_id:
            return []
        pr = await c.get(f"https://api.figma.com/v1/teams/{team_id}/projects", headers=h)
        if pr.status_code != 200:
            raise HTTPException(403, "Couldn't read that Figma team — make sure you're a member and the link is a team link.")
        if tm:
            await db.integration_accounts.update_one({"id": account["id"]}, {"$set": {"figma_team_id": team_id}})
        out: List[dict] = []
        for proj in (pr.json().get("projects") or [])[:12]:
            fr = await c.get(f"https://api.figma.com/v1/projects/{proj['id']}/files", headers=h)
            if fr.status_code != 200:
                continue
            for f in (fr.json().get("files") or []):
                name = f.get("name", "")
                if q and q.lower() not in name.lower():
                    continue
                out.append({"id": f["key"], "name": name, "url": f"https://www.figma.com/design/{f['key']}",
                            "meta": {"updated": f.get("last_modified", ""), "detail": proj.get("name", "")}})
            if len(out) >= 60:
                break
    out.sort(key=lambda x: x["meta"].get("updated", ""), reverse=True)
    return out[:60]


async def figma_fetch_digest(account: dict, key: str) -> str:
    token = await _access_token(account)
    h = _fig_headers(token)
    async with await _http() as c:
        fr = await c.get(f"https://api.figma.com/v1/files/{key}?depth=2", headers=h)
        cr = await c.get(f"https://api.figma.com/v1/files/{key}/comments", headers=h)
        vr = await c.get(f"https://api.figma.com/v1/files/{key}/versions", headers=h)
    if fr.status_code != 200:
        raise HTTPException(502, "Couldn't read the Figma file right now.")
    f = fr.json()
    lines = [f"FIGMA FILE: {f.get('name')}", f"Last modified: {f.get('lastModified')}"]
    for page in ((f.get("document") or {}).get("children") or [])[:20]:
        frames = [ch.get("name", "") for ch in (page.get("children") or [])[:40]]
        lines.append(f"PAGE '{page.get('name')}': frames/sections = {', '.join(frames) if frames else '(empty)'}")
    comps = f.get("components") or {}
    if comps:
        lines.append(f"Components ({len(comps)}): " + ", ".join(list({c.get('name', '') for c in comps.values()})[:40]))
    if vr.status_code == 200:
        versions = (vr.json().get("versions") or [])[:10]
        if versions:
            lines.append("RECENT VERSIONS:")
            for v in versions:
                lines.append(f"- {v.get('created_at', '')}: {v.get('label') or v.get('description') or 'update'} by {(v.get('user') or {}).get('handle', '')}")
    if cr.status_code == 200:
        comments = (cr.json().get("comments") or [])[:40]
        if comments:
            lines.append("COMMENTS:")
            for cm in comments:
                lines.append(f"- {(cm.get('user') or {}).get('handle', '')} ({cm.get('created_at', '')[:10]}): {(cm.get('message') or '')[:300]}")
    return "\n".join(lines)


# ---- GitHub ---------------------------------------------------------------
def _gh_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}


async def github_list_sources(account: dict, q: str) -> List[dict]:
    token = await _access_token(account)
    async with await _http() as c:
        r = await c.get("https://api.github.com/user/repos?sort=pushed&per_page=50", headers=_gh_headers(token))
    if r.status_code != 200:
        raise HTTPException(502, "Couldn't list your GitHub repositories.")
    out = []
    for repo in r.json():
        name = repo.get("full_name", "")
        if q and q.lower() not in name.lower():
            continue
        out.append({"id": name, "name": name, "url": repo.get("html_url", ""),
                    "meta": {"updated": repo.get("pushed_at", ""), "detail": (repo.get("description") or "")[:120],
                             "extra": f"{repo.get('open_issues_count', 0)} open issues"}})
    return out[:30]


async def github_fetch_digest(account: dict, full_name: str) -> str:
    token = await _access_token(account)
    h = _gh_headers(token)
    async with await _http() as c:
        rr = await c.get(f"https://api.github.com/repos/{full_name}", headers=h)
        readme = await c.get(f"https://api.github.com/repos/{full_name}/readme", headers={**h, "Accept": "application/vnd.github.raw+json"})
        issues = await c.get(f"https://api.github.com/repos/{full_name}/issues?state=all&per_page=25&sort=updated", headers=h)
        commits = await c.get(f"https://api.github.com/repos/{full_name}/commits?per_page=20", headers=h)
    if rr.status_code != 200:
        raise HTTPException(502, "Couldn't read that GitHub repository.")
    repo = rr.json()
    lines = [f"GITHUB REPO: {repo.get('full_name')}", f"Description: {repo.get('description') or ''}",
             f"Last push: {repo.get('pushed_at', '')}", f"Open issues: {repo.get('open_issues_count', 0)}"]
    if readme.status_code == 200:
        lines.append("README (excerpt):\n" + readme.text[:5000])
    if issues.status_code == 200:
        rows = [i for i in issues.json() if "pull_request" not in i][:20]
        if rows:
            lines.append("ISSUES:")
            for i in rows:
                lines.append(f"- [{i.get('state', '')}] #{i.get('number')} {i.get('title', '')} ({(i.get('updated_at') or '')[:10]}): {(i.get('body') or '')[:220]}")
    if commits.status_code == 200:
        lines.append("RECENT COMMITS:")
        for cm in commits.json()[:15]:
            msg = ((cm.get("commit") or {}).get("message") or "").split("\n")[0][:140]
            date = (((cm.get("commit") or {}).get("author") or {}).get("date") or "")[:10]
            lines.append(f"- {date}: {msg}")
    return "\n".join(lines)


# ---- Notion ---------------------------------------------------------------
NOTION_VERSION = "2022-06-28"


def _notion_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Notion-Version": NOTION_VERSION, "Content-Type": "application/json"}


def _notion_title(item: dict) -> str:
    props = item.get("properties") or {}
    tset = (props.get("title") or {}).get("title") or []
    if not tset:
        for p in props.values():
            if p.get("type") == "title":
                tset = p.get("title") or []
                break
    if not tset and item.get("title"):
        tset = item["title"]
    return "".join(x.get("plain_text", "") for x in tset) or "Untitled"


async def notion_list_sources(account: dict, q: str) -> List[dict]:
    token = await _access_token(account)
    body: dict = {"page_size": 30, "filter": {"property": "object", "value": "page"}}
    if q:
        body["query"] = q
    async with await _http() as c:
        r = await c.post("https://api.notion.com/v1/search", headers=_notion_headers(token), json=body)
    if r.status_code != 200:
        raise HTTPException(502, "Couldn't search your Notion pages.")
    out = []
    for item in r.json().get("results", []):
        out.append({"id": item["id"], "name": _notion_title(item), "url": item.get("url", ""),
                    "meta": {"updated": item.get("last_edited_time", ""), "detail": "Notion page"}})
    return out


async def _notion_blocks_text(c: httpx.AsyncClient, token: str, block_id: str, depth: int = 0, budget: list = None) -> List[str]:
    if budget is None:
        budget = [220]
    lines: List[str] = []
    cursor = None
    while budget[0] > 0:
        params = {"page_size": 100}
        if cursor:
            params["start_cursor"] = cursor
        r = await c.get(f"https://api.notion.com/v1/blocks/{block_id}/children", headers=_notion_headers(token), params=params)
        if r.status_code != 200:
            break
        payload = r.json()
        for block in payload.get("results", []):
            budget[0] -= 1
            data = block.get(block.get("type", ""), {}) or {}
            text = "".join(x.get("plain_text", "") for x in (data.get("rich_text") or []))
            if text:
                lines.append(text)
            if block.get("has_children") and depth < 2 and budget[0] > 0:
                lines.extend(await _notion_blocks_text(c, token, block["id"], depth + 1, budget))
            if budget[0] <= 0:
                break
        if not payload.get("has_more"):
            break
        cursor = payload.get("next_cursor")
    return lines


async def notion_fetch_digest(account: dict, page_id: str) -> str:
    token = await _access_token(account)
    async with await _http() as c:
        pr = await c.get(f"https://api.notion.com/v1/pages/{page_id}", headers=_notion_headers(token))
        if pr.status_code != 200:
            raise HTTPException(502, "Couldn't read that Notion page.")
        page = pr.json()
        lines = await _notion_blocks_text(c, token, page_id)
    return f"NOTION PAGE: {_notion_title(page)}\nLast edited: {page.get('last_edited_time', '')}\n\n" + "\n".join(lines)


# ---- Slack ----------------------------------------------------------------
async def slack_list_sources(account: dict, q: str) -> List[dict]:
    token = await _access_token(account)
    h = {"Authorization": f"Bearer {token}"}
    async with await _http() as c:
        r = await c.get("https://slack.com/api/conversations.list",
                        headers=h, params={"types": "public_channel,private_channel,mpim,im", "limit": 200, "exclude_archived": "true"})
    data = r.json() if r.status_code == 200 else {}
    if not data.get("ok"):
        raise HTTPException(502, "Couldn't list your Slack conversations.")
    out = []
    for ch in data.get("channels", []):
        name = ("#" + ch["name"]) if ch.get("name") else ("DM — " + (ch.get("user") or "direct message"))
        if q and q.lower() not in name.lower():
            continue
        detail = "Channel" if ch.get("is_channel") else ("Private channel" if ch.get("is_group") else "Direct message")
        out.append({"id": ch["id"], "name": name, "url": "",
                    "meta": {"detail": detail, "extra": f"{ch.get('num_members', '')} members" if ch.get("num_members") else ""}})
    return out[:40]


async def slack_fetch_digest(account: dict, channel_id: str) -> str:
    token = await _access_token(account)
    h = {"Authorization": f"Bearer {token}"}
    async with await _http() as c:
        hr = await c.get("https://slack.com/api/conversations.history", headers=h,
                         params={"channel": channel_id, "limit": 100})
        ur = await c.get("https://slack.com/api/users.list", headers=h, params={"limit": 200})
    hdata = hr.json() if hr.status_code == 200 else {}
    if not hdata.get("ok"):
        raise HTTPException(502, "Couldn't read that Slack conversation.")
    names = {}
    udata = ur.json() if ur.status_code == 200 else {}
    for u in (udata.get("members") or []):
        names[u["id"]] = (u.get("profile") or {}).get("real_name") or u.get("name", "")
    lines = ["SLACK CONVERSATION (most recent first):"]
    for m in (hdata.get("messages") or [])[:100]:
        if m.get("subtype") in ("channel_join", "channel_leave"):
            continue
        who = names.get(m.get("user", ""), m.get("user", "someone"))
        ts = datetime.fromtimestamp(float(m.get("ts", 0)), tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
        lines.append(f"- {who} ({ts}): {(m.get('text') or '')[:400]}")
    return "\n".join(lines)[:18000]


# ---- Gmail ----------------------------------------------------------------
async def gmail_list_sources(account: dict, q: str) -> List[dict]:
    at = await _access_token(account)
    headers = {"Authorization": f"Bearer {at}"}
    async with await _http() as c:
        params = {"maxResults": 12}
        if q:
            params["q"] = q
        r = await c.get("https://gmail.googleapis.com/gmail/v1/users/me/threads", headers=headers, params=params)
        if r.status_code != 200:
            raise HTTPException(502, "Couldn't list Gmail conversations.")
        out = []
        for th in r.json().get("threads", [])[:12]:
            tr = await c.get(f"https://gmail.googleapis.com/gmail/v1/users/me/threads/{th['id']}",
                             headers=headers, params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]})
            if tr.status_code != 200:
                continue
            data = tr.json()
            msgs = data.get("messages", [])
            hdrs = {h["name"]: h["value"] for h in ((msgs[0].get("payload") or {}).get("headers") or [])} if msgs else {}
            out.append({"id": th["id"], "name": hdrs.get("Subject") or "(no subject)",
                        "url": f"https://mail.google.com/mail/u/0/#all/{th['id']}",
                        "meta": {"updated": hdrs.get("Date", ""), "detail": hdrs.get("From", ""), "extra": f"{len(msgs)} messages"}})
    return out


def _gmail_body_text(payload: dict) -> str:
    if payload.get("mimeType") == "text/plain" and (payload.get("body") or {}).get("data"):
        try:
            return base64.urlsafe_b64decode(payload["body"]["data"] + "==").decode("utf-8", errors="replace")
        except Exception:
            return ""
    for part in payload.get("parts") or []:
        t = _gmail_body_text(part)
        if t:
            return t
    return ""


async def gmail_fetch_digest(account: dict, thread_id: str) -> str:
    at = await _access_token(account)
    async with await _http() as c:
        r = await c.get(f"https://gmail.googleapis.com/gmail/v1/users/me/threads/{thread_id}",
                        headers={"Authorization": f"Bearer {at}"}, params={"format": "full"})
    if r.status_code != 200:
        raise HTTPException(502, "Couldn't read that Gmail conversation.")
    msgs = r.json().get("messages", [])
    lines = [f"GMAIL CONVERSATION ({len(msgs)} messages):"]
    for m in msgs[:30]:
        hdrs = {h["name"]: h["value"] for h in ((m.get("payload") or {}).get("headers") or [])}
        body = _gmail_body_text(m.get("payload") or {})[:2500]
        lines.append(f"--- From: {hdrs.get('From', '')} | Date: {hdrs.get('Date', '')} | Subject: {hdrs.get('Subject', '')}\n{body}")
    return "\n".join(lines)[:18000]


# ---- Dispatch --------------------------------------------------------------
async def _fetch_digest(provider: str, account: dict, source_id: str) -> str:
    if provider == "figma":
        return await figma_fetch_digest(account, source_id)
    if provider == "github":
        return await github_fetch_digest(account, source_id)
    if provider == "notion":
        return await notion_fetch_digest(account, source_id)
    if provider == "gmail":
        return await gmail_fetch_digest(account, source_id)
    if provider == "slack":
        return await slack_fetch_digest(account, source_id)
    raise HTTPException(400, "This integration isn't available yet.")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class SourceRef(BaseModel):
    id: str
    name: str = ""
    url: str = ""


class PreviewIn(BaseModel):
    provider: str
    sources: List[SourceRef] = Field(min_length=1, max_length=5)


class EstablishIn(BaseModel):
    preview_id: str
    mode: str  # "new" | "existing"
    project_id: Optional[str] = None


class MemoryActionIn(BaseModel):
    action: str  # confirm | context | ignore


class AskIn(BaseModel):
    question: str = Field(min_length=3, max_length=500)


# ---------------------------------------------------------------------------
# Directory + accounts
# ---------------------------------------------------------------------------
@router.get("/connect/providers")
async def list_providers(request: Request):
    user = await current_user(request, db)
    accounts = {a["provider"]: a async for a in db.integration_accounts.find({"user_id": user["user_id"]}, {"_id": 0, "token_enc": 0})}
    out = []
    for key, p in PROVIDERS.items():
        if p["impl"] == "soon":
            status = "coming_soon"
        elif not _configured(key):
            status = "setup_required"
        elif key in accounts:
            status = "connected"
        else:
            status = "available"
        out.append({
            "key": key, "label": p["label"], "category": p["category"], "desc": p["desc"],
            "status": status, "impl": p["impl"],
            "select_mode": p.get("select_mode", "list"), "select_hint": p.get("select_hint", ""),
            "multi": bool(p.get("multi")),
            "account_label": accounts.get(key, {}).get("label", ""),
            "has_team": bool(accounts.get(key, {}).get("figma_team_id")),
        })
    return {"providers": out, "categories": CATEGORY_ORDER}


@router.delete("/connect/accounts/{provider}")
async def delete_account(provider: str, request: Request):
    user = await current_user(request, db)
    await db.integration_accounts.delete_one({"user_id": user["user_id"], "provider": provider})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Source selection + preview + establish (multi-source)
# ---------------------------------------------------------------------------
@router.get("/connect/{provider}/sources")
async def list_sources(provider: str, request: Request, q: str = "", url: str = ""):
    user = await current_user(request, db)
    account = await _get_account(user["user_id"], provider)
    if provider == "figma":
        return {"sources": await figma_list_sources(account, q, url)}
    if provider == "github":
        return {"sources": await github_list_sources(account, q)}
    if provider == "notion":
        return {"sources": await notion_list_sources(account, q)}
    if provider == "gmail":
        return {"sources": await gmail_list_sources(account, q)}
    if provider == "slack":
        return {"sources": await slack_list_sources(account, q)}
    raise HTTPException(400, "This integration isn't available yet.")


@router.post("/connect/preview")
async def preview_sources(body: PreviewIn, request: Request):
    user = await current_user(request, db)
    account = await _get_account(user["user_id"], body.provider)
    candidates = []
    async for p in db.projects.find({"owner_user_id": user["user_id"]}, {"_id": 0, "id": 1, "name": 1, "client_name": 1}).sort("updated_at", -1).limit(25):
        candidates.append({"id": p["id"], "name": p.get("name", ""), "client": p.get("client_name", "")})

    async def _one(src: SourceRef):
        digest = await _fetch_digest(body.provider, account, src.id)
        if not digest or len(digest) < 40:
            raise HTTPException(422, f"Not enough content in {src.name or src.id}.")
        analysis = await analyze_connected_source(body.provider, src.name or src.id, digest, candidates)
        return {"source": src.model_dump(), "digest": digest[:20000], "analysis": analysis}

    results = await asyncio.gather(*(_one(s) for s in body.sources), return_exceptions=True)
    items = [r for r in results if isinstance(r, dict)]
    if not items:
        first_err = next((r for r in results if isinstance(r, Exception)), None)
        if isinstance(first_err, HTTPException):
            raise first_err
        logger.warning("preview failed: %s", first_err)
        raise HTTPException(502, "Bracket couldn't analyze these sources right now — please try again.")

    counts = {k: 0 for k in ("requirements", "decisions", "deliverables", "deadlines", "open_questions")}
    best_match, proj_info = None, {}
    for it in items:
        a = it["analysis"] or {}
        for k in counts:
            counts[k] += len(a.get(k) or [])
        if not proj_info.get("name"):
            proj_info = a.get("project") or {}
        m = a.get("match") or {}
        conf = int(m.get("confidence") or 0)
        if m.get("project_id") and conf >= 55 and (not best_match or conf > best_match["confidence"]):
            mp = await db.projects.find_one({"id": m["project_id"], "owner_user_id": user["user_id"]}, {"_id": 0, "id": 1, "name": 1, "client_name": 1})
            if mp:
                best_match = {"id": mp["id"], "name": mp.get("name", ""), "client": mp.get("client_name", ""),
                              "confidence": conf, "reason": m.get("reason", "")}

    preview_id = _uuid()
    await db.connect_previews.insert_one({
        "id": preview_id, "user_id": user["user_id"], "provider": body.provider,
        "items": items, "created_at": _now_iso(),
    })
    sample = (items[0]["analysis"] or {})
    return {
        "preview_id": preview_id,
        "project": proj_info,
        "counts": counts,
        "sources": [it["source"] for it in items],
        "failed": max(0, len(body.sources) - len(items)),
        "items": {k: (sample.get(k) or [])[:6] for k in ("requirements", "decisions", "deliverables", "deadlines", "open_questions")},
        "match": best_match,
    }


def _memory_docs(project_id: str, conn_id: str, provider: str, source_label: str, analysis: dict) -> List[dict]:
    now = _now_iso()
    docs = []
    cat_map = {"requirements": "requirement", "decisions": "decision", "deliverables": "deliverable",
               "deadlines": "deadline", "open_questions": "question"}
    for key, cat in cat_map.items():
        for item in (analysis.get(key) or [])[:15]:
            if not isinstance(item, dict) or not item.get("title"):
                continue
            status = item.get("status") if item.get("status") in ("confirmed", "detected") else "detected"
            docs.append({
                "id": _uuid(), "project_id": project_id, "connection_id": conn_id,
                "provider": provider, "source_label": source_label, "category": cat,
                "title": str(item.get("title", ""))[:200], "detail": str(item.get("detail", ""))[:500],
                "status": status, "occurred_at": now, "created_at": now, "updated_at": now, "history": [],
            })
    return docs


@router.post("/connect/establish")
async def establish_connection(body: EstablishIn, request: Request):
    user = await current_user(request, db)
    prev = await db.connect_previews.find_one({"id": body.preview_id, "user_id": user["user_id"]}, {"_id": 0})
    if not prev:
        raise HTTPException(404, "Preview expired — please re-select the source.")
    # Back-compat: previews stored before multi-select had flat fields.
    items = prev.get("items")
    if not items:
        items = [{"source": {"id": prev.get("source_id", ""), "name": prev.get("source_name", ""), "url": prev.get("source_url", "")},
                  "digest": prev.get("digest", ""), "analysis": prev.get("analysis") or {}}]
    provider = prev["provider"]
    first = items[0]["analysis"] or {}
    proj_info = first.get("project") or {}
    now = _now_iso()

    if body.mode == "existing":
        if not body.project_id:
            raise HTTPException(400, "Pick a project to connect this source to.")
        project = await db.projects.find_one({"id": body.project_id, "owner_user_id": user["user_id"]}, {"_id": 0})
        if not project:
            raise HTTPException(404, "Project not found.")
        project_id = project["id"]
        if proj_info.get("client") and not project.get("client_name"):
            await db.projects.update_one({"id": project_id}, {"$set": {"client_name": proj_info["client"], "updated_at": now}})
    else:
        project_id = _uuid()
        combined_digest = "\n\n".join((it.get("digest") or "")[:4500] for it in items)[:9000]
        await db.projects.insert_one({
            "id": project_id,
            "name": (proj_info.get("name") or (items[0]["source"].get("name")) or "Connected project")[:120],
            "name_source": "ai",
            "creator_name": user.get("name", ""), "creator_email": user["email"],
            "owner_user_id": user["user_id"], "engine": "claude",
            "status": "in_progress", "step": 1,
            "client_name": proj_info.get("client", ""),
            "description": proj_info.get("description", ""),
            "situation_input": {"raw_paste": combined_digest},
            "framing": None, "context_input": None, "context": None,
            "decision_input": None, "decision": None, "artifacts": None,
            "locked_at": None, "feedback": None, "share_token": None,
            "share_status": "none", "share_review": None, "owner_replies": [],
            "created_at": now, "updated_at": now,
        })

    total_mem, connected = 0, []
    for it in items:
        src = it["source"]
        dup = await db.source_connections.find_one({"project_id": project_id, "provider": provider,
                                                    "source_id": src["id"], "status": {"$ne": "disconnected"}})
        if dup:
            continue
        conn_id = _uuid()
        analysis = it.get("analysis") or {}
        await db.source_connections.insert_one({
            "id": conn_id, "project_id": project_id, "user_id": user["user_id"],
            "provider": provider, "source_type": provider,
            "source_id": src["id"], "source_name": src.get("name") or src["id"], "source_url": src.get("url", ""),
            "status": "connected", "content_hash": _hash(it.get("digest", "")),
            "content_cache": (it.get("digest") or "")[:20000],
            "extracted_stats": {k: len(analysis.get(k) or []) for k in ("requirements", "decisions", "deliverables", "deadlines", "open_questions")},
            "last_synced_at": now, "last_activity_at": now, "created_at": now, "updated_at": now,
        })
        mem = _memory_docs(project_id, conn_id, provider, src.get("name") or src["id"], analysis)
        if mem:
            await db.project_memory.insert_many(mem)
        total_mem += len(mem)
        await db.source_events.insert_one({
            "id": _uuid(), "project_id": project_id, "connection_id": conn_id,
            "provider": provider, "source_label": src.get("name") or src["id"],
            "event_type": "SOURCE_CONNECTED",
            "summary": f"Connected {PROVIDERS[provider]['label']} — {src.get('name') or src['id']}. Bracket extracted {len(mem)} items.",
            "occurred_at": now, "created_at": now,
        })
        connected.append(conn_id)
    if not connected:
        raise HTTPException(409, "These sources are already connected to that project.")
    await db.connect_previews.delete_one({"id": body.preview_id})
    return {"ok": True, "project_id": project_id, "connection_ids": connected, "memory_count": total_mem}


# ---------------------------------------------------------------------------
# Project-scoped: connections / memory / activity / ask
# ---------------------------------------------------------------------------
async def _owned_project(project_id: str, request: Request) -> dict:
    user = await current_user(request, db)
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(404, "Project not found")
    if project.get("owner_user_id") and project["owner_user_id"] != user["user_id"]:
        raise HTTPException(403, "Not your project")
    return project


@router.get("/projects/{project_id}/connections")
async def project_connections(project_id: str, request: Request):
    await _owned_project(project_id, request)
    conns = []
    async for c in db.source_connections.find({"project_id": project_id, "status": {"$ne": "disconnected"}}, {"_id": 0, "content_cache": 0}):
        conns.append(c)
    return {"connections": conns}


@router.get("/projects/{project_id}/memory")
async def project_memory(project_id: str, request: Request):
    await _owned_project(project_id, request)
    items = []
    async for m in db.project_memory.find({"project_id": project_id, "status": {"$ne": "ignored"}}, {"_id": 0}).sort("created_at", -1).limit(200):
        items.append(m)
    return {"items": items}


@router.get("/projects/{project_id}/activity")
async def project_activity(project_id: str, request: Request):
    await _owned_project(project_id, request)
    events = []
    async for e in db.source_events.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).limit(50):
        events.append(e)
    return {"events": events}


@router.post("/connect/memory/{memory_id}/action")
async def memory_action(memory_id: str, body: MemoryActionIn, request: Request):
    user = await current_user(request, db)
    mem = await db.project_memory.find_one({"id": memory_id}, {"_id": 0})
    if not mem:
        raise HTTPException(404, "Memory item not found")
    project = await db.projects.find_one({"id": mem["project_id"]}, {"_id": 0, "owner_user_id": 1})
    if project and project.get("owner_user_id") and project["owner_user_id"] != user["user_id"]:
        raise HTTPException(403, "Not your project")
    new_status = {"confirm": "confirmed", "context": "context", "ignore": "ignored"}.get(body.action)
    if not new_status:
        raise HTTPException(400, "Unknown action")
    await db.project_memory.update_one(
        {"id": memory_id},
        {"$set": {"status": new_status, "updated_at": _now_iso()},
         "$push": {"history": {"from": mem.get("status"), "to": new_status, "at": _now_iso()}}},
    )
    return {"ok": True, "status": new_status}


@router.post("/projects/{project_id}/ask")
async def ask_project(project_id: str, body: AskIn, request: Request):
    project = await _owned_project(project_id, request)
    memory = []
    async for m in db.project_memory.find({"project_id": project_id, "status": {"$ne": "ignored"}}, {"_id": 0}).sort("created_at", -1).limit(80):
        memory.append(m)
    digests = []
    async for c in db.source_connections.find({"project_id": project_id, "status": {"$ne": "disconnected"}}, {"_id": 0, "source_name": 1, "provider": 1, "content_cache": 1}).limit(4):
        digests.append({"label": c.get("source_name", ""), "provider": c.get("provider", ""), "content": c.get("content_cache", "")})
    if not memory and not digests:
        raise HTTPException(422, "Connect a source first — Bracket answers from connected work only.")
    try:
        result = await answer_project_question(project.get("name", ""), body.question, memory, digests)
    except Exception as e:
        logger.warning("ask project failed: %s", e)
        raise HTTPException(502, "Bracket couldn't answer right now — please try again.")
    return result


# ---------------------------------------------------------------------------
# Sync engine — shared by manual "Sync now" and the background poller
# ---------------------------------------------------------------------------
async def _sync_connection(conn: dict) -> dict:
    account = await db.integration_accounts.find_one({"user_id": conn["user_id"], "provider": conn["provider"]}, {"_id": 0})
    now = _now_iso()
    if not account:
        await db.source_connections.update_one({"id": conn["id"]}, {"$set": {"status": "needs_attention", "updated_at": now}})
        return {"changed": False, "status": "needs_attention"}
    try:
        digest = await _fetch_digest(conn["provider"], account, conn["source_id"])
    except HTTPException as e:
        status = "expired" if e.status_code == 401 else "error"
        await db.source_connections.update_one({"id": conn["id"]}, {"$set": {"status": status, "updated_at": now}})
        return {"changed": False, "status": status}
    h = _hash(digest)
    if h == conn.get("content_hash"):
        await db.source_connections.update_one({"id": conn["id"]}, {"$set": {"last_synced_at": now, "status": "connected", "updated_at": now}})
        return {"changed": False, "status": "connected"}

    memory_titles = []
    async for m in db.project_memory.find({"project_id": conn["project_id"], "status": {"$ne": "ignored"}}, {"_id": 0, "title": 1}).limit(60):
        memory_titles.append(m["title"])
    project = await db.projects.find_one({"id": conn["project_id"]}, {"_id": 0, "name": 1})
    new_items, events = [], []
    try:
        result = await detect_source_updates(conn["provider"], conn["source_name"], (project or {}).get("name", ""), memory_titles, digest)
        events = result.get("events") or []
        new_items = result.get("new_items") or []
    except Exception as e:
        logger.warning("change detection failed for %s: %s", conn["id"], e)

    cat_ok = {"requirement", "decision", "deliverable", "deadline", "scope_change", "question"}
    mem_docs = []
    for item in new_items[:10]:
        if not isinstance(item, dict) or not item.get("title"):
            continue
        mem_docs.append({
            "id": _uuid(), "project_id": conn["project_id"], "connection_id": conn["id"],
            "provider": conn["provider"], "source_label": conn["source_name"],
            "category": item.get("category") if item.get("category") in cat_ok else "event",
            "title": str(item["title"])[:200], "detail": str(item.get("detail", ""))[:500],
            "status": item.get("status") if item.get("status") in ("confirmed", "detected") else "detected",
            "occurred_at": now, "created_at": now, "updated_at": now, "history": [],
        })
    if mem_docs:
        await db.project_memory.insert_many(mem_docs)
    ev_docs = []
    for ev in events[:8]:
        if not isinstance(ev, dict) or not ev.get("summary"):
            continue
        ev_docs.append({
            "id": _uuid(), "project_id": conn["project_id"], "connection_id": conn["id"],
            "provider": conn["provider"], "source_label": conn["source_name"],
            "event_type": ev.get("event_type", "ACTIVITY"), "summary": str(ev["summary"])[:300],
            "occurred_at": now, "created_at": now,
        })
    if not ev_docs:
        ev_docs.append({
            "id": _uuid(), "project_id": conn["project_id"], "connection_id": conn["id"],
            "provider": conn["provider"], "source_label": conn["source_name"],
            "event_type": "SOURCE_UPDATED", "summary": f"{conn['source_name']} changed — {len(mem_docs)} new items detected.",
            "occurred_at": now, "created_at": now,
        })
    await db.source_events.insert_many(ev_docs)
    await db.source_connections.update_one({"id": conn["id"]}, {"$set": {
        "content_hash": h, "content_cache": digest[:20000], "last_synced_at": now,
        "last_activity_at": now, "status": "connected", "updated_at": now,
    }})
    return {"changed": True, "status": "connected", "new_items": len(mem_docs), "events": len(ev_docs)}


@router.post("/connect/connections/{connection_id}/sync")
async def sync_now(connection_id: str, request: Request):
    user = await current_user(request, db)
    conn = await db.source_connections.find_one({"id": connection_id, "user_id": user["user_id"]}, {"_id": 0})
    if not conn:
        raise HTTPException(404, "Connection not found")
    return await _sync_connection(conn)


@router.delete("/connect/connections/{connection_id}")
async def disconnect(connection_id: str, request: Request):
    user = await current_user(request, db)
    conn = await db.source_connections.find_one({"id": connection_id, "user_id": user["user_id"]}, {"_id": 0})
    if not conn:
        raise HTTPException(404, "Connection not found")
    now = _now_iso()
    await db.source_connections.update_one({"id": connection_id}, {"$set": {"status": "disconnected", "content_cache": "", "updated_at": now}})
    await db.source_events.insert_one({
        "id": _uuid(), "project_id": conn["project_id"], "connection_id": connection_id,
        "provider": conn["provider"], "source_label": conn["source_name"],
        "event_type": "SOURCE_DISCONNECTED", "summary": f"Disconnected {conn['source_name']}.",
        "occurred_at": now, "created_at": now,
    })
    return {"ok": True}


# ---------------------------------------------------------------------------
# Background poller — every 5 minutes, re-sync stale connections (max 4/cycle)
# ---------------------------------------------------------------------------
POLL_INTERVAL_S = 300


async def poller_loop():
    while True:
        try:
            await asyncio.sleep(POLL_INTERVAL_S)
            cutoff = datetime.now(timezone.utc).timestamp() - POLL_INTERVAL_S
            count = 0
            async for conn in db.source_connections.find({"status": "connected"}, {"_id": 0}).sort("last_synced_at", 1).limit(20):
                try:
                    last = datetime.fromisoformat(conn.get("last_synced_at", "").replace("Z", "+00:00")).timestamp()
                except Exception:
                    last = 0
                if last > cutoff:
                    continue
                try:
                    await _sync_connection(conn)
                except Exception as e:
                    logger.warning("poll sync failed for %s: %s", conn.get("id"), e)
                count += 1
                if count >= 4:
                    break
        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.warning("connector poller iteration failed: %s", e)
