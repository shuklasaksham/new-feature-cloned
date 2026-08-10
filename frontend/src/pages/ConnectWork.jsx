import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  KeyRound,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
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

// ─── Directory card ────────────────────────────────────────────────────────
function AppCard({ p, onPick }) {
  const clickable = p.status === "connected" || p.status === "available";
  return (
    <button
      type="button"
      onClick={() => onPick(p)}
      disabled={!clickable && p.status !== "setup_required"}
      className="card-linear card-linear--solid p-4 text-left w-full transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-45 disabled:hover:translate-y-0"
      data-testid={`connect-app-${p.key}`}
    >
      <div className="flex items-start justify-between gap-2">
        <ProviderIcon provider={p.key} size={17} />
        <Chip status={p.status} />
      </div>
      <p className="mt-3 font-display font-semibold text-[14.5px] text-[var(--text)]">{p.label}</p>
      <p className="mt-1 text-[11.5px] text-[var(--text-3)] leading-snug">{p.desc}</p>
      {p.status === "connected" && p.account_label && (
        <p className="mt-2 mono-tag text-[9.5px] text-signal truncate">{p.account_label}</p>
      )}
    </button>
  );
}

// ─── Step: connect account (token) ─────────────────────────────────────────
function TokenConnect({ provider, onDone, onBack }) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (token.trim().length < 8) return toast.error("Paste a valid token first.");
    setSaving(true);
    try {
      const { data } = await api.post("/connect/accounts", { provider: provider.key, token: token.trim() });
      toast.success(`${provider.label} connected — ${data.label}`);
      onDone();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="card-linear card-linear--solid p-5 sm:p-6 max-w-[560px]" data-testid="connect-token-panel">
      <div className="flex items-center gap-3">
        <ProviderIcon provider={provider.key} size={18} />
        <div>
          <p className="font-display font-semibold text-[16px] text-[var(--text)]">Connect {provider.label}</p>
          <p className="text-[11.5px] text-[var(--text-3)]">Bracket only reads the specific source you select — never your whole account.</p>
        </div>
      </div>
      <p className="mt-4 text-[12.5px] text-[var(--text-2)] leading-relaxed">{provider.help}</p>
      {provider.help_url && (
        <a href={provider.help_url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-signal hover:underline" data-testid="connect-token-help-link">
          Open {provider.label} token settings <ExternalLink size={11} />
        </a>
      )}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={`Paste your ${provider.label} token…`}
          className="dashboard-search-input flex-1"
          style={{ height: 38 }}
          data-testid="connect-token-input"
          autoFocus
        />
        <button onClick={save} disabled={saving} className="clay-signal px-4 py-2 t-tag press inline-flex items-center justify-center gap-2 disabled:opacity-40" data-testid="connect-token-save">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Connect
        </button>
      </div>
      <p className="mt-3 text-[10.5px] text-[var(--text-3)] inline-flex items-center gap-1.5">
        <KeyRound size={10} /> Stored encrypted. Disconnect anytime.
      </p>
      <button onClick={onBack} className="mt-4 mono-tag text-muted hover:text-[var(--text)] text-[10px] inline-flex items-center gap-1" data-testid="connect-token-back">
        <ArrowLeft size={11} /> BACK
      </button>
    </div>
  );
}

// ─── Step: select the specific source ──────────────────────────────────────
function SourceSelect({ provider, onSelect, onBack }) {
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(provider.select_mode !== "url");

  const fetchSources = async (query = "", fileUrl = "") => {
    setLoading(true);
    try {
      const { data } = await api.get(`/connect/${provider.key}/sources`, { params: { q: query, url: fileUrl } });
      setSources(data.sources || []);
      if (fileUrl && (data.sources || []).length === 1) onSelect(data.sources[0]);
      else if (fileUrl && !(data.sources || []).length) toast.error("Couldn't resolve that link.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider.select_mode !== "url") fetchSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.key]);

  return (
    <div className="max-w-[640px]" data-testid="connect-source-select">
      <p className="mono-label">{"< select the source >"}</p>
      <h2 className="mt-2 font-display font-semibold tracking-[-0.02em] text-[22px] text-[var(--text)]">
        {provider.key === "gmail" ? "Select a conversation" : provider.key === "figma" ? "Select a design file" : `Select the ${provider.label} source`}
      </h2>
      <p className="mt-1 text-[12.5px] text-[var(--text-3)]">{provider.select_hint || "Choose the specific work you want Bracket to understand."}</p>

      {provider.select_mode === "url" ? (
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && url.trim() && fetchSources("", url.trim())}
            placeholder="https://www.figma.com/design/…"
            className="dashboard-search-input flex-1"
            style={{ height: 38 }}
            data-testid="connect-source-url-input"
            autoFocus
          />
          <button
            onClick={() => url.trim() && fetchSources("", url.trim())}
            disabled={loading || !url.trim()}
            className="clay-signal px-4 py-2 t-tag press inline-flex items-center justify-center gap-2 disabled:opacity-40"
            data-testid="connect-source-url-go"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} Find file
          </button>
        </div>
      ) : (
        <div className="mt-4 dashboard-search relative max-w-[380px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSources(q)}
            placeholder={provider.key === "gmail" ? "Search emails…" : "Search…"}
            className="dashboard-search-input w-full"
            data-testid="connect-source-search"
          />
        </div>
      )}

      {loading && provider.select_mode !== "url" ? (
        <div className="mt-5 flex items-center gap-2 text-[12px] text-[var(--text-3)]"><Loader2 size={13} className="animate-spin" /> Loading sources…</div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {sources.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="card-linear card-linear--solid p-3.5 text-left flex items-center gap-3 transition-transform duration-200 hover:-translate-y-0.5"
              data-testid={`connect-source-item-${s.id}`}
            >
              <ProviderIcon provider={provider.key} size={15} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--text)] truncate">{s.name}</p>
                <p className="text-[11px] text-[var(--text-3)] truncate">
                  {s.meta?.detail || ""}{s.meta?.extra ? ` · ${s.meta.extra}` : ""}{s.meta?.updated ? ` · ${timeAgo(s.meta.updated)}` : ""}
                </p>
              </div>
              <ArrowRight size={13} className="text-[var(--text-3)] shrink-0" />
            </button>
          ))}
          {!loading && provider.select_mode !== "url" && sources.length === 0 && (
            <p className="text-[12px] text-[var(--text-3)] mt-2">Nothing found. {provider.key === "notion" ? "Make sure the page is shared with your integration." : "Try a different search."}</p>
          )}
        </div>
      )}
      <button onClick={onBack} className="mt-5 mono-tag text-muted hover:text-[var(--text)] text-[10px] inline-flex items-center gap-1" data-testid="connect-source-back">
        <ArrowLeft size={11} /> BACK
      </button>
    </div>
  );
}

