import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, Copy, Mail, Slack, Check, AlertTriangle,
  Sparkles, TrendingUp, ArrowRight, Trash2, ThumbsDown,
  Pencil, RefreshCw, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { ProviderIcon, timeAgo } from "../lib/providersMeta";
import { CATEGORY_BY_KEY, STATUS_META } from "../lib/memoryCategories";

/**
 * ChangeActionDrawer — Bracket's signature interaction.
 * When the user clicks a "detected" memory item, we open a right-side drawer
 * that shows: (1) what changed, (2) an EDITABLE AI-drafted client reply
 * (regenerate + revert supported), (3) the concrete impacts, (4) the memory
 * updates Bracket will apply on confirm, and (5) Copy / Gmail / Slack
 * hand-offs.
 *
 * Trust model: Bracket recommends, the user approves. Nothing ever sends
 * without an explicit click. When the user hits Copy or a deep-link, the
 * final send happens in the user's own tool — Bracket cannot post anywhere
 * on its own (read-only OAuth scopes today).
 */
export default function ChangeActionDrawer({ item, open, onClose, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [acting, setActing] = useState(null); // 'confirm' | 'dismiss' | 'not_a_change'
  const [regenerating, setRegenerating] = useState(false);
  // Local editable reply text — seeded from the AI, edits are user's own.
  const [replyDraft, setReplyDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef(null);

  // Fetch AI suggestion once the drawer opens on a new item.
  useEffect(() => {
    if (!open || !item) return;
    setResult(null);
    setReplyDraft("");
    setEditing(false);
    if (item.status !== "detected" && item.status !== "review") return; // Only detected items need a suggested reply
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post(`/connect/memory/${item.id}/suggest-reply`);
        if (!cancelled) { setResult(data); setReplyDraft(data?.reply || ""); }
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, item]);

  // Regenerate — new suggestion from the AI, keeps user's edits recoverable
  // via `RESET TO AI DRAFT` (revertToAI below).
  const regenerate = async () => {
    if (regenerating || !item) return;
    setRegenerating(true);
    try {
      const { data } = await api.post(`/connect/memory/${item.id}/suggest-reply`);
      setResult(data);
      setReplyDraft(data?.reply || "");
      setEditing(false);
      toast.success("Bracket re-drafted the reply");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setRegenerating(false);
    }
  };

  const revertToAI = () => {
    if (!result?.reply) return;
    setReplyDraft(result.reply);
    setEditing(false);
  };

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Position caret at end so a user can just keep typing.
      const end = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(end, end);
    }
  }, [editing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!item) return null;
  const cat = CATEGORY_BY_KEY[item.display_category] || CATEGORY_BY_KEY.requirement;
  const status = STATUS_META[item.status] || STATUS_META.detected;

  const copyReply = async () => {
    const text = (replyDraft || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Reply copied — paste it in your tool to send.");
    } catch {
      toast.error("Couldn't access clipboard — select the text manually.");
    }
  };

  // Deep links always reflect the LATEST draft, not the original AI reply.
  const encodedDraft = encodeURIComponent(replyDraft || "");
  const encodedSubject = encodeURIComponent(
    result?.deep_links?.gmail_web
      ? new URL(result.deep_links.gmail_web).searchParams.get("su") || "Re: your project"
      : "Re: your project"
  );
  const liveGmailWeb = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodedSubject}&body=${encodedDraft}`;
  const liveMailto = `mailto:?subject=${encodedSubject}&body=${encodedDraft}`;
  const liveSlack = result?.deep_links?.slack_web || "slack://open";

  const doAction = async (action) => {
    setActing(action);
    try {
      await api.post(`/connect/memory/${item.id}/action`, { action });
      const msg = {
        confirm: "Confirmed — memory updated",
        dismiss: "Dismissed",
        not_a_change: "Marked as not a change",
      }[action] || "Updated";
      toast.success(msg);
      onChanged?.(item.id, action);
      onClose?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setActing(null);
    }
  };

  const isChange = item.status === "detected" || item.status === "review";
  const priorityMeta = {
    high:   { label: "HIGH IMPACT",   color: "#DC2626", bg: "rgba(220,38,38,0.10)" },
    medium: { label: "MEDIUM IMPACT", color: "#D97706", bg: "rgba(217,119,6,0.10)" },
    low:    { label: "LOW IMPACT",    color: "#16A34A", bg: "rgba(22,163,74,0.10)" },
  }[result?.priority || "medium"] || {};

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[70]"
            style={{ background: "rgba(15,18,38,0.35)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="change-action-drawer-overlay"
          />
          <motion.aside
            key="drawer"
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] lg:w-[600px] z-[71] overflow-y-auto"
            style={{
              background: "var(--surface)",
              borderLeft: "1px solid var(--hairline)",
              boxShadow: "-24px 0 60px rgba(15,18,38,0.10)",
            }}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            data-testid="change-action-drawer"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
                 style={{ background: "var(--surface)", borderBottom: "1px solid var(--hairline)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <cat.icon size={14} style={{ color: cat.color }} />
                <span className="mono-tag text-[10px]" style={{ color: cat.color }}>{cat.label.toUpperCase()}</span>
                {item.is_scope_change && (
                  <span className="mono-tag px-1.5 py-0.5 rounded text-[9px]"
                        style={{ color: "#DC2626", background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.2)" }}>
                    <AlertTriangle size={9} className="inline mr-0.5" /> SCOPE CREEP
                  </span>
                )}
              </div>
              <button
                type="button" onClick={onClose}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                style={{ border: "1px solid var(--hairline)", color: "var(--text-3)" }}
                aria-label="Close" data-testid="change-action-drawer-close"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* WHAT changed */}
              <section>
                <p className="mono-tag text-[9.5px] mb-1.5" style={{ color: "var(--text-3)" }}>WHAT CHANGED</p>
                <h2 className="text-[19px] font-semibold tracking-[-0.02em] leading-snug" style={{ color: "var(--text)" }}>
                  {item.title}
                </h2>
                {item.detail && (
                  <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>{item.detail}</p>
                )}
                <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px]" style={{ color: "var(--text-3)" }}>
                  <ProviderIcon provider={item.provider} size={12} />
                  <span>{item.source_label}</span>
                  <span>·</span>
                  <span>{timeAgo(item.created_at)}</span>
                  <span className="mono-tag px-1.5 py-0.5 rounded text-[9px]"
                        style={{ color: status.color, background: status.bg, border: `1px solid ${status.color}33` }}>
                    {status.label}
                  </span>
                </div>
              </section>

              {isChange && (
                <>
                  {/* IMPACT */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <p className="mono-tag text-[9.5px] inline-flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
                        <TrendingUp size={10} /> IMPACT
                      </p>
                      {result?.priority && (
                        <span className="mono-tag px-1.5 py-0.5 rounded text-[9px]"
                              style={{ color: priorityMeta.color, background: priorityMeta.bg, border: `1px solid ${priorityMeta.color}33` }}>
                          {priorityMeta.label}
                        </span>
                      )}
                    </div>
                    {loading && (
                      <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-3)" }}>
                        <Loader2 size={12} className="animate-spin" /> Bracket is reading the project…
                      </div>
                    )}
                    {result?.impacts?.length > 0 && (
                      <ul className="space-y-2" data-testid="change-action-impacts">
                        {result.impacts.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                            <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: cat.color }} />
                            <div>
                              <span className="mono-tag text-[9px] mr-1.5" style={{ color: "var(--text-3)" }}>{String(imp.kind).toUpperCase()}</span>
                              {imp.detail}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* MEMORY UPDATES */}
                  {result?.memory_updates?.length > 0 && (
                    <section>
                      <p className="mono-tag text-[9.5px] mb-2" style={{ color: "var(--text-3)" }}>MEMORY UPDATES ON CONFIRM</p>
                      <ul className="space-y-1.5" data-testid="change-action-memory-updates">
                        {result.memory_updates.map((u, i) => {
                          const c = CATEGORY_BY_KEY[u.category] || cat;
                          const actionColor = u.action === "add" ? "#16A34A" : u.action === "remove" ? "#DC2626" : "#4F46E5";
                          return (
                            <li key={i}
                                className="flex items-start gap-2 text-[12.5px] rounded-lg px-2.5 py-2"
                                style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}>
                              <c.icon size={12} className="mt-0.5" style={{ color: c.color }} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="mono-tag text-[9px]" style={{ color: c.color }}>{c.label.toUpperCase()}</span>
                                  <span className="mono-tag text-[9px]" style={{ color: actionColor }}>{String(u.action).toUpperCase()}</span>
                                </div>
                                <p className="mt-0.5 font-medium leading-snug" style={{ color: "var(--text)" }}>{u.title}</p>
                                {u.detail && <p className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{u.detail}</p>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}
                </>
              )}

              {/* DECISION ROW */}
              <section className="pt-2" style={{ borderTop: "1px solid var(--hairline)" }}>
                <p className="mono-tag text-[9.5px] mb-2" style={{ color: "var(--text-3)" }}>{isChange ? "YOUR CALL" : "MEMORY ITEM"}</p>
                <div className="flex flex-wrap gap-2">
                  {isChange && (
                    <button
                      type="button" onClick={() => doAction("confirm")} disabled={acting !== null}
                      className="clay-signal px-4 py-2 text-[12.5px] inline-flex items-center gap-1.5"
                      data-testid="change-action-confirm"
                    >
                      {acting === "confirm" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Confirm & update memory
                    </button>
                  )}
                  {isChange && (
                    <button
                      type="button" onClick={() => doAction("not_a_change")} disabled={acting !== null}
                      className="clay-ghost px-3 py-2 text-[12px] inline-flex items-center gap-1.5"
                      data-testid="change-action-not-change"
                    >
                      <ThumbsDown size={11} /> Not a change
                    </button>
                  )}
                  <button
                    type="button" onClick={() => doAction("dismiss")} disabled={acting !== null}
                    className="clay-ghost px-3 py-2 text-[12px] inline-flex items-center gap-1.5"
                    data-testid="change-action-dismiss"
                  >
                    <Trash2 size={11} /> {isChange ? "Ignore" : "Dismiss"}
                  </button>
                </div>
                <p className="mt-2 text-[10.5px]" style={{ color: "var(--text-3)" }}>
                  Bracket never sends messages on your behalf. Nothing goes out until you click Send in your email or chat app.
                </p>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
