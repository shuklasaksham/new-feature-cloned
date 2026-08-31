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
export default function AddSourceDialog({ open, onClose, projectId, onChanged }) {
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
    if (!open) { setPicker(null); setSelected([]); setStatus({}); setQuery(""); }
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
      if (!sources.length) { toast.info("Connected, but no sources found to attach."); onChanged?.(); onClose?.(); return; }
      setPicker({ provider: key, sources });
      setSelected(sources.length === 1 ? [sources[0].id] : []);
      setStatus({}); setQuery("");
    } catch (err) { toast.error(formatApiError(err)); }
  };

  // Click a provider: list its sources if already linked, else OAuth popup.
  const pick = async (key) => {
    if (connecting) return;
    setConnecting(key);
    try {
      const { data } = await api.get(`/connect/${key}/sources`);
      const sources = data?.sources || [];
      setPicker({ provider: key, sources });
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
    try {
      const { data } = await api.get(`/connect/${key}/auth-url`);
      if (popup) popup.location = data.url; else window.open(data.url, "_blank");
    } catch (e) {
      try { popup?.close?.(); } catch { /* ignore */ }
      setConnecting(null); pendingRef.current = null;
      toast.error(formatApiError(e));
    }
  };

  // Re-query the source list as the user types.
  useEffect(() => {
    if (!picker) return;
    const prov = picker.provider;
    const t = setTimeout(async () => {
      setPickerLoading(true);
      try {
        const { data } = await api.get(`/connect/${prov}/sources`, { params: { q: query } });
        setPicker((cur) => (cur && cur.provider === prov ? { ...cur, sources: data?.sources || [] } : cur));
      } catch { /* keep previous */ }
      finally { setPickerLoading(false); }
    }, 300);
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
              // "connected" (account already linked via OAuth) is still usable —
              // it lets the user add more sources or reconnect. Only true
              // "coming_soon"/"setup_required" providers are non-actionable.
              const usable = p.status === "available" || p.status === "connected";
              const busy = connecting === p.key;
              const badge = busy
                ? <Loader2 size={13} className="animate-spin" />
                : p.status === "connected" ? "Add"
                : p.status === "available" ? "Connect"
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
                placeholder="Search"
                data-testid="add-source-search"
                autoFocus
              />
              {pickerLoading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-3)" }} />}
            </div>
            <div className="asd-list" data-testid="add-source-list">
              {picker.sources.length === 0 ? (
                <p className="text-[12.5px] py-8 text-center" style={{ color: "var(--text-3)" }}>Nothing matched.</p>
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
