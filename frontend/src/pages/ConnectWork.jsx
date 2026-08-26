import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckSquare,
  Loader2,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useDialog } from "../components/Dialog";
import { PROVIDER_META, ProviderIcon, timeAgo } from "../lib/providersMeta";

const STATUS_CHIP = {
  connected:      { label: "CONNECTED",      style: { background: "rgba(34,197,94,0.10)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" } },
  available:      { label: "CONNECT",        style: { background: "rgba(94,106,210,0.10)", color: "#8B95E8", border: "1px solid rgba(94,106,210,0.3)" } },
  setup_required: { label: "SETUP REQUIRED", style: { background: "rgba(255,184,76,0.10)", color: "#FFB84C", border: "1px solid rgba(255,184,76,0.25)" } },
  coming_soon:    { label: "COMING SOON",    style: { background: "transparent", color: "var(--text-3)", border: "1px solid var(--hairline)" } },
};

function Chip({ status }) {
  const c = STATUS_CHIP[status] || STATUS_CHIP.coming_soon;
  return <span className="mono-tag px-2 py-0.5 rounded text-[9.5px]" style={c.style}>{c.label}</span>;
}

function AppCard({ p, onPick, onDisconnect, busy }) {
  const clickable = p.status === "connected" || p.status === "available";
  return (
    <div
      className="card-linear card-linear--solid p-4 text-left w-full transition-transform duration-200 hover:-translate-y-0.5 relative group"
      data-testid={`connect-app-${p.key}`}
    >
      <button
        type="button"
        onClick={() => onPick(p)}
        disabled={p.status === "coming_soon" || busy === p.key}
        className="block w-full text-left disabled:opacity-45 disabled:hover:translate-y-0"
      >
        <div className="flex items-start justify-between gap-2">
          <ProviderIcon provider={p.key} size={17} />
          {busy === p.key ? <Loader2 size={13} className="animate-spin text-signal" /> : <Chip status={p.status} />}
        </div>
        <p className="mt-3 font-display font-semibold text-[14.5px] text-[var(--text)]">{p.label}</p>
        <p className="mt-1 text-[11.5px] text-[var(--text-3)] leading-snug">{p.desc}</p>
        {p.status === "connected" && p.account_label && (
          <p className="mt-2 mono-tag text-[9.5px] text-signal truncate">{p.account_label}</p>
        )}
        {clickable && p.status === "available" && (
          <p className="mt-2 text-[10px] text-[var(--text-3)]">One click — sign in with {p.label}, then pick your source.</p>
        )}
      </button>
      {p.status === "connected" && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDisconnect(p); }}
          disabled={busy === `dc:${p.key}`}
          title={`Disconnect ${p.label}`}
          aria-label={`Disconnect ${p.label}`}
          className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-3)" }}
          data-testid={`connect-disconnect-${p.key}`}
        >
          {busy === `dc:${p.key}` ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        </button>
      )}
    </div>
  );
}

