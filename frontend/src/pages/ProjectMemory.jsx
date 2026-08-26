import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, ExternalLink, AlertTriangle,
  Sparkles, History, Copy, Mail, Slack, Pencil, RefreshCw,
  Check, RotateCcw, Send, User, Unplug, Plug, SlidersHorizontal,
  Rows3, AlignJustify, Bookmark, BookmarkPlus, Trash2, ChevronDown, Search,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import Seo from "../components/Seo";
import ChangeActionDrawer from "../components/ChangeActionDrawer";
import HistoryDrawer from "../components/HistoryDrawer";
import { useDialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
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

  // Flattened, newest-first list across all categories — powers the Overview
  // "recent activity" rail (the category snapshot grid is gone, we have tabs).
  const recentItems = useMemo(() => {
    const all = [];
    MEMORY_CATEGORIES.forEach((cat) => {
      (memory.grouped?.[cat.key] || []).forEach((m) => all.push({ ...m, _catKey: cat.key }));
    });
    all.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return all.slice(0, 8);
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
                          style={{ background: "var(--primary-bg)", color: "var(--primary-fg)", boxShadow: "0 8px 20px -8px rgba(129, 132, 196,0.5)" }}
                          data-testid="project-memory-review-cta">
                    <Sparkles size={12} /> Review changes
                  </button>
                )}
              </div>
            </motion.section>

            {/* Horizontal pill tabs — Overview + 6 categories */}
            <nav
              className="memory-tabs mb-8 overflow-x-auto no-scrollbar"
              data-testid="project-memory-pills"
              role="tablist"
              aria-label="Memory categories"
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
                recentItems={recentItems}
                connections={connections || []}
                onConnectionsChanged={() => load({ silent: true })}
                onJumpTo={(cat) => { setView(cat); setStatusFilter("all"); }}
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
            background: active ? "var(--accent-soft, rgba(129, 132, 196,0.14))" : "var(--surface-2)",
            color: active ? "var(--accent)" : "var(--text-3)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Overview — recent activity (left) + subtle Ask Bracket & sources (right) ── */
function OverviewView({ project, projectId, recentItems, connections, onConnectionsChanged, onJumpTo }) {
  const noSources = connections.length === 0;

  if (noSources) {
    return (
      <EmptyState
        icon={Plug}
        title="Your project memory is waiting"
        description="Connect Gmail, Slack, Figma or GitHub and Bracket starts extracting deliverables, scope, timelines, requirements, decisions and deadlines from your client conversations."
        cta="Connect your first tool"
        ctaTo={`/app/connect?project=${projectId}`}
        footnote="GMAIL · SLACK · FIGMA · GITHUB"
        testid="overview-empty-state"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      {/* Left — recent activity feed for this project */}
      <section className="min-w-0" data-testid="overview-recent">
        <div className="flex items-center justify-between mb-3">
          <p className="mono-tag text-[9.5px]" style={{ color: "var(--text-3)" }}>RECENT ACTIVITY</p>
          <span className="mono-tag text-[9px]" style={{ color: "var(--text-3)" }}>{recentItems.length} latest</span>
        </div>
        {recentItems.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "var(--surface)", border: "1px dashed var(--hairline-strong)" }}>
            <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Bracket is reading your connected work. New items will appear here.</p>
          </div>
        ) : (
          <ul className="flex flex-col rounded-xl overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
              data-testid="overview-recent-items">
            {recentItems.map((m) => {
              const c = CATEGORY_BY_KEY[m._catKey] || CATEGORY_BY_KEY.decision;
              return (
                <li key={m.id}>
                  <button type="button" onClick={() => onJumpTo(m._catKey)}
                          className="memory-ledger-row w-full text-left flex items-start gap-3 px-4 py-3"
                          data-testid={`overview-recent-${m.id}`}>
                    <c.icon size={13} style={{ color: c.color, marginTop: 2, flexShrink: 0 }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug truncate" style={{ color: "var(--text)" }}>{m.title}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="mono-tag text-[8.5px]" style={{ color: c.color }}>{c.label.toUpperCase()}</span>
                        {m.is_scope_change && (
                          <span className="mono-tag text-[8.5px] inline-flex items-center gap-0.5" style={{ color: "var(--danger)" }}><AlertTriangle size={8} /> SCOPE</span>
                        )}
                        <span className="text-[10px] inline-flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                          <ProviderIcon provider={m.provider} size={9} /> {timeAgo(m.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Right — subtle Ask Bracket + connected sources */}
      <aside className="min-w-0 flex flex-col gap-5 lg:sticky lg:top-24">
        <SuggestedReplyChat projectId={projectId} clientName={project?.client_name} connections={connections} />
        <ConnectedSourcesCompact
          projectId={projectId}
          connections={connections}
          onChanged={onConnectionsChanged}
        />
      </aside>
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
      className="rounded-xl overflow-hidden flex flex-col"
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
      <div className="px-4 py-4 flex flex-col gap-4 max-h-[440px] overflow-y-auto" data-testid="suggested-reply-thread">
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
  // Channel-aware send: a modal (matching the connect-source modal) opens for
  // the chosen channel. Gmail pre-populates the client's email.
  const [sendChannel, setSendChannel] = useState(null); // the selected target
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(clientName ? `Re: ${clientName}` : "Re: your project");
  const [sending, setSending] = useState(false);

  const openSend = (target) => {
    setSendChannel(target);
    if (target.provider === "gmail") setTo(target.to || "");
  };
  const closeSend = () => { if (!sending) setSendChannel(null); };

  const doSend = async () => {
    if (sending || !sendChannel) return;
    setSending(true);
    try {
      if (sendChannel.provider === "gmail") {
        if (!to.trim()) { toast.error("Enter the client's email address to send."); setSending(false); return; }
        await api.post(`/projects/${projectId}/send-email`, { to: to.trim(), subject: subject.trim(), body: turn.content });
        toast.success(`Email sent to ${to.trim()}`);
      } else if (sendChannel.provider === "slack") {
        await api.post(`/projects/${projectId}/send-slack`, { channel_id: sendChannel.channel_id, body: turn.content });
        toast.success(`Posted to ${sendChannel.channel_name || "Slack"}`);
      }
      setSendChannel(null);
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
                  {/* One send CTA per connected channel */}
                  {(sendTargets || []).map((tg) => (
                    <button key={tg.provider + (tg.channel_id || "")} type="button" onClick={() => openSend(tg)}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md font-medium"
                            style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                            data-testid={`chat-turn-send-${tg.provider}-${idx}`}>
                      {tg.provider === "slack" ? <Slack size={10} /> : <Mail size={10} />} {tg.label}
                    </button>
                  ))}
                </div>

                {sendChannel && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                       style={{ background: "rgba(0,0,0,0.6)" }}
                       onClick={closeSend}
                       data-testid={`chat-turn-send-modal-${idx}`}>
                    <div className="w-full max-w-[440px] rounded-2xl overflow-hidden"
                         style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "0 40px 120px -30px rgba(0,0,0,0.8)" }}
                         onClick={(e) => e.stopPropagation()}>
                      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--hairline)" }}>
                        <ProviderIcon provider={sendChannel.provider} size={13} />
                        <p className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                          {sendChannel.provider === "slack"
                            ? `Post to ${sendChannel.channel_name || "Slack"}`
                            : "Send email to your client"}
                        </p>
                      </div>
                      <div className="px-5 py-4 flex flex-col gap-3">
                        {sendChannel.provider === "gmail" && (
                          <>
                            <div>
                              <label className="mono-tag text-[9px] block mb-1" style={{ color: "var(--text-3)" }}>TO</label>
                              <input type="email" value={to} onChange={(e) => setTo(e.target.value)}
                                     placeholder="client@company.com" className="jira-filter-input" style={{ width: "100%" }}
                                     data-testid={`chat-turn-send-to-${idx}`} />
                            </div>
                            <div>
                              <label className="mono-tag text-[9px] block mb-1" style={{ color: "var(--text-3)" }}>SUBJECT</label>
                              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                                     placeholder="Subject" className="jira-filter-input" style={{ width: "100%" }}
                                     data-testid={`chat-turn-send-subject-${idx}`} />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="mono-tag text-[9px] block mb-1" style={{ color: "var(--text-3)" }}>MESSAGE</label>
                          <div className="text-[12.5px] leading-relaxed rounded-lg p-3 max-h-[180px] overflow-y-auto whitespace-pre-wrap"
                               style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}>
                            {turn.content}
                          </div>
                        </div>
                      </div>
                      <div className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--hairline)" }}>
                        <button type="button" onClick={closeSend} className="text-[12px]" style={{ color: "var(--text-2)" }}
                                data-testid={`chat-turn-send-cancel-${idx}`}>Cancel</button>
                        <button type="button" onClick={doSend} disabled={sending || (sendChannel.provider === "gmail" && !to.trim())}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium disabled:opacity-40"
                                style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                                data-testid={`chat-turn-send-confirm-${idx}`}>
                          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          {sending
                            ? "Sending…"
                            : (sendChannel.provider === "slack" ? "Post to Slack" : "Send from Gmail")}
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
          </div>
        )}
      </div>

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
        const attachedProviders = new Set(conns.map((c) => c.provider));
        const addable = ["gmail", "slack", "github"].filter((p) => !attachedProviders.has(p));
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
