import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, ExternalLink, AlertTriangle,
  Sparkles, History, Copy, Mail, Slack, Pencil, RefreshCw,
  Check, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import Seo from "../components/Seo";
import ChangeActionDrawer from "../components/ChangeActionDrawer";
import HistoryDrawer from "../components/HistoryDrawer";
import { MEMORY_CATEGORIES, CATEGORY_BY_KEY, STATUS_META } from "../lib/memoryCategories";
import { ProviderIcon, timeAgo } from "../lib/providersMeta";

/**
 * ProjectMemory (v2) — Notion-inspired dark, minimal.
 * - Header: crumbs, title, subtitle w/ live indicator, History + Review CTAs.
 * - Horizontal pill tabs: Overview + the 6 canonical categories.
 * - Overview tab: ONE project-level suggested reply (editable + regenerate),
 *   category count strip, connected sources.
 * - Category tab: filter (All / New / Confirmed) + list of memory rows.
 * - Auto-refresh every 10s while the tab is visible.
 */
const STATUS_FILTERS = [
  { key: "all",       label: "All" },
  { key: "detected",  label: "New" },
  { key: "confirmed", label: "Confirmed" },
];

export default function ProjectMemory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [memory, setMemory] = useState({ grouped: {}, counts: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("overview"); // 'overview' | one of the 6 category keys
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerItem, setDrawerItem] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [projRes, memRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/memory`),
      ]);
      setProject(projRes.data.project || projRes.data);
      setMemory(memRes.data);
    } catch (e) {
      if (!silent) toast.error(formatApiError(e));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (!id) return;
    const iv = setInterval(() => { if (!document.hidden) load({ silent: true }); }, 10_000);
    const onVis = () => { if (!document.hidden) load({ silent: true }); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [id]);

  const activeCat = view === "overview" ? null : CATEGORY_BY_KEY[view];
  const items = useMemo(() => {
    if (!activeCat) return [];
    const list = (memory.grouped?.[activeCat.key] || []);
    if (statusFilter === "all") return list;
    if (statusFilter === "detected") return list.filter((m) => m.status === "detected" || m.status === "review");
    return list.filter((m) => m.status === statusFilter);
  }, [memory, activeCat, statusFilter]);

  // Show only counts / totals for the 6 visible categories — rest still stored.
  const visibleCounts = useMemo(() => {
    const c = {};
    let total = 0;
    MEMORY_CATEGORIES.forEach((cat) => {
      const n = memory.counts?.[cat.key] || 0;
      c[cat.key] = n;
      total += n;
    });
    return { by: c, total };
  }, [memory]);

  const detectedCount = useMemo(() => {
    let n = 0;
    MEMORY_CATEGORIES.forEach((cat) => {
      (memory.grouped?.[cat.key] || []).forEach((m) => {
        if (m.status === "detected" || m.status === "review") n += 1;
      });
    });
    return n;
  }, [memory]);

  const openReview = () => {
    const target = MEMORY_CATEGORIES.find((c) =>
      (memory.grouped?.[c.key] || []).some((m) => m.status === "detected" || m.status === "review")
    );
    if (target) { setView(target.key); setStatusFilter("detected"); }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Seo title={project ? `${project.name} · Bracket` : "Project · Bracket"} />

      <header className="sticky top-0 z-20" style={{ background: "var(--bg)", borderBottom: "1px solid var(--hairline)" }}>
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-3 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("/app")}
                  className="inline-flex items-center gap-1.5 text-[12.5px]"
                  style={{ color: "var(--text-2)" }} data-testid="project-memory-back">
            <ArrowLeft size={13} /> Dashboard
          </button>
          {project?.is_demo && (
            <span className="mono-tag px-2 py-0.5 rounded-full text-[9.5px]"
                  style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--brand-border)" }}
                  data-testid="project-memory-demo-tag">DEMO</span>
          )}
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 md:px-8 py-8 lg:py-10" data-testid="project-memory-page">
        {loading ? (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--text-3)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : project ? (
          <>
            {/* Project header — minimal Notion-style */}
            <motion.section
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}
              className="flex items-start justify-between gap-4 flex-wrap mb-8"
              data-testid="project-memory-header"
            >
              <div className="min-w-0">
                <p className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>
                  {(project.client_name || "Client").toUpperCase()} · {(project.project_type || "Project").toUpperCase()}
                </p>
                <h1 className="mt-2 text-[32px] sm:text-[40px] font-semibold tracking-[-0.028em] leading-[1.05]"
                    style={{ color: "var(--text)" }} data-testid="project-memory-title">
                  {project.name}
                </h1>
                <div className="mt-2 flex items-center gap-3 text-[12.5px] flex-wrap" style={{ color: "var(--text-3)" }}>
                  <span>{visibleCounts.total} items</span>
                  {detectedCount > 0 && (
                    <>
                      <span style={{ color: "var(--warning)" }} data-testid="project-memory-new-count">
                        <AlertTriangle size={11} className="inline mb-0.5 mr-0.5" />
                        {detectedCount} new to review
                      </span>
                    </>
                  )}
                  <span className="mono-tag inline-flex items-center gap-1.5 text-[9.5px]" data-testid="project-memory-live-indicator">
                    <span className="relative inline-flex w-1.5 h-1.5">
                      <span className="absolute inset-0 rounded-full opacity-60 animate-ping" style={{ background: "var(--success)" }} />
                      <span className="relative inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                    </span>
                    LIVE
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setHistoryOpen(true)}
                        className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-2 rounded-full transition-colors"
                        style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--text)" }}
                        data-testid="project-memory-history-cta">
                  <History size={12} /> History
                </button>
                {detectedCount > 0 && (
                  <button type="button" onClick={openReview}
                          className="inline-flex items-center gap-1.5 text-[12.5px] px-3.5 py-2 rounded-full font-medium"
                          style={{ background: "var(--primary-bg)", color: "var(--primary-fg)", boxShadow: "0 8px 20px -8px rgba(59,130,246,0.5)" }}
                          data-testid="project-memory-review-cta">
                    <Sparkles size={12} /> Review changes
                  </button>
                )}
              </div>
            </motion.section>

            {/* Horizontal pill tabs — Overview + 6 categories */}
            <nav
              className="flex items-center gap-1 mb-8 overflow-x-auto no-scrollbar"
              data-testid="project-memory-pills"
              style={{ borderBottom: "1px solid var(--hairline)" }}
            >
              <PillTab
                active={view === "overview"}
                onClick={() => setView("overview")}
                label="Overview"
                testid="project-memory-pill-overview"
              />
              {MEMORY_CATEGORIES.map((c) => (
                <PillTab
                  key={c.key}
                  active={view === c.key}
                  onClick={() => { setView(c.key); setStatusFilter("all"); }}
                  label={c.label}
                  count={visibleCounts.by[c.key] || 0}
                  icon={c.icon}
                  color={c.color}
                  testid={`project-memory-pill-${c.key}`}
                />
              ))}
            </nav>

            {view === "overview" ? (
              <OverviewView
                project={project}
                projectId={id}
                counts={visibleCounts}
                detectedCount={detectedCount}
                onJumpTo={(cat) => { setView(cat); setStatusFilter("detected"); }}
              />
            ) : (
              <CategoryView
                cat={activeCat}
                items={items}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onOpen={(m) => setDrawerItem(m)}
              />
            )}
          </>
        ) : (
          <p style={{ color: "var(--text-3)" }}>Project not found.</p>
        )}
      </main>

      <ChangeActionDrawer
        item={drawerItem}
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        onChanged={() => load({ silent: true })}
      />
      <HistoryDrawer
        projectId={id}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onJumpToItem={(memoryId) => {
          for (const bucket of Object.values(memory.grouped || {})) {
            const found = (bucket || []).find((m) => m.id === memoryId);
            if (found) { setDrawerItem(found); setHistoryOpen(false); return; }
          }
        }}
      />
    </div>
  );
}

/* ─── Pill tab ────────────────────────────────────────────── */
function PillTab({ active, onClick, label, count, icon: Icon, color, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors"
      style={{
        color: active ? "var(--text)" : "var(--text-3)",
      }}
      data-testid={testid}
    >
      {Icon && <Icon size={13} style={{ color: active ? (color || "var(--accent)") : "var(--text-3)" }} />}
      {label}
      {typeof count === "number" && count > 0 && (
        <span className="mono-tag text-[9.5px]" style={{ color: active ? "var(--text-2)" : "var(--text-3)" }}>
          {count}
        </span>
      )}
      {active && (
        <motion.span
          layoutId="pill-underline"
          className="absolute -bottom-px left-0 right-0 h-0.5"
          style={{ background: "var(--text)" }}
          transition={{ duration: 0.18 }}
        />
      )}
    </button>
  );
}

/* ─── Overview view — suggested reply + category snapshot ── */
function OverviewView({ project, projectId, counts, detectedCount, onJumpTo }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
      <div className="min-w-0 flex flex-col gap-6">
        <SuggestedReplyPanel projectId={projectId} />

        {/* Category snapshot — 6 tiles, click to jump */}
        <section data-testid="overview-category-snapshot">
          <p className="mono-tag text-[9.5px] mb-3" style={{ color: "var(--text-3)" }}>PROJECT MEMORY</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MEMORY_CATEGORIES.map((c) => {
              const n = counts.by[c.key] || 0;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onJumpTo(c.key)}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-left transition-colors"
                  style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--hairline-strong)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--hairline)"; }}
                  data-testid={`overview-cat-${c.key}`}
                >
                  <c.icon size={14} style={{ color: c.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium truncate" style={{ color: "var(--text)" }}>{c.label}</p>
                    <p className="text-[10.5px]" style={{ color: "var(--text-3)" }}>{n} item{n === 1 ? "" : "s"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="min-w-0 flex flex-col gap-6">
        <ConnectedSourcesCompact projectId={projectId} />
      </aside>
    </div>
  );
}

/* ─── Suggested Reply panel (ONE per project) ─────────────── */
function SuggestedReplyPanel({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  const fetchReply = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/suggest-reply`);
      setData(data);
      setDraft(data.reply || "");
      setEditing(false);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) fetchReply(); }, [projectId]);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/suggest-reply`);
      setData(data);
      setDraft(data.reply || "");
      setEditing(false);
      toast.success("Bracket re-drafted the reply");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setRegenerating(false); }
  };

  const copyReply = async () => {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft.trim());
      toast.success("Reply copied — paste it in your tool to send.");
    } catch { toast.error("Couldn't access clipboard."); }
  };

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const end = ref.current.value.length;
      ref.current.setSelectionRange(end, end);
    }
  }, [editing]);

  const encoded = encodeURIComponent(draft || "");
  const gmailWeb = `https://mail.google.com/mail/?view=cm&fs=1&su=Re:%20your%20project&body=${encoded}`;
  const mailto = `mailto:?subject=Re:%20your%20project&body=${encoded}`;
  const slackWeb = data?.deep_links?.slack_web || "slack://open";

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
      data-testid="suggested-reply-panel"
    >
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={13} style={{ color: "var(--accent)" }} />
          <p className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>SUGGESTED RESPONSE</p>
          {data?.based_on && (
            <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>
              · replying to <ProviderIcon provider={data.based_on.provider} size={9} className="inline mx-1" />
              {data.based_on.source_label}
            </span>
          )}
        </div>
        <button type="button" onClick={regenerate} disabled={regenerating || loading}
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full disabled:opacity-40"
                style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                data-testid="suggested-reply-regenerate">
          {regenerating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          Regenerate
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-3)" }}>
            <Loader2 size={12} className="animate-spin" /> Drafting…
          </div>
        ) : data?.reply ? (
          editing ? (
            <>
              <textarea
                ref={ref}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={Math.max(4, Math.min(10, (draft.match(/\n/g) || []).length + 4))}
                className="w-full resize-y bg-transparent outline-none text-[14px] leading-relaxed"
                style={{ color: "var(--text)" }}
                data-testid="suggested-reply-editor"
              />
              <button type="button" onClick={() => setEditing(false)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--accent)" }}
                      data-testid="suggested-reply-done">
                <Check size={11} /> Done editing
              </button>
            </>
          ) : (
            <div className="relative group">
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }} data-testid="suggested-reply-body">
                {draft || data.reply}
              </p>
              <button type="button" onClick={() => setEditing(true)}
                      className="absolute -top-2 -right-2 inline-flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-full transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                      data-testid="suggested-reply-edit">
                <Pencil size={10} /> Edit
              </button>
              {draft !== data.reply && (
                <button type="button" onClick={() => { setDraft(data.reply || ""); setEditing(false); }}
                        className="mt-2 inline-flex items-center gap-1 text-[10.5px]"
                        style={{ color: "var(--text-3)" }}
                        data-testid="suggested-reply-reset">
                  <RotateCcw size={10} /> Reset to AI draft
                </button>
              )}
            </div>
          )
        ) : (
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
            Nothing to reply to yet. Once your client sends something new, Bracket drafts a response here.
          </p>
        )}

        {data?.reply && !editing && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copyReply}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium"
                    style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                    data-testid="suggested-reply-copy">
              <Copy size={12} /> Copy reply
            </button>
            <a href={gmailWeb} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px]"
               style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text)" }}
               data-testid="suggested-reply-gmail">
              <Mail size={12} /> Send in Gmail
            </a>
            <a href={mailto}
               className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px]"
               style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text)" }}
               data-testid="suggested-reply-mailto">
              <Mail size={12} /> Open in default mail
            </a>
            <a href={slackWeb}
               className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px]"
               style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text)" }}
               data-testid="suggested-reply-slack">
              <Slack size={12} /> Open Slack
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Category view — filter + memory rows ────────────────── */
function CategoryView({ cat, items, statusFilter, setStatusFilter, onOpen }) {
  return (
    <section data-testid="project-memory-pane">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <cat.icon size={16} style={{ color: cat.color }} />
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>{cat.label}</h2>
          <span className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>· {items.length}</span>
        </div>
        <div className="inline-flex rounded-full p-0.5"
             style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}
             data-testid="project-memory-status-filter">
          {STATUS_FILTERS.map((s) => (
            <button key={s.key} type="button" onClick={() => setStatusFilter(s.key)}
                    className="mono-tag px-3 py-1 rounded-full text-[10px] transition-colors"
                    style={statusFilter === s.key
                      ? { background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--brand-border)" }
                      : { color: "var(--text-3)", border: "1px solid transparent", background: "transparent" }}
                    data-testid={`project-memory-filter-${s.key}`}>
              {s.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl p-8 text-center"
             style={{ background: "var(--surface)", border: "1px dashed var(--hairline-strong)" }}
             data-testid="project-memory-empty">
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
            No {cat.plural.toLowerCase()} yet.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="project-memory-items">
          {items.map((m) => <MemoryRow key={m.id} item={m} cat={cat} onOpen={onOpen} />)}
        </ul>
      )}
    </section>
  );
}

function MemoryRow({ item, cat, onOpen }) {
  const status = STATUS_META[item.status] || STATUS_META.confirmed;
  const isChange = item.status === "detected" || item.status === "review";
  return (
    <li>
      <button type="button" onClick={() => onOpen(item)}
              className="w-full text-left rounded-lg px-4 py-3 transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--hairline-strong)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--hairline)"; }}
              data-testid={`project-memory-row-${item.id}`}>
        <div className="flex items-start gap-3">
          <cat.icon size={13} style={{ color: cat.color, marginTop: 3 }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="mono-tag px-1.5 py-0.5 rounded text-[9px]"
                    style={{ color: status.color, background: status.bg, border: `1px solid ${status.color}33` }}>
                {status.label}
              </span>
              {item.is_scope_change && (
                <span className="mono-tag px-1.5 py-0.5 rounded text-[9px]"
                      style={{ color: "var(--danger)", background: "var(--danger-soft)", border: "1px solid var(--danger)33" }}>
                  <AlertTriangle size={9} className="inline mr-0.5" /> SCOPE CREEP
                </span>
              )}
              <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>
                <ProviderIcon provider={item.provider} size={10} className="inline mr-1 align-middle" />
                {item.source_label} · {timeAgo(item.created_at)}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] font-medium leading-snug" style={{ color: "var(--text)" }}>{item.title}</p>
            {item.detail && (
              <p className="mt-0.5 text-[12px] leading-snug line-clamp-1" style={{ color: "var(--text-2)" }}>{item.detail}</p>
            )}
          </div>
          {isChange && (
            <span className="shrink-0 mono-tag text-[9px] mt-1" style={{ color: "var(--accent)" }}>REVIEW →</span>
          )}
        </div>
      </button>
    </li>
  );
}

