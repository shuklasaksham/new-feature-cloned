import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import BracketMark from "./BracketMark";
import { useAuth } from "../lib/AuthContext";

export default function AppNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    { to: "/app", label: "PROJECTS", end: true },
    { to: "/app/moments", label: "MOMENTS" },
    { to: "/app/templates", label: "TEMPLATES" },
    { to: "/app/workspace", label: "TEAM" },
    { to: "/app/billing", label: "BILLING" },
  ];
  return (
    <header className="sticky top-0 z-30 bg-paper border-b border-ink" data-testid="app-nav">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/app"><BracketMark /></Link>
          <nav className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `nav-link text-ink ${isActive ? "active" : ""}`}
                data-testid={`appnav-${l.label.toLowerCase()}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono-tag text-muted hidden md:inline" data-testid="appnav-tier">
            {(user?.tier || "FREE").toString().toUpperCase()}
          </span>
          <p className="mono-tag text-muted hidden lg:block">{user?.email}</p>
          <button className="btn-ghost" onClick={async () => { await logout(); navigate("/"); }} data-testid="appnav-logout-btn">
            Log out
          </button>
        </div>
      </div>
      <div className="md:hidden border-t border-ink overflow-x-auto">
        <div className="flex gap-5 px-6 py-3 whitespace-nowrap">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav-link text-ink ${isActive ? "active" : ""}`}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
