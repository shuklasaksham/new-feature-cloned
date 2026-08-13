import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, Plus, ExternalLink, AlertTriangle, MoreHorizontal,
  Pencil, Check, Trash2, RefreshCw, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import Seo from "../components/Seo";
import ChangeActionDrawer from "../components/ChangeActionDrawer";
import { MEMORY_CATEGORIES, CATEGORY_BY_KEY, STATUS_META } from "../lib/memoryCategories";
import { ProviderIcon, timeAgo } from "../lib/providersMeta";

/**
 * ProjectMemory — the new project page. Replaces the 5-step decision flow
 * for /project/:id. Structured around the 9 Bracket Memory categories.
 *
 * Left rail: category list w/ counts.
 * Main pane: selected category's items, filterable by status.
 * Row click on a "detected" item opens the ChangeActionDrawer.
 */
const STATUS_FILTERS = [
  { key: "all",       label: "All" },
  { key: "detected",  label: "New / detected" },
  { key: "confirmed", label: "Confirmed" },
];

export default function ProjectMemory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [memory, setMemory] = useState({ grouped: {}, counts: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("scope");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerItem, setDrawerItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [projRes, memRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/memory`),
      ]);
      setProject(projRes.data.project || projRes.data);
      setMemory(memRes.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // Pick the first non-empty category on first load so the pane isn't empty.
  useEffect(() => {
    if (!loading && memory?.counts) {
      if ((memory.counts[category] || 0) === 0) {
        const first = MEMORY_CATEGORIES.find((c) => (memory.counts[c.key] || 0) > 0);
        if (first) setCategory(first.key);
      }
    }
  }, [loading, memory, category]);

  const activeCat = CATEGORY_BY_KEY[category] || MEMORY_CATEGORIES[0];
  const items = useMemo(() => {
    const list = (memory.grouped?.[category] || []);
    if (statusFilter === "all") return list;
    if (statusFilter === "detected") return list.filter((m) => m.status === "detected" || m.status === "review");
    return list.filter((m) => m.status === statusFilter);
  }, [memory, category, statusFilter]);

  const detectedCount = useMemo(() => {
    let n = 0;
    Object.values(memory.grouped || {}).forEach((arr) =>
      arr.forEach((m) => { if (m.status === "detected" || m.status === "review") n += 1; })
    );
    return n;
  }, [memory]);

  const handleOpenRow = (m) => {
    setDrawerItem(m);
  };

  const handleChanged = () => {
    // Refresh memory after a drawer action.
    load();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Seo title={project ? `${project.name} · Memory · Bracket` : "Project · Bracket"} />

      {/* Top bar */}
      <header className="sticky top-0 z-20" style={{ background: "var(--bg)", borderBottom: "1px solid var(--hairline)" }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/app")}
            className="inline-flex items-center gap-1.5 text-[12.5px]"
            style={{ color: "var(--text-2)" }}
            data-testid="project-memory-back"
          >
            <ArrowLeft size={13} /> Dashboard
          </button>
          {project?.is_demo && (
            <span
              className="mono-tag px-2 py-0.5 rounded-full text-[9.5px]"
              style={{ color: "#4F46E5", background: "rgba(79,70,229,0.10)", border: "1px solid rgba(79,70,229,0.25)" }}
              data-testid="project-memory-demo-tag"
            >
              DEMO
            </span>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 lg:py-8" data-testid="project-memory-page">
        {loading ? (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--text-3)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading project memory…
          </div>
        ) : project ? (
          <>
            {/* Project header */}
            <motion.section
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="flex items-start justify-between gap-4 flex-wrap mb-6"
              data-testid="project-memory-header"
            >
              <div>
                <p className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>
                  {project.client_name || "Client"} · {project.project_type || "Project"}
                </p>
                <h1 className="mt-1.5 text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em]" style={{ color: "var(--text)" }}>
                  {project.name}
                </h1>
                <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
                  {memory.total} memory items across {Object.values(memory.counts || {}).filter((n) => n > 0).length} categories
                  {detectedCount > 0 && (
                    <>
                      {" · "}
                      <span style={{ color: "#D97706" }}>
                        <AlertTriangle size={11} className="inline mb-0.5 mr-0.5" />
                        {detectedCount} new to review
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {detectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Jump to the first category with a detected item.
                      const target = MEMORY_CATEGORIES.find((c) =>
                        (memory.grouped?.[c.key] || []).some((m) => m.status === "detected" || m.status === "review")
                      );
                      if (target) {
                        setCategory(target.key);
                        setStatusFilter("detected");
                      }
                    }}
                    className="clay-signal px-3 py-2 text-[12px] inline-flex items-center gap-1.5"
                    data-testid="project-memory-review-cta"
                  >
                    <Sparkles size={11} /> Review changes
                  </button>
                )}
              </div>
            </motion.section>

            {/* Grid: category rail | main pane */}
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6">
              {/* Category rail */}
              <aside data-testid="project-memory-rail">
                <p className="mono-tag text-[9.5px] mb-2" style={{ color: "var(--text-3)" }}>PROJECT MEMORY</p>
                <ul className="flex flex-col gap-0.5">
                  {MEMORY_CATEGORIES.map((c) => {
                    const n = memory.counts?.[c.key] || 0;
                    const isActive = category === c.key;
                    return (
                      <li key={c.key}>
                        <button
                          type="button"
                          onClick={() => { setCategory(c.key); setStatusFilter("all"); }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
                          style={{
                            background: isActive ? "var(--surface-2)" : "transparent",
                            border: isActive ? "1px solid var(--hairline-strong)" : "1px solid transparent",
                            color: isActive ? "var(--text)" : "var(--text-2)",
                          }}
                          data-testid={`project-memory-rail-${c.key}`}
                        >
                          <c.icon size={13} style={{ color: c.color }} />
                          <span className="flex-1 text-[13px] font-medium">{c.label}</span>
                          <span
                            className="mono-tag text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              color: n > 0 ? "var(--text-2)" : "var(--text-3)",
                              background: n > 0 ? "var(--surface-3)" : "transparent",
                            }}
                          >
                            {n}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Connected sources — compact list. Full management lives on /app/connect. */}
                <ConnectedSourcesCompact projectId={id} />
              </aside>

              {/* Main pane */}
              <section data-testid="project-memory-pane">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-center gap-2.5">
                    <activeCat.icon size={16} style={{ color: activeCat.color }} />
                    <h2 className="text-[19px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
                      {activeCat.label}
                    </h2>
                    <span className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>
                      · {items.length} {statusFilter === "all" ? "items" : STATUS_FILTERS.find((s) => s.key === statusFilter)?.label.toLowerCase()}
                    </span>
                  </div>
                  <div
                    className="inline-flex rounded-full p-0.5"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)" }}
                    data-testid="project-memory-status-filter"
                  >
                    {STATUS_FILTERS.map((s) => (
                      <button
                        key={s.key} type="button" onClick={() => setStatusFilter(s.key)}
                        className="mono-tag px-3 py-1 rounded-full text-[10px] transition-colors"
                        style={statusFilter === s.key
                          ? { background: "rgba(79,70,229,0.12)", color: "#4F46E5", border: "1px solid rgba(79,70,229,0.25)" }
                          : { color: "var(--text-3)", border: "1px solid transparent", background: "transparent" }}
                        data-testid={`project-memory-filter-${s.key}`}
                      >
                        {s.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {items.length === 0 ? (
                  <div
                    className="rounded-xl p-8 text-center"
                    style={{ background: "var(--surface)", border: "1px dashed var(--hairline-strong)" }}
                    data-testid="project-memory-empty"
                  >
                    <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                      Nothing in <span style={{ color: "var(--text-2)" }}>{activeCat.plural}</span> yet.
                      Connect a source or add an item manually — Bracket keeps this up to date automatically.
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2" data-testid="project-memory-items">
                    {items.map((m) => (
                      <MemoryRow key={m.id} item={m} cat={activeCat} onOpen={handleOpenRow} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text-3)" }}>Project not found.</p>
        )}
      </main>

      <ChangeActionDrawer
        item={drawerItem}
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        onChanged={handleChanged}
      />
    </div>
  );
}

function MemoryRow({ item, cat, onOpen }) {
  const status = STATUS_META[item.status] || STATUS_META.confirmed;
  const isChange = item.status === "detected" || item.status === "review";
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="w-full text-left rounded-xl px-4 py-3.5 transition-colors"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--hairline-strong)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--hairline)"; }}
        data-testid={`project-memory-row-${item.id}`}
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center"
            style={{ background: `${cat.color}14`, color: cat.color }}
          >
            <cat.icon size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="mono-tag px-1.5 py-0.5 rounded text-[9px]"
                style={{ color: status.color, background: status.bg, border: `1px solid ${status.color}33` }}
              >
                {status.label}
              </span>
              {item.is_scope_change && (
                <span
                  className="mono-tag px-1.5 py-0.5 rounded text-[9px]"
                  style={{ color: "#DC2626", background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.2)" }}
                >
                  <AlertTriangle size={9} className="inline mr-0.5" /> SCOPE CREEP
                </span>
              )}
              <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>
                <ProviderIcon provider={item.provider} size={10} className="inline mr-1 align-middle" />
                {item.source_label} · {timeAgo(item.created_at)}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] font-medium leading-snug" style={{ color: "var(--text)" }}>
              {item.title}
            </p>
            {item.detail && (
              <p className="mt-0.5 text-[12px] leading-snug line-clamp-2" style={{ color: "var(--text-2)" }}>
                {item.detail}
              </p>
            )}
          </div>
          {isChange && (
            <span className="shrink-0 mono-tag text-[9px] mt-1" style={{ color: "#4F46E5" }}>
              REVIEW →
            </span>
          )}
        </div>
      </button>
    </li>
  );
}


function ConnectedSourcesCompact({ projectId }) {
  const [conns, setConns] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}/connections`);
        if (!cancelled) setConns(data.connections || []);
      } catch { if (!cancelled) setConns([]); }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  if (conns === null) return null;
  return (
    <div className="mt-6" data-testid="project-memory-sources">
      <p className="mono-tag text-[9.5px] mb-2" style={{ color: "var(--text-3)" }}>CONNECTED SOURCES</p>
      {conns.length === 0 ? (
        <Link
          to="/app/connect"
          className="block rounded-lg px-3 py-2.5 text-[12px]"
          style={{ border: "1px dashed var(--hairline-strong)", color: "var(--text-2)" }}
          data-testid="project-memory-sources-connect"
        >
          + Connect Gmail, Slack or Figma to feed this project.
        </Link>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {conns.map((c) => {
            const isBad = c.health?.level === "red";
            const isWarn = c.health?.level === "amber";
            return (
              <li key={c.id}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                  style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
                <ProviderIcon provider={c.provider} size={12} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate" style={{ color: "var(--text)" }}>{c.source_name}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    {isBad ? c.health.message : (isWarn ? c.health.message : `Synced ${timeAgo(c.last_synced_at)}`)}
                  </p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: isBad ? "#DC2626" : isWarn ? "#D97706" : "#16A34A" }} />
              </li>
            );
          })}
        </ul>
      )}
      <Link to="/app/connect" className="text-[11px] mt-2 inline-flex items-center gap-1"
            style={{ color: "var(--accent)" }}
            data-testid="project-memory-sources-manage">
        Manage connections <ExternalLink size={10} />
      </Link>
    </div>
  );
}
