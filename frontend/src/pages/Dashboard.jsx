import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Check,
  Layers,
  ListChecks,
  CalendarRange,
  AlertTriangle,
  ScrollText,
  Pencil,
  Plug,
  Square,
  CheckSquare,
  Trash2,
  Plus,
  Search,
  FolderOpen,
  Lock,
  CircleDot,
  X,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";
import { useDialog } from "../components/Dialog";
import NotificationBell from "../components/NotificationBell";
import GlobalAskModal from "../components/GlobalAskModal";
import NewProjectComposer from "../components/NewProjectComposer";
import OnboardingWelcome from "../components/OnboardingWelcome";
import FirstRunChecklist from "../components/FirstRunChecklist";
import { EmptyState } from "../components/EmptyState";


const AI_OUTPUTS = [
  { icon: ListChecks,   label: "Scope",             hint: "in / out / deliverables" },
  { icon: Layers,       label: "Deliverables",      hint: "sized + owned" },
  { icon: CalendarRange,label: "Timeline",          hint: "sprints + milestones" },
  { icon: AlertTriangle,label: "Risks",             hint: "before your client sees them" },
  { icon: Check,        label: "Decisions",         hint: "with rationale + trade-offs" },
  { icon: ScrollText,   label: "Client-ready docs", hint: "sign-off + PDF" },
];

