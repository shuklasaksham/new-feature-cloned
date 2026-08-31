import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { Search, ArrowRight, ArrowLeft, Loader2, Check, Pencil, Lock, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { BRAND_GLYPHS } from "../components/BrandGlyphs";
import Seo from "../components/Seo";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";
const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };
const MAX_SELECT = 5;

const CFG = {
  gmail: { title: "Select a conversation.", sub: "Choose the client email thread(s) you want to bring into bracket.", search: "Search emails", col1: "Conversation", col2: "Messages", connected: "Gmail connected", showCol2: true },
  slack: { title: "Select a channel.", sub: "Choose the project channel(s) you want to bring into bracket.", search: "Search channels", col1: "Channel", col2: "Members", connected: "Slack connected", showCol2: true },
  figma: { title: "Select a file.", sub: "Choose the project file(s) you want to bring into bracket.", search: "Search files", col1: "File", col2: "", connected: "Figma connected", showCol2: false },
  github: { title: "Select a repository.", sub: "Choose the repositor(ies) you want to bring into bracket.", search: "Search repositories", col1: "Repository", col2: "Issues", connected: "GitHub connected", showCol2: true },
};

function formatActivity(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

const col2Value = (s) => {
  const m = (s.meta?.extra || "").match(/\d+/);
  return m ? m[0] : "—";
};

const subLabel = (provider, s) => {
  const detail = s.meta?.detail || "";
  if (provider === "gmail") {
    const m = detail.match(/<([^>]+)>/);
    return m ? m[1] : detail;
  }
  return detail;
};

export default function SelectSource() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const provider = (params.get("tool") || "gmail").toLowerCase();
  const cfg = CFG[provider] || CFG.gmail;
  const Glyph = BRAND_GLYPHS[provider] || BRAND_GLYPHS.gmail;

  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [accountLabel, setAccountLabel] = useState("");
  const [acctModalOpen, setAcctModalOpen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const debounceRef = useRef(null);

  const refreshAccountLabel = () => {
    api.get("/connect/providers").then(({ data }) => {
      const p = (data.providers || []).find((x) => x.key === provider);
      setAccountLabel(p?.account_label || user?.email || "");
    }).catch(() => setAccountLabel(user?.email || ""));
  };

  // Switch/reconnect the account for THIS provider via the OAuth popup. The
  // callback re-upserts the integration_account (keyed by user+provider), so a
  // successful reconnect replaces the connected account.
  const reconnectAccount = async () => {
    const popup = window.open("about:blank", "bracket-oauth", "width=560,height=680");
    setReconnecting(true);
    try {
      const { data } = await api.get(`/connect/${provider}/auth-url`);
      if (popup) popup.location = data.url;
      else window.open(data.url, "_blank");
    } catch (e) {
      if (popup) popup.close();
      setReconnecting(false);
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    const onMsg = (ev) => {
      if (typeof ev.data !== "string" || !ev.data.startsWith(`bracket-oauth:${provider}:`)) return;
      const result = ev.data.split(":")[2];
      setReconnecting(false);
      if (result === "success") {
        toast.success("Account switched.");
        setAcctModalOpen(false);
        refreshAccountLabel();
        fetchSources(query.trim());
      } else {
        toast.error("Couldn't switch account. Please try again.");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, query]);

  useEffect(() => {
    if (!CFG[provider]) { navigate("/welcome"); return; }
    api.get("/connect/providers").then(({ data }) => {
      const p = (data.providers || []).find((x) => x.key === provider);
      setAccountLabel(p?.account_label || user?.email || "");
    }).catch(() => setAccountLabel(user?.email || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const fetchSources = async (q = "") => {
    setLoading(true); setLoadError("");
    try {
      const { data } = await api.get(`/connect/${provider}/sources`, { params: q ? { q } : {} });
      setSources(data.sources || []);
    } catch (e) {
      setLoadError(formatApiError(e));
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSources(""); /* eslint-disable-next-line */ }, [provider]);

  const onQuery = (v) => {
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSources(v.trim()), 350);
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= MAX_SELECT) {
        toast.info(`You can bring in up to ${MAX_SELECT} at once.`);
        return next;
      }
      next.add(id);
      return next;
    });
  };

  const gridCols = cfg.showCol2 ? "30px minmax(0,1fr) 100px 132px" : "30px minmax(0,1fr) 140px";

  const addToBracket = async () => {
    const chosen = sources.filter((s) => selected.has(s.id)).slice(0, MAX_SELECT)
      .map((s) => ({ id: s.id, name: s.name, url: s.url || "" }));
    if (!chosen.length) return;
    setSubmitting(true);
    navigate("/welcome/building", { state: { provider, sources: chosen } });
  };

  const count = selected.size;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ background: "#000" }} data-testid="select-source-page">
      <Seo title={cfg.title} path="/welcome/select" noindex />

      {/* LEFT */}
      <div className="relative flex flex-col w-full lg:w-[38%] xl:w-[34%] px-7 sm:px-12 lg:px-14 xl:px-16 py-10 lg:py-12">
        <div className="page-enter">
          <img src={BRACKET_LOGO} alt="Bracket" width={52} height={52} style={{ display: "block" }} />
          <h1 className="mt-6 font-display font-semibold tracking-[-0.025em] text-[34px] sm:text-[40px] leading-[1.04]" style={{ color: "#fff" }}>
            {cfg.title}
          </h1>
          <p className="mt-3 text-[13px] leading-[1.6] max-w-[340px]" style={{ ...MONO, color: "#7a7a7a" }}>
            {cfg.sub}
          </p>
        </div>

        <div className="mt-auto pt-10 flex flex-col gap-4 max-w-[420px]">
          {/* Connected account */}
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: "#0a0a0a", border: "1px solid #242424", borderRadius: 14 }} data-testid="select-source-connected">
            <span className="shrink-0 inline-flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: "50%", background: "#1f9d55" }}>
              <Check size={17} color="#fff" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-semibold text-[15px]" style={{ color: "#fff" }}>{cfg.connected}</span>
              <span className="block text-[12px] truncate" style={{ ...MONO, color: "#8a8a8a" }}>{accountLabel || "connected account"}</span>
            </span>
            <button type="button" onClick={() => setAcctModalOpen(true)} className="shrink-0 inline-flex items-center justify-center transition-colors" style={{ width: 34, height: 34, borderRadius: 8, color: "#8a8a8a" }} aria-label="Change account" data-testid="select-source-edit"
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8a8a"; }}>
              <Pencil size={16} />
            </button>
          </div>

          {/* Privacy */}
          <div className="flex items-start gap-3 px-4 py-3.5" style={{ background: "#0a0a0a", border: "1px solid #242424", borderRadius: 14 }}>
            <span className="shrink-0 inline-flex items-center justify-center mt-0.5" style={{ width: 34, height: 34, borderRadius: 8, background: "#151515", border: "1px solid #262626", color: "#c9c9c9" }}>
              <Lock size={15} />
            </span>
            <span className="min-w-0">
              <span className="block font-display font-semibold text-[14px] leading-[1.35]" style={{ color: "#fff" }}>We only read the conversations you choose.</span>
              <span className="block mt-1 text-[12px]" style={{ ...MONO, color: "#8a8a8a" }}>Your data is private &amp; secure.</span>
            </span>
          </div>

          <button type="button" onClick={() => navigate("/welcome")} className="mt-2 inline-flex items-center gap-2 text-[13px] transition-colors" style={{ ...MONO, color: "#8a8a8a" }} data-testid="select-source-back"
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8a8a"; }}>
            <ArrowLeft size={15} /> Back
          </button>
        </div>
      </div>

      {/* RIGHT — picker panel */}
      <div className="w-full lg:flex-1 px-5 sm:px-8 lg:pr-12 xl:pr-16 lg:pl-0 pb-10 lg:py-12">
        <div className="flex flex-col h-full max-h-[calc(100vh-96px)] lg:max-h-[calc(100vh-96px)]" style={{ background: "#050505", border: "1px solid #1e1e1e", borderRadius: 18, overflow: "hidden" }} data-testid="select-source-panel">
          {/* Search */}
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #161616" }}>
            <div className="flex items-center gap-3 px-4" style={{ background: "#0c0c0c", border: "1px solid #232323", borderRadius: 12, height: 56 }}>
              <Search size={20} style={{ color: "#6b6b6b" }} />
              <input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder={cfg.search}
                className="flex-1 bg-transparent outline-none text-[16px]"
                style={{ ...MONO, color: "#f0f0f0" }}
                data-testid="select-source-search"
              />
            </div>
          </div>

          {/* Header */}
          <div className="px-6 pt-4 pb-3 grid items-center" style={{ gridTemplateColumns: gridCols, gap: 16, borderBottom: "1px solid #161616" }}>
            <span />
            <span className="font-display font-medium text-[13px]" style={{ color: "#cfcfcf" }}>{cfg.col1}</span>
            {cfg.showCol2 && <span className="font-display font-medium text-[13px] text-center" style={{ color: "#cfcfcf" }}>{cfg.col2}</span>}
            <span className="font-display font-medium text-[13px] text-right" style={{ color: "#cfcfcf" }}>Last Activity</span>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto select-source-scroll" data-testid="select-source-list">
            {loading ? (
              <div className="flex items-center justify-center py-20" style={{ color: "#6b6b6b" }}>
                <Loader2 size={22} className="animate-spin" />
              </div>
            ) : loadError ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[13.5px]" style={{ color: "#c9c9c9" }}>{loadError}</p>
                <button type="button" onClick={() => fetchSources(query.trim())} className="mt-4 login-link text-[13px]" style={MONO} data-testid="select-source-retry">Try again</button>
              </div>
            ) : sources.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[13.5px]" style={{ color: "#8a8a8a" }}>Nothing matched your search.</p>
              </div>
            ) : (
              sources.map((s) => {
                const on = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="w-full text-left grid items-center px-6 py-4 transition-colors select-source-row"
                    style={{ gridTemplateColumns: gridCols, gap: 16, borderBottom: "1px solid #141414", background: on ? "rgba(255,255,255,0.035)" : "transparent" }}
                    data-testid={`select-source-row-${s.id}`}
                    aria-pressed={on}
                  >
                    <span
                      className="shrink-0 inline-flex items-center justify-center"
                      style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${on ? "#fff" : "#3a3a3a"}`, background: on ? "#fff" : "transparent", boxSizing: "border-box" }}
                      data-testid={`select-source-check-${s.id}`}
                    >
                      {on && <Check size={14} color="#000" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display font-semibold text-[16px] tracking-[-0.01em] truncate" style={{ color: "#fff" }}>{s.name || "(untitled)"}</span>
                      {subLabel(provider, s) && (
                        <span className="block mt-0.5 text-[12.5px] truncate" style={{ ...MONO, color: "#767676" }}>{subLabel(provider, s)}</span>
                      )}
                    </span>
                    {cfg.showCol2 && (
                      <span className="text-[15px] text-center" style={{ ...MONO, color: "#8f8f8f" }}>{col2Value(s)}</span>
                    )}
                    <span className="text-[14px] text-right" style={{ ...MONO, color: "#8f8f8f" }}>{formatActivity(s.meta?.updated)}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 flex items-center justify-between gap-4" style={{ borderTop: "1px solid #1a1a1a", background: "#070707" }}>
            <span className="text-[12.5px]" style={{ ...MONO, color: count ? "#c9c9c9" : "#5f5f5f" }} data-testid="select-source-count">
              {count ? `${count} selected` : "Select at least one"}
            </span>
            <button
              type="button"
              onClick={addToBracket}
              disabled={!count || submitting}
              className="inline-flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-default"
              style={{ height: 52, minWidth: 220, padding: "0 26px", borderRadius: 9999, background: "#fff", color: "#000", fontWeight: 600, letterSpacing: "0.02em", ...MONO }}
              data-testid="select-source-submit"
            >
              {submitting ? <><Loader2 size={17} className="animate-spin" /> Adding…</> : <>Add to Bracket <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>

      {acctModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !reconnecting) setAcctModalOpen(false); }}
          data-testid="account-change-modal"
        >
          <div className="w-full max-w-[400px] page-enter" style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 24 }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="mono-tag text-[9.5px]" style={{ ...MONO, color: "#7a7a7a" }}>{cfg.connected.toUpperCase()}</p>
                <h2 className="mt-1 font-display font-semibold text-[19px] tracking-[-0.01em]" style={{ color: "#fff" }} data-testid="account-change-title">
                  Switch account
                </h2>
              </div>
              <button type="button" onClick={() => !reconnecting && setAcctModalOpen(false)} className="shrink-0 grid place-items-center" style={{ width: 30, height: 30, borderRadius: 9999, border: "1px solid rgba(255,255,255,0.14)", color: "#9a9a9a" }} data-testid="account-change-close" aria-label="Close">
                <X size={15} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 px-4 py-3.5" style={{ background: "#0a0a0a", border: "1px solid #242424", borderRadius: 12 }}>
              <span className="shrink-0 inline-flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: "50%", background: "#1f9d55" }}>
                <Check size={15} color="#fff" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px]" style={{ ...MONO, color: "#7a7a7a" }}>Currently connected</span>
                <span className="block text-[13px] truncate" style={{ color: "#fff" }} data-testid="account-change-current">{accountLabel || "connected account"}</span>
              </span>
            </div>

            <p className="mt-3 text-[12.5px] leading-[1.6]" style={{ ...MONO, color: "#8a8a8a" }}>
              Connect a different {cfg.connected.replace(" connected", "")} account. You'll pick the sources from the newly connected account.
            </p>

            <button
              type="button"
              onClick={reconnectAccount}
              disabled={reconnecting}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 h-11 text-[13px] font-semibold transition-colors disabled:opacity-60"
              style={{ ...MONO, background: "#fff", color: "#000", borderRadius: 9999 }}
              data-testid="account-change-reconnect"
            >
              {reconnecting ? <><Loader2 size={15} className="animate-spin" /> Waiting for authorization…</> : <><RefreshCw size={14} /> Connect a different account</>}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
