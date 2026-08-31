import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hexagon, MessagesSquare, Target, Package, Calendar, ListChecks, Check,
  CalendarClock, Settings, HelpCircle, Plus, ChevronDown, ChevronsLeft, ChevronsRight, Sparkles, Search, X,
} from "lucide-react";
import { ProviderIcon } from "../lib/providersMeta";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";

// Simplified IA: only Home, Conversations, and Timeline live in the main nav.
// Scope / Deliverables / Requirements / Decisions are surfaced inside Home
// (drill-in modals). Deadlines + History are folded into Timeline.
const NAV = [
  { key: "overview", label: "Home", icon: Hexagon },
  { key: "conversations", label: "Conversations", icon: MessagesSquare },
  { key: "timeline", label: "Timeline", icon: CalendarClock },
];

export default function ProjectSidebar({
  project, projects = [], onSwitchProject,
  view, setView, counts = {}, connections = [], onAddSource,
  collapsed, onToggleCollapse,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [quota, setQuota] = useState(null);
  const [projQuery, setProjQuery] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const switchRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    api.get("/project-quota").then(({ data }) => setQuota(data)).catch(() => {});
  }, []);

  const openSources = () => {
    setSourcesOpen(true);
    if (providers.length === 0) {
      api.get("/connect/providers").then(({ data }) => setProviders(data.providers || [])).catch(() => {});
    }
  };
  const addSource = (key) => {
    setSourcesOpen(false);
    navigate(`/app/connect?project=${project?.id || ""}&tool=${key}`);
  };

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
          const filtered = q ? projects.filter((p) => (p.name || "").toLowerCase().includes(q)) : projects;
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
              {filtered.length === 0 ? (
                <p className="psb-switch-empty">{projects.length === 0 ? "No other projects" : "No matches"}</p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`psb-switch-item${p.id === project?.id ? " is-current" : ""}`}
                    onClick={() => { setSwitchOpen(false); setProjQuery(""); if (p.id !== project?.id) onSwitchProject?.(p.id); }}
                    data-testid={`psb-switch-item-${p.id}`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.id === project?.id && <Check size={14} />}
                  </button>
                ))
              )}
            </div>
            <div className="psb-switch-div" />
            {quota && !quota.can_create ? (
              <>
                <button type="button" className="psb-switch-item" onClick={() => { setSwitchOpen(false); navigate("/pricing"); }} data-testid="psb-upgrade">
                  <span className="truncate">Upgrade to add projects</span>
                  <Sparkles size={13} />
                </button>
                <p className="psb-switch-hint" data-testid="psb-quota-hint">
                  {quota.used} of {quota.limit} project{quota.limit === 1 ? "" : "s"} on your plan
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
              onClick={() => setView(n.key)}
              title={n.label}
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
          <button type="button" className="psb-add" onClick={openSources} aria-label="Add a source" data-testid="psb-add-source">
            <Plus size={16} />
          </button>
        </div>
        <ul className="psb-source-list">
          {(connections || []).length === 0 ? (
            <li className="psb-source-empty psb-label">No sources yet</li>
          ) : (
            (connections || []).map((c) => (
              <li key={c.id} className="psb-source-row" title={c.source_name} data-testid={`psb-source-${c.id}`}>
                <span className="psb-source-icon"><ProviderIcon provider={c.provider} size={18} bare /></span>
                <span className="psb-label min-w-0">
                  <span className="psb-source-name">{c.source_name || c.provider}</span>
                  <span className="psb-source-status">
                    <span className="psb-dot" style={{ background: c.health?.level === "red" ? "#D95757" : c.health?.level === "amber" ? "#D4A72C" : "#52A874" }} />
                    {c.health?.level === "red" ? "Reconnect" : "Connected"}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Settings / Help */}
      <div className="psb-foot-nav">
        <button type="button" className="psb-nav-item" onClick={() => navigate("/settings")} title="Settings" data-testid="psb-nav-settings">
          <Settings size={20} strokeWidth={1.9} /> <span className="psb-label">Settings</span>
        </button>
        <button type="button" className="psb-nav-item" onClick={() => navigate("/pricing")} title="Help" data-testid="psb-nav-help">
          <HelpCircle size={20} strokeWidth={1.9} /> <span className="psb-label">Help</span>
        </button>
      </div>

      {/* User card */}
      <div className="psb-user-wrap" ref={userRef}>
        <button type="button" className="psb-user" onClick={() => setUserOpen((o) => !o)} data-testid="psb-user">
          <span className="psb-avatar">{user?.picture || user?.avatar ? <img src={user.picture || user.avatar} alt="" /> : initial}</span>
          <span className="psb-label min-w-0 flex-1 text-left">
            <span className="psb-user-name">{user?.name || "Account"}</span>
            <span className="psb-user-email">{user?.email}</span>
          </span>
          <ChevronDown size={16} className="psb-label" style={{ opacity: 0.7 }} />
        </button>
        {userOpen && (
          <div className="psb-user-menu" data-testid="psb-user-menu">
            <button type="button" className="psb-switch-item" onClick={() => navigate("/settings")}>Settings</button>
            <button type="button" className="psb-switch-item" onClick={() => { setUserOpen(false); logout?.(); navigate("/"); }} data-testid="psb-logout">Log out</button>
          </div>
        )}
      </div>
      {sourcesOpen && (
        <div className="bkt-modal-overlay" onClick={() => setSourcesOpen(false)} data-testid="sources-dialog">
          <div className="bkt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bkt-modal-head">
              <span className="flex items-center gap-2">
                <Plus size={16} style={{ color: "var(--text-2)" }} />
                <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Add a source</span>
              </span>
              <button type="button" className="bkt-modal-x" onClick={() => setSourcesOpen(false)} data-testid="sources-dialog-close"><X size={16} /></button>
            </div>
            <div className="bkt-modal-body" style={{ padding: "12px 14px 16px" }}>
              <p className="text-[12.5px] mb-3" style={{ color: "var(--text-3)" }}>Connect another tool to this project — Bracket reads it and keeps your memory in sync.</p>
              {(providers.length === 0 ? [] : providers).map((p) => {
                const available = p.status === "available";
                return (
                  <button
                    key={p.key}
                    type="button"
                    className="src-dialog-row"
                    disabled={!available}
                    onClick={() => available && addSource(p.key)}
                    data-testid={`source-option-${p.key}`}
                  >
                    <ProviderIcon provider={p.key} size={16} />
                    <span className="min-w-0">
                      <span className="src-dialog-name">{p.label}</span>
                      <span className="src-dialog-desc block truncate">{p.desc}</span>
                    </span>
                    <span className="src-dialog-badge">{available ? "Connect" : "Soon"}</span>
                  </button>
                );
              })}
              {providers.length === 0 && (
                <p className="text-[12.5px] py-4 text-center" style={{ color: "var(--text-3)" }}>Loading sources…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