const STAGE_STYLE = {
  in_progress: { backgroundColor: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--hairline)" },
  locked:      { backgroundColor: "#8184C4", color: "#FFFFFF", border: "1px solid #8184C4" },
  awaiting:    { backgroundColor: "rgba(245,158,11,0.14)", color: "#FBBF24", border: "1px solid rgba(245,158,11,0.35)" },
  rejected:    { backgroundColor: "#EF4444", color: "#FFFFFF", border: "1px solid #EF4444" },
  accepted:    { backgroundColor: "#22C55E", color: "#0A0A0C", border: "1px solid #22C55E" },
};
// Stage precedence: client review outcome > awaiting reply > locked > in progress.
function projectStage(p) {
  if (p.share_status === "accepted") return { key: "accepted", label: "ACCEPTED" };
  if (p.share_status === "rejected") return { key: "rejected", label: "REJECTED" };
  if (p.share_status === "sent" || p.share_status === "awaiting_reply")
    return { key: "awaiting", label: "AWAITING REPLY" };
  if (p.status === "locked") return { key: "locked", label: "LOCKED" };
  return { key: "in_progress", label: "IN PROGRESS" };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { prompt: promptDialog, confirm: confirmDialog } = useDialog();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // Composer / paste-flow state was removed when the textbox was retired
  // — Dashboard now hands off to the ConnectWork onboarding on new projects.
  const [askOpen, setAskOpen] = useState(false);
  // First-run onboarding — only appears for brand-new users (0 projects, no
  // "seen" flag in localStorage). Feature is offered from the composer too
  // (Show intro) so returning users can replay it if they want.
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  // ─── Multi-select bulk-delete ─────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = (visibleProjects) => {
    setSelectedIds(new Set(visibleProjects.map((p) => p.id)));
  };
  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = await confirmDialog({
      title: ids.length === 1 ? "Delete 1 project?" : `Delete ${ids.length} projects?`,
      message: "This can't be undone. All associated inputs and generated outputs will be permanently removed.",
      confirmLabel: `Delete ${ids.length}`,
      cancelLabel: "Keep them",
      tone: "danger",
    });
    if (!ok) return;
    setBulkDeleting(true);
    try {
      const { data } = await api.post("/projects/bulk-delete", { ids });
      setProjects((list) => list.filter((p) => !selectedIds.has(p.id)));
      clearSelection();
      toast.success(`Deleted ${data.deleted} project${data.deleted === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Remove any legacy demo project (silent, one-shot cleanup after the pivot).
        try { await api.delete("/demo/reset"); } catch { /* non-blocking */ }
        const { data } = await api.get("/projects");
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        // First-run onboarding — only for empty accounts that haven't seen it.
        let seen = false;
        try { seen = localStorage.getItem("bracket.onboarding.seen") === "1"; } catch { /* private */ }
        if (!seen && list.length === 0) {
          // Small delay so the page settles first — feels less abrupt.
          setTimeout(() => setOnboardingOpen(true), 550);
        }
      } catch (e) {
        toast.error(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-focus + composer helpers removed — the textbox they served is gone.

  // Optimistic rename — prompt, PATCH, patch local state on success. Keeps
  // the interaction snappy on the dashboard.
  const renameProject = async (p) => {
    const nextName = await promptDialog({
      title: "Rename project",
      message: "Give this project a clearer name.",
      defaultValue: p.name,
      placeholder: "New project name",
      confirmLabel: "Save",
    });
    const trimmed = (nextName || "").trim();
    if (!trimmed || trimmed === p.name) return;
    try {
      const { data } = await api.patch(`/projects/${p.id}`, { name: trimmed });
      setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, name: data.name } : x)));
      toast.success("Renamed.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Confirm + DELETE. Removes from local list on success.
  const deleteProject = async (p) => {
    const ok = await confirmDialog({
      title: `Delete "${p.name}"?`,
      message: "This can't be undone. All associated inputs and generated outputs will be permanently removed.",
      confirmLabel: "Delete project",
      cancelLabel: "Keep it",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/projects/${p.id}`);
      setProjects((list) => list.filter((x) => x.id !== p.id));
      toast.success("Project deleted.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const shouldReduce = useReducedMotion();
  const { user, logout } = useAuth();

  // ─── Search + status filter over the projects list ─────────────────
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");   // all | in_progress | locked | rejected | accepted

  const stats = useMemo(() => {
    const total = projects.length;
    let inProgress = 0, locked = 0;
    for (const p of projects) {
      if (p.status === "locked") locked += 1;
      else if ((p.step || 1) > 1) inProgress += 1;
    }
    return { total, inProgress, locked, draft: total - inProgress - locked };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (statusFilter === "all") return true;
      return projectStage(p).key === statusFilter;
    });
  }, [projects, query, statusFilter]);

  // Only show the onboarding "examples + what we produce" tiles for
  // brand-new users. Once they have a project, they've seen the goods.
  const hasProjects = !loading && projects.length > 0;

  // Cinematic staggered entry matching Landing/Login.
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: shouldReduce ? 0 : 0.06, delayChildren: 0.04 } },
  };
  const item = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  const greeting = (() => {
    const first = (user?.name || user?.email || "").split(/[ .@]/)[0];
    const h = new Date().getHours();
    const timeOfDay = h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    return first ? `${timeOfDay}, ${first[0].toUpperCase()}${first.slice(1)}.` : `${timeOfDay}.`;
  })();

  const focusComposer = () => { /* no-op; composer is now a CTA panel */ };

  return (
    <div className="dashboard-root relative min-h-full" data-testid="dashboard-page">
      <Seo title="Dashboard" path="/app" noindex />

      <GlobalAskModal open={askOpen} onClose={() => setAskOpen(false)} />
      <OnboardingWelcome
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onFinish={() => setOnboardingOpen(false)}
      />

      {/* Ambient dot pattern — subtle depth on paper. Colours come from CSS
          tokens (see .hero-ambient--dashboard) so this respects the theme. */}
      <div aria-hidden="true" className="hero-ambient hero-ambient--dashboard" />

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="relative max-w-[1440px] w-full mx-auto px-6 sm:px-8 md:px-10 py-6 md:py-8 flex flex-col gap-5 md:gap-6"
      >
        {/* ─── Header — greeting + primary CTA + stats ────────────────── */}
        <motion.header variants={item} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              <p className="mono-tag text-muted text-[10px]">DASHBOARD</p>
              <h1 className="mt-1.5 font-display font-semibold tracking-[-0.028em] leading-[1.1] text-[26px] sm:text-[30px] text-[var(--text)]" data-testid="dashboard-greeting">
                {greeting}
              </h1>
              <p className="mt-1 text-[13px] text-[var(--text-3)]">
                {hasProjects
                  ? `You have ${stats.total} project${stats.total === 1 ? "" : "s"} · ${stats.locked} locked · ${stats.inProgress} in progress.`
                  : "Paste a client conversation and Bracket does the thinking."}
              </p>
            </div>
            {/* Mobile-only sign out — the sidebar (and its logout) is hidden on phones. */}
            <div className="flex items-center gap-2 shrink-0 self-center">
              <NotificationBell />
              <button
                type="button"
                onClick={async () => { await logout(); navigate("/", { replace: true }); }}
                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--hairline)] text-[var(--text-3)] active:text-[var(--text)]"
                aria-label="Sign out"
                data-testid="dashboard-mobile-logout"
              >
                <LogOut size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </motion.header>

        {/* Change Digest moved to its own Activity view (/app/activity). */}

        {/* Stat pills — only show when the user has projects. */}
        {hasProjects && (
          <motion.div variants={item} className="grid grid-cols-3 gap-3" data-testid="dashboard-stats">
            <StatCard label="Total projects" value={stats.total} icon={FolderOpen} accent="var(--text-2)" />
            <StatCard label="In progress" value={stats.inProgress} icon={CircleDot} accent="#989BE0" />
            <StatCard label="Locked" value={stats.locked} icon={Lock} accent="#8184C4" />
          </motion.div>
        )}

        {/* ─── New composer: intent-first onboarding, no textbox. ────── */}
        <motion.section variants={item} data-testid="dashboard-composer-section">
          <NewProjectComposer
            onAskOpen={() => setAskOpen(true)}
            hasProjects={hasProjects}
          />
        </motion.section>

        <motion.div variants={item}>
          <FirstRunChecklist />
        </motion.div>

        {/* ─── With projects: projects list. Without: onboarding tiles. ─ */}
        {loading ? (
          <motion.div variants={item} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true" data-testid="dashboard-loading-skeleton">
            {[0, 1, 2].map((i) => (
              <div key={i} className="dashboard-tile p-4">
                <div className="skeleton-bar h-2.5 w-24 rounded" />
                <div className="skeleton-bar h-3 w-1/2 rounded mt-3" />
                <div className="skeleton-bar h-2.5 w-1/3 rounded mt-2" />
              </div>
            ))}
          </motion.div>
        ) : hasProjects ? (
          <>
            {/* Projects list header — search + filter tabs */}
            <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid="dashboard-projects-header">
              <p className="mono-tag text-muted text-[10px]">YOUR PROJECTS · {filteredProjects.length}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="dashboard-search relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    className="dashboard-search-input"
                    data-testid="dashboard-search-input"
                  />
                </div>
                <div className="dashboard-filter-tabs">
                  {[
                    { key: "all", label: "All" },
                    { key: "in_progress", label: "In progress" },
                    { key: "locked", label: "Locked" },
                    { key: "awaiting", label: "Awaiting reply" },
                    { key: "rejected", label: "Rejected" },
                    { key: "accepted", label: "Accepted" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatusFilter(f.key)}
                      className={`dashboard-filter-tab ${statusFilter === f.key ? "active" : ""}`}
                      data-testid={`dashboard-filter-${f.key}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div variants={item} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="dashboard-projects-grid">
              {filteredProjects.length === 0 ? (
                <div className="col-span-full dashboard-tile dashboard-tile--empty flex items-center justify-center h-[100px]">
                  <p className="text-[12.5px] text-[var(--text-3)]">No projects match your filters.</p>
                </div>
              ) : (
                <>
                  {/* Selection bar — only appears when at least one project
                     is ticked. Sticks to the top of the grid, offers select-all
                     and a single bulk-delete action. */}
                  {selectedIds.size > 0 && (
                    <div
                      className="col-span-full dashboard-selection-bar"
                      data-testid="dashboard-selection-bar"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          className="dashboard-selection-toggle"
                          onClick={() => {
                            if (selectedIds.size === filteredProjects.length) {
                              clearSelection();
                            } else {
                              selectAllVisible(filteredProjects);
                            }
                          }}
                          data-testid="dashboard-selection-toggle-all"
                          aria-label={selectedIds.size === filteredProjects.length ? "Clear selection" : "Select all"}
                        >
                          {selectedIds.size === filteredProjects.length ? (
                            <CheckSquare size={14} />
                          ) : (
                            <Square size={14} />
                          )}
                          <span>
                            {selectedIds.size === filteredProjects.length
                              ? "All selected"
                              : `${selectedIds.size} selected`}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="dashboard-selection-link"
                          onClick={() => selectAllVisible(filteredProjects)}
                          data-testid="dashboard-selection-select-all"
                        >
                          Select all ({filteredProjects.length})
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={bulkDelete}
                          disabled={bulkDeleting}
                          className="dashboard-selection-danger"
                          data-testid="dashboard-selection-bulk-delete"
                        >
                          {bulkDeleting ? (
                            <><Loader2 size={12} className="animate-spin" /> Deleting…</>
                          ) : (
                            <><Trash2 size={12} /> Delete {selectedIds.size}</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="dashboard-selection-ghost"
                          data-testid="dashboard-selection-clear"
                          aria-label="Cancel selection"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  {filteredProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onRename={renameProject}
                      onDelete={deleteProject}
                      selected={selectedIds.has(p.id)}
                      selectionActive={selectedIds.size > 0}
                      onToggleSelect={() => toggleSelect(p.id)}
                    />
                  ))}
                </>
              )}
            </motion.div>
          </>
        ) : (
          // ─── Empty state — the NewProjectComposer above handles the
          // intent-first CTA; this illustrated panel makes the empty
          // dashboard feel intentional and shows what Bracket produces.
          <motion.div variants={item} data-testid="dashboard-outputs-wrap">
            <EmptyState
              icon={Plug}
              title="No projects yet"
              description="Connect a client tool above and Bracket builds a living project memory automatically. Here's what it keeps track of:"
              testid="dashboard-empty"
            >
              <div className="produces-manifest max-w-[520px] mx-auto text-left">
                {AI_OUTPUTS.map((o) => {
                  const Icon = o.icon;
                  return (
                    <div key={o.label} className="produces-manifest-row">
                      <span className="produces-manifest-check" aria-hidden="true">
                        <Check size={11} />
                      </span>
                      <Icon size={13} className="text-[var(--text-3)] shrink-0" />
                      <p className="text-[12.5px] font-medium text-[var(--text)]">{o.label}</p>
                      <p className="text-[11px] text-[var(--text-3)] hidden md:block truncate">{o.hint}</p>
                    </div>
                  );
                })}
              </div>
            </EmptyState>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}

// ─── Stat pill ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="dashboard-stat-card" data-testid={`dashboard-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between">
        <p className="mono-tag text-muted text-[10px]">{label.toUpperCase()}</p>
        <Icon size={12} style={{ color: accent }} />
      </div>
      <p className="mt-2 font-display font-semibold tracking-[-0.02em] text-[28px] leading-none">{value}</p>
    </div>
  );
}

// ─── Project card — actions ALWAYS visible on the card, no hover trick.
function ProjectCard({ project: p, onRename, onDelete, selected, selectionActive, onToggleSelect }) {
  const stage = projectStage(p);
  return (
    <div
      className={`dashboard-project-card relative ${selected ? "is-selected" : ""} ${selectionActive ? "is-selection-active" : ""}`}
      data-testid={`dashboard-recent-${p.id}`}
    >
      {/* Selection checkbox — always visible on hover, always visible once
         selection mode is active (any card ticked). Clicking the checkbox
         toggles selection without navigating. */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect?.(); }}
        className="dashboard-project-checkbox"
        aria-label={selected ? "Unselect project" : "Select project"}
        aria-pressed={selected}
        data-testid={`dashboard-recent-select-${p.id}`}
      >
        {selected ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>
      <Link to={`/project/${p.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-[14px] leading-snug line-clamp-2 flex-1">{p.name}</p>
          <span
            className="mono-tag px-1.5 py-0.5 rounded shrink-0 text-[9.5px]"
            style={STAGE_STYLE[stage.key]}
            data-testid={`dashboard-stage-${p.id}`}
          >
            {stage.label}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
          <span>{formatDate(p.updated_at)}</span>
        </div>
      </Link>
      <div className="dashboard-project-actions" data-testid={`dashboard-project-actions-${p.id}`}>
        <Link
          to={`/project/${p.id}`}
          className="dashboard-project-action"
          title="Open project"
          data-testid={`dashboard-open-${p.id}`}
          aria-label="Open project"
        >
          <ArrowRight size={12} /> Open
        </Link>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRename(p); }}
          className="dashboard-project-action dashboard-project-action--icon"
          title="Rename"
          aria-label="Rename project"
          data-testid={`dashboard-recent-rename-${p.id}`}
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(p); }}
          className="dashboard-project-action dashboard-project-action--icon dashboard-project-action--danger"
          title="Delete"
          aria-label="Delete project"
          data-testid={`dashboard-recent-delete-${p.id}`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ---- helpers ----

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
