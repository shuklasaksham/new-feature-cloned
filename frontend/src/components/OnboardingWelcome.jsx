import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, X, Sparkles } from "lucide-react";
import { PROVIDER_META } from "../lib/providersMeta";

/**
 * OnboardingWelcome — one-time first-run modal for brand-new dashboards.
 *
 * Storyboard (3 short steps, no forms):
 *   1. Welcome — "Your client talks. Bracket remembers."
 *   2. Tools   — user picks the apps they use (checkboxes)
 *   3. Ready   — one CTA lands them in /app/connect for their first tool
 *
 * Persistence — a `localStorage` flag ('bracket.onboarding.seen') so the
 * modal only ever shows once per browser. Dashboard mounts pass `open`
 * only when they know the user has zero projects AND the flag isn't set.
 */
const TOOLS = [
  { key: "gmail",  hint: "Client emails"        },
  { key: "slack",  hint: "Channels & DMs"       },
  { key: "figma",  hint: "Design files"         },
  { key: "github", hint: "Repos, PRs, issues"   },
  { key: "notion", hint: "Docs & workspaces"    },
];

export default function OnboardingWelcome({ open, onClose, onFinish }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(() => new Set(["gmail", "slack", "figma"]));

  const togglePick = (k) => {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  const finish = (openConnect = false) => {
    try { localStorage.setItem("bracket.onboarding.seen", "1"); } catch { /* private mode */ }
    onFinish?.();
    onClose?.();
    if (openConnect) {
      const first = [...picked][0];
      const q = first ? `?tool=${first}` : "";
      navigate(`/app/connect${q}`);
    }
  };

  const StepDots = () => (
    <div className="flex items-center gap-1.5" data-testid="onboarding-step-dots">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === step ? 20 : 6,
            height: 6,
            background: i <= step ? "var(--accent)" : "var(--hairline-strong)",
          }}
        />
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="ob-overlay"
            className="fixed inset-0 z-[80]"
            style={{ background: "rgba(15,18,38,0.42)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => finish(false)}
            data-testid="onboarding-overlay"
          />
          <motion.div
            key="ob-modal"
            className="fixed inset-0 z-[81] flex items-center justify-center px-4"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[560px] rounded-3xl overflow-hidden"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                boxShadow: "0 40px 120px -32px rgba(0,0,0,0.65)",
              }}
              data-testid="onboarding-modal"
            >
              {/* Header — dismiss + step dots */}
              <div className="flex items-center justify-between px-6 pt-5">
                <StepDots />
                <button
                  type="button"
                  onClick={() => finish(false)}
                  aria-label="Skip"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                  style={{ border: "1px solid var(--hairline)", color: "var(--text-3)", background: "var(--surface)" }}
                  data-testid="onboarding-skip"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="px-6 pt-4 pb-6">
                {/* STEP 0 — Welcome */}
                {step === 0 && (
                  <motion.div
                    key="ob-step-0"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    data-testid="onboarding-step-welcome"
                  >
                    <p className="mono-tag text-[10px] inline-flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                      <Sparkles size={11} /> WELCOME TO BRACKET
                    </p>
                    <h2
                      className="mt-2 font-display font-medium tracking-[-0.028em] leading-[1.05]"
                      style={{ color: "var(--text)", fontSize: "clamp(28px, 4vw, 40px)" }}
                    >
                      Your client talks.<br />Bracket remembers.
                    </h2>
                    <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                      Bracket sits on top of the tools where your client already talks and turns
                      the mess — email threads, Slack pings, Figma comments — into a living
                      project memory. Decisions, deadlines, scope, risks — all up to date,
                      without you typing a thing.
                    </p>
                    <ul className="mt-4 space-y-1.5" data-testid="onboarding-welcome-bullets">
                      {[
                        "Reads the tools you already use — no re-training your client",
                        "Catches scope creep the moment a client mentions something new",
                        "Drafts a reply and updates memory in one click",
                      ].map((line) => (
                        <li key={line} className="flex items-start gap-2 text-[12.5px]" style={{ color: "var(--text-2)" }}>
                          <span
                            className="mt-0.5 shrink-0 w-4 h-4 rounded-full inline-flex items-center justify-center"
                            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                          >
                            <Check size={9} strokeWidth={3} />
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => finish(false)}
                        className="text-[12px]"
                        style={{ color: "var(--text-3)" }}
                        data-testid="onboarding-later"
                      >
                        I'll explore first
                      </button>
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-medium"
                        style={{
                          background: "var(--primary-bg)", color: "var(--primary-fg)",
                          fontSize: "13.5px",
                          boxShadow: "0 10px 32px -10px rgba(94,106,210,0.40)",
                        }}
                        data-testid="onboarding-continue-welcome"
                      >
                        Get started <ArrowRight size={14} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1 — Which tools? */}
                {step === 1 && (
                  <motion.div
                    key="ob-step-1"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    data-testid="onboarding-step-tools"
                  >
                    <p className="mono-tag text-[10px]" style={{ color: "var(--accent)" }}>02 · YOUR STACK</p>
                    <h2
                      className="mt-2 font-display font-medium tracking-[-0.028em] leading-[1.1]"
                      style={{ color: "var(--text)", fontSize: "clamp(24px, 3.2vw, 30px)" }}
                    >
                      Where does your client talk?
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                      Pick every tool your client uses. You'll authorize them next — Bracket only
                      reads what you connect and never posts on your behalf.
                    </p>
                    <ul className="mt-4 grid grid-cols-1 gap-1.5" data-testid="onboarding-tools-list">
                      {TOOLS.map((t) => {
                        const meta = PROVIDER_META[t.key];
                        if (!meta) return null;
                        const on = picked.has(t.key);
                        return (
                          <li key={t.key}>
                            <button
                              type="button"
                              onClick={() => togglePick(t.key)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
                              style={{
                                background: on ? "rgba(94,106,210,0.06)" : "var(--surface)",
                                border: `1px solid ${on ? "rgba(94,106,210,0.35)" : "var(--hairline)"}`,
                              }}
                              data-testid={`onboarding-tool-${t.key}`}
                              aria-pressed={on}
                            >
                              {meta.logo ? (
                                <img src={meta.logo} alt="" className="w-5 h-5" />
                              ) : (
                                <span className="w-5 h-5 rounded-full" style={{ background: meta.dot || "var(--accent)" }} />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{meta.label}</p>
                                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{t.hint}</p>
                              </div>
                              <span
                                className="shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center"
                                style={{
                                  background: on ? "var(--accent)" : "transparent",
                                  border: `1.5px solid ${on ? "var(--accent)" : "var(--hairline-hover)"}`,
                                  color: "#FFFFFF",
                                }}
                              >
                                {on && <Check size={11} strokeWidth={3} />}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="text-[12px]"
                        style={{ color: "var(--text-3)" }}
                        data-testid="onboarding-back-tools"
                      >
                        ← Back
                      </button>
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setStep(2)}
                        disabled={picked.size === 0}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-medium disabled:opacity-40"
                        style={{
                          background: "var(--primary-bg)", color: "var(--primary-fg)",
                          fontSize: "13.5px",
                          boxShadow: "0 10px 32px -10px rgba(94,106,210,0.40)",
                        }}
                        data-testid="onboarding-continue-tools"
                      >
                        {picked.size === 0 ? "Pick at least one" : `Continue with ${picked.size}`} <ArrowRight size={14} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 — Ready */}
                {step === 2 && (
                  <motion.div
                    key="ob-step-2"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    data-testid="onboarding-step-ready"
                  >
                    <p className="mono-tag text-[10px]" style={{ color: "var(--accent)" }}>03 · READY</p>
                    <h2
                      className="mt-2 font-display font-medium tracking-[-0.028em] leading-[1.1]"
                      style={{ color: "var(--text)", fontSize: "clamp(24px, 3.2vw, 30px)" }}
                    >
                      Connect your first tool
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                      One-click OAuth. Once authorized, pick the specific project, thread or file
                      you want Bracket to watch — not your whole workspace.
                    </p>
                    <div
                      className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
                      style={{ background: "rgba(94,106,210,0.06)", border: "1px solid rgba(94,106,210,0.20)" }}
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full inline-flex items-center justify-center"
                            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        <Sparkles size={14} />
                      </span>
                      <p className="text-[12.5px]" style={{ color: "var(--text-2)" }}>
                        You picked <strong style={{ color: "var(--text)" }}>{picked.size}</strong>{" "}
                        tool{picked.size === 1 ? "" : "s"} — we'll start with{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {PROVIDER_META[[...picked][0]]?.label || "the first one"}
                        </strong>.
                      </p>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[12px]"
                        style={{ color: "var(--text-3)" }}
                        data-testid="onboarding-back-ready"
                      >
                        ← Back
                      </button>
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                        onClick={() => finish(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-medium"
                        style={{
                          background: "var(--primary-bg)", color: "var(--primary-fg)",
                          fontSize: "13.5px",
                          boxShadow: "0 10px 32px -10px rgba(94,106,210,0.40)",
                        }}
                        data-testid="onboarding-connect-now"
                      >
                        Connect {PROVIDER_META[[...picked][0]]?.label || "now"} <ArrowRight size={14} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
