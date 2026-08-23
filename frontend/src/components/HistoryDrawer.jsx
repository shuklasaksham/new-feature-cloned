import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, History, Loader2, Plus, Pencil, Check, Trash2, RefreshCw, Zap } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ProviderIcon, timeAgo } from "../lib/providersMeta";
import { CATEGORY_BY_KEY } from "../lib/memoryCategories";

/**
 * HistoryDrawer — answers "why is the project like this?"
 *
 * Fuses `source_events` (connect/sync milestones) with `project_memory.history`
 * (confirm / dismiss / edit stamps) into one reverse-chronological timeline.
 * Read-only — every entry links back to the memory item that generated it.
 */
const KIND_META = {
  SOURCE_CONNECTED: { label: "SOURCE CONNECTED", icon: Zap,     color: "#4F46E5" },
  SOURCE_UPDATED:   { label: "SOURCE UPDATED",   icon: RefreshCw,color: "#0EA5E9" },
  SOURCE_EVENT:     { label: "SOURCE EVENT",     icon: Zap,     color: "#4F46E5" },
  STATUS_CHANGE:    { label: "STATUS CHANGE",    icon: Check,   color: "#16A34A" },
  EDITED:           { label: "EDITED",           icon: Pencil,  color: "#D97706" },
  CREATED:          { label: "ADDED",            icon: Plus,    color: "#16A34A" },
  REMOVED:          { label: "REMOVED",          icon: Trash2,  color: "#DC2626" },
  HISTORY:          { label: "HISTORY",          icon: History, color: "#7A7F92" },
};

export default function HistoryDrawer({ projectId, open, onClose, onJumpToItem }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}/history?limit=80`);
        if (!cancelled) setEntries(data.entries || []);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="hist-overlay"
            className="fixed inset-0 z-[65]"
            style={{ background: "rgba(15,18,38,0.32)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="history-drawer-overlay"
          />
          <motion.aside
            key="hist-drawer"
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] lg:w-[540px] z-[66] overflow-y-auto"
            style={{ background: "var(--surface)", borderLeft: "1px solid var(--hairline)", boxShadow: "-24px 0 60px rgba(15,18,38,0.10)" }}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            data-testid="history-drawer"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
                 style={{ background: "var(--surface)", borderBottom: "1px solid var(--hairline)" }}>
              <div className="flex items-center gap-2">
                <History size={14} style={{ color: "var(--accent)" }} />
                <p className="mono-tag text-[10px]" style={{ color: "var(--accent)" }}>DECISION HISTORY</p>
                <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>· {entries.length} events</span>
              </div>
              <button
                type="button" onClick={onClose}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                style={{ border: "1px solid var(--hairline)", color: "var(--text-3)", background: "var(--surface)" }}
                aria-label="Close" data-testid="history-drawer-close"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-[12px] mb-4 leading-relaxed" style={{ color: "var(--text-2)" }}>
                Every source event and every memory change, newest first. Click any row to jump to the item.
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-[12px] py-6" style={{ color: "var(--text-3)" }}>
                  <Loader2 size={12} className="animate-spin" /> Reading the project timeline…
                </div>
              ) : entries.length === 0 ? (
                <div className="rounded-xl p-6 text-center"
                     style={{ background: "var(--surface-2)", border: "1px dashed var(--hairline-strong)" }}
                     data-testid="history-drawer-empty">
                  <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                    Nothing yet. As you confirm changes and Bracket syncs, every step will show up here.
                  </p>
                </div>
              ) : (
                <ol className="relative" data-testid="history-drawer-list">
                  {/* Left rail */}
                  <span aria-hidden="true"
                        className="absolute top-1 bottom-1 left-[9px] w-px"
                        style={{ background: "var(--hairline)" }} />
                  {entries.map((e) => {
                    const M = KIND_META[e.kind] || KIND_META.HISTORY;
                    const cat = e.category ? CATEGORY_BY_KEY[e.category] : null;
                    return (
                      <li key={e.id} className="relative pl-6 pb-3.5" data-testid={`history-entry-${e.id}`}>
                        <span className="absolute left-0 top-1 w-[19px] h-[19px] rounded-full inline-flex items-center justify-center"
                              style={{ background: `${M.color}18`, color: M.color, border: `1px solid ${M.color}55` }}>
                          <M.icon size={10} />
                        </span>
                        <button
                          type="button"
                          onClick={() => e.memory_id && onJumpToItem?.(e.memory_id)}
                          disabled={!e.memory_id}
                          className="w-full text-left rounded-lg px-3 py-2 transition-colors disabled:cursor-default"
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--hairline)",
                          }}
                          onMouseEnter={(ev) => { if (e.memory_id) ev.currentTarget.style.borderColor = "var(--hairline-strong)"; }}
                          onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = "var(--hairline)"; }}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="mono-tag text-[9px]" style={{ color: M.color }}>{M.label}</span>
                            {cat && (
                              <span className="mono-tag text-[9px]" style={{ color: cat.color }}>· {cat.label.toUpperCase()}</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12.5px] font-medium leading-snug" style={{ color: "var(--text)" }}>
                            {e.title}
                          </p>
                          {e.detail && (
                            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--text-3)" }}>
                              {e.detail}
                            </p>
                          )}
                          <p className="mt-1 text-[10.5px] inline-flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
                            {e.provider && <ProviderIcon provider={e.provider} size={9} />}
                            {e.source_label ? `${e.source_label} · ` : ""}{timeAgo(e.at)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
