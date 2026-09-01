import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, ExternalLink, AlertTriangle,
  Sparkles, History, Copy, Mail, Slack, Pencil, RefreshCw,
  Check, RotateCcw, Send, User, Unplug, Plug, SlidersHorizontal,
  Rows3, AlignJustify, Bookmark, BookmarkPlus, Trash2, ChevronDown, Search,
  ArrowRight, Clock, CheckCircle2, CalendarClock,
  Flag, Bell, MoreHorizontal, ChevronRight, Calendar, Paperclip, Smile, Zap, Star, Info, Plus, X, AlertCircle, Lock, FileText, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import Seo from "../components/Seo";
import ChangeActionDrawer from "../components/ChangeActionDrawer";
import ProjectUpdateReview from "../components/ProjectUpdateReview";
import HistoryDrawer from "../components/HistoryDrawer";
import { useDialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
import ProjectSidebar from "../components/ProjectSidebar";
import PlanModal from "../components/PlanModal";
import Settings from "./Settings";
import { MEMORY_CATEGORIES, CATEGORY_BY_KEY, STATUS_META } from "../lib/memoryCategories";
import { ProviderIcon, PROVIDER_META, timeAgo } from "../lib/providersMeta";

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
  const [connections, setConnections] = useState(null); // null = still loading
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("overview"); // 'overview' | one of the 6 category keys
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerItem, setDrawerItem] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [projects, setProjects] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [quota, setQuota] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [dismissedChangeCount, setDismissedChangeCount] = useState(0);

  const refreshProjects = () => {
    api.get("/projects").then(({ data }) => setProjects(Array.isArray(data) ? data : [])).catch(() => {});
    api.get("/project-quota").then(({ data }) => setQuota(data)).catch(() => {});
  };

  useEffect(() => { refreshProjects(); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [projRes, memRes, connRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/memory`),
        api.get(`/projects/${id}/connections`).catch(() => ({ data: { connections: [] } })),
      ]);
      setProject(projRes.data.project || projRes.data);
      setMemory(memRes.data);
      setConnections(connRes.data.connections || []);
      setUpdatedAt(new Date().toISOString());
      if ((memRes.data?.total || 0) > 0) {
        try { localStorage.setItem("bracket.fr.sawMemory", "1"); } catch { /* ignore */ }
        window.dispatchEvent(new Event("bracket-firstrun-update"));
      }
    } catch (e) {
      if (!silent) toast.error(formatApiError(e));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (!id) return;
    // Capture the PREVIOUS visit timestamp once per mount so "What Changed" has
    // a stable baseline for this session (tracked per account, syncs devices).
    api.post(`/projects/${id}/seen`).then((r) => setLastSeen(r.data?.previous || null)).catch(() => {});
  }, [id]);
  useEffect(() => {
    if (!id) return;
    const iv = setInterval(() => { if (!document.hidden) load({ silent: true }); }, 5_000);
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

  // Newest pending change across all sources — powers the change banner copy.
  const latestChange = useMemo(() => {
    let best = null;
    MEMORY_CATEGORIES.forEach((cat) => {
      (memory.grouped?.[cat.key] || []).forEach((m) => {
        if (m.status !== "detected" && m.status !== "review") return;
        const t = String(m.occurred_at || m.created_at || "");
        if (!best || t.localeCompare(best._t) > 0) best = { ...m, _t: t };
      });
    });
    if (!best) return null;
    const label = best.source_label || PROVIDER_META[best.provider]?.label || best.provider || "a source";
    return { title: best.title, sourceLabel: label, requestedBy: best.requested_by || "" };
  }, [memory]);

  const showChangeBanner = detectedCount > 0 && detectedCount !== dismissedChangeCount;

  // Flattened, newest-first list across all categories — powers the Overview
  // "Today's Focus" sections (computed inside OverviewView from `memory`).
  const openReview = () => setUpdateOpen(true);

  const headerActions = {
    providerLabel: (connections && connections[0]) ? (PROVIDER_META[connections[0].provider]?.label || connections[0].provider) : null,
    detectedCount,
    onReview: () => setUpdateOpen(true),
    onGoTimeline: () => setView("timeline"),
    onGoHome: () => setView("overview"),
    onRefresh: () => load({ silent: true }),
  };

  return (
    <div className="project-shell" data-testid="project-shell">
      <Seo title={project ? `${project.name} · Bracket` : "Project · Bracket"} />

      <ProjectSidebar
        project={project}
        projects={projects}
        onSwitchProject={(pid) => navigate(`/project/${pid}`)}
        view={view}
        setView={(v) => { setView(v); if (CATEGORY_BY_KEY[v]) setStatusFilter("all"); }}
        counts={visibleCounts.by}
        connections={connections || []}
        onAddSource={() => setView("conversations")}
        onSourcesChanged={() => load({ silent: true })}
        onProjectsChanged={refreshProjects}
        onOpenSearch={() => setSearchOpen(true)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} memory={memory} />

      <main className="project-main">
        {loading ? (
          <div className="flex items-center gap-2 py-8 px-8" style={{ color: "var(--text-3)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : project ? (
          <div className="project-main-inner" data-testid="project-memory-page">
            {quota?.plan_expired && (
              <div className="plan-lock-banner" data-testid="plan-lock-banner">
                <div className="flex items-center gap-3 min-w-0">
                  <Lock size={16} style={{ color: "var(--warning)" }} />
                  <span className="min-w-0">
                    <span className="plan-lock-title">Your 60-day project access has ended</span>
                    <span className="plan-lock-sub">This project is read-only. Renew or upgrade to keep working on it.</span>
                  </span>
                </div>
                <button type="button" className="plan-lock-cta" onClick={() => setPlanModalOpen(true)} data-testid="plan-lock-cta">
                  Renew or upgrade <ArrowRight size={14} />
                </button>
              </div>
            )}
            {showChangeBanner && (
              <div className="change-banner" data-testid="change-notification-banner">
                <div className="change-banner-left">
                  <span className="change-banner-icon change-banner-pulse">
                    <span className="relative inline-flex w-2 h-2">
                      <span className="absolute inset-0 rounded-full opacity-70 animate-ping" style={{ background: "var(--warning)" }} />
                      <span className="relative inline-block w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="change-banner-title" data-testid="change-banner-title">
                      Something changed{latestChange?.sourceLabel ? ` in ${latestChange.sourceLabel}` : ""}
                    </span>
                    <span className="change-banner-sub">
                      {detectedCount === 1
                        ? (latestChange?.title || "A new update affects this project.")
                        : `${detectedCount} new updates affect this project.`}
                      {latestChange?.requestedBy ? ` · Requested by ${latestChange.requestedBy}` : ""}
                    </span>
                  </span>
                </div>
                <div className="change-banner-right">
                  <button type="button" className="change-banner-cta" onClick={() => setUpdateOpen(true)} data-testid="change-banner-review">
                    <Sparkles size={13} /> Review {detectedCount > 1 ? `${detectedCount} changes` : "change"}
                  </button>
                  <button
                    type="button"
                    className="change-banner-close"
                    onClick={() => setDismissedChangeCount(detectedCount)}
                    aria-label="Dismiss"
                    data-testid="change-banner-dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            {false && (
            <section className="project-topbar" data-testid="project-memory-header">
              <div className="min-w-0">
                <p className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>
                  {(project.client_name || "Client").toUpperCase()} · {(project.project_type || "Project").toUpperCase()}
                </p>
                <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-semibold tracking-[-0.028em] leading-[1.05]"
                    style={{ color: "var(--text)" }} data-testid="project-memory-title">
                  {project.name}
                </h1>
                <div className="mt-2 flex items-center gap-3 text-[12.5px] flex-wrap" style={{ color: "var(--text-3)" }}>
                  {detectedCount > 0 && (
                    <span style={{ color: "var(--warning)" }} data-testid="project-memory-new-count">
                      <AlertTriangle size={11} className="inline mb-0.5 mr-0.5" />
                      {detectedCount} to review
                    </span>
                  )}
                  <span className="mono-tag inline-flex items-center gap-1.5 text-[9.5px]" data-testid="project-memory-live-indicator">
                    <span className="relative inline-flex w-1.5 h-1.5">
                      <span className="absolute inset-0 rounded-full opacity-60 animate-ping" style={{ background: "var(--success)" }} />
                      <span className="relative inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                    </span>
                    LIVE
                  </span>
                  {project?.is_demo && (
                    <span className="mono-tag px-2 py-0.5 rounded-full text-[9.5px]"
                          style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--brand-border)" }}
                          data-testid="project-memory-demo-tag">DEMO</span>
                  )}
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
                          style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                          data-testid="project-memory-review-cta">
                    <Sparkles size={12} /> Review changes
                  </button>
                )}
              </div>
            </section>
            )}

            {view === "conversations" ? (
              <motion.div key="conversations" className="project-view" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                <ConversationsStream
                  projectId={id}
                  project={project}
                  connections={connections || []}
                  memory={memory}
                  headerActions={headerActions}
                  onChanged={() => load({ silent: true })}
                />
              </motion.div>
            ) : view === "timeline" ? (
              <motion.div key="timeline" className="project-view" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                <TimelineView projectId={id} project={project} memory={memory} headerActions={headerActions} />
              </motion.div>
            ) : view === "notes" ? (
              <motion.div key="notes" className="project-view" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                <NotesView projectId={id} project={project} headerActions={headerActions} onChanged={() => load({ silent: true })} />
              </motion.div>
            ) : view === "settings" ? (
              <motion.div key="settings" className="project-view" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                <Settings embedded onBack={() => setView("overview")} />
              </motion.div>
            ) : view === "help" ? (
              <motion.div key="help" className="project-view" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                <HelpPanel onBack={() => setView("overview")} />
              </motion.div>
            ) : (
              <motion.div key="overview" className="project-view" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                <OverviewView
                  project={project}
                  projectId={id}
                  memory={memory}
                  connections={connections || []}
                  detectedCount={detectedCount}
                  counts={visibleCounts.by}
                  updatedAt={updatedAt}
                  headerActions={headerActions}
                  onReviewUpdate={() => setUpdateOpen(true)}
                />
              </motion.div>
            )}
          </div>
        ) : (
          <p className="px-8 py-8" style={{ color: "var(--text-3)" }}>Project not found.</p>
        )}
      </main>

      <ChangeActionDrawer
        item={drawerItem}
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        onChanged={() => load({ silent: true })}
        onReviewUpdate={() => { setDrawerItem(null); setUpdateOpen(true); }}
      />
      <ProjectUpdateReview
        projectId={id}
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        onResolved={() => load({ silent: true })}
        onViewConversation={() => { setUpdateOpen(false); setView("conversations"); }}
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
      <PlanModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        defaultPlan="monthly"
        title="Renew or upgrade"
      />
    </div>
  );
}

/* ─── Conversations tab — 3-pane: linked emails · thread · Ask Bracket ─── */
function ConversationsViewLegacy({ projectId, project, connections, onChanged }) {
  const emails = useMemo(() => (connections || []).filter((c) => c.provider === "gmail"), [connections]);
  const list = emails.length ? emails : (connections || []);
  const [selectedId, setSelectedId] = useState(null);
  const [content, setContent] = useState(null);
  const [loadingC, setLoadingC] = useState(false);
  const [q, setQ] = useState("");
  const [targets, setTargets] = useState([]);
  const [replies, setReplies] = useState({});
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const selected = list.find((c) => c.id === selectedId) || null;
  const primary = connections?.[0];

  useEffect(() => {
    if (!selectedId && list.length) setSelectedId(list[0].id);
    // eslint-disable-next-line
  }, [list.length]);

  useEffect(() => {
    api.get(`/projects/${projectId}/send-targets`).then((r) => setTargets(r.data.targets || [])).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!selectedId) return;
    setContent(null); setLoadingC(true);
    api.get(`/projects/${projectId}/connections/${selectedId}/content`)
      .then((r) => setContent(r.data)).catch(() => setContent({ content: "" }))
      .finally(() => setLoadingC(false));
  }, [selectedId, projectId]);

  const initial = (s) => (s || "?").trim().charAt(0).toUpperCase();
  const filtered = q ? list.filter((c) => (c.source_name || "").toLowerCase().includes(q.toLowerCase())) : list;

  const target = targets.find((t) => t.thread_id === selected?.source_id);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || sendingReply) return;
    setSendingReply(true);
    try {
      if (selected?.provider === "gmail" && target?.to) {
        await api.post(`/projects/${projectId}/send-email`, { body: text, targets: [{ to: target.to, thread_id: target.thread_id }] });
      }
      setReplies((r) => ({ ...r, [selectedId]: [...(r[selectedId] || []), { text, at: new Date().toISOString() }] }));
      setReply("");
      toast.success(selected?.provider === "gmail" && target?.to ? "Reply sent." : "Reply saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="cv-wrap" data-testid="project-conversations">
      <div className="cv-head">
        <div className="ov-head-actions">
          {primary && (
            <span className="ov-source-pill">
              <span className="ov-dot" style={{ background: primary.health?.level === "red" ? "var(--danger)" : "var(--success)" }} />
              {(PROVIDER_META[primary.provider]?.label || primary.provider)} {primary.health?.level === "red" ? "· reconnect" : "connected"}
            </span>
          )}
          <button type="button" className="ov-icon-btn" aria-label="Notifications"><Bell size={16} /></button>
          <button type="button" className="ov-icon-btn" aria-label="More"><MoreHorizontal size={16} /></button>
        </div>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.03em]" style={{ color: "var(--text)" }}>Conversations</h1>
        <p className="mt-1 text-[13.5px]" style={{ color: "var(--text-3)" }}>Ask Bracket what to send, then send it to one or multiple linked emails.</p>
      </div>

      {list.length === 0 ? (
        <div className="ov-card ov-card--quiet mt-6"><Mail size={16} style={{ color: "var(--text-3)" }} /><p className="ov-card-sub">No conversations connected yet. Use “+” in the sidebar to add one.</p></div>
      ) : (
      <div className="cv-grid">
        {/* Left — linked emails */}
        <div className="cv-col cv-left">
          <p className="cv-col-title">Linked emails</p>
          <div className="cv-search">
            <Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails" data-testid="cv-search" />
          </div>
          <ul className="cv-thread-list">
            {filtered.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelectedId(c.id)} className="cv-thread" data-active={selectedId === c.id ? "true" : "false"} data-testid={`cv-thread-${c.id}`}>
                  <span className="cv-avatar">{initial(c.source_name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="cv-thread-name">{c.client_email || c.source_name || c.provider}</span>
                    <span className="cv-thread-sub">{c.source_name || "Conversation"}</span>
                  </span>
                  <span className="cv-thread-meta"><span className="cv-thread-time">{c.last_activity_at ? timeAgo(c.last_activity_at) : ""}</span><ProviderIcon provider={c.provider} size={14} bare /></span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Middle — thread reading + reply */}
        <div className="cv-col cv-mid">
          <div className="cv-mid-head">
            <span className="min-w-0 flex items-center gap-2">
              <span className="cv-mid-title">{selected?.source_name || "Conversation"}</span>
              <ProviderIcon provider={selected?.provider || ""} size={14} bare />
            </span>
            <span className="flex items-center gap-1">
              <button type="button" className="ov-icon-btn ov-icon-btn--sm" aria-label="Star"><Star size={14} /></button>
              <button type="button" className="ov-icon-btn ov-icon-btn--sm" aria-label="More"><MoreHorizontal size={14} /></button>
            </span>
          </div>
          <div className="cv-mid-body">
            {loadingC ? (
              <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--text-3)" }}><Loader2 size={13} className="animate-spin" /> Loading…</div>
            ) : (
              <>
                {content?.content ? (
                  <div className="cv-reading">{content.content}</div>
                ) : (
                  <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>No cached content for this conversation yet.</p>
                )}
                {(replies[selectedId] || []).map((r, i) => (
                  <div key={i} className="cv-sent-bubble">
                    <p className="whitespace-pre-wrap">{r.text}</p>
                    <span className="cv-sent-meta">You · {timeAgo(r.at)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="cv-reply">
            <button type="button" className="cv-reply-ico" aria-label="Emoji"><Smile size={16} /></button>
            <button type="button" className="cv-reply-ico" aria-label="Attach"><Paperclip size={16} /></button>
            <button type="button" className="cv-reply-ico" aria-label="Quick"><Zap size={16} /></button>
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
              placeholder={`Reply to ${(selected?.client_email || selected?.source_name || "conversation")}…`}
              data-testid="cv-reply-input"
            />
            <button type="button" className="cv-reply-send" onClick={sendReply} disabled={!reply.trim() || sendingReply} data-testid="cv-reply-send" aria-label="Send">
              {sendingReply ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>

        {/* Right — Ask Bracket */}
        <div className="cv-col cv-right">
          <SuggestedReplyChat projectId={projectId} clientName={project?.client_name} connections={connections} />
        </div>
      </div>
      )}
    </div>
  );
}

/* ─── Category tab (JIRA-style: label + count chip + accent underline) ── */
function PillTab({ active, onClick, label, count, icon: Icon, color, testid }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active ? "true" : "false"}
      onClick={onClick}
      className="memory-tab inline-flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap"
      data-active={active ? "true" : "false"}
      data-testid={testid}
    >
      {Icon && <Icon size={13} style={{ color: active ? (color || "var(--accent)") : "var(--text-3)" }} />}
      {label}
      {typeof count === "number" && count > 0 && (
        <span
          className="memory-tab-count inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold"
          style={{
            background: active ? "var(--accent-soft, rgba(255,255,255,0.14))" : "var(--surface-2)",
            color: active ? "var(--accent)" : "var(--text-3)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── "Today's Focus" helpers ──────────────────────────────────────────── */
const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

// Best-effort parse of a due date from free text ("Feb 20", "20 March",
// "2026-02-14", "tomorrow", "in 3 days"). Returns a Date or null.
function parseDueDate(text, now = new Date()) {
  if (!text) return null;
  const s = String(text).toLowerCase();
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) { const d = new Date(+iso[1], +iso[2] - 1, +iso[3]); return isNaN(d) ? null : d; }
  if (/\btoday\b/.test(s)) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/\btomorrow\b/.test(s)) { const d = new Date(now); d.setDate(d.getDate() + 1); return d; }
  const inDays = s.match(/in (\d+) days?/); if (inDays) { const d = new Date(now); d.setDate(d.getDate() + +inDays[1]); return d; }
  if (/\bnext week\b/.test(s)) { const d = new Date(now); d.setDate(d.getDate() + 7); return d; }
  // "Feb 20" / "February 20th" / "20 Feb"
  let m = s.match(/([a-z]{3,9})\.?\s+(\d{1,2})/);
  if (!m) { const m2 = s.match(/(\d{1,2})\s+([a-z]{3,9})/); if (m2) m = [m2[0], m2[2], m2[1]]; }
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3)];
    const day = +m[2];
    if (mon != null && day >= 1 && day <= 31) {
      let d = new Date(now.getFullYear(), mon, day);
      // If the date already passed this year, assume it means next year.
      if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d = new Date(now.getFullYear() + 1, mon, day);
      return d;
    }
  }
  return null;
}

function flattenMemory(memory) {
  const all = [];
  MEMORY_CATEGORIES.forEach((cat) => {
    (memory.grouped?.[cat.key] || []).forEach((m) => all.push({ ...m, _catKey: cat.key }));
  });
  return all;
}

function FocusSection({ label, icon: Icon, accent, count, children }) {
  return (
    <section className="mb-6" >
      <div className="flex items-center gap-2 mb-2.5">
        {Icon && <Icon size={12} style={{ color: accent || "var(--text-3)" }} />}
        <p className="mono-tag text-[9.5px]" style={{ color: "var(--text-3)" }}>{label}</p>
        {typeof count === "number" && count > 0 && (
          <span className="mono-tag text-[9px]" style={{ color: accent || "var(--text-3)" }}>· {count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function FocusRow({ item, onClick, right }) {
  const c = CATEGORY_BY_KEY[item._catKey] || CATEGORY_BY_KEY.decision;
  return (
    <button type="button" onClick={onClick}
            className="memory-ledger-row w-full text-left flex items-start gap-3 px-4 py-3"
            data-testid={`focus-row-${item.id}`}>
      <c.icon size={13} style={{ color: c.color, marginTop: 2, flexShrink: 0 }} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug truncate" style={{ color: "var(--text)" }}>{item.title}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="mono-tag text-[8.5px]" style={{ color: c.color }}>{c.label.toUpperCase()}</span>
          {item.is_scope_change && (
            <span className="mono-tag text-[8.5px] inline-flex items-center gap-0.5" style={{ color: "var(--danger)" }}><AlertTriangle size={8} /> SCOPE</span>
          )}
          {right}
        </div>
      </div>
    </button>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function daysLeftLabel(d) {
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const n = Math.round((d - today) / 86400000);
  return n <= 0 ? "Today" : n === 1 ? "1 day left" : `${n} days left`;
}
function dedupeByTitle(list) {
  const seen = new Set();
  return (list || []).filter((m) => (seen.has(m.title) ? false : seen.add(m.title)));
}

/* ─── Shared header controls: working notifications + options ─────────── */
function HeaderActions({ providerLabel, detectedCount = 0, attentionTitle, onReview, onGoTimeline, onGoHome, onRefresh }) {
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  return (
    <div className="ov-head-actions">
      {providerLabel && (
        <span className="ov-source-pill"><span className="ov-dot" style={{ background: "var(--success)" }} />{providerLabel} connected</span>
      )}
      <div className="relative">
        <button type="button" className="ov-icon-btn" style={{ position: "relative" }} onClick={() => { setBell((v) => !v); setMenu(false); }} aria-label="Notifications" data-testid="header-bell">
          <Bell size={16} />{detectedCount > 0 && <span className="sc-bell-dot" />}
        </button>
        {bell && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBell(false)} />
            <div className="ha-pop" data-testid="header-bell-pop">
              <p className="ha-pop-head">NOTIFICATIONS</p>
              {detectedCount > 0 ? (
                <button type="button" className="ha-pop-row" onClick={() => { setBell(false); onReview?.(); }} data-testid="header-bell-review">
                  <span className="ha-pop-title">{attentionTitle || "Changes ready to review"}</span>
                  <span className="ha-pop-sub">A client request affects this project · Review →</span>
                </button>
              ) : (
                <p className="ha-pop-empty">You're all caught up.</p>
              )}
              <button type="button" className="ha-pop-link" onClick={() => { setBell(false); onGoTimeline?.(); }} data-testid="header-bell-timeline">View project timeline</button>
            </div>
          </>
        )}
      </div>
      <div className="relative">
        <button type="button" className="ov-icon-btn" onClick={() => { setMenu((v) => !v); setBell(false); }} aria-label="More" data-testid="header-menu"><MoreHorizontal size={16} /></button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="ha-pop" data-testid="header-menu-pop">
              <button type="button" className="ha-menu-item" onClick={() => { setMenu(false); onGoHome?.(); }}>Home</button>
              <button type="button" className="ha-menu-item" onClick={() => { setMenu(false); onGoTimeline?.(); }}>Project timeline</button>
              <button type="button" className="ha-menu-item" data-testid="header-menu-refresh" onClick={() => { setMenu(false); onRefresh?.(); toast.success("Refreshed"); }}>Refresh now</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Global memory search — find any item across the project ─────────── */
function GlobalSearch({ open, onClose, memory }) {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const all = useMemo(() => flattenMemory(memory), [memory]);
  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    return all.filter((m) =>
      (`${m.title || ""} ${m.detail || ""} ${CATEGORY_BY_KEY[m._catKey]?.label || ""} ${m.source_label || m.provider || ""}`)
        .toLowerCase().includes(query)
    ).slice(0, 40);
  }, [all, query]);

  if (!open) return null;
  return (
    <div className="gs-overlay" onClick={onClose} data-testid="global-search">
      <div className="gs-box" onClick={(e) => e.stopPropagation()}>
        <div className="gs-input-row">
          <Search size={17} style={{ color: "var(--text-3)" }} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search decisions, requirements, scope, deadlines…"
            data-testid="global-search-input"
          />
          <span className="gs-esc">ESC</span>
        </div>
        <div className="gs-results" data-testid="global-search-results">
          {!query ? (
            <p className="gs-hint">Search across everything Bracket remembers for this project.</p>
          ) : results.length === 0 ? (
            <p className="gs-hint">No matches for “{q}”.</p>
          ) : (
            results.map((m) => {
              const c = CATEGORY_BY_KEY[m._catKey] || CATEGORY_BY_KEY.decision;
              const Icon = c.icon;
              return (
                <div key={m.id} className="gs-row" data-testid={`global-search-row-${m.id}`}>
                  <span className="gs-icon"><Icon size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="gs-title">{m.title}</span>
                    {m.detail && <span className="gs-detail">{m.detail}</span>}
                  </span>
                  <span className="gs-cat">{c.label}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Help — in-layout quick help (no redirect) ───────────────────────── */
function HelpPanel({ onBack }) {
  const FAQ = [
    { q: "How does Bracket build my project memory?", a: "Connect a source (Gmail, Slack, Figma, GitHub) and Bracket reads the conversations you choose, then extracts scope, deliverables, requirements, decisions and deadlines automatically." },
    { q: "How do I add another source?", a: "Use the + next to “Sources” in the left rail. Pick a tool and select the conversations to bring in — Bracket keeps everything in sync." },
    { q: "How do I disconnect or reconnect a source?", a: "Hover a source in the left rail and use the disconnect icon. To reconnect, hover and press reconnect, or add it again from the + menu — your extracted memory stays." },
    { q: "What is a Project Change?", a: "When a client request affects the project, Bracket groups every downstream impact into one review so you approve it once and everything updates together." },
    { q: "How do I respond to a client?", a: "Open Conversations and ask Bracket to draft a reply grounded in the project’s memory, then review and send." },
  ];
  return (
    <div className="settings-embed" data-testid="help-panel">
      <div className="settings-embed-main page-enter">
        <button type="button" onClick={onBack} className="text-[12px] inline-flex items-center gap-1.5 transition-colors" style={{ color: "var(--text-3)" }} data-testid="help-back">
          <ArrowLeft size={12} /> Back
        </button>
        <h1 className="mt-4 text-[30px] sm:text-[38px] font-semibold tracking-[-0.03em]" style={{ color: "var(--text)" }}>Help</h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--text-3)" }}>Quick answers about how Bracket works.</p>
        <div className="ov-panel" style={{ marginTop: 28 }}>
          <p className="ov-panel-label">FREQUENTLY ASKED</p>
          <ul className="help-faq">
            {FAQ.map((f, i) => (
              <li key={i} className="help-faq-item">
                <p className="help-q">{f.q}</p>
                <p className="help-a">{f.a}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="ov-panel" style={{ marginTop: 16 }}>
          <p className="ov-panel-label">STILL STUCK?</p>
          <p className="text-[13.5px]" style={{ color: "var(--text-2)" }}>
            Email us at <a href="mailto:support@use-bracket.com" className="help-link">support@use-bracket.com</a> and we’ll get back to you.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Meeting Notes — attach transcripts/notes; Bracket extracts changes ── */
function NotesView({ projectId, headerActions, onChanged }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null); // { title, content }

  const load = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/notes`);
      setNotes(data.notes || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const submit = async () => {
    if (busy) return;
    if (!text.trim() && !file) { toast.error("Paste your notes or choose a file."); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append("text", text.trim());
      if (title.trim()) fd.append("title", title.trim());
      if (file) fd.append("file", file);
      const { data } = await api.post(`/projects/${projectId}/ingest-notes`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (data.added > 0) toast.success(`${data.added} update${data.added === 1 ? "" : "s"} found — review them from Home.`);
      else toast.info("Notes saved. No new changes were detected.");
      setTitle(""); setText(""); setFile(null);
      await load();
      onChanged?.();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const openNote = async (n) => {
    try {
      const { data } = await api.get(`/projects/${projectId}/connections/${n.id}/content`);
      setViewing({ title: n.title, content: data.content || "" });
    } catch { toast.error("Couldn't load that note."); }
  };

  return (
    <div className="notes-wrap" data-testid="notes-view">
      <div className="ov-head">
        <HeaderActions {...(headerActions || {})} />
        <h1 className="mt-1 text-[30px] sm:text-[38px] font-semibold tracking-[-0.03em] leading-[1.03]" style={{ color: "var(--text)" }} data-testid="notes-title">
          Meeting Notes
        </h1>
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--text-3)", maxWidth: 620 }}>
          Paste or upload notes and transcripts — Bracket extracts what changed and queues it for your review.
        </p>
      </div>

      <div className="notes-composer" data-testid="notes-composer">
        <input
          className="asd-notes-title"
          placeholder="Title (optional) — e.g. Kickoff call, Sep 3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="notes-title-input"
        />
        <textarea
          className="asd-notes-text"
          placeholder="Paste meeting notes or a transcript here…"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-testid="notes-text-input"
        />
        <div className="notes-composer-foot">
          <label className="asd-notes-file" style={{ marginTop: 0, flex: 1 }} data-testid="notes-file-label">
            <Upload size={14} />
            <span className="truncate">{file ? file.name : "Upload .txt, .md, .docx or .pdf"}</span>
            <input type="file" accept=".txt,.md,.docx,.pdf" style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="notes-file-input" />
          </label>
          <button type="button" className="asd-attach" disabled={busy || (!text.trim() && !file)} onClick={submit} data-testid="notes-submit">
            {busy ? <><Loader2 size={14} className="animate-spin" /> Reading…</> : <><Sparkles size={14} /> Extract changes</>}
          </button>
        </div>
      </div>

      <p className="notes-list-label">ATTACHED NOTES</p>
      {loading ? (
        <p className="text-[13px]" style={{ color: "var(--text-3)" }}><Loader2 size={13} className="animate-spin inline mr-1" /> Loading…</p>
      ) : notes.length === 0 ? (
        <div className="notes-empty" data-testid="notes-empty">
          <FileText size={22} style={{ color: "var(--text-3)" }} />
          <p>No notes yet. Add your first meeting notes above.</p>
        </div>
      ) : (
        <ul className="notes-list" data-testid="notes-list">
          {notes.map((n) => (
            <li key={n.id} className="notes-item" onClick={() => openNote(n)} role="button" data-testid={`notes-item-${n.id}`}>
              <span className="notes-item-icon"><FileText size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="notes-item-title">{n.title}</span>
                <span className="notes-item-meta">{n.items} update{n.items === 1 ? "" : "s"} extracted · {timeAgo(n.created_at)}</span>
              </span>
              <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
            </li>
          ))}
        </ul>
      )}

      {viewing && (
        <div className="bkt-modal-overlay" style={{ zIndex: 70 }} onClick={() => setViewing(null)} data-testid="notes-view-modal">
          <div className="pu-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(94vw, 720px)" }}>
            <div className="bkt-modal-head">
              <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>{viewing.title}</span>
              <button type="button" className="bkt-modal-x" onClick={() => setViewing(null)} data-testid="notes-view-close"><X size={16} /></button>
            </div>
            <div className="pu-body">
              <pre className="notes-content">{viewing.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── Home — lightweight "where are we now" + drill-in details ─────────── */
function OverviewView({ project, projectId, memory, connections, detectedCount, counts, updatedAt, headerActions, onReviewUpdate }) {
  const [modalCat, setModalCat] = useState(null);
  const noSources = connections.length === 0;
  const all = useMemo(() => flattenMemory(memory), [memory]);

  const attention = useMemo(
    () => dedupeByTitle(all.filter((m) => m.status === "detected" || m.status === "review" || m.is_scope_change)).slice(0, 3),
    [all],
  );

  const nextDeadline = useMemo(() => {
    const now = new Date();
    return dedupeByTitle(all.filter((m) => m._catKey === "deadline" || m._catKey === "timeline"))
      .map((m) => ({ ...m, _due: parseDueDate(`${m.title} ${m.detail || ""}`, now) }))
      .filter((m) => m._due && m._due >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => a._due - b._due)[0] || null;
  }, [all]);

  const recent = useMemo(
    () => dedupeByTitle([...all].sort((a, b) =>
      String(b.occurred_at || b.created_at || "").localeCompare(String(a.occurred_at || a.created_at || "")),
    )).slice(0, 5),
    [all],
  );

  const STATS = [
    { key: "scope", label: "Scope" },
    { key: "deliverable", label: "Deliverables" },
    { key: "requirement", label: "Requirements" },
    { key: "decision", label: "Decisions" },
  ];

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

  const Header = () => (
    <div className="ov-head">
      <HeaderActions {...headerActions} attentionTitle={attention[0]?.title} />
      <motion.h1
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-1 text-[30px] sm:text-[38px] font-semibold tracking-[-0.03em] leading-[1.03]" style={{ color: "var(--text)" }} data-testid="project-memory-title">
        {project.name}
      </motion.h1>
      <div className="ov-meta" data-testid="home-updated">
        <span className="ov-live"><span className="ov-live-dot" /> Synced {timeAgo(updatedAt)}</span>
        {connections.length > 0 && <span className="ov-meta-sep" />}
        <span className="ov-chips">
          {connections.slice(0, 4).map((c) => (
            <span key={c.id} className="ov-chip" title={c.source_name || c.provider} data-testid={`home-source-chip-${c.id}`}>
              <ProviderIcon provider={c.provider} size={13} bare />
              <span className="ov-chip-name">{c.source_name || PROVIDER_META[c.provider]?.label || c.provider}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );

  if (noSources) {
    return (
      <>
        <Header />
        <EmptyState
          icon={Plug}
          title="Your project memory is waiting"
          description="Connect Gmail, Slack, Figma or GitHub and Bracket starts reading your client conversations — surfacing scope, decisions, requirements and deadlines automatically."
          cta="Connect your first tool"
          ctaTo={`/app/connect?project=${projectId}`}
          footnote="GMAIL · SLACK · FIGMA · GITHUB"
          testid="overview-empty-state"
        />
      </>
    );
  }

  return (
    <div className="ov-wrap">
      <Header />

      <motion.div className="ov-dash" variants={container} initial="hidden" animate="show">
        {/* At-a-glance stats */}
        <motion.section className="ov-stats" variants={item} data-testid="home-stats">
          {STATS.map((s) => (
            <button key={s.key} type="button" className="ov-stat" onClick={() => setModalCat(s.key)} data-testid={`home-stat-${s.key}`}>
              <span className="ov-stat-num">{counts?.[s.key] || 0}</span>
              <span className="ov-stat-label">{s.label}</span>
            </button>
          ))}
        </motion.section>

        <div className="ov-grid">
          {/* Needs attention */}
          <motion.section className="ov-panel" variants={item} data-testid="home-attention">
            <p className="ov-panel-label">NEEDS ATTENTION</p>
            {detectedCount === 0 ? (
              <div className="attn-feat" data-testid="home-caught-up">
                <span className="attn-ring"><CheckCircle2 size={22} style={{ color: "var(--success)" }} /></span>
                <div className="min-w-0">
                  <p className="attn-feat-title">You're all caught up</p>
                  <p className="attn-feat-desc">Nothing needs your review right now. Bracket will surface changes as new client messages arrive.</p>
                </div>
              </div>
            ) : (
              <div className="attn-feat" data-testid="home-attention-change">
                <span className="attn-ring attn-ring--alert"><AlertCircle size={22} /></span>
                <div className="min-w-0">
                  <p className="attn-feat-title">{attention[0]?.title || "Changes ready to review"}</p>
                  <p className="attn-feat-desc">{attention[0]?.detail || `A client request affects this project — review its full impact once and Bracket updates everything.`}</p>
                  <div className="attn-actions">
                    <button type="button" className="attn-review" onClick={onReviewUpdate} data-testid="home-attention-review">Review <ArrowRight size={16} /></button>
                    {detectedCount > 1 && (
                      <button type="button" className="attn-more" onClick={onReviewUpdate} data-testid="home-attention-more">+{detectedCount - 1} more <ChevronRight size={15} /></button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.section>

          {/* Up next — deadline */}
          <motion.section className="ov-panel" variants={item} data-testid="home-upnext">
            <p className="ov-panel-label">UP NEXT</p>
            {nextDeadline ? (
              <div className="ov-deadline" onClick={() => headerActions?.onGoTimeline?.()} data-testid="home-next-deadline">
                <span className="ov-cal"><CalendarClock size={20} /></span>
                <div className="min-w-0">
                  <p className="ov-deadline-title">{nextDeadline.title}</p>
                  <p className="ov-deadline-meta">
                    {nextDeadline._due.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {daysLeftLabel(nextDeadline._due)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="ov-deadline ov-deadline--empty">
                <span className="ov-cal"><CalendarClock size={20} /></span>
                <div className="min-w-0">
                  <p className="ov-deadline-title" style={{ color: "var(--text-2)" }}>No upcoming deadlines</p>
                  <p className="ov-deadline-meta">Deadlines Bracket finds in your messages appear here.</p>
                </div>
              </div>
            )}
          </motion.section>
        </div>

        {/* Recent activity */}
        <motion.section className="ov-panel ov-panel--flush" variants={item} data-testid="home-recent">
          <p className="ov-panel-label">RECENT ACTIVITY</p>
          {recent.length === 0 ? (
            <p className="text-[13px] py-2" style={{ color: "var(--text-3)" }}>Nothing yet.</p>
          ) : (
            <ul className="ov-recent">
              {recent.map((m) => {
                const c = CATEGORY_BY_KEY[m._catKey] || CATEGORY_BY_KEY.decision;
                return (
                  <li key={m.id} className="ov-recent-row" onClick={() => setModalCat(m._catKey)} data-testid={`home-recent-${m.id}`}>
                    <span className="ov-recent-icon"><c.icon size={14} /></span>
                    <span className="ov-recent-title">{m.title}</span>
                    <span className="ov-recent-cat">{c.label}</span>
                    <span className="ov-recent-time">{timeAgo(m.occurred_at || m.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>
      </motion.div>

      <CategoryModal catKey={modalCat} memory={memory} onClose={() => setModalCat(null)} />
    </div>
  );
}

/* ─── Category drill-in modal (Scope / Deliverables / Requirements / …) ── */
function CategoryModal({ catKey, memory, onClose }) {
  if (!catKey) return null;
  const c = CATEGORY_BY_KEY[catKey];
  const items = dedupeByTitle(memory.grouped?.[catKey] || []);
  return (
    <div className="bkt-modal-overlay" onClick={onClose} data-testid="category-modal">
      <div className="bkt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bkt-modal-head">
          <span className="flex items-center gap-2">
            <c.icon size={16} style={{ color: c.color }} />
            <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>{c.label}</span>
            <span className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>· {items.length}</span>
          </span>
          <button type="button" className="bkt-modal-x" onClick={onClose} data-testid="category-modal-close"><X size={16} /></button>
        </div>
        <div className="bkt-modal-body">
          {items.length === 0 ? (
            <p className="px-2 py-8 text-[13px] text-center" style={{ color: "var(--text-3)" }}>
              Nothing here yet. Bracket adds {c.label.toLowerCase()} automatically as it reads your conversations.
            </p>
          ) : items.map((m) => {
            const st = STATUS_META[m.status] || STATUS_META.confirmed;
            return (
              <div key={m.id} className="drill-row" data-testid={`drill-${m.id}`}>
                <p className="drill-title">{m.title}</p>
                {m.detail && <p className="drill-detail">{m.detail}</p>}
                <div className="drill-meta">
                  <span style={{ color: st.color }}>{st.label}</span>
                  {m.source_label && <span>· {m.source_label}</span>}
                  {m.occurred_at && <span>· {timeAgo(m.occurred_at)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Conversations — compressed client stream + Ask Bracket ──────────── */
function ConversationsStream({ projectId, project, connections, memory, headerActions }) {
  const [orig, setOrig] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const all = useMemo(() => flattenMemory(memory), [memory]);
  const full = useMemo(() => (
    dedupeByTitle([...all].sort((a, b) =>
      String(b.occurred_at || b.created_at || "").localeCompare(String(a.occurred_at || a.created_at || "")))
    ).slice(0, 12)
  ), [all]);
  const stream = showAll ? full : full.slice(0, 4);
  const primary = connections[0];

  return (
    <div className="ov-wrap conv-wrap" data-testid="project-conversations">
      <div className="ov-head">
        <HeaderActions {...(headerActions || {})} />
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.03em]" style={{ color: "var(--text)" }}>Conversations</h1>
        <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-3)" }}>Bracket compresses client messages and helps you respond.</p>
      </div>

      <p className="ov-section-label" style={{ flexShrink: 0, marginBottom: 4 }}>What your client said</p>

      <div className="conv-stream-region">
        {connections.length === 0 ? (
          <div className="ov-card ov-card--quiet"><Mail size={16} style={{ color: "var(--text-3)" }} /><p className="ov-card-sub">No conversations connected yet. Use the “+” next to Sources to add one.</p></div>
        ) : full.length === 0 ? (
          <div className="ov-card ov-card--quiet"><p className="ov-card-sub">Nothing important yet. Bracket will surface key client messages here as they arrive.</p></div>
        ) : (
          <>
            <div className="stream" data-testid="conversation-stream">
              {stream.map((m) => {
                const c = CATEGORY_BY_KEY[m._catKey] || CATEGORY_BY_KEY.decision;
                return (
                  <div key={m.id} className="stream-row2" data-testid={`stream-row-${m.id}`}>
                    <span className="stream-ring"><c.icon size={16} style={{ color: c.color }} /></span>
                    <div className="min-w-0">
                      <p className="stream-t">{m.title}</p>
                      {m.detail && <p className="stream-d">{m.detail}</p>}
                    </div>
                    <span className="stream-time">{m.occurred_at ? timeAgo(m.occurred_at) : ""}</span>
                    {m.connection_id ? (
                      <button type="button" className="stream-orig2" onClick={() => setOrig(m.connection_id)} data-testid={`stream-orig-${m.id}`}>
                        View original <span className="stream-orig-ic"><ExternalLink size={11} /></span>
                      </button>
                    ) : <span />}
                  </div>
                );
              })}
            </div>
            {full.length > 4 && (
              <button type="button" className="conv-view-older" onClick={() => setShowAll((v) => !v)} data-testid="conv-view-older">
                {showAll ? "Show less" : "View older"} <ChevronDown size={14} style={{ transform: showAll ? "rotate(180deg)" : "none", transition: "transform .16s" }} />
              </button>
            )}
          </>
        )}
      </div>

      <AskBracketBar projectId={projectId} connections={connections} />

      <ViewOriginalModal projectId={projectId} connId={orig} connections={connections} onClose={() => setOrig(null)} />
    </div>
  );
}

/* ─── Ask Bracket — bottom composer: Ask → Draft → Review → Select → Send ─ */
const ASK_SUGGESTIONS = ["Tell them mobile isn't included.", "Confirm the new timeline.", "Thanks for the feedback."];
const ASK_MORE = ["Ask for the missing details we still need.", "Push back politely on the new scope.", "Share a short status update.", "Confirm next steps and owners."];

function AskBracketBar({ projectId, connections }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const generate = async (text) => {
    const t = (text || "").trim();
    if (!t || generating) return;
    setGenerating(true); setMoreOpen(false);
    try {
      const { data } = await api.post(`/projects/${projectId}/suggest-reply`, { instruction: t, history: [] });
      setDraft({ content: (data.reply || "").trim(), instruction: t });
      setPrompt("");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setGenerating(false); }
  };

  return (
    <div className="ask-bar" data-testid="ask-bracket-bar">
      <div className="ask-bar-grid">
        <div className="ask-bar-intro">
          <p className="ask-bar-title"><Sparkles size={14} style={{ color: "var(--accent)" }} /> Ask Bracket</p>
          <p className="ask-bar-desc">Ask Bracket to draft a reply using recent conversation and project context.</p>
        </div>
        <div className="ask-bar-main">
          <form className="ask-bar-input" onSubmit={(e) => { e.preventDefault(); generate(prompt); }}>
            <textarea rows={1} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(prompt); } }}
              placeholder="Ask Bracket what to send…" data-testid="ask-bracket-input" />
            <button type="submit" className="ask-bar-send" disabled={generating || !prompt.trim()} data-testid="ask-bracket-send" aria-label="Generate">
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
          <div className="ask-chips">
            {ASK_SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="ask-chip" disabled={generating} onClick={() => generate(s)} data-testid="ask-chip">{s}</button>
            ))}
            <div className="relative">
              <button type="button" className="ask-chip" onClick={() => setMoreOpen((o) => !o)} data-testid="ask-more">More suggestions <ChevronDown size={12} /></button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
                  <div className="absolute z-40 rounded-xl p-1.5 min-w-[280px]" style={{ bottom: "calc(100% + 6px)", left: 0, background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.7)" }}>
                    {ASK_MORE.map((s) => (
                      <button key={s} type="button" onClick={() => generate(s)} className="w-full text-left px-2.5 py-2 rounded-lg text-[12.5px]" style={{ color: "var(--text-2)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>{s}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <DraftReviewModal projectId={projectId} connections={connections} draft={draft}
        onChange={(v) => setDraft((d) => (d ? { ...d, content: v } : d))} onClose={() => setDraft(null)} />
    </div>
  );
}

function DraftReviewModal({ projectId, connections, draft, onChange, onClose }) {
  const keyOf = (t) => `${t.provider}:${t.thread_id || t.channel_id || ""}`;
  const [targets, setTargets] = useState([]);
  const [checked, setChecked] = useState({});
  const [toEdits, setToEdits] = useState({});
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!draft) return;
    api.get(`/projects/${projectId}/send-targets`).then((r) => {
      const ts = r.data.targets || [];
      setTargets(ts);
      const c = {}; const e = {};
      ts.forEach((t) => { c[keyOf(t)] = true; if (t.provider === "gmail") e[keyOf(t)] = t.to || ""; });
      setChecked(c); setToEdits(e);
    }).catch(() => setTargets([]));
  }, [draft, projectId]);
  if (!draft) return null;

  const doSend = async () => {
    if (sending) return;
    const picked = targets.filter((t) => checked[keyOf(t)]);
    if (picked.length === 0) { toast.error("Tick at least one recipient."); return; }
    const gmailTargets = picked.filter((t) => t.provider === "gmail").map((t) => ({ to: (toEdits[keyOf(t)] || "").trim(), thread_id: t.thread_id }));
    const slackTargets = picked.filter((t) => t.provider === "slack");
    if (gmailTargets.some((t) => !t.to || !t.to.includes("@"))) { toast.error("Add a valid email for each ticked Gmail thread."); return; }
    setSending(true);
    try {
      const done = [];
      if (gmailTargets.length) { await api.post(`/projects/${projectId}/send-email`, { targets: gmailTargets, body: draft.content }); done.push(`${gmailTargets.length} email${gmailTargets.length > 1 ? "s" : ""}`); }
      for (const s of slackTargets) { await api.post(`/projects/${projectId}/send-slack`, { channel_id: s.channel_id, body: draft.content }); }
      if (slackTargets.length) done.push(`${slackTargets.length} Slack post${slackTargets.length > 1 ? "s" : ""}`);
      toast.success(`Sent — ${done.join(" · ")}`);
      onClose();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSending(false); }
  };

  return (
    <div className="bkt-modal-overlay" onClick={onClose} data-testid="draft-review-modal">
      <div className="bkt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bkt-modal-head">
          <span className="flex items-center gap-2"><Sparkles size={15} style={{ color: "var(--accent)" }} /><span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Review &amp; send</span></span>
          <button type="button" className="bkt-modal-x" onClick={onClose} data-testid="draft-review-close"><X size={16} /></button>
        </div>
        <div className="bkt-modal-body" style={{ padding: "16px 18px" }}>
          <p className="mono-tag text-[9.5px] mb-2" style={{ color: "var(--text-3)" }}>BRACKET'S DRAFT</p>
          <textarea value={draft.content} onChange={(e) => onChange(e.target.value)} rows={7}
            className="w-full resize-y rounded-xl p-3 text-[13.5px] leading-relaxed outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--hairline-strong)", color: "var(--text)" }} data-testid="draft-review-text" />
          {targets.length > 0 && (
            <>
              <p className="mono-tag text-[9.5px] mt-4 mb-2" style={{ color: "var(--text-3)" }}>SEND TO</p>
              <div className="flex flex-col gap-1.5">
                {targets.map((t) => {
                  const k = keyOf(t); const on = !!checked[k];
                  return (
                    <div key={k} className="rounded-lg px-2.5 py-2" style={{ background: on ? "var(--surface-2)" : "transparent", border: "1px solid var(--hairline)" }}>
                      <button type="button" onClick={() => setChecked((c) => ({ ...c, [k]: !c[k] }))} className="w-full flex items-center gap-2.5 text-left" data-testid={`draft-target-${k}`}>
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded shrink-0" style={{ background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1px solid var(--hairline-strong)", color: "#fff" }}>{on && <Check size={11} />}</span>
                        <ProviderIcon provider={t.provider} size={12} bare />
                        <span className="text-[12.5px] truncate" style={{ color: "var(--text)" }}>{t.provider === "slack" ? (t.channel_name || "Slack channel") : (t.thread_name || "Gmail thread")}</span>
                      </button>
                      {t.provider === "gmail" && on && (
                        <input type="email" value={toEdits[k] || ""} onChange={(e) => setToEdits((m) => ({ ...m, [k]: e.target.value }))} placeholder="client@company.com" className="jira-filter-input mt-2" style={{ width: "100%" }} data-testid={`draft-to-${k}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--hairline)" }}>
          <button type="button" onClick={onClose} className="text-[12.5px]" style={{ color: "var(--text-2)" }} data-testid="draft-review-cancel">Cancel</button>
          <button type="button" onClick={doSend} disabled={sending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium disabled:opacity-40" style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }} data-testid="draft-review-send">{sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}{sending ? "Sending…" : "Send"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── View original source conversation (full context) ────────────────── */
function ViewOriginalModal({ projectId, connId, connections, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!connId) { setContent(null); return; }
    setLoading(true);
    api.get(`/projects/${projectId}/connections/${connId}/content`)
      .then((r) => setContent(r.data)).catch(() => setContent({ content: "" }))
      .finally(() => setLoading(false));
  }, [connId, projectId]);
  if (!connId) return null;
  const conn = connections.find((c) => c.id === connId);
  return (
    <div className="bkt-modal-overlay" onClick={onClose} data-testid="view-original-modal">
      <div className="bkt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bkt-modal-head">
          <span className="flex items-center gap-2 min-w-0">
            <ProviderIcon provider={conn?.provider || "gmail"} size={15} bare />
            <span className="text-[15px] font-semibold truncate" style={{ color: "var(--text)" }}>{conn?.source_name || "Original conversation"}</span>
          </span>
          <button type="button" className="bkt-modal-x" onClick={onClose} data-testid="view-original-close"><X size={16} /></button>
        </div>
        <div className="bkt-modal-body" style={{ padding: "18px 20px" }}>
          {loading ? (
            <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-3)" }}><Loader2 size={14} className="animate-spin" /> Loading original…</div>
          ) : content?.content ? (
            <div style={{ whiteSpace: "pre-wrap", fontSize: "13.5px", lineHeight: 1.7, color: "var(--text-2, #c4c4c4)" }}>{content.content}</div>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>No cached content available for this conversation.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Timeline — Approaching deadlines + Project history + Ask Bracket ── */
function TimelineView({ projectId, project, memory, headerActions }) {
  const [history, setHistory] = useState([]);
  const [fullOpen, setFullOpen] = useState(false);
  useEffect(() => {
    api.get(`/projects/${projectId}/history`).then((r) => setHistory(r.data?.entries || [])).catch(() => {});
  }, [projectId]);

  const all = useMemo(() => flattenMemory(memory), [memory]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const deadlines = useMemo(() => (
    dedupeByTitle(all.filter((m) => m._catKey === "deadline" || m._catKey === "timeline"))
      .map((m) => ({ ...m, _due: parseDueDate(`${m.title} ${m.detail || ""}`, now) }))
      .filter((m) => m._due && m._due >= today)
      .sort((a, b) => a._due - b._due)
  ), [all]); // eslint-disable-line

  const past = useMemo(() => {
    const evs = [];
    dedupeByTitle(all).forEach((m) => {
      evs.push({ id: m.id, kind: m._catKey, title: m.title, detail: m.detail, at: m.occurred_at || m.created_at, provider: m.provider, connection_id: m.connection_id });
    });
    (history || []).forEach((h) => {
      evs.push({ id: `h-${h.id}`, kind: "event", title: h.title, detail: h.detail, at: h.at, provider: h.provider });
    });
    return evs.filter((e) => e.at).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }, [all, history]);

  const iconFor = (kind) => CATEGORY_BY_KEY[kind]?.icon || History;
  const recent = past.slice(0, 4);
  const [orig, setOrig] = useState(null);

  const fmtDue = (d) => {
    const days = Math.round((d - today) / 86400000);
    const lbl = days <= 0 ? "Today" : days === 1 ? "Due in 1 day" : `Due in ${days} days`;
    return `${lbl} · ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
  };
  const fmtEyebrow = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    if (diff <= 0) return "TODAY";
    if (diff === 1) return "YESTERDAY";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  };
  const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");

  return (
    <div className="ov-wrap conv-wrap" data-testid="project-timeline">
      <div className="ov-head">
        <HeaderActions {...(headerActions || {})} />
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.03em]" style={{ color: "var(--text)" }}>Timeline</h1>
        <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-3)" }}>Deadlines, decisions, and everything that shaped this project.</p>
      </div>

      <div className="conv-stream-region">
        {/* Approaching deadlines */}
        <div className="tl-sec-head">
          <p className="mono-tag" style={{ color: "var(--text-3)", fontSize: "10.5px", letterSpacing: "0.14em" }}>APPROACHING DEADLINES</p>
          {deadlines.length > 0 && (
            <button type="button" className="tl-viewall" onClick={() => setFullOpen(true)} data-testid="timeline-view-all-deadlines">View all deadlines <ArrowRight size={13} /></button>
          )}
        </div>
        <div className="tl-deadlines" data-testid="timeline-deadlines">
          {deadlines.length === 0 ? (
            <p className="tl-empty">No upcoming deadlines detected yet — Bracket adds them as dates appear in your conversations.</p>
          ) : deadlines.slice(0, 3).map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && <span className="tl-dl-sep" />}
              <div className="tl-dl" data-testid={`timeline-deadline-${m.id}`}>
                <span className="tl-dl-ic"><Calendar size={15} /></span>
                <div className="min-w-0">
                  <p className="tl-dl-title">{m.title}</p>
                  <p className="tl-dl-due">{fmtDue(m._due)}</p>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Project history */}
        <p className="mono-tag" style={{ color: "var(--text-3)", fontSize: "10.5px", letterSpacing: "0.14em", marginTop: 34, marginBottom: 6 }}>PROJECT HISTORY</p>
        <div className="tl-hist">
          {recent.length === 0 ? (
            <p className="tl-empty">No events yet.</p>
          ) : recent.map((e, i) => {
            const Icon = iconFor(e.kind);
            return (
              <div key={e.id} className="tl-h-row" data-testid={`timeline-hist-${e.id}`}>
                <div className="tl-rail">
                  <span className="tl-dot"><Icon size={13} style={{ color: "var(--text-2)" }} /></span>
                  {i < recent.length - 1 && <span className="tl-line" />}
                </div>
                <div className="tl-h-body">
                  <p className="tl-h-eyebrow">{fmtEyebrow(e.at)}</p>
                  <p className="tl-h-title">{e.title}</p>
                  {e.detail && <p className="tl-h-desc">{e.detail}</p>}
                </div>
                <div className="tl-h-meta">
                  <span className="tl-h-who">{PROVIDER_META[e.provider]?.label || e.provider}</span>
                  <span className="tl-h-time">{fmtTime(e.at)}</span>
                  {e.connection_id ? (
                    <button type="button" className="stream-orig2" onClick={() => setOrig(e.connection_id)} data-testid={`timeline-orig-${e.id}`}>
                      View original <span className="stream-orig-ic"><ExternalLink size={11} /></span>
                    </button>
                  ) : <span className="tl-h-spacer" />}
                </div>
              </div>
            );
          })}
        </div>
        {past.length > recent.length && (
          <button type="button" className="tl-viewall" style={{ marginTop: 16 }} onClick={() => setFullOpen(true)} data-testid="timeline-view-earlier">View earlier history <ArrowRight size={13} /></button>
        )}
      </div>

      <AskBracketHistory projectId={projectId} />

      <ViewOriginalModal projectId={projectId} connId={orig} connections={[]} onClose={() => setOrig(null)} />
      <TimelineHistoryModal open={fullOpen} past={past} iconFor={iconFor} onClose={() => setFullOpen(false)} />
    </div>
  );
}

/* Ask Bracket — history Q&A (full-width composer with search affordance) */
const HISTORY_Q = ["When did the client first ask for mobile screens?", "Who approved Option B?", "What was the original homepage deadline?", "Why did the deadline change?"];
const HISTORY_Q_MORE = ["What's still unresolved?", "Summarise the scope changes so far.", "What did the client confirm last week?"];

function AskBracketHistory({ projectId }) {
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const ask = async (text) => {
    const t = (text || "").trim();
    if (!t || asking) return;
    setAsking(true); setMoreOpen(false);
    try {
      const { data } = await api.post(`/projects/${projectId}/ask`, { question: t });
      setAnswer({ q: t, a: (data.answer || data.reply || "").trim() });
      setQ("");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setAsking(false); }
  };

  return (
    <div className="ask-bar" data-testid="ask-bracket-history">
      <p className="mono-tag" style={{ color: "var(--text-3)", fontSize: "10.5px", letterSpacing: "0.14em", marginBottom: 12 }}>ASK BRACKET</p>
      <form className="ask-bar-input ask-search" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <Search size={16} style={{ color: "#6f6f6f", marginTop: 3, flexShrink: 0 }} />
        <textarea rows={1} value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }}
          placeholder="Ask anything about this project's history…" data-testid="ask-history-input" />
        <button type="submit" className="ask-bar-send" disabled={asking || !q.trim()} data-testid="ask-history-send" aria-label="Ask">
          {asking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
      <div className="ask-chips">
        {HISTORY_Q.map((s) => (
          <button key={s} type="button" className="ask-chip" disabled={asking} onClick={() => ask(s)} data-testid="ask-history-chip">{s}</button>
        ))}
        <div className="relative">
          <button type="button" className="ask-chip" onClick={() => setMoreOpen((o) => !o)} data-testid="ask-history-more">More examples <ChevronDown size={12} /></button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
              <div className="absolute z-40 rounded-xl p-1.5 min-w-[300px]" style={{ bottom: "calc(100% + 6px)", right: 0, background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.7)" }}>
                {HISTORY_Q_MORE.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="w-full text-left px-2.5 py-2 rounded-lg text-[12.5px]" style={{ color: "var(--text-2)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>{s}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {answer && (
        <div className="bkt-modal-overlay" onClick={() => setAnswer(null)} data-testid="ask-history-answer">
          <div className="bkt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bkt-modal-head">
              <span className="flex items-center gap-2"><Sparkles size={15} style={{ color: "var(--accent)" }} /><span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Bracket answers</span></span>
              <button type="button" className="bkt-modal-x" onClick={() => setAnswer(null)} data-testid="ask-history-answer-close"><X size={16} /></button>
            </div>
            <div className="bkt-modal-body" style={{ padding: "16px 18px" }}>
              <p className="text-[13px] mb-3" style={{ color: "var(--text-3)" }}>{answer.q}</p>
              <div style={{ whiteSpace: "pre-wrap", fontSize: "13.5px", lineHeight: 1.7, color: "var(--text)" }}>{answer.a || "Bracket couldn't find an answer in the connected work."}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Full project history — opened deliberately; scrolls inside the modal only */
function TimelineHistoryModal({ open, past, iconFor, onClose }) {
  if (!open) return null;
  return (
    <div className="bkt-modal-overlay" onClick={onClose} data-testid="timeline-history-modal">
      <div className="bkt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bkt-modal-head">
          <span className="flex items-center gap-2">
            <History size={16} style={{ color: "var(--text-2)" }} />
            <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Full history</span>
            <span className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>· {past.length}</span>
          </span>
          <button type="button" className="bkt-modal-x" onClick={onClose} data-testid="timeline-history-close"><X size={16} /></button>
        </div>
        <div className="bkt-modal-body" style={{ padding: "10px 16px 14px" }}>
          {past.map((e) => {
            const Icon = iconFor(e.kind);
            return (
              <div key={e.id} className="drill-row" data-testid={`timeline-full-${e.id}`}>
                <div className="flex items-start gap-3">
                  <span className="stream-ico" style={{ width: 26, height: 26 }}><Icon size={13} style={{ color: "var(--text-2)" }} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="drill-title">{e.title}</p>
                    {e.detail && <p className="drill-detail">{e.detail}</p>}
                    <div className="drill-meta">{e.at ? timeAgo(e.at) : ""}{e.provider ? ` · ${PROVIDER_META[e.provider]?.label || e.provider}` : ""}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Suggested Reply chat (on-demand, per-project) ───────── */
const REPLY_QUICK_PROMPTS = [
  "Draft a reply to the client's latest message.",
  "Acknowledge the deadline and confirm next steps.",
  "Ask for the missing details we still need.",
];

function SuggestedReplyChat({ projectId, clientName, connections }) {
  const storeKey = `bracket.askThread.${projectId}`;
  // Each turn: { role: 'user'|'assistant', content: string, meta?: {...} }
  const [thread, setThread] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`bracket.askThread.${projectId}`) || "[]"); } catch { return []; }
  });
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [editingIdx, setEditingIdx] = useState(-1);
  const [editingDraft, setEditingDraft] = useState("");
  const [sendTargets, setSendTargets] = useState([]);
  const bottomRef = useRef(null);
  const editRef = useRef(null);

  // Which channels this reply can be sent through (Gmail / Slack), driven by
  // the sources actually connected to this project.
  useEffect(() => {
    let alive = true;
    api.get(`/projects/${projectId}/send-targets`)
      .then((r) => { if (alive) setSendTargets(r.data.targets || []); })
      .catch(() => { if (alive) setSendTargets([]); });
    return () => { alive = false; };
  }, [projectId, connections]);

  // Persist the conversation so "previous interactions" survive navigation/reload.
  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify(thread.slice(-20))); } catch { /* ignore */ }
  }, [thread, storeKey]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length, sending]);

  useEffect(() => {
    if (editingIdx >= 0 && editRef.current) {
      editRef.current.focus();
      const len = editRef.current.value.length;
      editRef.current.setSelectionRange(len, len);
    }
  }, [editingIdx]);

  const send = async (instruction) => {
    const text = (instruction || "").trim();
    if (!text || sending) return;
    setSending(true);
    // Append the user turn immediately so the UI feels responsive.
    const userTurn = { role: "user", content: text };
    const nextThread = [...thread, userTurn];
    setThread(nextThread);
    setPrompt("");
    try {
      const { data } = await api.post(`/projects/${projectId}/suggest-reply`, {
        instruction: text,
        history: thread, // send the turns BEFORE this instruction
      });
      const reply = (data.reply || "").trim();
      const assistantTurn = {
        role: "assistant",
        content: reply,
        meta: {
          based_on: data.based_on || null,
          deep_links: data.deep_links || {},
          confidence: data.confidence || "medium",
        },
      };
      setThread((cur) => [...cur, assistantTurn]);
      try { localStorage.setItem("bracket.fr.draftedReply", "1"); } catch { /* ignore */ }
      window.dispatchEvent(new Event("bracket-firstrun-update"));
    } catch (e) {
      toast.error(formatApiError(e));
      // Roll the user turn back if the request failed — nothing to reply to.
      setThread(thread);
    } finally {
      setSending(false);
    }
  };

  const regenerate = async (assistantIdx) => {
    // Find the user instruction paired with this assistant reply.
    const userIdx = assistantIdx - 1;
    if (userIdx < 0 || thread[userIdx]?.role !== "user") return;
    const instruction = thread[userIdx].content;
    // Truncate thread up to (but not including) this pair, then re-send.
    const priorThread = thread.slice(0, userIdx);
    setSending(true);
    setThread([...priorThread, { role: "user", content: instruction }]);
    try {
      const { data } = await api.post(`/projects/${projectId}/suggest-reply`, {
        instruction, history: priorThread,
      });
      const reply = (data.reply || "").trim();
      setThread([
        ...priorThread,
        { role: "user", content: instruction },
        {
          role: "assistant",
          content: reply,
          meta: {
            based_on: data.based_on || null,
            deep_links: data.deep_links || {},
            confidence: data.confidence || "medium",
          },
        },
      ]);
      toast.success("Bracket re-drafted the reply");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSending(false); }
  };

  const copyReply = async (idx, content) => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content.trim());
      setCopiedId(idx);
      setTimeout(() => setCopiedId((c) => (c === idx ? null : c)), 1500);
      toast.success("Reply copied — paste it in your tool to send.");
    } catch { toast.error("Couldn't access clipboard."); }
  };

  const saveEdit = () => {
    if (editingIdx < 0) return;
    setThread((cur) => cur.map((t, i) => (i === editingIdx ? { ...t, content: editingDraft } : t)));
    setEditingIdx(-1);
    setEditingDraft("");
  };

  return (
    <section
      className="rounded-xl overflow-hidden flex flex-col h-full"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
      data-testid="suggested-reply-chat"
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={13} style={{ color: "var(--accent)" }} />
          <p className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>ASK BRACKET</p>
          {clientName && (
            <span className="text-[10.5px] truncate" style={{ color: "var(--text-3)" }}>· {clientName}</span>
          )}
        </div>
        {thread.length > 0 && (
          <button type="button" onClick={() => { setThread([]); setPrompt(""); }}
                  className="inline-flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-full"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                  data-testid="suggested-reply-clear">
            <RotateCcw size={10} /> New
          </button>
        )}
      </div>

      {/* Thread body */}
      <div className="px-4 py-4 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto" data-testid="suggested-reply-thread">
        {thread.length === 0 && (
          <div data-testid="suggested-reply-empty">
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              Ask Bracket to draft a reply, chase missing details, or push back on scope — grounded in this project&apos;s memory.
            </p>
            <div className="mt-3 flex flex-col gap-1.5" data-testid="suggested-reply-quick-prompts">
              {REPLY_QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => send(qp)}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 text-[11.5px] px-3 py-2 rounded-lg disabled:opacity-40 text-left"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                >
                  <Sparkles size={10} className="shrink-0" /> {qp}
                </button>
              ))}
            </div>
          </div>
        )}

        {thread.map((t, i) => (
          <ChatTurn
            key={i}
            idx={i}
            turn={t}
            projectId={projectId}
            clientName={clientName}
            sendTargets={sendTargets}
            editing={editingIdx === i}
            editingDraft={editingDraft}
            editRef={editRef}
            onEdit={() => { setEditingIdx(i); setEditingDraft(t.content); }}
            onEditChange={(v) => setEditingDraft(v)}
            onEditSave={saveEdit}
            onEditCancel={() => { setEditingIdx(-1); setEditingDraft(""); }}
            onCopy={(content) => copyReply(i, content)}
            copied={copiedId === i}
            onRegenerate={() => regenerate(i)}
          />
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-3)" }}>
            <Loader2 size={12} className="animate-spin" /> Bracket is drafting…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--hairline)" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); send(prompt); }}
          className="ask-input-box flex items-end gap-2 p-2"
          data-testid="suggested-reply-form"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(prompt); }
            }}
            placeholder={thread.length === 0
              ? "Ask Bracket to draft a reply…"
              : "Refine or ask for another angle…"}
            rows={2}
            className="flex-1 resize-none bg-transparent outline-none text-[13px] leading-relaxed px-1.5 py-1"
            style={{ color: "var(--text)" }}
            data-testid="suggested-reply-input"
          />
          <button
            type="submit"
            disabled={sending || !prompt.trim()}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium disabled:opacity-40"
            style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
            data-testid="suggested-reply-send"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {thread.length === 0 ? "Generate" : "Send"}
          </button>
        </form>
        <p className="mt-1.5 text-[10px]" style={{ color: "var(--text-3)" }}>
          Bracket never sends on its own — you review and send.
        </p>
      </div>
    </section>
  );
}

function ChatTurn({
  idx, turn, projectId, clientName, sendTargets, editing, editingDraft, editRef,
  onEdit, onEditChange, onEditSave, onEditCancel,
  onCopy, copied, onRegenerate,
}) {
  // Send a reply to one OR MORE connected client threads/channels via a checklist.
  const keyOf = (t) => `${t.provider}:${t.thread_id || t.channel_id || ""}`;
  const [sendOpen, setSendOpen] = useState(false);
  const [checked, setChecked] = useState({});      // { key: true }
  const [toEdits, setToEdits] = useState({});       // { key: email } for gmail
  const [sending, setSending] = useState(false);

  const openSend = () => {
    const init = {};
    (sendTargets || []).forEach((t) => { init[keyOf(t)] = true; });   // default: all ticked
    setChecked(init);
    const edits = {};
    (sendTargets || []).forEach((t) => { if (t.provider === "gmail") edits[keyOf(t)] = t.to || ""; });
    setToEdits(edits);
    setSendOpen(true);
  };
  const closeSend = () => { if (!sending) setSendOpen(false); };

  const doSend = async () => {
    if (sending) return;
    const picked = (sendTargets || []).filter((t) => checked[keyOf(t)]);
    if (picked.length === 0) { toast.error("Tick at least one recipient."); return; }
    const gmailTargets = picked.filter((t) => t.provider === "gmail")
      .map((t) => ({ to: (toEdits[keyOf(t)] || "").trim(), thread_id: t.thread_id }));
    const slackTargets = picked.filter((t) => t.provider === "slack");
    if (gmailTargets.some((t) => !t.to || !t.to.includes("@"))) {
      toast.error("Add a valid email for each ticked Gmail thread."); return;
    }
    setSending(true);
    try {
      const results = [];
      if (gmailTargets.length) {
        await api.post(`/projects/${projectId}/send-email`, { targets: gmailTargets, body: turn.content });
        results.push(`${gmailTargets.length} email${gmailTargets.length > 1 ? "s" : ""}`);
      }
      for (const s of slackTargets) {
        await api.post(`/projects/${projectId}/send-slack`, { channel_id: s.channel_id, body: turn.content });
      }
      if (slackTargets.length) results.push(`${slackTargets.length} Slack post${slackTargets.length > 1 ? "s" : ""}`);
      toast.success(`Sent — ${results.join(" · ")}`);
      setSendOpen(false);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSending(false);
    }
  };

  if (turn.role === "user") {
    return (
      <div className="flex items-start gap-3" data-testid={`chat-turn-user-${idx}`}>
        <span
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full mt-0.5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
        >
          <User size={11} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mono-tag text-[9.5px] mb-1" style={{ color: "var(--text-3)" }}>YOU</p>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
            {turn.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant turn
  const based = turn.meta?.based_on || null;

  return (
    <div className="flex items-start gap-3" data-testid={`chat-turn-assistant-${idx}`}>
      <span
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full mt-0.5"
        style={{ background: "var(--accent-soft)", border: "1px solid var(--brand-border)", color: "var(--accent)" }}
      >
        <Sparkles size={11} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="mono-tag text-[9.5px]" style={{ color: "var(--accent)" }}>BRACKET</p>
          {based && (
            <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>
              · replying to <ProviderIcon provider={based.provider} size={9} className="inline mx-1" />
              {based.source_label}
            </span>
          )}
        </div>

        {editing ? (
          <>
            <textarea
              ref={editRef}
              value={editingDraft}
              onChange={(e) => onEditChange(e.target.value)}
              rows={Math.max(4, Math.min(12, (editingDraft.match(/\n/g) || []).length + 4))}
              className="w-full resize-y bg-transparent outline-none text-[13.5px] leading-relaxed rounded-lg p-3"
              style={{ color: "var(--text)", background: "var(--surface-2)", border: "1px solid var(--hairline-strong)" }}
              data-testid={`chat-turn-editor-${idx}`}
            />
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={onEditSave}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                      style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                      data-testid={`chat-turn-save-${idx}`}>
                <Check size={11} /> Save
              </button>
              <button type="button" onClick={onEditCancel}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                      data-testid={`chat-turn-cancel-${idx}`}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="text-[13.5px] leading-relaxed whitespace-pre-wrap pl-3.5 py-0.5"
              style={{ borderLeft: "2px solid var(--brand-border)", color: "var(--text)" }}
              data-testid={`chat-turn-body-${idx}`}
            >
              {turn.content || <span style={{ color: "var(--text-3)" }}>(Bracket returned an empty reply — try a different instruction.)</span>}
            </div>

            {turn.content && (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => onCopy(turn.content)}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                          data-testid={`chat-turn-copy-${idx}`}>
                    {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                  </button>
                  <button type="button" onClick={onEdit}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                          data-testid={`chat-turn-edit-${idx}`}>
                    <Pencil size={10} /> Edit
                  </button>
                  <button type="button" onClick={onRegenerate}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                          data-testid={`chat-turn-regenerate-${idx}`}>
                    <RefreshCw size={10} /> Regenerate
                  </button>
                  {/* Single send button → checklist of recipients */}
                  {(sendTargets || []).length > 0 && (
                    <button type="button" onClick={openSend}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md font-medium"
                            style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                            data-testid={`chat-turn-send-${idx}`}>
                      <Send size={10} /> Send reply
                    </button>
                  )}
                </div>

                {sendOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                       style={{ background: "rgba(0,0,0,0.6)" }}
                       onClick={closeSend}
                       data-testid={`chat-turn-send-modal-${idx}`}>
                    <div className="w-full max-w-[460px] rounded-2xl overflow-hidden"
                         style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "0 40px 120px -30px rgba(0,0,0,0.8)" }}
                         onClick={(e) => e.stopPropagation()}>
                      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
                        <p className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>Send this reply</p>
                        <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>Pick who gets it. Emails reply inside the client's original thread.</p>
                      </div>
                      <div className="px-4 py-3 flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
                        {(sendTargets || []).map((t) => {
                          const k = keyOf(t);
                          const on = !!checked[k];
                          return (
                            <div key={k} className="rounded-lg px-2.5 py-2"
                                 style={{ background: on ? "var(--surface-2)" : "transparent", border: "1px solid var(--hairline)" }}>
                              <button type="button" onClick={() => setChecked((c) => ({ ...c, [k]: !c[k] }))}
                                      className="w-full flex items-center gap-2.5 text-left"
                                      data-testid={`chat-turn-send-target-${k}`}>
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded shrink-0"
                                      style={{ background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1px solid var(--hairline-strong)", color: "#fff" }}>
                                  {on && <Check size={11} />}
                                </span>
                                <ProviderIcon provider={t.provider} size={12} bare />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[12.5px] truncate" style={{ color: "var(--text)" }}>
                                    {t.provider === "slack" ? (t.channel_name || "Slack channel") : (t.thread_name || "Gmail thread")}
                                  </span>
                                </span>
                              </button>
                              {t.provider === "gmail" && on && (
                                <input type="email" value={toEdits[k] || ""} onChange={(e) => setToEdits((m) => ({ ...m, [k]: e.target.value }))}
                                       placeholder="client@company.com" className="jira-filter-input mt-2" style={{ width: "100%" }}
                                       data-testid={`chat-turn-send-to-${k}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-4 pb-3">
                        <div className="text-[12px] leading-relaxed rounded-lg p-3 max-h-[120px] overflow-y-auto whitespace-pre-wrap"
                             style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}>
                          {turn.content}
                        </div>
                      </div>
                      <div className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--hairline)" }}>
                        <button type="button" onClick={closeSend} className="text-[12px]" style={{ color: "var(--text-2)" }}
                                data-testid={`chat-turn-send-cancel-${idx}`}>Cancel</button>
                        <button type="button" onClick={doSend} disabled={sending}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium disabled:opacity-40"
                                style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                                data-testid={`chat-turn-send-confirm-${idx}`}>
                          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          {sending ? "Sending…" : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Category view — filter + memory rows ────────────────── */
const JIRA_OPT_COLS = [
  { key: "status", label: "Status", w: "112px" },
  { key: "source", label: "Source", w: "140px" },
  { key: "date",   label: "Updated", w: "96px" },
];

function CategoryView({ cat, items, statusFilter, setStatusFilter, onOpen }) {
  const dialog = useDialog();
  const isTimeline = cat.key === "timeline";
  const [simple, setSimple] = useState(() => {
    try { const v = localStorage.getItem("bracket.simpleView"); return v === null ? true : v === "1"; }
    catch { return true; }
  });
  useEffect(() => { try { localStorage.setItem("bracket.simpleView", simple ? "1" : "0"); } catch { /* ignore */ } }, [simple]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`bracket.sort.${cat.key}`)) || { col: "date", dir: "desc" }; }
    catch { return { col: "date", dir: "desc" }; }
  });
  const [visibleCols, setVisibleCols] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(`bracket.cols.${cat.key}`)); return Array.isArray(v) ? v : ["status", "source", "date"]; }
    catch { return ["status", "source", "date"]; }
  });
  const [colMenu, setColMenu] = useState(false);
  // Global row density (shared across all categories).
  const [density, setDensity] = useState(() => {
    try { return localStorage.getItem("bracket.density") || "comfortable"; } catch { return "comfortable"; }
  });
  // Saved views — filter + columns + sort combos, scoped per category.
  const [views, setViews] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(`bracket.views.${cat.key}`)); return Array.isArray(v) ? v : []; }
    catch { return []; }
  });
  const [viewsMenu, setViewsMenu] = useState(false);

  useEffect(() => { try { localStorage.setItem(`bracket.sort.${cat.key}`, JSON.stringify(sort)); } catch { /* ignore */ } }, [sort, cat.key]);
  useEffect(() => { try { localStorage.setItem(`bracket.cols.${cat.key}`, JSON.stringify(visibleCols)); } catch { /* ignore */ } }, [visibleCols, cat.key]);
  useEffect(() => { try { localStorage.setItem("bracket.density", density); } catch { /* ignore */ } }, [density]);
  useEffect(() => { try { localStorage.setItem(`bracket.views.${cat.key}`, JSON.stringify(views)); } catch { /* ignore */ } }, [views, cat.key]);

  const toggleSort = (col) => setSort((s) => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "date" ? "desc" : "asc" });
  const toggleCol = (key) => setVisibleCols((cols) => cols.includes(key) ? cols.filter((c) => c !== key) : [...JIRA_OPT_COLS.map((c) => c.key).filter((k) => cols.includes(k) || k === key)]);

  const saveView = async () => {
    const name = (await dialog.prompt({
      title: "Save this view",
      message: "Save the current filter, visible columns and sort as a named view for this category.",
      placeholder: "e.g. Open scope, newest first",
    }))?.trim();
    if (!name) return;
    setViews((cur) => [...cur.filter((v) => v.name !== name), { name, statusFilter, visibleCols, sort }]);
    setViewsMenu(false);
    toast.success(`View “${name}” saved`);
  };
  const applyView = (v) => {
    setStatusFilter(v.statusFilter || "all");
    if (Array.isArray(v.visibleCols)) setVisibleCols(v.visibleCols);
    if (v.sort) setSort(v.sort);
    setViewsMenu(false);
    toast.success(`Applied “${v.name}”`);
  };
  const deleteView = (name) => setViews((cur) => cur.filter((v) => v.name !== name));

  const shownOpt = JIRA_OPT_COLS.filter((c) => visibleCols.includes(c.key));
  const gridTemplate = `30px minmax(0,1fr)${shownOpt.map((c) => ` ${c.w}`).join("")}`;

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (q) list = list.filter((m) =>
      String(m.title || "").toLowerCase().includes(q) ||
      String(m.detail || "").toLowerCase().includes(q) ||
      String(m.source_label || "").toLowerCase().includes(q));
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (m) => sort.col === "summary" ? String(m.title || "").toLowerCase()
      : sort.col === "status" ? String(m.status || "")
      : sort.col === "source" ? String(m.source_label || m.provider || "").toLowerCase()
      : String(m.created_at || "");
    return [...list].sort((a, b) => val(a) < val(b) ? -dir : val(a) > val(b) ? dir : 0);
  }, [items, query, sort]);

  const SortHead = ({ col, label }) => (
    <button type="button" onClick={() => toggleSort(col)}
            className="jira-sort-head inline-flex items-center gap-1"
            data-testid={`jira-sort-${col}`}>
      {label}
      {sort.col === col && <span className="jira-sort-arrow">{sort.dir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );

  return (
    <section data-testid="project-memory-pane">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <cat.icon size={16} style={{ color: cat.color }} />
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>{cat.label}</h2>
          <span className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>· {items.length}</span>
        </div>
        {!isTimeline && (
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => setSimple((s) => !s)}
                    className="jira-cols-btn inline-flex items-center gap-1.5" data-testid="jira-simple-toggle"
                    title={simple ? "Show full details" : "Show simple view"}>
              <SlidersHorizontal size={12} /> {simple ? "Details" : "Simple"}
            </button>
            {!simple && (
            <>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                   placeholder="Filter…" className="jira-filter-input" data-testid="jira-filter-input" />
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
            <div className="relative">
              <button type="button" onClick={() => setColMenu((v) => !v)}
                      className="jira-cols-btn inline-flex items-center gap-1.5" data-testid="jira-columns-btn" title="Configure columns">
                <SlidersHorizontal size={12} /> Columns
              </button>
              {colMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setColMenu(false)} />
                  <div className="absolute right-0 mt-1.5 z-40 rounded-xl p-1.5 min-w-[150px]"
                       style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.7)" }}
                       data-testid="jira-columns-menu">
                    {JIRA_OPT_COLS.map((c) => {
                      const on = visibleCols.includes(c.key);
                      return (
                        <button key={c.key} type="button" onClick={() => toggleCol(c.key)}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] transition-colors text-left"
                                style={{ color: "var(--text-2)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                data-testid={`jira-col-toggle-${c.key}`}>
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded"
                                style={{ background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1px solid var(--hairline-strong)", color: "#fff" }}>
                            {on && <Check size={11} />}
                          </span>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {/* Saved views — apply / save / delete filter+column combos (per category) */}
            <div className="relative">
              <button type="button" onClick={() => setViewsMenu((v) => !v)}
                      className="jira-cols-btn inline-flex items-center gap-1.5" data-testid="jira-views-btn" title="Saved views">
                <Bookmark size={12} /> Views
                {views.length > 0 && (
                  <span className="mono-tag text-[9px] px-1 rounded" style={{ background: "var(--surface-3)", color: "var(--text-3)" }}>{views.length}</span>
                )}
                <ChevronDown size={11} />
              </button>
              {viewsMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setViewsMenu(false)} />
                  <div className="absolute right-0 mt-1.5 z-40 rounded-xl p-1.5 min-w-[220px]"
                       style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.7)" }}
                       data-testid="jira-views-menu">
                    {views.length === 0 ? (
                      <p className="px-2.5 py-2 text-[11.5px]" style={{ color: "var(--text-3)" }} data-testid="jira-views-empty">
                        No saved views yet. Save your current filter + columns below.
                      </p>
                    ) : (
                      views.map((v) => (
                        <div key={v.name}
                             className="group w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px]"
                             style={{ color: "var(--text-2)" }}
                             onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                             onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                             data-testid={`jira-view-${v.name}`}>
                          <button type="button" onClick={() => applyView(v)}
                                  className="flex-1 text-left inline-flex items-center gap-2 min-w-0"
                                  data-testid={`jira-view-apply-${v.name}`}>
                            <Bookmark size={11} style={{ color: "var(--accent)", flexShrink: 0 }} />
                            <span className="truncate">{v.name}</span>
                          </button>
                          <button type="button" onClick={() => deleteView(v.name)}
                                  className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                                  style={{ color: "var(--danger)" }}
                                  title={`Delete “${v.name}”`}
                                  data-testid={`jira-view-delete-${v.name}`}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                    <div className="my-1" style={{ borderTop: "1px solid var(--hairline)" }} />
                    <button type="button" onClick={saveView}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] transition-colors text-left"
                            style={{ color: "var(--accent)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            data-testid="jira-view-save">
                      <BookmarkPlus size={12} /> Save current view
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Row density toggle — global across categories */}
            <div className="density-toggle" data-testid="jira-density-toggle">
              <button type="button" onClick={() => setDensity("comfortable")}
                      data-active={density === "comfortable" ? "true" : "false"}
                      title="Comfortable rows" data-testid="jira-density-comfortable">
                <Rows3 size={13} />
              </button>
              <button type="button" onClick={() => setDensity("compact")}
                      data-active={density === "compact" ? "true" : "false"}
                      title="Compact rows" data-testid="jira-density-compact">
                <AlignJustify size={13} />
              </button>
            </div>
            </>
            )}
          </div>
        )}
      </div>

      {!isTimeline && items.length > 0 && (() => {
        const need = items.filter((i) => i.status === "detected" || i.status === "review").length;
        return (
          <p className="text-[12.5px] mb-3 -mt-1" style={{ color: "var(--text-3)" }} data-testid="category-summary">
            {items.length} {items.length === 1 ? cat.label.toLowerCase().replace(/s$/, "") : cat.plural.toLowerCase()}
            {need > 0 ? ` · ${need} need${need === 1 ? "s" : ""} your review` : " · all confirmed"}.
          </p>
        );
      })()}

      {isTimeline ? (
        <TimelineCalendar items={items} cat={cat} onOpen={onOpen} />
      ) : items.length === 0 ? (
        <div className="rounded-xl p-10 text-center"
             style={{ background: "var(--surface)", border: "1px dashed var(--hairline-strong)" }}
             data-testid="project-memory-empty">
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
            No {cat.plural.toLowerCase()} yet.
          </p>
        </div>
      ) : simple ? (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--hairline)" }} data-testid="project-memory-items">
          {displayed.map((m) => {
            const st = STATUS_META[m.status] || STATUS_META.confirmed;
            return (
              <button key={m.id} type="button" onClick={() => onOpen(m)}
                      className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors"
                      style={{ borderBottom: "1px solid var(--hairline)", background: "transparent" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      data-testid={`memory-simple-row-${m.id}`}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.color || "var(--text-3)" }} />
                <span className="text-[13.5px] leading-relaxed" style={{ color: "var(--text)" }}>
                  {m.title || m.summary || m.content}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="jira-table rounded-xl overflow-hidden" data-density={density} data-testid="project-memory-items">
          <div className="jira-row jira-head" style={{ gridTemplateColumns: gridTemplate }}>
            <span></span>
            <SortHead col="summary" label="Summary" />
            {shownOpt.map((c) => <SortHead key={c.key} col={c.key} label={c.label} />)}
          </div>
          {displayed.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px]" style={{ color: "var(--text-3)" }} data-testid="jira-no-match">
              No items match “{query}”.
            </div>
          ) : (
            displayed.map((m) => <MemoryRow key={m.id} item={m} cat={cat} onOpen={onOpen} gridTemplate={gridTemplate} visibleCols={visibleCols} />)
          )}
        </div>
      )}
    </section>
  );
}

function MemoryRow({ item, cat, onOpen, gridTemplate, visibleCols }) {
  const status = STATUS_META[item.status] || STATUS_META.confirmed;
  return (
    <button type="button" onClick={() => onOpen(item)}
            className="jira-row jira-body group"
            style={{ gridTemplateColumns: gridTemplate }}
            data-testid={`project-memory-row-${item.id}`}>
      <span className="jira-key" aria-hidden="true">
        <cat.icon size={13} style={{ color: cat.color }} />
      </span>
      <span className="min-w-0 flex items-center gap-2">
        {item.is_scope_change && (
          <span title="Scope creep" className="shrink-0 inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--danger)" }} />
        )}
        <span className="block text-[13.5px] font-medium leading-snug truncate" style={{ color: "var(--text)" }}>{item.title}</span>
      </span>
      {visibleCols.includes("status") && (
        <span>
          <span className="jira-status-pill" style={{ color: status.color, background: status.bg, borderColor: `${status.color}33` }}>
            {status.label}
          </span>
        </span>
      )}
      {visibleCols.includes("source") && (
        <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
          <ProviderIcon provider={item.provider} size={11} />
          <span className="truncate">{item.source_label || item.provider}</span>
        </span>
      )}
      {visibleCols.includes("date") && (
        <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--text-3)" }}>
          {timeAgo(item.created_at)}
        </span>
      )}
    </button>
  );
}

/* ─── Timeline calendar — month/week views marking when events happened ── */
function TimelineCalendar({ items, cat, onOpen }) {
  const [mode, setMode] = useState("month");   // "month" | "week"
  const [offset, setOffset] = useState(0);      // months or weeks depending on mode
  const [selectedKey, setSelectedKey] = useState(null);
  const [hoverKey, setHoverKey] = useState(null);
  const base = new Date();

  const byDay = useMemo(() => {
    const map = {};
    (items || []).forEach((it) => {
      const d = new Date(it.created_at);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (map[key] = map[key] || []).push(it);
    });
    return map;
  }, [items]);

  const todayKey = `${base.getFullYear()}-${base.getMonth()}-${base.getDate()}`;

  // Build the visible day cells for the current view.
  let cells = [];
  let rangeLabel = "";
  if (mode === "month") {
    const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    rangeLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  } else {
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay() + offset * 7);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
    const end = new Date(start); end.setDate(start.getDate() + 6);
    rangeLabel = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }

  const keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  // Events shown in the side list: selected day, else everything in the view range.
  const rangeKeys = new Set(cells.filter(Boolean).map(keyOf));
  const listItems = useMemo(() => {
    let list = (items || []).filter((it) => { const d = new Date(it.created_at); return !isNaN(d); });
    if (selectedKey) list = list.filter((it) => keyOf(new Date(it.created_at)) === selectedKey);
    else list = list.filter((it) => rangeKeys.has(keyOf(new Date(it.created_at))));
    return list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedKey, mode, offset]);

  const clickDay = (d, dayItems) => {
    if (!dayItems.length) return;
    const k = keyOf(d);
    // Clicking a day swaps the side panel to show that day's events inline
    // (toggle off if it's already the selected day). Range list returns on clear.
    setSelectedKey((cur) => (cur === k ? null : k));
  };

  const selectedDateLabel = useMemo(() => {
    if (!selectedKey) return null;
    const [y, m, dd] = selectedKey.split("-").map(Number);
    return new Date(y, m, dd).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }, [selectedKey]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start" data-testid="timeline-calendar">
      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
        <div className="flex items-center justify-between mb-3 gap-2">
          <button type="button" onClick={() => setOffset((m) => m - 1)} className="cal-nav" data-testid="timeline-prev" aria-label="Previous">‹</button>
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }} data-testid="timeline-month-label">{rangeLabel}</p>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full p-0.5" style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }} data-testid="timeline-mode-toggle">
              {["month", "week"].map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setOffset(0); setSelectedKey(null); }}
                        className="mono-tag px-2.5 py-1 rounded-full text-[9px] transition-colors"
                        style={mode === m ? { background: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--text-3)", background: "transparent" }}
                        data-testid={`timeline-mode-${m}`}>{m.toUpperCase()}</button>
              ))}
            </div>
            <button type="button" onClick={() => setOffset((m) => m + 1)} className="cal-nav" data-testid="timeline-next" aria-label="Next">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <span key={i} className="mono-tag text-[8.5px] text-center py-1" style={{ color: "var(--text-3)" }}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <span key={`e${i}`} />;
            const key = keyOf(d);
            const dayItems = byDay[key] || [];
            const has = dayItems.length > 0;
            const isToday = key === todayKey;
            const isSel = key === selectedKey;
            return (
              <button key={key} type="button" disabled={!has}
                      onClick={() => clickDay(d, dayItems)}
                      onMouseEnter={() => has && setHoverKey(key)}
                      onMouseLeave={() => setHoverKey((k) => (k === key ? null : k))}
                      className={`cal-cell ${mode === "week" ? "cal-cell--week" : ""}`}
                      data-active={has ? "true" : "false"}
                      data-testid={`timeline-day-${d.getDate()}`}
                      style={isSel ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : isToday ? { borderColor: "var(--accent)" } : undefined}>
                <span className="text-[11.5px]" style={{ color: has ? "var(--text)" : "var(--text-3)" }}>{d.getDate()}</span>
                {has && (
                  <span className="cal-dots">
                    {dayItems.slice(0, 3).map((_, di) => <span key={di} className="cal-dot-multi" style={{ background: cat.color }} />)}
                  </span>
                )}
                {has && hoverKey === key && (
                  <span className="cal-popover" data-testid={`timeline-popover-${d.getDate()}`}>
                    <span className="block mono-tag text-[8.5px] mb-1.5" style={{ color: "var(--text-3)" }}>
                      {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {dayItems.length} EVENT{dayItems.length === 1 ? "" : "S"}
                    </span>
                    {dayItems.slice(0, 4).map((it) => (
                      <span key={it.id} className="flex items-start gap-1.5 py-0.5">
                        <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                        <span className="text-[11px] leading-snug truncate" style={{ color: "var(--text)" }}>{it.title}</span>
                      </span>
                    ))}
                    {dayItems.length > 4 && (
                      <span className="block text-[10px] mt-1" style={{ color: "var(--text-3)" }}>+{dayItems.length - 4} more</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events list — selected day panel, else the whole visible range */}
      <div data-testid="timeline-day-panel">
        <div className="flex items-center justify-between mb-2">
          <p className="mono-tag text-[9px]" style={{ color: selectedKey ? "var(--accent)" : "var(--text-3)" }}>
            {selectedKey ? selectedDateLabel.toUpperCase() : (mode === "month" ? "THIS MONTH" : "THIS WEEK")} · {listItems.length}
          </p>
          {selectedKey && (
            <button type="button" onClick={() => setSelectedKey(null)} className="mono-tag text-[9px] inline-flex items-center gap-1" style={{ color: "var(--text-3)" }} data-testid="timeline-clear-day">
              <RotateCcw size={9} /> BACK
            </button>
          )}
        </div>
        {listItems.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--hairline-strong)" }}>
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No timeline events here.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {listItems.map((it) => {
              const d = new Date(it.created_at);
              return (
                <li key={it.id}>
                  <button type="button" onClick={() => onOpen(it)}
                          className="w-full text-left rounded-lg px-3 py-2.5 transition-colors"
                          style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--hairline-hover)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--hairline)"; }}
                          data-testid={`timeline-event-${it.id}`}>
                    <span className="mono-tag text-[9px] block mb-1" style={{ color: cat.color }}>
                      {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <p className="text-[12.5px] font-medium leading-snug" style={{ color: "var(--text)" }}>{it.title}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ─── Connected sources (compact) ─────────────────────────── */
function ConnectedSourcesCompact({ projectId, connections, onChanged }) {
  const dialog = useDialog();
  const [busy, setBusy] = useState(null);
  const [connecting, setConnecting] = useState(null);   // provider key while OAuth in flight
  const [picker, setPicker] = useState(null);           // { provider, sources }
  const [attaching, setAttaching] = useState(false);
  const [selected, setSelected] = useState([]);         // selected source ids
  const [sourceStatus, setSourceStatus] = useState({}); // { id: 'attaching'|'done'|'error' }
  const [pickerQuery, setPickerQuery] = useState("");   // source search box
  const [pickerLoading, setPickerLoading] = useState(false);
  const pendingRef = useRef(null);
  const popupRef = useRef(null);

  // OAuth completion — the callback posts "bracket-oauth:{key}:{ok|error}".
  useEffect(() => {
    const onMsg = async (e) => {
      if (typeof e.data !== "string" || !e.data.startsWith("bracket-oauth:")) return;
      const [, key, status] = e.data.split(":");
      if (key !== pendingRef.current) return;
      pendingRef.current = null;
      try { popupRef.current?.close?.(); } catch { /* ignore */ }
      if (status !== "ok") { setConnecting(null); toast.error("Connection cancelled."); return; }
      try {
        const { data } = await api.get(`/connect/${key}/sources`);
        const sources = data?.sources || data || [];
        if (!Array.isArray(sources) || sources.length === 0) {
          toast.info("Connected, but no sources were found to attach.");
          onChanged?.();
        } else {
          setPicker({ provider: key, sources });
          setSelected(sources.length === 1 ? [sources[0].id] : []);
          setSourceStatus({});
        }
      } catch (err) { toast.error(formatApiError(err)); }
      finally { setConnecting(null); }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onChanged]);

  // Single-click connect — opens the OAuth popup synchronously (user gesture,
  // popup-blocker safe), then points it at the provider login. Never leaves the page.
  const quickConnect = async (providerKey) => {
    if (connecting) return;
    const popup = window.open("about:blank", "bracket-oauth", "width=560,height=680");
    if (popup) {
      try {
        popup.document.write('<!doctype html><meta charset="utf-8"><title>Connecting…</title><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#191919;color:#8a8f98;font-family:system-ui,sans-serif;font-size:14px">Opening secure sign-in…</body>');
      } catch { /* ignore */ }
    }
    popupRef.current = popup;
    setConnecting(providerKey);
    pendingRef.current = providerKey;
    try {
      const { data } = await api.get(`/connect/${providerKey}/auth-url`);
      if (popup) popup.location = data.url; else window.open(data.url, "_blank");
    } catch (e) {
      try { popup?.close?.(); } catch { /* ignore */ }
      setConnecting(null);
      pendingRef.current = null;
      toast.error(formatApiError(e));
    }
  };

  // Open the source list for a provider. If the account is already linked we
  // list their chats/files/emails straight away (with search) — no re-auth.
  // Only if the account isn't connected yet do we kick off OAuth.
  const openSourcePicker = async (providerKey) => {
    if (connecting) return;
    setConnecting(providerKey);
    try {
      const { data } = await api.get(`/connect/${providerKey}/sources`);
      const sources = data?.sources || [];
      setPicker({ provider: providerKey, sources });
      setPickerQuery("");
      setSelected([]);
      setSourceStatus({});
      setConnecting(null);
    } catch (e) {
      if (e?.response?.status === 400) {
        // Account not linked yet — connect it (OAuth), then the list opens.
        quickConnect(providerKey);
      } else {
        setConnecting(null);
        toast.error(formatApiError(e));
      }
    }
  };

  // Re-query the source list as the user types in the picker search box.
  useEffect(() => {
    if (!picker) return;
    const prov = picker.provider;
    const t = setTimeout(async () => {
      setPickerLoading(true);
      try {
        const { data } = await api.get(`/connect/${prov}/sources`, { params: { q: pickerQuery } });
        setPicker((cur) => (cur && cur.provider === prov ? { ...cur, sources: data?.sources || [] } : cur));
      } catch { /* keep previous list */ }
      finally { setPickerLoading(false); }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerQuery]);

  // Attach the selected sources to THIS project (preview -> establish), one by
  // one, updating per-source sync status as they land.
  const attachSelected = async () => {
    if (!picker || selected.length === 0) return;
    setAttaching(true);
    const chosen = picker.sources.filter((s) => selected.includes(s.id));
    let anyOk = false;
    for (const src of chosen) {
      setSourceStatus((st) => ({ ...st, [src.id]: "attaching" }));
      try {
        const { data: prev } = await api.post("/connect/preview", {
          provider: picker.provider,
          sources: [{ id: src.id, name: src.name, url: src.url || "" }],
        });
        await api.post("/connect/establish", { preview_id: prev.preview_id, mode: "existing", project_id: projectId });
        setSourceStatus((st) => ({ ...st, [src.id]: "done" }));
        anyOk = true;
      } catch (e) {
        setSourceStatus((st) => ({ ...st, [src.id]: "error" }));
      }
    }
    setAttaching(false);
    if (anyOk) {
      toast.success(`${chosen.length === 1 ? "Source" : `${chosen.length} sources`} connected`);
      onChanged?.();
      setTimeout(() => setPicker(null), 700);
    } else {
      toast.error("Couldn't attach the selected sources.");
    }
  };

  const toggleSelect = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const disconnect = async (conn) => {
    const ok = await dialog.confirm({
      title: `Disconnect ${conn.source_name}?`,
      message: "Bracket will stop syncing this source. Memory items already extracted stay. You can reconnect anytime.",
      confirmLabel: "Disconnect",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(conn.id);
    try {
      await api.delete(`/connect/connections/${conn.id}`);
      toast.success(`${conn.source_name} disconnected`);
      onChanged?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };

  const conns = connections || [];
  return (
    <div data-testid="project-memory-sources">
      <p className="mono-tag text-[9.5px] mb-3" style={{ color: "var(--text-3)" }}>CONNECTED SOURCES</p>
      {conns.length === 0 ? (
        <Link to={`/app/connect?project=${projectId}`}
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
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg"
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
                <button
                  type="button"
                  onClick={() => disconnect(c)}
                  disabled={busy === c.id}
                  title="Disconnect this source"
                  className="disconnect-btn shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10.5px] font-medium transition-colors"
                  data-testid={`project-memory-source-disconnect-${c.id}`}
                >
                  {busy === c.id ? <Loader2 size={11} className="animate-spin" /> : <Unplug size={11} />}
                  <span>Disconnect</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {/* Add a source — only providers NOT already attached to this project.
          Opens the source list (search); connects the account only if needed. */}
      {(() => {
        const addable = ["gmail", "slack", "figma", "github"];
        if (addable.length === 0) return null;
        return (
          <div className="mt-3">
            <p className="mono-tag text-[8.5px] mb-1.5" style={{ color: "var(--text-3)" }}>ADD A SOURCE</p>
            <div className="flex flex-wrap gap-1.5" data-testid="project-memory-quick-connect">
              {addable.map((p) => {
                const meta = PROVIDER_META[p] || {};
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => openSourcePicker(p)}
                    disabled={!!connecting}
                    className="quick-connect-chip inline-flex items-center gap-1.5 disabled:opacity-45"
                    title={`Add a source from ${meta.label || p}`}
                    data-testid={`project-memory-quick-connect-${p}`}
                  >
                    {connecting === p ? <Loader2 size={13} className="animate-spin" /> : <ProviderIcon provider={p} size={14} bare />}
                    {meta.label || p}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
      <Link to={`/app/connect?project=${projectId}`} className="text-[11px] mt-3 inline-flex items-center gap-1"
            style={{ color: "var(--accent)" }} data-testid="project-memory-sources-manage">
        Manage connections <ExternalLink size={10} />
      </Link>

      {/* Inline source picker — shown after OAuth so connecting never leaves the page. */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: "rgba(0,0,0,0.6)" }}
             onClick={() => !attaching && setPicker(null)}
             data-testid="inline-connect-picker">
          <div className="w-full max-w-[440px] rounded-2xl overflow-hidden"
               style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "0 40px 120px -30px rgba(0,0,0,0.8)" }}
               onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--hairline)" }}>
              <ProviderIcon provider={picker.provider} size={13} />
              <p className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                Attach {PROVIDER_META[picker.provider]?.label || picker.provider} sources
              </p>
              <span className="ml-auto mono-tag text-[9px]" style={{ color: "var(--text-3)" }}>{selected.length} SELECTED</span>
            </div>
            {/* Search box — filter the list of chats / files / emails */}
            <div className="px-4 pt-3 pb-1">
              <div className="ask-input-box flex items-center gap-2 px-2.5" style={{ height: 34 }}>
                <Search size={13} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                <input
                  type="text"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder={`Search your ${PROVIDER_META[picker.provider]?.label || picker.provider}…`}
                  className="flex-1 bg-transparent outline-none text-[12.5px]"
                  style={{ color: "var(--text)" }}
                  data-testid="inline-connect-search"
                  autoFocus
                />
                {pickerLoading && <Loader2 size={12} className="animate-spin" style={{ color: "var(--accent)" }} />}
              </div>
            </div>
            {(() => {
              const attachedIds = new Set(conns.filter((c) => c.provider === picker.provider).map((c) => c.source_id));
              const available = (picker.sources || []).filter((s) => !attachedIds.has(s.id));
              if (available.length === 0) {
                return (
                  <div className="px-5 py-8 text-center text-[12.5px]" style={{ color: "var(--text-3)" }} data-testid="inline-connect-empty">
                    {pickerLoading ? "Searching…" : (pickerQuery ? "No matches — try another search." : "Everything here is already attached.")}
                  </div>
                );
              }
              return (
                <ul className="max-h-[320px] overflow-y-auto p-2">
                  {available.map((s) => {
                    const on = selected.includes(s.id);
                    const st = sourceStatus[s.id];
                    return (
                      <li key={s.id}>
                        <button type="button" onClick={() => !attaching && toggleSelect(s.id)} disabled={attaching}
                                className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors disabled:opacity-70"
                                onMouseEnter={(e) => { if (!attaching) e.currentTarget.style.background = "var(--surface-2)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                data-testid={`inline-connect-source-${s.id}`}>
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded shrink-0"
                                style={{ background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1px solid var(--hairline-strong)", color: "#fff" }}>
                            {on && <Check size={11} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="font-medium truncate block text-[13px]" style={{ color: "var(--text)" }}>{s.name}</span>
                            {(s.subtitle || s.meta?.detail) && <span className="text-[11px] truncate block" style={{ color: "var(--text-3)" }}>{s.subtitle || s.meta?.detail}</span>}
                          </span>
                          {st === "attaching" && <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "var(--accent)" }} data-testid={`inline-connect-status-${s.id}`} />}
                          {st === "done" && <Check size={13} className="shrink-0" style={{ color: "var(--success, #22C55E)" }} data-testid={`inline-connect-status-${s.id}`} />}
                          {st === "error" && <AlertTriangle size={12} className="shrink-0" style={{ color: "var(--danger)" }} data-testid={`inline-connect-status-${s.id}`} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
            <div className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--hairline)" }}>
              <button type="button" onClick={() => !attaching && setPicker(null)}
                      className="text-[12px]" style={{ color: "var(--text-2)" }}
                      data-testid="inline-connect-cancel">Cancel</button>
              <button type="button" onClick={attachSelected} disabled={attaching || selected.length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium disabled:opacity-40"
                      style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                      data-testid="inline-connect-attach">
                {attaching ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
                {attaching ? "Attaching…" : `Attach ${selected.length || ""}`.trim()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
