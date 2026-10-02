import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, AlertTriangle, Mail, RotateCcw, ChevronRight, Loader2, Check,
  X, ArrowRight, Zap, FlaskConical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";

const BEAT_DELAY_MS = 6000;

const track = (event, projectId) => {
  api.post("/demo/track", { event, project_id: projectId || "" }).catch(() => {});
};

// Bracket Demo Workspace control dock. Renders only for is_demo projects.
export default function DemoDock({ project, onRefresh }) {
  const navigate = useNavigate();
  const projectId = project?.id;
  const [state, setState] = useState(null); // {sim_step, sim_total, email_sent, reply_received, conflict_resolved}
  const [beats, setBeats] = useState([]); // released beat summaries
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyMsg, setReplyMsg] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;
    api.get("/demo/project")
      .then(({ data }) => { if (data?.demo_state) setState(data.demo_state); })
      .catch(() => {});
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [projectId]);

  const step = state?.sim_step ?? 0;
  const total = state?.sim_total ?? 5;
  const conflictActive = step >= 3 && !state?.conflict_resolved;
  const simDone = step >= total;

  const advance = async () => {
    if (busy) return false;
    setBusy(true);
    try {
      const { data } = await api.post("/demo/simulate/next");
      if (data?.beat) {
        setBeats((b) => [...b, data.beat]);
        if (data.beat.is_conflict) {
          toast.message("Conflict detected", { description: "Gmail says Oct 27, Figma still says Oct 20." });
        }
      }
      setState((s) => ({ ...(s || {}), sim_step: data.step, sim_total: data.total }));
      onRefresh?.();
      return data?.done;
    } catch (e) {
      toast.error(formatApiError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Auto-advance loop with pacing; user can skip the wait with "Next event".
  useEffect(() => {
    if (!running) return;
    if (simDone) { setRunning(false); return; }
    timerRef.current = setTimeout(async () => {
      const done = await advance();
      if (done) setRunning(false);
    }, BEAT_DELAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, step, simDone]);

  const startSim = () => { setRunning(true); advance(); };
  const nextNow = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const done = await advance();
    if (done) setRunning(false);
  };

  const openComposer = async () => {
    setComposerOpen(true);
    track("demo_reply_generated", projectId);
    if (draft) return;
    setDrafting(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/suggest-reply`, {
        instruction: "Ask Sarah to confirm the new October 27 launch date, and clarify the lingering October 20 reference in the Figma design so both sides are aligned.",
      });
      setDraft(data?.reply || "");
    } catch {
      setDraft("Hi Sarah — can you confirm the launch is now October 27? A Figma comment still references October 20 and I want to make sure we're aligned before the design handoff.");
    } finally {
      setDrafting(false);
    }
  };

  const sendDemoEmail = async () => {
    setSending(true);
    try {
      await api.post("/demo/send-email", { body: draft });
      toast.success("Demo email sent — no real email was delivered.");
      setComposerOpen(false);
      setState((s) => ({ ...(s || {}), email_sent: true }));
      onRefresh?.();
      // Simulated client reply a short beat later.
      setTimeout(async () => {
        try {
          const { data } = await api.post("/demo/client-reply");
          setReplyMsg(data?.message || "Sarah confirmed October 27.");
          setState((s) => ({ ...(s || {}), reply_received: true, conflict_resolved: true }));
          onRefresh?.();
          toast.success("Sarah replied — conflict resolved, launch confirmed for Oct 27.");
        } catch (e) { toast.error(formatApiError(e)); }
      }, 2600);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSending(false);
    }
  };

  const resetDemo = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/demo/reset");
      toast.success("Demo reset to its starting state.");
      setBeats([]); setDraft(""); setReplyMsg("");
      setState(data?.demo_state || null);
      setRunning(false);
      if (data?.project_id && data.project_id !== projectId) navigate(`/project/${data.project_id}`);
      else onRefresh?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const connectTools = () => {
    track("demo_connect_tools_clicked", projectId);
    navigate("/welcome");
  };

  if (!projectId) return null;

  return (
    <>
      {/* Persistent demo marker banner */}
      <div className="demo-banner" data-testid="demo-banner">
        <span className="demo-banner-tag"><FlaskConical size={13} /> Demo Workspace</span>
        <span className="demo-banner-text">Fictional data — explore Bracket's full loop with the Harbor project.</span>
        <button type="button" className="demo-banner-link" onClick={connectTools} data-testid="demo-banner-connect">
          Connect your business <ArrowRight size={13} />
        </button>
      </div>

      {/* Floating control dock */}
      <motion.div
        className="demo-dock"
        data-testid="demo-dock"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="demo-dock-head">
          <span className="demo-dock-title"><Sparkles size={15} /> Live demo</span>
          <span className="demo-dock-progress" data-testid="demo-progress">{Math.min(step, total)} / {total}</span>
          <button type="button" className="demo-dock-collapse" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle demo dock" data-testid="demo-dock-collapse">
            {collapsed ? <ChevronRight size={16} style={{ transform: "rotate(-90deg)" }} /> : <X size={16} />}
          </button>
        </div>

        {!collapsed && (
          <div className="demo-dock-body">
            {/* Released beats log */}
            {beats.length > 0 && (
              <div className="demo-beats" data-testid="demo-beats">
                <AnimatePresence initial={false}>
                  {beats.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      className={`demo-beat${b.is_conflict ? " is-conflict" : ""}`}
                    >
                      <span className="demo-beat-src">{b.is_conflict ? <AlertTriangle size={12} /> : <Zap size={12} />} {b.provider}</span>
                      <span className="demo-beat-sum">{b.summary}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Phase actions */}
            {!simDone && step === 0 && !running && (
              <button type="button" className="demo-btn demo-btn--primary" onClick={startSim} disabled={busy} data-testid="demo-simulate-start">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Simulate incoming activity
              </button>
            )}
            {!simDone && (running || step > 0) && (
              <div className="demo-dock-actions">
                <button type="button" className="demo-btn demo-btn--primary" onClick={nextNow} disabled={busy} data-testid="demo-next-event">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />} Next event
                </button>
                {running && <span className="demo-hint">Releasing events…</span>}
              </div>
            )}

            {/* Conflict action */}
            {conflictActive && (
              <div className="demo-conflict" data-testid="demo-conflict-card">
                <div className="demo-conflict-head"><AlertTriangle size={14} /> Launch date conflict</div>
                <p className="demo-conflict-body">Gmail says <strong>Oct 27</strong>, but Figma still references <strong>Oct 20</strong>. Bracket kept both — ask Sarah to confirm.</p>
                <button type="button" className="demo-btn demo-btn--warn" onClick={openComposer} data-testid="demo-draft-email">
                  <Mail size={14} /> Draft clarification email
                </button>
              </div>
            )}

            {/* Sarah reply confirmation */}
            {replyMsg && (
              <div className="demo-resolved" data-testid="demo-resolved">
                <Check size={14} /> {replyMsg}
              </div>
            )}

            {/* Conversion prompt */}
            {simDone && state?.conflict_resolved && (
              <div className="demo-convert" data-testid="demo-convert">
                <p className="demo-convert-title">That's Bracket with demo data.</p>
                <p className="demo-convert-sub">Now let Bracket keep up with your real business.</p>
                <button type="button" className="demo-btn demo-btn--primary" onClick={connectTools} data-testid="demo-connect-tools">
                  Connect my tools <ArrowRight size={14} />
                </button>
              </div>
            )}

            <button type="button" className="demo-reset" onClick={resetDemo} disabled={busy} data-testid="demo-reset">
              <RotateCcw size={12} /> Reset demo
            </button>
          </div>
        )}
      </motion.div>

      {/* Email composer */}
      {composerOpen && (
        <div className="demo-modal-overlay" data-testid="demo-composer" onClick={() => setComposerOpen(false)}>
          <motion.div
            className="demo-modal" onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <div className="demo-modal-head">
              <span><Mail size={15} /> Clarification email to Sarah</span>
              <button type="button" onClick={() => setComposerOpen(false)} data-testid="demo-composer-close"><X size={16} /></button>
            </div>
            <div className="demo-modal-meta">
              <span>To: Sarah Chen &lt;sarah@harbor.io&gt;</span>
              <span>Re: Harbor — Payments App Launch</span>
            </div>
            {drafting ? (
              <div className="demo-modal-drafting"><Loader2 size={15} className="animate-spin" /> Bracket is drafting a reply…</div>
            ) : (
              <textarea
                className="demo-modal-textarea" value={draft} onChange={(e) => setDraft(e.target.value)}
                rows={6} data-testid="demo-composer-textarea"
              />
            )}
            <div className="demo-modal-foot">
              <span className="demo-modal-note">Demo mode — no real email is sent.</span>
              <button type="button" className="demo-btn demo-btn--primary" onClick={sendDemoEmail} disabled={sending || drafting} data-testid="demo-send-email">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Send demo email
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