/* ─── Connected sources (compact) ─────────────────────────── */
function ConnectedSourcesCompact({ projectId }) {
  const [conns, setConns] = useState(null);
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}/connections`);
        if (!cancelled) setConns(data.connections || []);
      } catch { if (!cancelled) setConns((prev) => prev ?? []); }
    };
    fetchOnce();
    const iv = setInterval(() => { if (!document.hidden) fetchOnce(); }, 10_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [projectId]);

  if (conns === null) return null;
  return (
    <div data-testid="project-memory-sources">
      <p className="mono-tag text-[9.5px] mb-3" style={{ color: "var(--text-3)" }}>CONNECTED SOURCES</p>
      {conns.length === 0 ? (
        <Link to="/app/connect"
              className="block rounded-lg px-3 py-3 text-[12px]"
              style={{ border: "1px dashed var(--hairline-strong)", color: "var(--text-2)" }}
              data-testid="project-memory-sources-connect">
          + Connect Gmail, Slack or Figma to feed this project.
        </Link>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {conns.map((c) => {
            const isBad = c.health?.level === "red";
            const isWarn = c.health?.level === "amber";
            return (
              <li key={c.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
                <ProviderIcon provider={c.provider} size={12} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate" style={{ color: "var(--text)" }}>{c.source_name}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    {isBad ? c.health.message : (isWarn ? c.health.message : `Synced ${timeAgo(c.last_synced_at)}`)}
                  </p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: isBad ? "var(--danger)" : isWarn ? "var(--warning)" : "var(--success)" }} />
              </li>
            );
          })}
        </ul>
      )}
      <Link to="/app/connect" className="text-[11px] mt-2 inline-flex items-center gap-1"
            style={{ color: "var(--accent)" }} data-testid="project-memory-sources-manage">
        Manage connections <ExternalLink size={10} />
      </Link>
    </div>
  );
}
