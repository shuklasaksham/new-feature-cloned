import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const KEY = "bracket_tour_done_v1";

const STEPS = [
  {
    badge: "WELCOME TO BRACKET",
    title: "Your project memory layer",
    copy: "Bracket isn't another dashboard to fill in. It reads the conversations where your client work already happens and keeps the project's current state for you.",
  },
  {
    badge: "STEP 01 — CONNECT",
    title: "Connect one conversation",
    copy: "Pick the Gmail thread (or another source) where a client project lives. Bracket only reads what you connect — nothing else.",
  },
  {
    badge: "STEP 02 — IT KEEPS UP",
    title: "Bracket catches the changes",
    copy: "Scope, deliverables, requirements, decisions and deadlines stay organized. When the client changes something, Bracket shows you what it affects — you approve it once.",
  },
];

/** Short guided first-run for brand-new accounts. Shows once (localStorage). */
export default function OnboardingTour({ enabled = true }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try { if (!localStorage.getItem(KEY)) setOpen(true); } catch { setOpen(true); }
  }, [enabled]);

  const finish = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;
  const last = i === STEPS.length - 1;
  const s = STEPS[i];

  return (
    <div className="ob-overlay" data-testid="onboarding-tour">
      <div className="ob-card">
        <p className="ob-step-badge">{s.badge}</p>
        <h2 className="ob-title">{s.title}</h2>
        <p className="ob-copy">{s.copy}</p>
        <div className="ob-dots">
          {STEPS.map((_, idx) => <span key={idx} className={`ob-dot${idx === i ? " is-on" : ""}`} />)}
        </div>
        <div className="ob-actions">
          <button type="button" className="ob-skip" onClick={finish} data-testid="onboarding-skip">Skip</button>
          <button
            type="button"
            className="ob-next"
            onClick={() => (last ? finish() : setI((v) => v + 1))}
            data-testid="onboarding-next"
          >
            {last ? "Connect a source" : "Next"} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
