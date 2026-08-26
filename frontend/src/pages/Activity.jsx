import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, AlertTriangle, Check, CalendarClock, Layers,
  ListChecks, HelpCircle, Loader2, X,
} from "lucide-react";
import Seo from "../components/Seo";
import { EmptyState } from "../components/EmptyState";
import { api } from "../lib/api";
import { ProviderIcon, PROVIDER_META, timeAgo } from "../lib/providersMeta";

const CAT_META = {
  decision:     { label: "Decisions",      icon: Check,          color: "#22C55E" },
  deadline:     { label: "Deadlines",      icon: CalendarClock,  color: "#FFB84C" },
  scope_change: { label: "Scope changes",  icon: AlertTriangle,  color: "#EF4444" },
  requirement:  { label: "Requirements",   icon: ListChecks,     color: "#989BE0" },
  deliverable:  { label: "Deliverables",   icon: Layers,         color: "#989BE0" },
  question:     { label: "Open questions", icon: HelpCircle,     color: "var(--text-3)" },
};

const WINDOWS = [
  { key: "24h", label: "24h" },
  { key: "7d",  label: "7 days" },
];

export default function Activity() {
  const [win, setWin] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fProject, setFProject] = useState("all");
  const [fTool, setFTool] = useState("all");
  const [fType, setFType] = useState("all");

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

  // Mark seen -> clears the sidebar badge.
  useEffect(() => {
    if (!data) return;
    localStorage.setItem("bracket.activity.seenTotal", String(data.total || 0));
    window.dispatchEvent(new Event("activity-seen"));
  }, [data]);

  const items = data?.items || [];

  const projectOptions = useMemo(() => {
    const m = new Map();
    items.forEach((it) => { if (it.project_id) m.set(it.project_id, it.project_name || "Untitled"); });
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [items]);

  const toolOptions = useMemo(() => {
    const s = new Set();
    items.forEach((it) => { if (it.provider) s.add(it.provider); });
    return Array.from(s);
  }, [items]);

  const typeOptions = useMemo(() => {
    const s = new Set();
    items.forEach((it) => { if (it.category) s.add(it.category); });
    return Array.from(s);
  }, [items]);

  const filtered = useMemo(() => items.filter((it) =>
    (fProject === "all" || it.project_id === fProject) &&
    (fTool === "all" || it.provider === fTool) &&
    (fType === "all" || it.category === fType)
  ), [items, fProject, fTool, fType]);

  const hasFilters = fProject !== "all" || fTool !== "all" || fType !== "all";
  const clearFilters = () => { setFProject("all"); setFTool("all"); setFType("all"); };

  return (
    <div className="dashboard-root relative min-h-full" data-testid="activity-page">
      <Seo title="Activity" path="/app/activity" noindex />
      <div aria-hidden="true" className="hero-ambient hero-ambient--dashboard" />

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-[1000px] w-full mx-auto px-6 sm:px-8 md:px-10 py-6 md:py-8 flex flex-col gap-6"
      >
        {/* Hero header */}
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="mono-tag text-muted text-[10px] inline-flex items-center gap-1.5">
              <TrendingUp size={11} /> ACTIVITY
            </p>
            <h1 className="mt-1.5 font-display font-semibold tracking-[-0.028em] leading-[1.05] text-[26px] sm:text-[32px] text-[var(--text)]">
              {loading ? "Reading connected work…" : (
                (data?.total || 0) === 0
                  ? "All quiet"
                  : <><span className="text-[var(--accent)]">{data.total}</span> {data.total === 1 ? "change" : "changes"} across {data.projects_with_changes} {data.projects_with_changes === 1 ? "project" : "projects"}</>
              )}
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--text-3)]">
              Decisions, deadlines, scope shifts, requirements and open questions — newest first.
            </p>
          </div>
          <WindowToggle win={win} setWin={setWin} />
        </header>

        {loading ? (
          <div className="rounded-2xl px-6 py-16 flex items-center justify-center gap-2 text-[13px] text-[var(--text-3)]"
               style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
            <Loader2 size={14} className="animate-spin" /> Analyzing your connected work…
          </div>
        ) : (data?.total || 0) === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Nothing new — yet"
            description="When your connected tools surface a new decision, deadline, scope change or question, it shows up here first."
            cta="Connect a tool"
            ctaTo="/app/connect"
            testid="activity-empty"
          />
        ) : (
          <>
            {/* Scope alert banner */}
            {data.scope_alerts > 0 && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-2.5 text-[12.5px]"
                   style={{ background: "var(--danger-soft)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5" }}
                   data-testid="activity-scope-banner">
                <AlertTriangle size={14} className="shrink-0" />
                <span><strong style={{ color: "#fff" }}>{data.scope_alerts} scope alert{data.scope_alerts === 1 ? "" : "s"}</strong> — review before your next client update.</span>
              </div>
            )}

            {/* Counters strip — cinematic category tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5" data-testid="activity-counts">
              {Object.keys(CAT_META).map((k) => {
                const M = CAT_META[k];
                const n = data.counts?.[k] || 0;
                const active = fType === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFType(active ? "all" : k)}
                    disabled={n === 0}
                    className="activity-stat text-left rounded-xl px-3 py-3 transition-all disabled:cursor-default"
                    style={{
                      background: active ? "var(--accent-soft)" : "var(--surface)",
                      border: `1px solid ${active ? "rgba(129, 132, 196,0.4)" : "var(--hairline)"}`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                      opacity: n === 0 ? 0.45 : 1,
                    }}
                    data-testid={`activity-count-${k}`}
                  >
                    <M.icon size={13} style={{ color: M.color }} />
                    <p className="mt-2 font-display font-semibold text-[24px] leading-none tracking-[-0.03em]" style={{ color: "var(--text)" }}>{n}</p>
                    <p className="mt-1 mono-tag text-[8.5px] text-muted leading-tight">{M.label.toUpperCase()}</p>
                  </button>
                );
              })}
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap" data-testid="activity-filters">
              {projectOptions.length > 1 && (
                <select
                  value={fProject}
                  onChange={(e) => setFProject(e.target.value)}
                  className="activity-select"
                  data-testid="activity-filter-project"
                >
                  <option value="all">All projects</option>
                  {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {toolOptions.length > 1 && (
                <div className="flex items-center gap-1.5" data-testid="activity-filter-tools">
                  {toolOptions.map((t) => {
                    const meta = PROVIDER_META[t] || {};
                    const active = fTool === t;
                    return (
                      <button key={t} type="button"
                        onClick={() => setFTool(active ? "all" : t)}
                        className="activity-chip inline-flex items-center gap-1.5"
                        data-active={active ? "true" : "false"}
                        data-testid={`activity-filter-tool-${t}`}>
                        <ProviderIcon provider={t} size={11} />
                        {meta.label || t}
                      </button>
                    );
                  })}
                </div>
              )}
              {hasFilters && (
                <button type="button" onClick={clearFilters}
                        className="activity-chip inline-flex items-center gap-1 text-[var(--text-3)]"
                        data-testid="activity-filter-clear">
                  <X size={11} /> Clear
                </button>
              )}
              <span className="ml-auto mono-tag text-[9.5px] text-[var(--text-3)]">
                {filtered.length} of {items.length} shown
              </span>
            </div>

            {/* Timeline feed */}
            {filtered.length === 0 ? (
              <div className="rounded-xl px-5 py-10 text-center text-[12.5px]"
                   style={{ background: "var(--surface)", border: "1px dashed var(--hairline-strong)", color: "var(--text-3)" }}
                   data-testid="activity-no-match">
                No changes match these filters.
              </div>
            ) : (
              <ol className="activity-feed" data-testid="activity-feed">
                {filtered.map((it) => {
                  const M = CAT_META[it.category] || CAT_META.requirement;
                  return (
                    <li key={it.id} className="activity-feed-row" data-testid={`activity-item-${it.id}`}>
                      <span className="activity-node" style={{ background: M.color, boxShadow: `0 0 0 4px var(--bg), 0 0 12px -2px ${M.color}` }} aria-hidden="true" />
                      <Link to={`/project/${it.project_id}`} className="activity-card group">
                        <div className="flex items-center gap-2 flex-wrap">
                          <M.icon size={12} style={{ color: M.color }} />
                          <span className="mono-tag text-[9px]" style={{ color: M.color }}>{M.label.toUpperCase()}</span>
                          {it.status === "detected" && (
                            <span className="mono-tag text-[9px]" style={{ color: "var(--accent)" }}>· NEW</span>
                          )}
                          <span className="text-[10.5px] text-[var(--text-3)] inline-flex items-center gap-1">
                            <ProviderIcon provider={it.provider} size={10} /> {it.project_name}
                          </span>
                          <span className="ml-auto mono-tag text-[9px] text-[var(--text-3)]">{timeAgo(it.created_at)}</span>
                        </div>
                        <p className="mt-1.5 text-[13.5px] font-medium leading-snug" style={{ color: "var(--text)" }}>{it.title}</p>
                        {it.detail && (
                          <p className="mt-0.5 text-[12px] leading-snug line-clamp-2" style={{ color: "var(--text-2)" }}>{it.detail}</p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </motion.main>
    </div>
  );
}

function WindowToggle({ win, setWin }) {
  return (
    <div className="inline-flex rounded-full p-0.5"
         style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
         data-testid="activity-window-toggle">
      {WINDOWS.map((w) => (
        <button key={w.key} type="button" onClick={() => setWin(w.key)}
          className="px-3.5 py-1.5 rounded-full text-[11.5px] font-medium transition-colors"
          style={win === w.key
            ? { background: "var(--accent)", color: "#fff" }
            : { color: "var(--text-3)", background: "transparent" }}
          data-testid={`activity-window-${w.key}`}>
          {w.label}
        </button>
      ))}
    </div>
  );
}
