import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

// Rotating status copy while Bracket is reading the brief. Cycles every
// ~5.5s — feels lively without racing past the real backend latency.
const STAGES = [
  "Reading your brief…",
  "Framing the real situation…",
  "Compressing the context…",
  "Weighing the call…",
  "Stress-testing the decision…",
];

/**
 * Non-dismissable "Bracket is thinking" modal. Styled to match the
 * delete-confirm dialog (same overlay, same card frame) so the app feels
 * consistent — but with the close button, ESC key, and backdrop click
 * intentionally removed so the user can't cancel mid-thought.
 *
 * Rendered on the Dashboard while the brief-structuring API call is in
 * flight. On completion, the parent navigates the user to Step 5 (rich
 * brief) or Step 1 (thin brief), and this modal is unmounted.
 */
export default function StructuringModal({ open }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setStage(0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Swallow Escape while the modal is open — this reinforces that the
    // structuring pass cannot be cancelled.
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 5500);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey, true);
      clearInterval(t);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="bracket-dialog-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="structuring-modal-title"
      aria-describedby="structuring-modal-desc"
      data-testid="structuring-modal"
    >
      <div
        className="bracket-dialog card-linear card-linear--solid"
        data-testid="structuring-modal-card"
        style={{ textAlign: "center", padding: "36px 28px 28px" }}
      >
        <div className="bracket-dialog-body" style={{ alignItems: "center", gap: 16 }}>
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: "rgba(129, 132, 196,0.12)",
              border: "1px solid rgba(129, 132, 196,0.35)",
            }}
          >
            <Loader2 size={22} className="animate-spin text-signal" />
          </div>
          <p className="mono-tag text-signal text-[10.5px]">BRACKET IS THINKING</p>
          <h2
            id="structuring-modal-title"
            className="bracket-dialog-title"
            style={{ padding: 0, textAlign: "center" }}
          >
            Reading your brief…
          </h2>
          <p
            id="structuring-modal-desc"
            className="bracket-dialog-message"
            style={{ textAlign: "center" }}
            data-testid="structuring-modal-stage"
          >
            {STAGES[stage]}
          </p>
          <p
            className="text-[11.5px] leading-snug"
            style={{ color: "var(--text-3)", textAlign: "center", maxWidth: 340 }}
          >
            Takes about 20 seconds. If your brief is complete, Bracket will drop
            you straight at the final document. If not, you&apos;ll start from
            Step&nbsp;1 with sharp follow-up questions ready for Steps&nbsp;2 &amp;&nbsp;3.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
