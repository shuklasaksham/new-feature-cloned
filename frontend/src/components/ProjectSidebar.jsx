import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hexagon, MessagesSquare, Target, Package, Calendar, ListChecks, Check,
  CalendarClock, Settings, HelpCircle, Plus, ChevronDown, ChevronsLeft, ChevronsRight, Search, Unplug, RefreshCw, Loader2, Archive, ArchiveRestore, FileText,
} from "lucide-react";
import { ProviderIcon } from "../lib/providersMeta";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { toast } from "sonner";
import { useDialog } from "../components/Dialog";
import AddSourceDialog from "./AddSourceDialog";
import PlanModal from "./PlanModal";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";

// Compact "time since" for the per-source sync badge (e.g. 5s / 3m / 2h / 1d).
function relTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Simplified IA: only Home, Conversations, and Timeline live in the main nav.
// Scope / Deliverables / Requirements / Decisions are surfaced inside Home
// (drill-in modals). Deadlines + History are folded into Timeline.
const NAV = [
  { key: "overview", label: "Home", icon: Hexagon },
  { key: "conversations", label: "Conversations", icon: MessagesSquare },
  { key: "notes", label: "Meeting Notes", icon: FileText },
  { key: "timeline", label: "Timeline", icon: CalendarClock },
];

