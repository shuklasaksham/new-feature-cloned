import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plug, Sparkles, MessageSquareQuote, Check, X, ArrowRight } from "lucide-react";
import { api } from "../lib/api";

const KEYS = {
  dismissed: "bracket.fr.dismissed",
  sawMemory: "bracket.fr.sawMemory",
  draftedReply: "bracket.fr.draftedReply",
};

const flag = (k) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };

/**
 * FirstRunChecklist — a dismissible 3-step "aha" guide for new users:
 * connect a tool -> see your first memory -> draft a reply. Auto-hides when
 * complete or dismissed. Progress is derived from real connections + local
 * flags set by ProjectMemory as the user hits each milestone.
 */
export default function FirstRunChecklist() {
  const [hasConn, setHasConn] = useState(false);
  const [ready, setReady] = useState(false);
  const [flags, setFlags] = useState(() => ({
    sawMemory: flag(KEYS.sawMemory),
    draftedReply: flag(KEYS.draftedReply),
  }));

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/connect/connections");
      const conns = data?.connections || data || [];
      setHasConn(Array.isArray(conns) && conns.length > 0);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => setFlags({ sawMemory: flag(KEYS.sawMemory), draftedReply: flag(KEYS.draftedReply) });
    window.addEventListener("bracket-firstrun-update", onUpdate);
    return () => window.removeEventListener("bracket-firstrun-update", onUpdate);
  }, [refresh]);

  const steps = [
    { key: "connect", icon: Plug, done: hasConn, title: "Connect a tool", desc: "Link Gmail, Slack, Figma or GitHub to a project.", to: "/app/connect" },
    { key: "memory", icon: Sparkles, done: flags.sawMemory, title: "See your first memory", desc: "Open a project — Bracket has already extracted decisions, scope and deadlines.", to: "/app" },
    { key: "reply", icon: MessageSquareQuote, done: flags.draftedReply, title: "Draft a reply", desc: "Ask Bracket to draft a grounded reply to your client.", to: "/app" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  const [visible, setVisible] = useState(true);
  useEffect(() => { setVisible(!flag(KEYS.dismissed)); }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEYS.dismissed, "1"); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!ready || !visible || allDone) return null;

  // Point the primary CTA at the first incomplete step.
  const next = steps.find((s) => !s.done) || steps[0];

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
        data-testid="first-run-checklist"
      >
        <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <div>
            <p className="mono-tag text-muted text-[10px] inline-flex items-center gap-1.5">
              <Sparkles size={11} /> GET STARTED
            </p>
            <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text)" }}>
              Reach your first client memory in 3 steps
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }} data-testid="first-run-progress">{doneCount}/{steps.length}</span>
            <button type="button" onClick={dismiss} title="Dismiss"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[var(--surface-2)]"
                    style={{ color: "var(--text-3)" }} data-testid="first-run-dismiss">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* progress bar */}
        <div className="h-[3px] w-full" style={{ background: "var(--surface-2)" }}>
          <motion.div className="h-full" style={{ background: "var(--accent)" }}
                      initial={false} animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
        </div>

        <div className="p-3 grid gap-2 sm:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.key}
                   className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5"
                   style={{ background: s.done ? "var(--accent-soft)" : "var(--surface-2)", border: `1px solid ${s.done ? "rgba(129, 132, 196,0.3)" : "var(--hairline)"}` }}
                   data-testid={`first-run-step-${s.key}`}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                        style={{ background: s.done ? "var(--accent)" : "var(--bg)", color: s.done ? "#fff" : "var(--text-3)", border: s.done ? "none" : "1px solid var(--hairline)" }}>
                    {s.done ? <Check size={12} /> : <Icon size={12} />}
                  </span>
                  <span className="mono-tag text-[9px]" style={{ color: "var(--text-3)" }}>STEP {i + 1}</span>
                </div>
                <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{s.title}</p>
                <p className="text-[11.5px] leading-snug" style={{ color: "var(--text-3)" }}>{s.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="px-3 pb-3">
          <Link to={next.to}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium"
                style={{ background: "var(--primary-bg)", color: "var(--primary-fg)", boxShadow: "0 8px 20px -8px rgba(129, 132, 196,0.5)" }}
                data-testid="first-run-cta">
            {next.key === "connect" ? "Connect your first tool" : next.key === "memory" ? "Open a project" : "Draft a reply"} <ArrowRight size={13} />
          </Link>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
