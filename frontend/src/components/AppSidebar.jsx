import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Plug,
  Activity as ActivityIcon,
  ShieldCheck,
  Settings as SettingsIcon,
  HelpCircle,
} from "lucide-react";
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
    try {
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) return true;
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch { return false; }
  });
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setCollapsed(true);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    try { if (!isMobile) localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
    document.documentElement.style.setProperty(
      "--sidebar-w",
      isMobile ? "52px" : (collapsed ? "64px" : "240px")
    );
  }, [collapsed, isMobile]);

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
        <Link to="/app" className="brand-mark" data-testid="sidebar-brand" aria-label="Bracket">
          <img
            src="/logo-diamond.png"
            alt="Bracket"
            height={24}
            style={{ display: "block", flexShrink: 0, objectFit: "contain", height: 24, width: "auto" }}
          />
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
          icon={LayoutGrid}
          label="Dashboard"
          collapsed={collapsed}
          active={isProjectsActive}
          dataTestId="sidebar-nav-dashboard"
        />
        <NavItem
          to="/app/activity"
          icon={ActivityIcon}
          label="Activity"
          collapsed={collapsed}
          active={path.startsWith("/app/activity")}
          dataTestId="sidebar-nav-activity"
        />
        <NavItem
          to="/app/connect"
          icon={Plug}
          label="Connect Work"
          collapsed={collapsed}
          active={path.startsWith("/app/connect")}
          dataTestId="sidebar-nav-connect"
        />
      </nav>

      {/* Account section */}
      {!collapsed && (
        <div className="sidebar-section-label mt-5">Account</div>
      )}
      <nav className="sidebar-nav" aria-label="Account">
        <NavItem
          to="/settings"
          icon={SettingsIcon}
          label="Settings"
          collapsed={collapsed}
          active={isSettingsActive}
          dataTestId="sidebar-nav-settings"
        />
        <NavItem
          to="/faq"
          icon={HelpCircle}
          label="FAQ"
          collapsed={collapsed}
          active={path === "/faq"}
          dataTestId="sidebar-nav-faq"
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

      {/* New project CTA removed per design — quick-create lives on the dashboard itself */}

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