export default function ProjectSidebar({
  project, projects = [], onSwitchProject,
  view, setView, counts = {}, connections = [], onAddSource, onSourcesChanged, onProjectsChanged, onOpenSearch,
  collapsed, onToggleCollapse,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [quota, setQuota] = useState(null);
  const [projQuery, setProjQuery] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(null);
  const [busyConn, setBusyConn] = useState(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const dialog = useDialog();
  const switchRef = useRef(null);
  const userRef = useRef(null);

  const disconnectSource = async (conn) => {
    const ok = await dialog.confirm({
      title: `Disconnect ${conn.source_name || conn.provider}?`,
      message: "Bracket will stop syncing this source. Memory already extracted stays. You can reconnect anytime.",
      confirmLabel: "Disconnect",
      tone: "danger",
    });
    if (!ok) return;
    setBusyConn(conn.id);
    try {
      await api.delete(`/connect/connections/${conn.id}`);
      toast.success(`${conn.source_name || conn.provider} disconnected`);
      onSourcesChanged?.();
    } catch {
      toast.error("Couldn't disconnect that source.");
    } finally {
      setBusyConn(null);
    }
  };

  const reconnectSource = (conn) => {
    setReconnectKey(conn?.provider || null);
    setSourcesOpen(true);
  };

  const archiveProject = async (e, p) => {
    e.stopPropagation();
    try {
      await api.post(`/projects/${p.id}/archive`);
      toast.success(`${p.name} archived`);
      onProjectsChanged?.();
    } catch { toast.error("Couldn't archive that project."); }
  };

  const unarchiveProject = async (e, p) => {
    e.stopPropagation();
    try {
      await api.post(`/projects/${p.id}/unarchive`);
      toast.success(`${p.name} restored`);
      onProjectsChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Couldn't restore that project.");
    }
  };

  useEffect(() => {
    api.get("/project-quota").then(({ data }) => setQuota(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (switchRef.current && !switchRef.current.contains(e.target)) setSwitchOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <aside className={`project-sidebar${collapsed ? " is-collapsed" : ""}`} data-testid="project-sidebar">
      {/* Brand + collapse */}
      <div className="psb-brand">
        <button type="button" className="psb-logo" onClick={() => navigate("/app")} data-testid="psb-home">
          <img src={BRACKET_LOGO} alt="" width={30} height={30} style={{ display: "block" }} />
          <span className="psb-wordmark">bracket.</span>
        </button>
        <button type="button" className="psb-collapse" onClick={onToggleCollapse} aria-label="Collapse sidebar" data-testid="psb-collapse">
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      {/* Project switcher */}
      <div className="psb-switch-wrap" ref={switchRef}>
        <button type="button" className="psb-switch" onClick={() => setSwitchOpen((o) => !o)} data-testid="psb-switcher">
          <span className="psb-switch-name">{project?.name || "Project"}</span>
          <ChevronDown size={18} style={{ opacity: 0.7 }} />
        </button>
        {switchOpen && (() => {
          const q = projQuery.trim().toLowerCase();
          const match = (p) => !q || (p.name || "").toLowerCase().includes(q);
          const active = projects.filter((p) => !p.archived && match(p));
          const archived = projects.filter((p) => p.archived && match(p));
          return (
          <div className="psb-switch-menu" data-testid="psb-switcher-menu">
            {projects.length > 6 && (
              <div className="psb-switch-search">
                <Search size={14} />
                <input
                  autoFocus
                  value={projQuery}
                  onChange={(e) => setProjQuery(e.target.value)}
                  placeholder="Search projects"
                  data-testid="psb-switch-search"
                />
              </div>
            )}
            <div className="psb-switch-scroll">
              {active.length === 0 ? (
                <p className="psb-switch-empty">{projects.length === 0 ? "No projects yet" : "No matches"}</p>
              ) : (
                active.map((p) => (
                  <div
                    key={p.id}
                    className={`psb-switch-item group${p.id === project?.id ? " is-current" : ""}`}
                    onClick={() => { setSwitchOpen(false); setProjQuery(""); if (p.id !== project?.id) onSwitchProject?.(p.id); }}
                    role="button"
                    data-testid={`psb-switch-item-${p.id}`}
                  >
                    <span className="truncate flex-1">{p.name}</span>
                    {p.id === project?.id && <Check size={14} className="shrink-0" />}
                    <button
                      type="button"
                      className="psb-switch-act"
                      title="Archive project"
                      onClick={(e) => archiveProject(e, p)}
                      data-testid={`psb-archive-${p.id}`}
                    >
                      <Archive size={13} />
                    </button>
                  </div>
                ))
              )}
              {archived.length > 0 && (
                <>
                  <p className="psb-switch-section" data-testid="psb-archived-heading">Archived · {archived.length}</p>
                  {archived.map((p) => (
                    <div key={p.id} className="psb-switch-item group is-archived" data-testid={`psb-archived-${p.id}`}>
                      <span className="truncate flex-1">{p.name}</span>
                      <button
                        type="button"
                        className="psb-switch-act"
                        title="Restore project"
                        onClick={(e) => unarchiveProject(e, p)}
                        data-testid={`psb-unarchive-${p.id}`}
                      >
                        <ArchiveRestore size={13} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="psb-switch-div" />
            {quota && !quota.can_create ? (
              <>
                <button type="button" className="psb-switch-item psb-switch-new" onClick={() => { setSwitchOpen(false); setPlanModalOpen(true); }} data-testid="psb-new-project">
                  <span>New project</span>
                  <Plus size={14} />
                </button>
                <p className="psb-switch-hint" data-testid="psb-quota-hint">
                  {quota.used} of {quota.limit} active project{quota.limit === 1 ? "" : "s"} on your plan
                </p>
              </>
            ) : (
              <button type="button" className="psb-switch-item psb-switch-new" onClick={() => { setSwitchOpen(false); navigate("/welcome"); }} data-testid="psb-new-project">
                <span>New project</span>
                <Plus size={14} />
              </button>
            )}
          </div>
          );
        })()}
      </div>

      {/* Nav */}
      <nav className="psb-nav" aria-label="Project sections">
        <button
          type="button"
          className="psb-nav-item psb-nav-search"
          data-tip="Search"
          onClick={() => onOpenSearch?.()}
          data-testid="psb-nav-search"
        >
          <Search size={20} strokeWidth={1.9} />
          <span className="psb-label">Search</span>
          <span className="psb-kbd">⌘K</span>
        </button>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = view === n.key;
          const count = n.cat ? (counts[n.key] || 0) : 0;
          return (
            <button
              key={n.key}
              type="button"
              className="psb-nav-item"
              data-active={active ? "true" : "false"}
              data-tip={n.label}
              onClick={() => setView(n.key)}
              data-testid={`psb-nav-${n.key}`}
            >
              <Icon size={20} strokeWidth={1.9} />
              <span className="psb-label">{n.label}</span>
              {count > 0 && <span className="psb-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="psb-divider" />

      {/* Sources */}
      <div className="psb-sources">
        <div className="psb-section-head">
          <span className="psb-section-label psb-label">Sources</span>
          <button type="button" className="psb-add" onClick={() => setSourcesOpen(true)} aria-label="Add a source" data-tip="Add a source" data-testid="psb-add-source">
            <Plus size={16} />
          </button>
        </div>
        <ul className="psb-source-list">
          {(connections || []).length === 0 ? (
            <li className="psb-source-empty psb-label">No sources yet</li>
          ) : (
            (connections || []).map((c) => {
              const level = c.health?.level;
              const stale = level === "red" || level === "amber";
              const isError = c.status === "error" || c.status === "needs_attention";
              const dot = level === "red" ? "#D95757" : (level === "amber" || isError) ? "#D4A72C" : "#52A874";
              const statusText = level === "red"
                ? "Token expired"
                : level === "amber"
                  ? (c.health?.message || "Expiring soon")
                  : isError
                    ? "Retrying…"
                    : (c.last_synced_at ? `Synced ${relTime(c.last_synced_at)} ago` : "Connected");
              return (
              <li key={c.id} className="psb-source-row group" title={c.source_name} data-testid={`psb-source-${c.id}`}>
                <span className="psb-source-icon"><ProviderIcon provider={c.provider} size={18} bare /></span>
                <span className="psb-label min-w-0 flex-1">
                  <span className="psb-source-name">{c.source_name || c.provider}</span>
                  <span className="psb-source-status" data-testid={`psb-source-status-${c.id}`}>
                    {isError
                      ? <RefreshCw size={10} className="animate-spin" style={{ color: "#D4A72C" }} />
                      : <span className="psb-dot" style={{ background: dot }} />}
                    {statusText}
                  </span>
                </span>
                {stale && (
                  <button
                    type="button"
                    className="psb-reconnect-chip psb-label"
                    data-level={level}
                    title="Reconnect this tool"
                    onClick={() => reconnectSource(c)}
                    data-testid={`psb-source-reconnect-${c.id}`}
                  >
                    <RefreshCw size={11} /> Reconnect
                  </button>
                )}
                <span className="psb-source-actions psb-label">
                  <button type="button" className="psb-src-btn psb-src-btn--danger" title="Disconnect" disabled={busyConn === c.id} onClick={() => disconnectSource(c)} data-testid={`psb-source-disconnect-${c.id}`}>
                    {busyConn === c.id ? <Loader2 size={13} className="animate-spin" /> : <Unplug size={13} />}
                  </button>
                </span>
              </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Help */}
      <div className="psb-foot-nav">
        <button type="button" className="psb-nav-item" data-active={view === "help" ? "true" : "false"} onClick={() => setView("help")} data-tip="Help" data-testid="psb-nav-help">
          <HelpCircle size={20} strokeWidth={1.9} /> <span className="psb-label">Help</span>
        </button>
      </div>

      {/* User card */}
      <div className="psb-user-wrap" ref={userRef}>
        <button type="button" className="psb-user" onClick={() => setUserOpen((o) => !o)} data-testid="psb-user">
          <span className="psb-avatar">
            {initial}
            {user?.picture && /^https?:\/\//.test(user.picture) ? (
              <img src={user.picture} alt="" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.remove()} />
            ) : null}
          </span>
          <span className="psb-label min-w-0 flex-1 text-left">
            <span className="psb-user-name">{user?.name || "Account"}</span>
            <span className="psb-user-email">{user?.email}</span>
          </span>
          <ChevronDown size={16} className="psb-label" style={{ opacity: 0.7 }} />
        </button>
        {userOpen && (
          <div className="psb-user-menu" data-testid="psb-user-menu">
            <button type="button" className="psb-switch-item" onClick={() => { setUserOpen(false); setView("settings"); }}>Settings</button>
            <button type="button" className="psb-switch-item" onClick={() => { setUserOpen(false); logout?.(); navigate("/"); }} data-testid="psb-logout">Log out</button>
          </div>
        )}
      </div>
      <AddSourceDialog
        open={sourcesOpen}
        onClose={() => { setSourcesOpen(false); setReconnectKey(null); }}
        projectId={project?.id}
        onChanged={onSourcesChanged}
        reconnect={reconnectKey}
        connectedProviders={[...new Set((connections || []).map((c) => c.provider))]}
      />
      <PlanModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        defaultPlan="monthly"
        title="Add another project"
      />
    </aside>
  );
}
