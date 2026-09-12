import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Search, Check, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { ProviderIcon, PROVIDER_META } from "../lib/providersMeta";

/**
 * AddSourceDialog — self-contained "+ Add a source" flow that NEVER leaves the
 * page. Provider list → inline OAuth popup (popup-blocker safe) → source picker
 * → attach to THIS project via /connect/preview + /connect/establish.
 */
export default function AddSourceDialog({ open, onClose, projectId, onChanged, reconnect, connectedProviders = [] }) {
  const [providers, setProviders] = useState([]);
  const [connecting, setConnecting] = useState(null); // provider key while OAuth in flight
  const [picker, setPicker] = useState(null);          // { provider, sources }
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState({});            // { id: 'attaching'|'done'|'error' }
  const [query, setQuery] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const pendingRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (open && providers.length === 0) {
      api.get("/connect/providers").then(({ data }) => setProviders(data.providers || [])).catch(() => {});
    }
    if (!open) {
      // Fully reset transient state so a reopened dialog never gets stuck with a
      // disabled list (e.g. after an OAuth popup was closed without finishing).
      setPicker(null); setSelected([]); setStatus({}); setQuery("");
      setConnecting(null); pendingRef.current = null;
      try { popupRef.current?.close?.(); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // OAuth completion — callback posts "bracket-oauth:{key}:{ok|error}".
  useEffect(() => {
    const onMsg = async (e) => {
      if (typeof e.data !== "string" || !e.data.startsWith("bracket-oauth:")) return;
      const [, key, st] = e.data.split(":");
      if (key !== pendingRef.current) return;
      pendingRef.current = null;
      try { popupRef.current?.close?.(); } catch { /* ignore */ }
      if (st !== "ok") { setConnecting(null); toast.error("Connection cancelled."); return; }
      await loadSources(key);
      setConnecting(null);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const loadSources = async (key) => {
    try {
      const { data } = await api.get(`/connect/${key}/sources`);
      const sources = data?.sources || [];
      // Figma has no "list all my files" API — after connecting, open the picker
      // so the user can paste a file/team link (paste-and-go) instead of
      // dead-ending with a "no sources" toast.
      if (!sources.length && key !== "figma") {
        toast.info("Connected, but no sources found to attach."); onChanged?.(); onClose?.(); return;
      }
      setPicker({ provider: key, sources });
      setSelected(sources.length === 1 ? [sources[0].id] : []);
      setStatus({}); setQuery("");
    } catch (err) { toast.error(formatApiError(err)); }
  };

  // Fallback for when the OAuth popup's cross-origin postMessage never reaches
  // us (app loaded on www/host origin, popup+callback on the apex origin, so
  // window.opener is severed). On popup close we VERIFY the connection by
  // hitting /sources: if the account got linked we proceed exactly like the
  // postMessage path; if not (user cancelled) we stay silent.
  const finalizeOnClose = async (key) => {
    try {
      const { data } = await api.get(`/connect/${key}/sources`);
      const sources = data?.sources || [];
      if (!sources.length && key !== "figma") { onChanged?.(); onClose?.(); return; }
      setPicker({ provider: key, sources });
      setSelected(sources.length === 1 ? [sources[0].id] : []);
      setStatus({}); setQuery("");
    } catch { /* not connected → user cancelled; no error toast */ }
    finally { setConnecting(null); }
  };

  // A provider counts as "connected" only if it has an active source in THIS
  // project (what the user sees in the sidebar) — NOT merely because a token
  // exists somewhere on their account. This makes adding a tool that isn't on
  // this project start a fresh OAuth (pick the account for this project),
  // while a tool already on the project just opens its list to add more.
  const inProject = (key) => connectedProviders.includes(key);

  const pick = async (key) => {
    if (connecting) return;
    if (!inProject(key)) { startOAuth(key); return; }
    setConnecting(key);
    try {
      const { data } = await api.get(`/connect/${key}/sources`);
      setPicker({ provider: key, sources: data?.sources || [] });
      setSelected([]); setStatus({}); setQuery("");
      setConnecting(null);
    } catch (e) {
      if (e?.response?.status === 400) startOAuth(key);
      else { setConnecting(null); toast.error(formatApiError(e)); }
    }
  };

  const startOAuth = async (key) => {
    const popup = window.open("about:blank", "bracket-oauth", "width=560,height=680");
    if (popup) {
      try {
        popup.document.write('<!doctype html><meta charset="utf-8"><title>Connecting…</title><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#8a8a8a;font-family:system-ui,sans-serif;font-size:14px">Opening secure sign-in…</body>');
      } catch { /* ignore */ }
    }
    popupRef.current = popup;
    setConnecting(key);
    pendingRef.current = key;
    // Watch for the user closing the OAuth popup without finishing — otherwise
    // `connecting` stays set and the whole provider list looks stuck (disabled).
    const watch = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        clearInterval(watch);
        if (pendingRef.current === key) {
          pendingRef.current = null;
          // postMessage may have been lost (cross-origin opener) — verify by
          // checking whether the account actually got connected.
          finalizeOnClose(key);
        }
      }
    }, 600);
    try {
      const { data } = await api.get(`/connect/${key}/auth-url`);
      if (popup) popup.location = data.url; else window.open(data.url, "_blank");
    } catch (e) {
      clearInterval(watch);
      try { popup?.close?.(); } catch { /* ignore */ }
      setConnecting(null); pendingRef.current = null;
      toast.error(formatApiError(e));
    }
  };

  // One-click reconnect from the sidebar chip: force a fresh OAuth for the
  // given provider the moment the dialog opens (re-mints a stale/expired token).
  const reconnectFired = useRef(false);
  useEffect(() => {
    if (open && reconnect && !reconnectFired.current) {
      reconnectFired.current = true;
      startOAuth(reconnect);
    }
    if (!open) reconnectFired.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reconnect]);

  // Re-query the source list as the user types. Also powers Figma "paste-and-go"
  // (a pasted link resolves to its file) and Figma team-file search by name.
  useEffect(() => {
    if (!picker) return;
    const prov = picker.provider;
    const isFig = prov === "figma";
    const val = query.trim();
    const t = setTimeout(async () => {
      setPickerLoading(true);
      try {
        // Figma: send the text as BOTH url (resolves a pasted file/team link) and
        // q (filters the team's files by name). Others just search by q.
        const params = isFig ? { q: val, url: val } : { q: val };
        const { data } = await api.get(`/connect/${prov}/sources`, { params });
        const rows = data?.sources || [];
        setPicker((cur) => (cur && cur.provider === prov ? { ...cur, sources: rows } : cur));
        // Paste-and-Go: a valid Figma link resolves to exactly one file → auto-select it.
        if (isFig && val && rows.length === 1) setSelected([rows[0].id]);
      } catch { /* keep previous */ }
      finally { setPickerLoading(false); }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const attach = async () => {
    if (!picker || !selected.length) return;
    setAttaching(true);
    const chosen = picker.sources.filter((s) => selected.includes(s.id));
    let okCount = 0;
    for (const src of chosen) {
      setStatus((st) => ({ ...st, [src.id]: "attaching" }));
      try {
        const { data: prev } = await api.post("/connect/preview", {
          provider: picker.provider,
          sources: [{ id: src.id, name: src.name, url: src.url || "" }],
        });
        await api.post("/connect/establish", { preview_id: prev.preview_id, mode: "existing", project_id: projectId });
        setStatus((st) => ({ ...st, [src.id]: "done" }));
        okCount += 1;
      } catch { setStatus((st) => ({ ...st, [src.id]: "error" })); }
    }
    setAttaching(false);
    const failed = chosen.length - okCount;
    if (okCount && failed) {
      toast.warning(`${okCount} attached, ${failed} failed`);
      onChanged?.();
    } else if (okCount) {
      toast.success(`${okCount === 1 ? "Source" : `${okCount} sources`} connected`);
      onChanged?.();
      setTimeout(() => onClose?.(), 650);
    } else {
      toast.error("Couldn't attach the selected sources.");
    }
  };

  if (!open) return null;
  const provLabel = picker ? (PROVIDER_META[picker.provider]?.label || picker.provider) : "";

  return createPortal((
    <div className="bkt-modal-overlay" onClick={onClose} data-testid="add-source-dialog">
      <div className="bkt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bkt-modal-head">
          <span className="flex items-center gap-2">
            {picker ? (
              <button type="button" className="asd-back" onClick={() => setPicker(null)} data-testid="add-source-back"><ArrowLeft size={15} /></button>
            ) : (
              <Plus size={16} style={{ color: "var(--text-2)" }} />
            )}
            <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              {picker ? `Choose from ${provLabel}` : "Add a source"}
            </span>
          </span>
          <button type="button" className="bkt-modal-x" onClick={onClose} data-testid="add-source-close"><X size={16} /></button>
        </div>

        {!picker ? (
          <div className="bkt-modal-body" style={{ padding: "12px 14px 16px" }}>
            <p className="text-[12.5px] mb-3" style={{ color: "var(--text-3)" }}>
              Connect another tool to this project — Bracket reads it and keeps your memory in sync.
            </p>
            {providers.length === 0 ? (
              <p className="text-[12.5px] py-6 text-center" style={{ color: "var(--text-3)" }}>Loading sources…</p>
            ) : providers.map((p) => {
              // "connected" here means connected to THIS project (in the
              // sidebar) — not just an account-level token. Providers not on
              // this project show "Connect" and start OAuth on click.
              const onProject = inProject(p.key);
              const usable = onProject || p.status === "available" || p.status === "connected";
              const busy = connecting === p.key;
              const badge = busy
                ? <Loader2 size={13} className="animate-spin" />
                : onProject ? "Add"
                : (p.status === "available" || p.status === "connected") ? "Connect"
                : p.status === "setup_required" ? "Setup" : "Soon";
              return (
                <button
                  key={p.key}
                  type="button"
                  className="src-dialog-row"
                  disabled={!usable || !!connecting}
                  onClick={() => usable && pick(p.key)}
                  data-testid={`add-source-option-${p.key}`}
                >
                  <ProviderIcon provider={p.key} size={16} />
                  <span className="min-w-0">
                    <span className="src-dialog-name">{p.label}</span>
                    <span className="src-dialog-desc block truncate">{p.desc}</span>
                  </span>
                  <span className="src-dialog-badge">
                    {badge}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bkt-modal-body" style={{ padding: "12px 14px 0" }}>
            <div className="asd-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={picker.provider === "figma" ? "Paste your Figma design file link (figma.com/design/…)" : "Search…"}
                data-testid="add-source-search"
                autoFocus
              />
              {pickerLoading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-3)" }} />}
            </div>
            <div className="asd-list" data-testid="add-source-list">
              {picker.sources.length === 0 ? (
                <p className="text-[12.5px] py-8 text-center" style={{ color: "var(--text-3)" }}>
                  {picker.provider === "figma"
                    ? "Paste your Figma design file link above and Bracket will connect that file."
                    : "Type to search your sources."}
                </p>
              ) : picker.sources.map((s) => {
                const on = selected.includes(s.id);
                const st = status[s.id];
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="asd-row"
                    onClick={() => toggle(s.id)}
                    aria-pressed={on}
                    data-testid={`add-source-item-${s.id}`}
                  >
                    <span className={`asd-check${on ? " is-on" : ""}`}>{on && <Check size={13} strokeWidth={3} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="asd-row-name">{s.name || "(untitled)"}</span>
                      {s.meta?.detail && <span className="asd-row-sub">{s.meta.detail}</span>}
                    </span>
                    {st === "attaching" && <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-3)" }} />}
                    {st === "done" && <Check size={14} style={{ color: "var(--success)" }} />}
                    {st === "error" && <X size={14} style={{ color: "var(--danger)" }} />}
                  </button>
                );
              })}
            </div>
            <div className="asd-foot">
              <span className="text-[12px]" style={{ color: selected.length ? "var(--text-2)" : "var(--text-3)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }} data-testid="add-source-count">
                {selected.length ? `${selected.length} selected` : "Select at least one"}
              </span>
              <button
                type="button"
                className="asd-attach"
                disabled={!selected.length || attaching}
                onClick={attach}
                data-testid="add-source-attach"
              >
                {attaching ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : `Add ${selected.length || ""}`.trim()}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ), document.body);
}
