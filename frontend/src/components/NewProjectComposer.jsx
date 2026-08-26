import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Plug, Sparkles } from "lucide-react";
import { PROVIDER_META } from "../lib/providersMeta";

/**
 * NewProjectComposer — the paste-textbox has been removed. Bracket now asks
 * users about the tools they already work in, then hands them to /app/connect
 * to authorize + pick a project/channel/file. Bracket builds the memory from
 * that source. No manual typing.
 */
const TOOLS = ["gmail", "slack", "figma", "github", "notion"];

export default function NewProjectComposer({ onAskOpen, hasProjects }) {
  const navigate = useNavigate();
  const openConnect = (provider) => {
    // Preserve intent — /app/connect reads ?tool= to jump straight to the picker.
    const q = provider ? `?tool=${provider}` : "";
    navigate(`/app/connect${q}`);
  };
  return (
    <div
      className="relative overflow-hidden rounded-[20px] p-6 sm:p-7"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hairline)",
        boxShadow: "0 20px 50px -30px rgba(0,0,0,0.55)",
      }}
      data-testid="dashboard-new-project-composer"
    >
      {/* Soft accent orb — signals AI intelligence without dark-theme glow */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-16 h-[260px] w-[260px] rounded-full opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(closest-side, rgba(129, 132, 196,0.20), transparent 70%)" }}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="max-w-[560px]">
          <p className="mono-tag text-[10px]" style={{ color: "var(--accent)" }}>
            {hasProjects ? "START A NEW PROJECT" : "WELCOME TO BRACKET"}
          </p>
          <h2
            className="mt-2 font-display font-medium tracking-[-0.03em] leading-[1.08]"
            style={{ color: "var(--text)", fontSize: "clamp(24px, 3.2vw, 32px)" }}
            data-testid="dashboard-new-project-title"
          >
            {hasProjects
              ? "Where does your client talk?"
              : "Your client talks. Bracket remembers."}
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Pick the tools your client already uses. Bracket connects, reads the mess, and builds a
            living project memory — decisions, deadlines, scope, risks — without you typing a thing.
          </p>

          {/* Tool chips */}
          <div className="mt-5 flex flex-wrap gap-2" data-testid="dashboard-new-project-tools">
            {TOOLS.map((t) => {
              const meta = PROVIDER_META[t];
              if (!meta) return null;
              return (
                <motion.button
                  key={t}
                  type="button"
                  onClick={() => openConnect(t)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full text-[12.5px] font-medium"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--hairline-strong)",
                    color: "var(--text)",
                    transition: "border-color 200ms ease, box-shadow 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(129, 132, 196,0.45)";
                    e.currentTarget.style.boxShadow = "0 4px 12px -6px rgba(129, 132, 196,0.30)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--hairline-strong)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  data-testid={`dashboard-new-project-tool-${t}`}
                >
                  {meta.logo ? (
                    <img src={meta.logo} alt="" className="w-4 h-4" />
                  ) : (
                    <span className="w-4 h-4 rounded-full" style={{ background: meta.dot || "var(--accent)" }} />
                  )}
                  {meta.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA + secondary actions */}
        <div className="flex flex-col items-stretch lg:items-end gap-2 shrink-0">
          <motion.button
            type="button"
            onClick={() => openConnect(null)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-medium"
            style={{
              background: "var(--primary-bg)",
              color: "var(--primary-fg)",
              fontSize: "13.5px",
              boxShadow: "0 10px 32px -10px rgba(129, 132, 196,0.40)",
            }}
            data-testid="dashboard-new-project-start"
          >
            Start a new project <ArrowRight size={14} />
          </motion.button>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => openConnect(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11.5px]"
              style={{ border: "1px solid var(--hairline)", color: "var(--text-2)", background: "var(--surface)" }}
              data-testid="dashboard-connect-work-btn"
              title="Bring a conversation, design or file into Bracket"
            >
              <Plug size={11} /> Connect work
            </button>
            {hasProjects && (
              <button
                type="button"
                onClick={onAskOpen}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11.5px]"
                style={{ border: "1px solid var(--hairline)", color: "var(--text-2)", background: "var(--surface)" }}
                data-testid="dashboard-ask-bracket-btn"
                title="Ask Bracket across every connected source"
              >
                <Sparkles size={11} /> Ask Bracket
              </button>
            )}
          </div>
          <p className="text-[10.5px] text-right max-w-[260px]" style={{ color: "var(--text-3)" }}>
            One-click OAuth. Bracket never posts on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}
