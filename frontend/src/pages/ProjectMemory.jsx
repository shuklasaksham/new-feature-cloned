import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, ExternalLink, AlertTriangle,
  Sparkles, History, Copy, Mail, Slack, Pencil, RefreshCw,
  Check, RotateCcw, Send, User, Trash2, Plug,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import Seo from "../components/Seo";
import ChangeActionDrawer from "../components/ChangeActionDrawer";
import HistoryDrawer from "../components/HistoryDrawer";
import { useDialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
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
                connections={connections || []}
                onConnectionsChanged={() => load({ silent: true })}
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

/* ─── Overview view — chat-style reply + category snapshot ── */
function OverviewView({ project, projectId, counts, detectedCount, connections, onConnectionsChanged, onJumpTo }) {
  const noSources = connections.length === 0;

  // Empty state — no connected sources yet. Uses the shared illustrated
  // EmptyState so it matches Dashboard / Activity exactly.
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
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
      <div className="min-w-0 flex flex-col gap-6">
        <SuggestedReplyChat projectId={projectId} />

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

function SuggestedReplyChat({ projectId }) {
  // Each turn: { role: 'user'|'assistant', content: string, meta?: {...} }
  const [thread, setThread] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [editingIdx, setEditingIdx] = useState(-1);
  const [editingDraft, setEditingDraft] = useState("");
  const bottomRef = useRef(null);
  const editRef = useRef(null);

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

  const encodedForLink = (t) => encodeURIComponent(t || "");
  const gmailLink = (t) => `https://mail.google.com/mail/?view=cm&fs=1&su=Re:%20your%20project&body=${encodedForLink(t)}`;
  const mailtoLink = (t) => `mailto:?subject=Re:%20your%20project&body=${encodedForLink(t)}`;

  return (
    <section
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
      data-testid="suggested-reply-chat"
    >
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={13} style={{ color: "var(--accent)" }} />
          <p className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>ASK BRACKET</p>
          <span className="text-[10.5px] truncate" style={{ color: "var(--text-3)" }}>
            · on-demand replies grounded in this project
          </span>
        </div>
        {thread.length > 0 && (
          <button type="button" onClick={() => { setThread([]); setPrompt(""); }}
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                  data-testid="suggested-reply-clear">
            <RotateCcw size={10} /> New thread
          </button>
        )}
      </div>

      {/* Thread body */}
      <div className="px-5 py-5 flex flex-col gap-4 max-h-[520px] overflow-y-auto" data-testid="suggested-reply-thread">
        {thread.length === 0 && (
          <div data-testid="suggested-reply-empty">
            <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text)" }}>
              Tell Bracket what you want to do — draft a reply, ask for missing details, or push back on scope.
              You&apos;ll get a grounded response using this project&apos;s memory.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5" data-testid="suggested-reply-quick-prompts">
              {REPLY_QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => send(qp)}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 text-[11.5px] px-3 py-1.5 rounded-full disabled:opacity-40"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                >
                  <Sparkles size={10} /> {qp}
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
            gmailLink={gmailLink}
            mailtoLink={mailtoLink}
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
      <div className="px-5 py-3" style={{ borderTop: "1px solid var(--hairline)" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); send(prompt); }}
          className="flex items-end gap-2"
          data-testid="suggested-reply-form"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(prompt); }
            }}
            placeholder={thread.length === 0
              ? "Tell Bracket what you want to do…"
              : "Refine the reply, or ask for a different angle…"}
            rows={2}
            className="flex-1 resize-none bg-transparent outline-none text-[13.5px] leading-relaxed"
            style={{ color: "var(--text)" }}
            data-testid="suggested-reply-input"
          />
          <button
            type="submit"
            disabled={sending || !prompt.trim()}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium disabled:opacity-40"
            style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
            data-testid="suggested-reply-send"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {thread.length === 0 ? "Generate" : "Send"}
          </button>
        </form>
        <p className="mt-2 text-[10.5px]" style={{ color: "var(--text-3)" }}>
          Shift + Enter for a newline. Bracket never sends autonomously — you review, edit and send.
        </p>
      </div>
    </section>
  );
}

