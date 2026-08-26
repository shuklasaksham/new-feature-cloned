import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plug, Sparkles } from "lucide-react";
import { PROVIDER_META } from "../lib/providersMeta";

/**
 * NewProjectComposer — a quiet, flat prompt bar (Linear-style). Users pick the
 * tools their client already uses; Bracket connects and builds the memory.
 * No paste box, no hero glow — subtle by design. "Ask Bracket" is given its
 * own accent-tinted button so the AI action reads clearly.
 */
const TOOLS = ["gmail", "slack", "figma", "github", "notion"];

export default function NewProjectComposer({ onAskOpen, hasProjects }) {
  const navigate = useNavigate();
  const openConnect = (provider) => {
    const q = provider ? `?tool=${provider}` : "";
    navigate(`/app/connect${q}`);
  };
  return (
    <div
      className="p-4 sm:p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: "6px" }}
      data-testid="dashboard-new-project-composer"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left — quiet prompt + inline tool chips */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="mono-tag text-[9.5px]" style={{ color: "var(--text-3)" }}>
              {hasProjects ? "START A NEW PROJECT" : "WELCOME TO BRACKET"}
            </p>
          </div>
          <h2
            className="mt-1.5 font-medium tracking-[-0.01em] text-[16px] sm:text-[17px]"
            style={{ color: "var(--text)" }}
            data-testid="dashboard-new-project-title"
          >
            {hasProjects ? "Where does your client talk?" : "Your client talks. Bracket remembers."}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="dashboard-new-project-tools">
            {TOOLS.map((t) => {
              const meta = PROVIDER_META[t];
              if (!meta) return null;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => openConnect(t)}
                  className="inline-flex items-center gap-1.5 pl-2 pr-2.5 h-7 text-[12px] font-medium transition-colors"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--text-2)", borderRadius: "5px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--hairline-hover)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--hairline)"; e.currentTarget.style.color = "var(--text-2)"; }}
                  data-testid={`dashboard-new-project-tool-${t}`}
                >
                  {meta.logo
                    ? <img src={meta.logo} alt="" className="w-3.5 h-3.5" />
                    : <span className="w-2 h-2 rounded-full" style={{ background: meta.dot || "var(--accent)" }} />}
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — actions. Ask Bracket gets an accent-tinted treatment. */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {hasProjects && (
            <button
              type="button"
              onClick={onAskOpen}
              className="inline-flex items-center gap-1.5 px-3 h-9 text-[12.5px] font-medium transition-colors"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--brand-border)", color: "var(--accent)", borderRadius: "6px" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(129,132,196,0.22)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; }}
              data-testid="dashboard-ask-bracket-btn"
              title="Ask Bracket across every connected source"
            >
              <Sparkles size={13} /> Ask Bracket
            </button>
          )}
          <button
            type="button"
            onClick={() => openConnect(null)}
            className="inline-flex items-center gap-1.5 px-3 h-9 text-[12.5px] transition-colors"
            style={{ border: "1px solid var(--hairline)", color: "var(--text-2)", background: "var(--surface-2)", borderRadius: "6px" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--hairline-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderColor = "var(--hairline)"; }}
            data-testid="dashboard-connect-work-btn"
            title="Bring a conversation, design or file into Bracket"
          >
            <Plug size={13} /> Connect work
          </button>
          <button
            type="button"
            onClick={() => openConnect(null)}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 text-[12.5px] font-medium transition-colors"
            style={{ background: "var(--primary-bg)", color: "var(--primary-fg)", border: "1px solid var(--primary-bg)", borderRadius: "6px" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-bg-hov)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary-bg)"; }}
            data-testid="dashboard-new-project-start"
          >
            Start a new project <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
