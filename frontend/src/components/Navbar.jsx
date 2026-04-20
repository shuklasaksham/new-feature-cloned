import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BracketMark from "./BracketMark";
import { NAV_LINKS } from "../lib/constants";
import { useAuth } from "../lib/AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-paper border-b border-ink" data-testid="site-navbar">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center" data-testid="nav-logo-link">
          <BracketMark size={28} />
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav-link text-ink ${isActive ? "active" : ""}`}
              data-testid={`nav-link-${l.to.replace("/", "")}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/app" className="btn-ghost" data-testid="nav-dashboard-btn">
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
                className="btn-brut"
                data-testid="nav-logout-btn"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" data-testid="nav-login-btn">
                Log in
              </Link>
              <Link to="/signup" className="btn-brut" data-testid="nav-signup-btn">
                Get started →
              </Link>
            </>
          )}
        </div>

        <button
          className="lg:hidden p-2 border border-ink"
          onClick={() => setOpen((o) => !o)}
          data-testid="nav-mobile-toggle"
          aria-label="Menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-ink bg-paper" data-testid="nav-mobile-panel">
          <div className="px-6 py-6 flex flex-col gap-5">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="nav-link text-ink"
                data-testid={`nav-mobile-link-${l.to.replace("/", "")}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="h-px bg-ink" />
            {user ? (
              <>
                <Link to="/app" onClick={() => setOpen(false)} className="btn-ghost justify-center">
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    setOpen(false);
                    navigate("/");
                  }}
                  className="btn-brut justify-center"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost justify-center">
                  Log in
                </Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="btn-brut justify-center">
                  Get started →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
