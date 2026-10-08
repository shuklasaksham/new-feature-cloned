import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import ParticleField from "../components/ParticleField";
import Seo from "../components/Seo";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";
const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };

const NOUN = { gmail: "conversations", slack: "channels", figma: "files", github: "repositories" };
const STEPS = ["Reading conversations...", "Finding project details...", "Organizing your project..."];

export default function BuildingProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const { provider, sources } = location.state || {};

  const [step, setStep] = useState(0); // number of completed checklist items
  const [phase, setPhase] = useState("building"); // building | ready | error
  const [result, setResult] = useState(null); // { project_id, name, counts }
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  // A transient failure = network drop / gateway 5xx (502/503/504) / timeout —
  // exactly the "origin returned an invalid response" case. These are worth an
  // automatic retry before we ever show the user an error.
  const isTransient = (e) => {
    const s = e?.response?.status;
    return !e?.response || e?.code === "ECONNABORTED" || (typeof s === "number" && s >= 502 && s <= 504);
  };
  const friendlyError = (e) => {
    if (isTransient(e)) return "Bracket's server was briefly unavailable while building your project. This is usually temporary — please try again.";
    return formatApiError(e);
  };

  const runBuild = async () => {
    setError("");
    setPhase("building");
    setStep(0);
    const t0 = performance.now();
    const timers = [];
    timers.push(setTimeout(() => setStep((s) => Math.max(s, 1)), 700));
    timers.push(setTimeout(() => setStep((s) => Math.max(s, 2)), 1700));
    const attempt = async () => {
      const { data: prev } = await api.post("/connect/preview", { provider, sources });
      const { data: est } = await api.post("/connect/establish", { preview_id: prev.preview_id, mode: "new" });
      return { prev, est };
    };
    try {
      let out;
      // Up to 3 attempts total for transient gateway blips.
      for (let i = 0; i < 3; i += 1) {
        try { out = await attempt(); break; }
        catch (e) {
          if (i < 2 && isTransient(e)) { await new Promise((r) => setTimeout(r, 1500 * (i + 1))); continue; }
          throw e;
        }
      }
      const res = {
        project_id: out.est.project_id,
        name: out.prev.project?.name || sources[0]?.name || "Your project",
        counts: out.prev.counts || {},
      };
      const elapsed = performance.now() - t0;
      const wait = Math.max(0, 2400 - elapsed);
      setTimeout(() => {
        setStep(3);
        setResult(res);
        setTimeout(() => setPhase("ready"), 550);
      }, wait);
    } catch (e) {
      setError(friendlyError(e));
      setPhase("error");
    } finally {
      timers.forEach(clearTimeout);
    }
  };

  useEffect(() => {
    if (!provider || !sources || !sources.length) { navigate("/welcome"); return; }
    if (startedRef.current) return;
    startedRef.current = true;
    runBuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noun = NOUN[provider] || "sources";
  const c = result?.counts || {};

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "#000" }} data-testid="building-project-page">
      <Seo title="Building your project" path="/welcome/building" noindex />

      {/* Particle field — right-biased halftone, fading into black on the left */}
      <div className="absolute inset-0 fade-in" aria-hidden="true">
        <ParticleField />
      </div>
      <div className="absolute inset-0" aria-hidden="true" style={{ background: "linear-gradient(to right, #000 0%, #000 34%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 78%)" }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-7 sm:px-14 lg:px-20 xl:px-24 py-10">
        <div className="max-w-[560px] w-full">
          <img src={BRACKET_LOGO} alt="Bracket" width={52} height={52} style={{ display: "block" }} />

          <AnimatePresence mode="wait">
            {phase !== "ready" ? (
              <motion.div
                key="building"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="mt-6 font-display font-semibold tracking-[-0.025em] text-[38px] sm:text-[44px] leading-[1.02]" style={{ color: "#fff" }}>
                  {phase === "error" ? "Something went wrong" : "Building your project"}
                </h1>
                <p className="mt-3 text-[13px]" style={{ ...MONO, color: "#7a7a7a" }}>
                  {phase === "error" ? "We couldn't build this project." : "We're almost done."}
                </p>

                {phase === "error" ? (
                  <div className="mt-10">
                    <p className="text-[13.5px] leading-[1.6] max-w-[420px]" style={{ color: "#c9c9c9" }}>{error}</p>
                    <div className="mt-6 flex items-center gap-5">
                      <button type="button" onClick={() => runBuild()} className="login-submit" style={{ width: "auto", padding: "0 26px", height: 48 }} data-testid="building-retry">
                        Try again
                      </button>
                      <button type="button" onClick={() => navigate(-1)} className="text-[13px]" style={{ ...MONO, color: "#8a8a8a" }} data-testid="building-goback">
                        Go back
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-12 flex flex-col gap-5" data-testid="building-checklist">
                    {STEPS.map((label, i) => {
                      const done = step > i;
                      return (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.45, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center gap-3.5"
                          data-testid={`building-step-${i}`}
                        >
                          <span className="shrink-0 inline-flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: "50%", background: done ? "#1f9d55" : "transparent", border: done ? "none" : "1.5px solid #2e2e2e", transition: "background 0.3s ease" }}>
                            {done ? <Check size={13} color="#fff" strokeWidth={3} /> : <Loader2 size={13} className="animate-spin" style={{ color: "#6b6b6b" }} />}
                          </span>
                          <span className="text-[15px]" style={{ ...MONO, color: done ? "#b8b8b8" : "#6f6f6f", transition: "color 0.3s ease" }}>{label}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="mt-6 font-display font-semibold tracking-[-0.025em] text-[38px] sm:text-[44px] leading-[1.02]" style={{ color: "#fff" }}>
                  Your project is ready.
                </h1>
                <p className="mt-3 text-[13px]" style={{ ...MONO, color: "#7a7a7a" }}>
                  We found the key details from your conversations.
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-9 max-w-[420px] px-6 py-6"
                  style={{ background: "rgba(10,10,10,0.7)", border: "1px solid #242424", borderRadius: 16, backdropFilter: "blur(6px)" }}
                  data-testid="ready-card"
                >
                  <h2 className="font-display font-semibold text-[22px] tracking-[-0.01em]" style={{ color: "#fff" }} data-testid="ready-project-name">
                    {result?.name}
                  </h2>
                  <p className="mt-1.5 text-[12.5px]" style={{ ...MONO, color: "#7f7f7f" }}>
                    {sources.length} {noun} · Added just now
                  </p>
                  <div className="my-4 h-px" style={{ background: "#1e1e1e" }} />
                  <p className="text-[13px]" style={{ ...MONO, color: "#b0b0b0" }}>
                    {c.deliverables || 0} deliverables · {c.requirements || 0} requirements · {c.decisions || 0} decisions
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/project/${result.project_id}`)}
                    className="mt-6 inline-flex items-center justify-center gap-2"
                    style={{ height: 50, padding: "0 30px", borderRadius: 9999, background: "#fff", color: "#000", fontWeight: 600, letterSpacing: "0.02em", ...MONO }}
                    data-testid="ready-open-project"
                  >
                    Open Project <ArrowRight size={16} />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