// ─── Source selection popup — searchable, multi-select ─────────────────────
function SourceModal({ provider, onConfirm, onClose }) {
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const isFigma = provider.select_mode === "figma";
  const autoList = !isFigma || provider.has_team;

  const fetchSources = async (query = "", link = "") => {
    setLoading(true);
    try {
      const { data } = await api.get(`/connect/${provider.key}/sources`, { params: { q: query, url: link } });
      const rows = data.sources || [];
      setSources(rows);
      if (link && FIG_FILE_RE.test(link) && rows.length === 1) {
        setSelected((s) => ({ ...s, [rows[0].id]: rows[0] }));
      }
      if (link && !rows.length) toast.error("Nothing found for that link.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoList) fetchSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.key]);

  const toggle = (s) => {
    setSelected((cur) => {
      const next = { ...cur };
      if (next[s.id]) delete next[s.id];
      else if (Object.keys(next).length >= 5) { toast.info("You can connect up to 5 sources at once."); return cur; }
      else next[s.id] = s;
      return next;
    });
  };

  const picked = Object.values(selected);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" data-testid="source-modal">
      <div className="absolute inset-0" style={{ background: "rgba(4,5,6,0.75)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      <div className="relative card-linear card-linear--solid w-full max-w-[620px] max-h-[82vh] flex flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon provider={provider.key} size={17} />
            <div className="min-w-0">
              <p className="font-display font-semibold text-[16px] text-[var(--text)]">
                {provider.key === "gmail" ? "Select a conversation" : provider.key === "figma" ? "Select design files" : `Select ${provider.label} sources`}
              </p>
              <p className="text-[11px] text-[var(--text-3)] truncate">{provider.select_hint}</p>
            </div>
          </div>
          <button onClick={onClose} className="flow-header-action" data-testid="source-modal-close" aria-label="Close"><X size={12} /></button>
        </div>

        {isFigma && (
          <div className="mt-4 flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url.trim() && fetchSources("", url.trim())}
              placeholder="Paste a Figma file link or team link…"
              className="dashboard-search-input flex-1"
              style={{ height: 36 }}
              data-testid="source-modal-url-input"
            />
            <button onClick={() => url.trim() && fetchSources("", url.trim())} disabled={loading || !url.trim()} className="flow-header-action" data-testid="source-modal-url-go">
              {loading ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
            </button>
          </div>
        )}

        <div className={`${isFigma ? "mt-2" : "mt-4"} dashboard-search relative`}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSources(q)}
            placeholder={provider.key === "gmail" ? "Search emails… (press Enter)" : "Search… (press Enter)"}
            className="dashboard-search-input w-full"
            data-testid="source-modal-search"
          />
        </div>

        <div className="mt-3 flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5" data-testid="source-modal-list">
          {loading && <div className="flex items-center gap-2 text-[12px] text-[var(--text-3)] py-3"><Loader2 size={13} className="animate-spin" /> Loading…</div>}
          {!loading && sources.map((s) => {
            const on = !!selected[s.id];
            return (
              <button
                key={s.id}
                onClick={() => toggle(s)}
                className="p-3 text-left flex items-center gap-3 rounded-lg transition-colors"
                style={{ background: on ? "rgba(94,106,210,0.10)" : "rgba(255,255,255,0.02)", border: `1px solid ${on ? "rgba(94,106,210,0.4)" : "var(--hairline)"}` }}
                data-testid={`source-modal-item-${s.id}`}
              >
                {on ? <CheckSquare size={15} className="text-signal shrink-0" /> : <Square size={15} className="text-[var(--text-3)] shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[var(--text)] truncate">{s.name}</p>
                  <p className="text-[10.5px] text-[var(--text-3)] truncate">
                    {s.meta?.detail || ""}{s.meta?.extra ? ` · ${s.meta.extra}` : ""}{s.meta?.updated ? ` · ${timeAgo(s.meta.updated)}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
          {!loading && !sources.length && (
            <p className="text-[12px] text-[var(--text-3)] py-3">
              {isFigma ? "Paste a Figma file or team link above to browse your files." : "Nothing found. Try a different search."}
            </p>
          )}
        </div>

        <div className="mt-4 pt-4 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--hairline)" }}>
          <p className="text-[11px] text-[var(--text-3)]">
            {picked.length ? `${picked.length} selected` : provider.multi ? "Select one or more sources" : "Select a source"}
            {" · "}Bracket only reads what you select.
          </p>
          <button
            onClick={() => onConfirm(picked)}
            disabled={!picked.length}
            className="clay-signal px-4 py-2 t-tag press inline-flex items-center gap-2 disabled:opacity-40"
            data-testid="source-modal-confirm"
          >
            Connect {picked.length > 1 ? `${picked.length} sources` : "source"} <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

const FIG_FILE_RE = /figma\.com\/(file|design|board|proto)\//;

// ─── Preview + create/attach ────────────────────────────────────────────────
const COUNT_LABELS = { requirements: "requirements", decisions: "decisions", deliverables: "deliverables", deadlines: "deadlines", open_questions: "open questions" };

function SourcePreview({ provider, sources, attachProjectId, onDone, onBack }) {
  const [phase, setPhase] = useState("analyzing");
  const [preview, setPreview] = useState(null);
  const [projects, setProjects] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data }, projRes] = await Promise.all([
          api.post("/connect/preview", {
            provider: provider.key,
            sources: sources.map((s) => ({ id: s.id, name: s.name, url: s.url || "" })),
          }),
          api.get("/projects").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setPreview(data);
        setProjects(Array.isArray(projRes.data) ? projRes.data : projRes.data?.projects || []);
        if (data.failed) toast.warning(`${data.failed} source(s) couldn't be read and were skipped.`);
        setPhase("ready");
      } catch (e) {
        if (!cancelled) { toast.error(formatApiError(e)); onBack(); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const establish = async (mode, projectId = null) => {
    setPhase("creating");
    try {
      const { data } = await api.post("/connect/establish", { preview_id: preview.preview_id, mode, project_id: projectId });
      onDone(data.project_id, mode);
    } catch (e) {
      toast.error(formatApiError(e));
      setPhase("ready");
    }
  };

  if (phase === "analyzing") {
    return (
      <div className="card-linear card-linear--solid p-8 max-w-[560px] text-center" data-testid="connect-analyzing">
        <Loader2 size={22} className="animate-spin mx-auto text-signal" />
        <p className="mt-4 font-display font-semibold text-[16px] text-[var(--text)]">Bracket is reading {sources.length > 1 ? `${sources.length} sources` : "this source"}…</p>
        <p className="mt-1.5 text-[12px] text-[var(--text-3)]">{sources.map((s) => s.name).join(" · ").slice(0, 120)}</p>
        <p className="mt-3 text-[11.5px] text-[var(--text-3)]">Extracting requirements, decisions, deliverables and deadlines. ~30 seconds.</p>
      </div>
    );
  }

  const counts = preview?.counts || {};
  const proj = preview?.project || {};
  const match = attachProjectId ? null : preview?.match;
  const attachTarget = attachProjectId ? projects.find((p) => p.id === attachProjectId) : null;

  return (
    <div className="max-w-[640px]" data-testid="connect-preview">
      <p className="mono-label">{"< review — we found your project >"}</p>
      <div className="mt-3 card-linear card-linear--solid p-5">
        <div className="flex flex-col gap-2.5">
          {(preview?.sources || []).map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <ProviderIcon provider={provider.key} size={15} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-[var(--text)] truncate">{s.name}</p>
                <p className="text-[10.5px] text-[var(--text-3)]">{PROVIDER_META[provider.key]?.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--hairline)" }}>
          <p className="mono-tag text-signal text-[10px] inline-flex items-center gap-1.5"><Sparkles size={11} /> BRACKET DETECTED</p>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
            {Object.entries(COUNT_LABELS).map(([k, label]) => (
              <span key={k} className="text-[12.5px] text-[var(--text-2)]" data-testid={`connect-count-${k}`}>
                <span className="font-display font-semibold text-[16px] text-[var(--text)] tabular-nums">{counts[k] ?? 0}</span> {label}
              </span>
            ))}
          </div>
          {proj.name && (
            <div className="mt-4">
              <p className="text-[13.5px] font-medium text-[var(--text)]">{proj.name}</p>
              {proj.client && <p className="mono-tag text-[10px] text-muted mt-0.5">CLIENT · {proj.client}</p>}
              {proj.description && <p className="mt-1.5 text-[12px] text-[var(--text-3)] leading-snug">{proj.description}</p>}
            </div>
          )}
        </div>
      </div>

      {match && (
        <div className="mt-3 card-linear card-linear--solid p-4" style={{ borderColor: "rgba(94,106,210,0.35)" }} data-testid="connect-match-card">
          <p className="mono-tag text-signal text-[10px]">WE FOUND A POSSIBLE PROJECT MATCH</p>
          <p className="mt-1.5 text-[14px] font-medium text-[var(--text)]">{match.name}</p>
          <p className="text-[11.5px] text-[var(--text-3)] mt-0.5">{match.reason} · {match.confidence}% confidence</p>
        </div>
      )}

      <div className="mt-4">
        <p className="mono-tag text-muted text-[10px] mb-2.5">WHAT WOULD YOU LIKE TO DO?</p>
        <div className="flex flex-wrap gap-2">
          {attachTarget ? (
            <button onClick={() => establish("existing", attachProjectId)} disabled={phase === "creating"} className="clay-signal px-4 py-2 t-tag press inline-flex items-center gap-2 disabled:opacity-40" data-testid="connect-attach-target">
              {phase === "creating" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Connect to “{attachTarget.name?.slice(0, 32)}”
            </button>
          ) : (
            <>
              {match && (
                <button onClick={() => establish("existing", match.id)} disabled={phase === "creating"} className="clay-signal px-4 py-2 t-tag press inline-flex items-center gap-2 disabled:opacity-40" data-testid="connect-to-match">
                  {phase === "creating" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Connect to {match.name?.slice(0, 26)}
                </button>
              )}
              <button onClick={() => establish("new")} disabled={phase === "creating"} className={`${match ? "flow-header-action" : "clay-signal px-4 py-2 t-tag press inline-flex items-center gap-2"} disabled:opacity-40`} data-testid="connect-create-project">
                {phase === "creating" && !match ? <Loader2 size={13} className="animate-spin" /> : null} Create new project
              </button>
            </>
          )}
          {projects.length > 0 && !attachTarget && (
            <button onClick={() => setPickerOpen((o) => !o)} className="flow-header-action" data-testid="connect-choose-project">
              {match ? "Choose another project" : "Connect to an existing project"}
            </button>
          )}
        </div>
        {pickerOpen && (
          <div className="mt-3 card-linear card-linear--solid p-2 max-h-[240px] overflow-y-auto" data-testid="connect-project-picker">
            {projects.map((p) => (
              <button key={p.id} onClick={() => establish("existing", p.id)} className="w-full text-left px-3 py-2 rounded hover:bg-[var(--surface-2)] text-[12.5px] text-[var(--text-2)]" data-testid={`connect-pick-${p.id}`}>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onBack} className="mt-5 mono-tag text-muted hover:text-[var(--text)] text-[10px] inline-flex items-center gap-1" data-testid="connect-preview-back">
        <ArrowLeft size={11} /> CHOOSE DIFFERENT SOURCES
      </button>
    </div>
  );
}

// ─── Root page ──────────────────────────────────────────────────────────────
export default function ConnectWork() {
  const navigate = useNavigate();
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const attachProjectId = searchParams.get("project") || null;

  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("directory"); // directory | preview | done
  const [active, setActive] = useState(null);
  const [modalProvider, setModalProvider] = useState(null);
  const [sources, setSources] = useState([]);
  const [doneProject, setDoneProject] = useState(null);
  const [busy, setBusy] = useState(null);
  const pendingOAuth = useRef(null);

  const loadProviders = async () => {
    try {
      const { data } = await api.get("/connect/providers");
      setProviders(data.providers || []);
      setCategories(data.categories || []);
      return data.providers || [];
    } catch (e) {
      toast.error(formatApiError(e));
      return [];
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadProviders(); }, []);

  // Deep-link support — /app/connect?tool=gmail auto-opens that provider's
  // source-picker once providers finish loading, so the dashboard chips can
  // drop the user straight into the flow.
  useEffect(() => {
    const tool = searchParams.get("tool");
    if (!loading && tool && providers.length && !modalProvider) {
      const p = providers.find((x) => x.key === tool);
      if (p && p.status === "connected") setModalProvider(p);
      else if (p) setActive(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, providers]);

  // OAuth popup completion — the callback page posts "bracket-oauth:{key}:{ok|error}"
  useEffect(() => {
    const onMsg = async (e) => {
      if (typeof e.data !== "string" || !e.data.startsWith("bracket-oauth:")) return;
      const [, key, result] = e.data.split(":");
      if (result === "ok") {
        toast.success(`${PROVIDER_META[key]?.label || key} connected.`);
        const fresh = await loadProviders();
        const p = fresh.find((x) => x.key === key);
        if (p) setModalProvider(p);
      } else {
        toast.error("Authorization didn't complete — please try again.");
      }
      pendingOAuth.current = null;
      setBusy(null);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  }, [providers, query]);

  const pick = async (p) => {
    if (p.status === "coming_soon") return;
    if (p.status === "setup_required") {
      toast.info(`${p.label} isn't enabled yet — it needs one-time admin configuration.`);
      return;
    }
    setActive(p);
    if (p.status === "connected") {
      setModalProvider(p);
      return;
    }
    // One-click OAuth: open the popup synchronously (popup-blocker safe),
    // then point it at the provider's login screen.
    const popup = window.open("about:blank", "bracket-oauth", "width=560,height=680");
    setBusy(p.key);
    try {
      const { data } = await api.get(`/connect/${p.key}/auth-url`);
      if (popup) popup.location = data.url;
      else window.open(data.url, "_blank");
      pendingOAuth.current = p.key;
    } catch (e) {
      if (popup) popup.close();
      setBusy(null);
      toast.error(formatApiError(e));
    }
  };

  const disconnectProvider = async (p) => {
    // Fetch every connection for this provider (across projects the user owns)
    // and disconnect them in one confirm. We can't cleanly single-connection
    // scope from this directory view — the provider card represents ALL of
    // the user's connections for that tool.
    setBusy(`dc:${p.key}`);
    let ids = [];
    try {
      const { data } = await api.get("/connect/connections");
      ids = (data.connections || [])
        .filter((c) => c.provider === p.key && c.status !== "disconnected")
        .map((c) => c.id);
    } catch (e) {
      toast.error(formatApiError(e));
      setBusy(null);
      return;
    }
    if (!ids.length) {
      toast.info(`No active ${p.label} connections to disconnect.`);
      setBusy(null);
      loadProviders();
      return;
    }
    const ok = await dialog.confirm({
      title: `Disconnect ${p.label}?`,
      message: `Bracket will stop syncing ${ids.length === 1 ? "this source" : `${ids.length} sources`}. Memory items already extracted stay. You can reconnect anytime.`,
      confirmLabel: "Disconnect",
      tone: "danger",
    });
    if (!ok) { setBusy(null); return; }
    try {
      await Promise.all(ids.map((cid) => api.delete(`/connect/connections/${cid}`)));
      toast.success(`${p.label} disconnected`);
      await loadProviders();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="dashboard-root relative min-h-full" data-testid="connect-work-page">
      <div aria-hidden="true" className="hero-ambient hero-ambient--dashboard" />
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, #08090A 0%, #06070A 55%, #050506 100%)" }} />

      <main className="relative max-w-[1100px] mx-auto px-6 sm:px-8 md:px-10 py-6 md:py-8 flex flex-col gap-6 page-enter">
        <Link to={attachProjectId ? `/project/${attachProjectId}` : "/app"} className="mono-tag text-muted hover:text-[var(--text)] inline-flex items-center gap-1.5 text-[10px] w-fit" data-testid="connect-back">
          ← {attachProjectId ? "BACK TO PROJECT" : "BACK TO DASHBOARD"}
        </Link>

        {view === "directory" && (
          <>
            <div>
              <p className="mono-tag text-muted text-[10px]">CONNECT WORK</p>
              <h1 className="mt-1.5 font-display font-semibold tracking-[-0.028em] leading-[1.1] text-[26px] sm:text-[30px] text-[var(--text)]">
                Connect your work
              </h1>
              <p className="mt-2 text-[13.5px] text-[var(--text-2)] max-w-[560px]">
                Bring your client conversations, designs and files into Bracket.
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--text-3)] max-w-[560px]">
                Connect a specific conversation, file or work source — not your entire workspace.
              </p>
            </div>

            <div className="dashboard-search relative max-w-[340px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps…"
                className="dashboard-search-input w-full"
                data-testid="connect-search-input"
              />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-3)]"><Loader2 size={13} className="animate-spin" /> Loading…</div>
            ) : (
              categories.map((cat) => {
                const apps = filtered.filter((p) => p.category === cat);
                if (!apps.length) return null;
                return (
                  <section key={cat} data-testid={`connect-category-${cat.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                    <p className="mono-tag text-muted text-[10px] mb-3">{cat.toUpperCase()}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {apps.map((p) => <AppCard key={p.key} p={p} onPick={pick} onDisconnect={disconnectProvider} busy={busy} />)}
                    </div>
                  </section>
                );
              })
            )}
          </>
        )}

        {view === "preview" && active && sources.length > 0 && (
          <SourcePreview
            provider={active}
            sources={sources}
            attachProjectId={attachProjectId}
            onBack={() => { setSources([]); setView("directory"); setModalProvider(active); }}
            onDone={(projectId, mode) => { setDoneProject({ id: projectId, mode }); setView("done"); }}
          />
        )}

        {view === "done" && doneProject && (
          <div className="card-linear card-linear--solid p-8 max-w-[560px] text-center" data-testid="connect-done">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-full" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <Check size={20} style={{ color: "#22C55E" }} />
            </span>
            <p className="mt-4 font-display font-semibold text-[18px] text-[var(--text)]">
              {doneProject.mode === "new" ? "Your project is ready" : "Sources connected"}
            </p>
            <p className="mt-2 text-[12.5px] text-[var(--text-3)]">
              Bracket will continue to understand this connected work as it evolves.
            </p>
            <button
              onClick={() => navigate(`/project/${doneProject.id}`)}
              className="clay-signal px-5 py-2.5 t-tag press inline-flex items-center gap-2 mt-5"
              data-testid="connect-view-project"
            >
              View project <ArrowRight size={13} />
            </button>
          </div>
        )}
      </main>

      {modalProvider && (
        <SourceModal
          provider={modalProvider}
          onClose={() => setModalProvider(null)}
          onConfirm={(picked) => {
            setModalProvider(null);
            setActive(modalProvider);
            setSources(picked);
            setView("preview");
          }}
        />
      )}
    </div>
  );
}
