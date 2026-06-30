import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Settings as SettingsIcon,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  Plus,
} from "lucide-react";
import BracketMark from "./BracketMark";
import Avatar from "./Avatar";
import { useAuth } from "../lib/AuthContext";

const STORAGE_KEY = "bracket.sidebar.collapsed";

function NavItem({ to, icon: Icon, label, collapsed, active, end, dataTestId, onClick }) {
  const content = (
    <>
      <span className="nav-icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      {!collapsed && <span className="nav-label">{label}</span>}
      {active && <span className="nav-active-bar" aria-hidden="true" />}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`nav-item ${active ? "is-active" : ""}`}
        title={collapsed ? label : undefined}
        data-testid={dataTestId}
      >
        {content}
      </button>
    );
  }
  return (
    <Link
      to={to}
      end={end ? "true" : undefined}
      className={`nav-item ${active ? "is-active" : ""}`}
      title={collapsed ? label : undefined}
      data-testid={dataTestId}
    >
      {content}
    </Link>
  );
}

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
    document.documentElement.style.setProperty(
      "--sidebar-w",
      collapsed ? "64px" : "240px"
    );
  }, [collapsed]);

  const path = location.pathname;
  const isProjectsActive =
    path === "/app" || path === "/app/new" || path.startsWith("/project/");
  const isSettingsActive = path === "/settings";
  const isAdminActive = path.startsWith("/admin");

  const isAdmin = !!user?.is_admin;

  const onLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <aside
      className={`app-sidebar ${collapsed ? "is-collapsed" : ""}`}
      data-testid="app-sidebar"
      data-collapsed={collapsed ? "1" : "0"}
    >
      {/* Brand + collapse toggle */}
      <div className="sidebar-brand">
        <Link to="/app" className="brand-mark" data-testid="sidebar-brand">
          <BracketMark size={22} label={false} variant="chalk" />
          {!collapsed && <span className="brand-text">Bracket</span>}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="collapse-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          data-testid="sidebar-collapse-toggle"
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Workspace section label */}
      {!collapsed && (
        <div className="sidebar-section-label">Workspace</div>
      )}

      {/* Primary nav */}
      <nav className="sidebar-nav" aria-label="Primary">
        <NavItem
          to="/app"
          icon={FolderKanban}
          label="Projects"
          collapsed={collapsed}
          active={isProjectsActive}
          dataTestId="sidebar-nav-projects"
        />
        <NavItem
          to="/settings"
          icon={SettingsIcon}
          label="Settings"
          collapsed={collapsed}
          active={isSettingsActive}
          dataTestId="sidebar-nav-settings"
        />
        {isAdmin && (
          <NavItem
            to="/admin"
            icon={ShieldCheck}
            label="Admin"
            collapsed={collapsed}
            active={isAdminActive}
            dataTestId="sidebar-nav-admin"
          />
        )}
      </nav>

      {/* New project quick action */}
      <div className="sidebar-cta">
        <Link
          to="/app/new"
          className={`new-project-btn ${collapsed ? "is-collapsed" : ""}`}
          title={collapsed ? "New project" : undefined}
          data-testid="sidebar-new-project"
        >
          <Plus size={14} strokeWidth={2} />
          {!collapsed && <span>New project</span>}
        </Link>
      </div>

      <div className="sidebar-spacer" />

      {/* User card at bottom */}
      {user && (
        <div className={`sidebar-user ${collapsed ? "is-collapsed" : ""}`} data-testid="sidebar-user">
          <Link
            to="/settings"
            className="user-info"
            title={collapsed ? (user.name || user.email) : undefined}
          >
            <Avatar id={user.avatar || "mono-1"} size={28} initial={user.name || user.email} />
            {!collapsed && (
              <div className="user-meta">
                <div className="user-name">{user.name || "—"}</div>
                <div className="user-email">{user.email}</div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="user-logout"
            aria-label="Sign out"
            title="Sign out"
            data-testid="sidebar-logout"
          >
            <LogOut size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </aside>
  );
}