function ChatTurn({
  idx, turn, editing, editingDraft, editRef,
  onEdit, onEditChange, onEditSave, onEditCancel,
  onCopy, copied, onRegenerate, gmailLink, mailtoLink,
}) {
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
  const gmailWeb = turn.meta?.deep_links?.gmail_web || gmailLink(turn.content);
  const mailto = turn.meta?.deep_links?.mailto || mailtoLink(turn.content);
  const slackWeb = turn.meta?.deep_links?.slack_web || "slack://open";

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
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => onCopy(turn.content)}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                        style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }}
                        data-testid={`chat-turn-copy-${idx}`}>
                  {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                </button>
                <button type="button" onClick={onEdit}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                        data-testid={`chat-turn-edit-${idx}`}>
                  <Pencil size={10} /> Edit
                </button>
                <button type="button" onClick={onRegenerate}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                        data-testid={`chat-turn-regenerate-${idx}`}>
                  <RefreshCw size={10} /> Regenerate
                </button>
                <a href={gmailWeb} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                   style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                   data-testid={`chat-turn-gmail-${idx}`}>
                  <Mail size={10} /> Gmail
                </a>
                <a href={mailto}
                   className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                   style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                   data-testid={`chat-turn-mailto-${idx}`}>
                  <Mail size={10} /> Mail
                </a>
                <a href={slackWeb}
                   className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                   style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)" }}
                   data-testid={`chat-turn-slack-${idx}`}>
                  <Slack size={10} /> Slack
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
        <div className="rounded-xl p-10 text-center"
             style={{ background: "var(--surface)", border: "1px dashed var(--hairline-strong)" }}
             data-testid="project-memory-empty">
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
            No {cat.plural.toLowerCase()} yet.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col rounded-xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
            data-testid="project-memory-items">
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
              className="memory-ledger-row group w-full text-left flex items-start gap-3.5 px-5 py-3.5"
              data-testid={`project-memory-row-${item.id}`}>
        <cat.icon size={14} style={{ color: cat.color, marginTop: 2, flexShrink: 0 }} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium leading-snug" style={{ color: "var(--text)" }}>{item.title}</p>
          {item.detail && (
            <p className="mt-0.5 text-[12px] leading-snug line-clamp-1" style={{ color: "var(--text-2)" }}>{item.detail}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="mono-tag text-[9px]" style={{ color: status.color }}>
              {status.label}
            </span>
            {item.is_scope_change && (
              <span className="mono-tag text-[9px] inline-flex items-center gap-0.5" style={{ color: "var(--danger)" }}>
                <AlertTriangle size={9} /> SCOPE CREEP
              </span>
            )}
            <span className="text-[10.5px] inline-flex items-center gap-1" style={{ color: "var(--text-3)" }}>
              <ProviderIcon provider={item.provider} size={10} className="align-middle" />
              {item.source_label} · {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
        {isChange && (
          <span className="shrink-0 mono-tag text-[9px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--accent)" }}>REVIEW →</span>
        )}
      </button>
    </li>
  );
}

/* ─── Connected sources (compact) ─────────────────────────── */
function ConnectedSourcesCompact({ projectId, connections, onChanged }) {
  const dialog = useDialog();
  const [busy, setBusy] = useState(null);

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
                  title="Disconnect"
                  className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-3)" }}
                  data-testid={`project-memory-source-disconnect-${c.id}`}
                >
                  {busy === c.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Link to={`/app/connect?project=${projectId}`} className="text-[11px] mt-2 inline-flex items-center gap-1"
            style={{ color: "var(--accent)" }} data-testid="project-memory-sources-manage">
        Manage connections <ExternalLink size={10} />
      </Link>
    </div>
  );
}