// ─── Step: preview + create/attach ─────────────────────────────────────────
const COUNT_LABELS = { requirements: "requirements", decisions: "decisions", deliverables: "deliverables", deadlines: "deadlines", open_questions: "open questions" };

function SourcePreview({ provider, source, attachProjectId, onDone, onBack }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("analyzing"); // analyzing | ready | creating
  const [preview, setPreview] = useState(null);
  const [projects, setProjects] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data }, projRes] = await Promise.all([
          api.post("/connect/preview", {
            provider: provider.key, source_id: source.id, source_name: source.name, source_url: source.url || "",
          }),
          api.get("/projects").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setPreview(data);
        setProjects(Array.isArray(projRes.data) ? projRes.data : projRes.data?.projects || []);
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
        <p className="mt-4 font-display font-semibold text-[16px] text-[var(--text)]">Bracket is reading this source…</p>
        <p className="mt-1.5 text-[12px] text-[var(--text-3)]">{source.name}</p>
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
      <p className="mono-label">{"< review this source >"}</p>
      <div className="mt-3 card-linear card-linear--solid p-5">
        <div className="flex items-center gap-3">
          <ProviderIcon provider={provider.key} size={17} />
          <div className="min-w-0">
            <p className="font-display font-semibold text-[15.5px] text-[var(--text)] truncate">{source.name}</p>
            <p className="text-[11px] text-[var(--text-3)]">{PROVIDER_META[provider.key]?.label}{source.meta?.extra ? ` · ${source.meta.extra}` : ""}</p>
          </div>
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
        <ArrowLeft size={11} /> CHOOSE A DIFFERENT SOURCE
      </button>
    </div>
  );
}

// ─── Root page ──────────────────────────────────────────────────────────────
export default function ConnectWork() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attachProjectId = searchParams.get("project") || null;

  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("directory"); // directory | token | select | preview | done
  const [active, setActive] = useState(null);
  const [source, setSource] = useState(null);
  const [doneProject, setDoneProject] = useState(null);

  const loadProviders = async () => {
    try {
      const { data } = await api.get("/connect/providers");
      setProviders(data.providers || []);
      setCategories(data.categories || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadProviders(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  }, [providers, query]);

  const pick = async (p) => {
    if (p.status === "coming_soon") return;
    if (p.status === "setup_required") {
      toast.info(`${p.label} needs one-time setup (OAuth app credentials). It'll light up automatically once configured.`);
      return;
    }
    setActive(p);
    if (p.key === "gmail" && p.status === "available") {
      try {
        const { data } = await api.get("/connect/gmail/auth-url");
        window.open(data.url, "_blank", "width=520,height=640");
        toast.info("Authorize Gmail in the popup, then come back here.");
      } catch (e) { toast.error(formatApiError(e)); }
      return;
    }
    setView(p.status === "connected" ? "select" : "token");
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
                      {apps.map((p) => <AppCard key={p.key} p={p} onPick={pick} />)}
                    </div>
                  </section>
                );
              })
            )}
          </>
        )}

        {view === "token" && active && (
          <TokenConnect
            provider={active}
            onBack={() => { setActive(null); setView("directory"); }}
            onDone={async () => { await loadProviders(); setView("select"); }}
          />
        )}

        {view === "select" && active && (
          <SourceSelect
            provider={active}
            onBack={() => { setActive(null); setView("directory"); }}
            onSelect={(s) => { setSource(s); setView("preview"); }}
          />
        )}

        {view === "preview" && active && source && (
          <SourcePreview
            provider={active}
            source={source}
            attachProjectId={attachProjectId}
            onBack={() => { setSource(null); setView("select"); }}
            onDone={(projectId, mode) => { setDoneProject({ id: projectId, mode }); setView("done"); }}
          />
        )}

        {view === "done" && doneProject && (
          <div className="card-linear card-linear--solid p-8 max-w-[560px] text-center" data-testid="connect-done">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-full" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <Check size={20} style={{ color: "#22C55E" }} />
            </span>
            <p className="mt-4 font-display font-semibold text-[18px] text-[var(--text)]">
              {doneProject.mode === "new" ? "Your project is ready" : "Source connected"}
            </p>
            <p className="mt-2 text-[12.5px] text-[var(--text-3)]">
              Bracket will continue to understand this connected source as it evolves.
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
    </div>
  );
}
