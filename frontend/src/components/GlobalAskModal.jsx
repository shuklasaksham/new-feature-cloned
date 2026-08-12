import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { PROVIDER_META } from "../lib/providersMeta";

/**
 * Global "Ask Bracket" modal — answers a single question stitched across every
 * connected Figma/Gmail/Slack/GitHub source on every project the user owns.
 * Uses POST /api/ask/all (a project-aware wrapper around the existing ask engine).
 */
export default function GlobalAskModal({ open, onClose }) {
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = async (override) => {
    const question = (typeof override === "string" ? override : q).trim();
    if (question.length < 3 || asking) return;
    setAsking(true);
    setResult(null);
    try {
      const { data } = await api.post("/ask/all", { question });
      setResult(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setAsking(false);
    }
  };

  if (!open) return null;

  const suggestions = [
    "What new client requests came in this week?",
    "What decisions have we confirmed but not written down?",
    "Which deadlines are at risk across my projects?",
    "What did the client say about pricing?",
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]"
      style={{ background: "rgba(4,5,7,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      data-testid="global-ask-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[640px] rounded-2xl overflow-hidden"
        style={{ background: "var(--surface-1)", border: "1px solid var(--hairline)", boxShadow: "0 40px 120px rgba(0,0,0,0.55)" }}
        data-testid="global-ask-modal"
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <div>
            <p className="mono-tag text-muted text-[10px] inline-flex items-center gap-1.5">
              <Sparkles size={11} /> ASK BRACKET
            </p>
            <p className="mt-1 text-[13.5px] font-medium text-[var(--text)]">
              Answer stitched across every connected source
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ border: "1px solid var(--hairline)", color: "var(--text-3)" }}
            aria-label="Close"
            data-testid="global-ask-close"
          >
            <X size={13} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Ask about anything across your projects…"
              className="dashboard-search-input flex-1"
              style={{ height: 42 }}
              data-testid="global-ask-input"
            />
            <button
              type="button"
              onClick={submit}
              disabled={asking || q.trim().length < 3}
              className="clay-signal px-4 py-2 t-tag press inline-flex items-center gap-1.5 disabled:opacity-40"
              data-testid="global-ask-submit"
            >
              {asking ? <Loader2 size={12} className="animate-spin" /> : <><Send size={12} /> Ask</>}
            </button>
          </div>

          {!result && !asking && (
            <div className="mt-3 flex flex-wrap gap-1.5" data-testid="global-ask-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setQ(s); submit(s); }}
                  className="mono-tag px-2.5 py-1 rounded-full text-[10.5px]"
                  style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-3)", border: "1px solid var(--hairline)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {asking && (
            <div className="mt-4 text-[12px] text-[var(--text-3)] inline-flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Reading your connected work…
            </div>
          )}

          {result && (
            <div
              className="mt-4 p-4 rounded-xl"
              style={{ background: "rgba(94,106,210,0.06)", border: "1px solid rgba(94,106,210,0.2)" }}
              data-testid="global-ask-answer"
            >
              <p className="text-[13px] text-[var(--text)] leading-relaxed whitespace-pre-wrap">{result.answer}</p>
              {result.confidence && (
                <p className="mt-2 mono-tag text-[9.5px]" style={{ color: result.confidence === "high" ? "#22C55E" : result.confidence === "medium" ? "#FFB84C" : "var(--text-3)" }}>
                  CONFIDENCE · {String(result.confidence).toUpperCase()}
                </p>
              )}
              {(result.sources || []).length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--hairline)" }}>
                  <p className="mono-tag text-muted text-[9.5px] mb-1.5">SOURCES</p>
                  <div className="flex flex-col gap-1">
                    {result.sources.map((s, i) => (
                      <p key={i} className="text-[11.5px] text-[var(--text-3)] leading-snug">
                        <span className="text-signal" style={{ color: "#8B95E8" }}>
                          {PROVIDER_META[s.provider]?.label || s.provider || "Source"}
                        </span>
                        {" · "}{s.label}{s.detail ? ` — ${s.detail}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-[10.5px] text-[var(--text-3)]">
            Grounded only in what you&apos;ve connected — Bracket never invents decisions or approvals.{" "}
            <Link to="/app/connect" className="underline underline-offset-2 hover:text-[var(--text-2)]">
              Manage connections
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
