import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, TrendingUp, AlertTriangle, Check, CalendarClock, Layers, ListChecks, HelpCircle } from "lucide-react";
import { api } from "../lib/api";
import { ProviderIcon, timeAgo } from "../lib/providersMeta";
import { EmptyState } from "./EmptyState";

/**
 * ChangeDigestPanel — "What changed" roll-up across every connected project.
 * Only renders when the user has at least one detected change in the window.
 */
const CAT_META = {
  decision:     { label: "Decisions",     icon: Check,          color: "#22C55E" },
  deadline:     { label: "Deadlines",     icon: CalendarClock,  color: "#FFB84C" },
  scope_change: { label: "Scope changes", icon: AlertTriangle,  color: "#EF4444" },
  requirement:  { label: "Requirements",  icon: ListChecks,     color: "#989BE0" },
  deliverable:  { label: "Deliverables",  icon: Layers,         color: "#989BE0" },
  question:     { label: "Open questions",icon: HelpCircle,     color: "var(--text-3)" },
};

const WINDOWS = [
  { key: "24h", label: "Since yesterday" },
  { key: "7d",  label: "Last 7 days" },
];

export default function ChangeDigestPanel({ showEmptyState = false }) {
  const [win, setWin] = useState("24h");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get(`/connect/digest?window=${win}`);
        if (!cancelled) setData(data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [win]);

  // Hide the panel entirely when there's nothing to show — no need to nag
  // an empty dashboard. `null` avoids layout jitter for first-time users.
  // On the Activity page (showEmptyState) we render a quiet empty note instead.
  const total = data?.total || 0;
  if (!loading && total === 0) {
    if (!showEmptyState) return null;
    return (
      <EmptyState
        icon={TrendingUp}
        title="Nothing new — yet"
        description="When your connected tools surface a new decision, deadline, scope change or question, it shows up here first."
        cta="Connect a tool"
        ctaTo="/app/connect"
        testid="activity-empty"
      />
    );
  }

  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(180deg, rgba(129, 132, 196,0.06) 0%, rgba(129, 132, 196,0.02) 100%)",
        border: "1px solid rgba(129, 132, 196,0.20)",
      }}
      data-testid="change-digest-panel"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="mono-tag text-muted text-[10px] inline-flex items-center gap-1.5">
            <TrendingUp size={11} /> CHANGE DIGEST
          </p>
          <h2 className="mt-1 font-display font-medium tracking-[-0.02em] text-[18px] text-[var(--text)]" data-testid="change-digest-title">
            {loading ? "Reading connected work…" : (
              total === 0
                ? "No new changes"
                : `${total} change${total === 1 ? "" : "s"} across ${data.projects_with_changes} project${data.projects_with_changes === 1 ? "" : "s"}`
            )}
          </h2>
          {!loading && data?.scope_alerts > 0 && (
            <p className="mt-1 text-[11.5px] inline-flex items-center gap-1.5" style={{ color: "#FFB84C" }} data-testid="change-digest-scope-alerts">
              <AlertTriangle size={11} /> {data.scope_alerts} scope alert{data.scope_alerts === 1 ? "" : "s"} — review before your next client update.
            </p>
          )}
        </div>
        <div
          className="inline-flex rounded-full p-0.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--hairline)" }}
          data-testid="change-digest-window-toggle"
        >
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWin(w.key)}
              className="mono-tag px-3 py-1 rounded-full text-[10px] transition-colors"
              style={win === w.key
                ? { background: "rgba(129, 132, 196,0.18)", color: "#989BE0", border: "1px solid rgba(129, 132, 196,0.35)" }
                : { color: "var(--text-3)", border: "1px solid transparent", background: "transparent" }}
              data-testid={`change-digest-window-${w.key}`}
            >
              {w.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-[12px] text-[var(--text-3)] inline-flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Analyzing…
        </p>
      ) : (
        <>
          {/* Counters strip */}
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2" data-testid="change-digest-counts">
            {Object.keys(CAT_META).map((k) => {
              const M = CAT_META[k];
              const n = data.counts?.[k] || 0;
              return (
                <div
                  key={k}
                  className="rounded-lg px-2.5 py-2"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--hairline)",
                    opacity: n === 0 ? 0.5 : 1,
                  }}
                  data-testid={`change-digest-count-${k}`}
                >
                  <div className="flex items-center gap-1.5">
                    <M.icon size={11} style={{ color: M.color }} />
                    <span className="mono-tag text-[9px] text-muted">{M.label.toUpperCase()}</span>
                  </div>
                  <p className="mt-1 font-display font-semibold text-[18px] leading-none tracking-[-0.02em]">{n}</p>
                </div>
              );
            })}
          </div>

          {/* Top items */}
          {(data.items || []).length > 0 && (
            <div className="mt-4">
              <p className="mono-tag text-muted text-[9.5px] mb-2">RECENT CHANGES</p>
              <div className="flex flex-col">
                {data.items.slice(0, 6).map((it) => {
                  const M = CAT_META[it.category] || CAT_META.requirement;
                  return (
                    <Link
                      key={it.id}
                      to={`/project/${it.project_id}`}
                      className="flex items-start gap-3 py-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors -mx-2 px-2 rounded"
                      style={{ borderBottom: "1px solid var(--hairline)" }}
                      data-testid={`change-digest-item-${it.id}`}
                    >
                      <ProviderIcon provider={it.provider} size={13} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <M.icon size={11} style={{ color: M.color }} />
                          <span className="mono-tag text-[9px]" style={{ color: M.color }}>{M.label.toUpperCase()}</span>
                          <span className="text-[10px] text-[var(--text-3)]">· {it.project_name}</span>
                        </div>
                        <p className="mt-1 text-[12.5px] font-medium text-[var(--text)] leading-snug">{it.title}</p>
                        {it.detail && (
                          <p className="mt-0.5 text-[11px] text-[var(--text-3)] leading-snug line-clamp-1">{it.detail}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-[var(--text-3)]">{it.source_label} · {timeAgo(it.created_at)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
