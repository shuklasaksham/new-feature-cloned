import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BracketMark from "./BracketMark";
import { NAV_LINKS } from "../lib/constants";
import { useAuth } from "../lib/AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const logoHref = user ? "/app" : "/";

  return (
    <header className="marketing-header" data-testid="site-navbar">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 h-full flex items-center justify-between gap-3">
        {/* Brand */}
        <Link to={logoHref} className="flex items-center gap-2 shrink-0 group" data-testid="nav-logo-link">
          <BracketMark size={22} label={false} variant="chalk" />
          <span className="font-semibold text-[14px] tracking-[-0.012em] text-[var(--text)] group-hover:opacity-90 transition-opacity">Bracket</span>
        </Link>

        {/* Center nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `marketing-nav-link ${isActive ? "is-active" : ""}`}
              data-testid={`nav-link-${l.to.replace("/", "")}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <Link to="/app" className="btn-primary" data-testid="nav-app-btn">Open app</Link>
          ) : (
            <>
              <Link to="/login" className="marketing-nav-link" data-testid="nav-login-link">Log in</Link>
              <Link to="/app" className="btn-primary" data-testid="nav-start-btn">Start a project</Link>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          {user ? (
            <Link to="/app" className="btn-primary btn-sm" data-testid="nav-mobile-app">App</Link>
          ) : (
            <Link to="/app" className="btn-primary btn-sm" data-testid="nav-mobile-start-cta">Start</Link>
          )}
          <button
            className="icon-tile"
            onClick={() => setOpen((o) => !o)}
            data-testid="nav-mobile-toggle"
            aria-label="Menu"
          >
            {open ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[var(--hairline)] bg-[var(--bg)]" data-testid="nav-mobile-panel">
          <div className="px-5 sm:px-6 py-5 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="marketing-nav-link"
                data-testid={`nav-mobile-link-${l.to.replace("/", "")}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="h-px bg-[var(--hairline)] my-2" />
            {!user && (
              <Link to="/login" onClick={() => setOpen(false)} className="marketing-nav-link" data-testid="nav-mobile-login">
                Log in
              </Link>
            )}
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="btn-primary justify-center mt-2"
              data-testid="nav-mobile-start-btn"
            >
              {user ? "Open app" : "Start a project"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
