import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, Check, AlertTriangle, TrendingUp, ArrowRight, Sparkles, ThumbsDown, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { CATEGORY_BY_KEY } from "../lib/memoryCategories";

/**
 * ProjectUpdateReview — Bracket's consolidated "one change, one review, one
 * approval" surface. Instead of approving each detected item separately, we
 * bundle EVERY pending change plus its AI-computed downstream impacts into a
 * single snapshot. The user approves or rejects the whole thing at once.
 */
const PRIORITY = {
  high:   { label: "HIGH IMPACT",   color: "#DC2626", bg: "rgba(220,38,38,0.10)" },
  medium: { label: "MEDIUM IMPACT", color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  low:    { label: "LOW IMPACT",    color: "#16A34A", bg: "rgba(22,163,74,0.10)" },
};

export default function ProjectUpdateReview({ projectId, open, onClose, onResolved }) {
  const [loading, setLoading] = useState(false);
  const [update, setUpdate] = useState(null);
  const [nonePending, setNonePending] = useState(false);
  const [acting, setActing] = useState(null); // 'approve' | 'reject'

  useEffect(() => {
    if (!open || !projectId) return;
    setUpdate(null);
    setNonePending(false);
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post(`/projects/${projectId}/update/build`);
        if (cancelled) return;
        if (!data.pending) setNonePending(true);
        else setUpdate(data.update);
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

  const resolve = async (action) => {
    if (!update || acting) return;
    setActing(action);
    try {
      const { data } = await api.post(`/projects/${projectId}/update/${update.id}/${action}`);
      if (action === "approve") {
        toast.success(`Update approved — ${data.confirmed} confirmed${data.added ? `, ${data.added} added` : ""}`);
      } else {
        toast.success(`Update rejected — ${data.discarded} change${data.discarded === 1 ? "" : "s"} discarded`);
      }
      onResolved?.();
      onClose?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setActing(null);
    }
  };

  const prio = PRIORITY[update?.priority] || PRIORITY.medium;
  const directByCat = groupByCat(update?.direct || []);
  const downstreamByCat = groupByCat(update?.downstream || []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[70]"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="project-update-overlay"
          />
          <motion.aside
            key="drawer"
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[540px] lg:w-[620px] z-[71] overflow-y-auto"
            style={{ background: "var(--surface)", borderLeft: "1px solid var(--hairline)" }}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            data-testid="project-update-drawer"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
                 style={{ background: "var(--surface)", borderBottom: "1px solid var(--hairline)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={14} style={{ color: "var(--accent)" }} />
                <span className="mono-tag text-[10px]" style={{ color: "var(--accent)" }}>PROJECT UPDATE</span>
                {update && (
                  <span className="mono-tag px-1.5 py-0.5 rounded text-[9px]"
                        style={{ color: prio.color, background: prio.bg, border: `1px solid ${prio.color}33` }}>
                    {prio.label}
                  </span>
                )}
              </div>
              <button type="button" onClick={onClose}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                      style={{ border: "1px solid var(--hairline)", color: "var(--text-3)" }}
                      aria-label="Close" data-testid="project-update-close">
                <X size={13} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {loading && (
                <div className="flex items-center gap-2 text-[13px] py-6" style={{ color: "var(--text-3)" }}>
                  <Loader2 size={14} className="animate-spin" /> Bracket is consolidating your update…
                </div>
              )}

              {!loading && nonePending && (
                <div className="text-center py-10" data-testid="project-update-empty">
                  <CheckCircle2 size={26} style={{ color: "var(--success)", margin: "0 auto" }} />
                  <p className="mt-3 text-[15px] font-medium" style={{ color: "var(--text)" }}>You're all caught up</p>
                  <p className="mt-1 text-[12.5px]" style={{ color: "var(--text-3)" }}>Nothing is waiting for your review right now.</p>
                </div>
              )}

              {!loading && update && (
                <>
                  {/* Summary */}
                  {update.summary && (
                    <section>
                      <p className="mono-tag text-[9.5px] mb-1.5" style={{ color: "var(--text-3)" }}>WHAT THIS UPDATE MEANS</p>
                      <p className="text-[14px] leading-relaxed" style={{ color: "var(--text)" }} data-testid="project-update-summary">
                        {update.summary}
                      </p>
                    </section>
                  )}

                  {/* Impacts */}
                  {update.impacts?.length > 0 && (
                    <section>
                      <p className="mono-tag text-[9.5px] mb-2 inline-flex items-center gap-1.5" style={{ color: "var(--text-3)" }}>
                        <TrendingUp size={10} /> IMPACT ACROSS THE PROJECT
                      </p>
                      <ul className="space-y-2" data-testid="project-update-impacts">
                        {update.impacts.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                            <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
                            <div>
                              <span className="mono-tag text-[9px] mr-1.5" style={{ color: "var(--text-3)" }}>{String(imp.kind).toUpperCase()}</span>
                              {imp.detail}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Direct changes */}
                  <section>
                    <p className="mono-tag text-[9.5px] mb-2" style={{ color: "var(--text-3)" }}>
                      CHANGES IN THIS UPDATE · {update.direct?.length || 0}
                    </p>
                    <div className="space-y-1.5" data-testid="project-update-direct">
                      {directByCat.map(([catKey, list]) => (
                        <CatGroup key={catKey} catKey={catKey} list={list} />
                      ))}
                    </div>
                  </section>

                  {/* Downstream */}
                  {update.downstream?.length > 0 && (
                    <section>
                      <p className="mono-tag text-[9.5px] mb-2 inline-flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                        <Sparkles size={10} /> BRACKET WILL ALSO ADD · {update.downstream.length}
                      </p>
                      <div className="space-y-1.5" data-testid="project-update-downstream">
                        {downstreamByCat.map(([catKey, list]) => (
                          <CatGroup key={catKey} catKey={catKey} list={list} showReason />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Decision row */}
                  <section className="pt-2 sticky bottom-0 pb-1" style={{ borderTop: "1px solid var(--hairline)", background: "var(--surface)" }}>
                    <p className="mono-tag text-[9.5px] mb-2 mt-3" style={{ color: "var(--text-3)" }}>ONE REVIEW, ONE APPROVAL</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => resolve("approve")} disabled={acting !== null}
                              className="clay-signal px-4 py-2 text-[12.5px] inline-flex items-center gap-1.5"
                              data-testid="project-update-approve">
                        {acting === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Approve update
                      </button>
                      <button type="button" onClick={() => resolve("reject")} disabled={acting !== null}
                              className="clay-ghost px-3 py-2 text-[12px] inline-flex items-center gap-1.5"
                              data-testid="project-update-reject">
                        {acting === "reject" ? <Loader2 size={11} className="animate-spin" /> : <ThumbsDown size={11} />}
                        Reject all
                      </button>
                    </div>
                    <p className="mt-2 text-[10.5px]" style={{ color: "var(--text-3)" }}>
                      Approving applies every change above at once. Rejecting discards them all — no separate approvals.
                    </p>
                  </section>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function groupByCat(list) {
  const map = {};
  (list || []).forEach((it) => {
    const k = it.category || "requirement";
    (map[k] = map[k] || []).push(it);
  });
  return Object.entries(map);
}

function CatGroup({ catKey, list, showReason }) {
  const c = CATEGORY_BY_KEY[catKey] || CATEGORY_BY_KEY.requirement;
  return (
    <>
      {list.map((it, i) => (
        <div key={i}
             className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
             style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}>
          <c.icon size={13} className="mt-0.5 shrink-0" style={{ color: c.color }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="mono-tag text-[9px]" style={{ color: c.color }}>{c.label.toUpperCase()}</span>
              {it.is_scope_change && (
                <span className="mono-tag text-[9px] inline-flex items-center gap-0.5" style={{ color: "var(--danger)" }}>
                  <AlertTriangle size={8} /> SCOPE CREEP
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] font-medium leading-snug" style={{ color: "var(--text)" }}>{it.title}</p>
            {it.detail && <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: "var(--text-3)" }}>{it.detail}</p>}
            {showReason && it.reason && (
              <p className="text-[10.5px] italic mt-1" style={{ color: "var(--text-3)" }}>↳ {it.reason}</p>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
