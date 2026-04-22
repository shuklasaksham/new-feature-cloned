import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BracketMark from "./BracketMark";
import { NAV_LINKS } from "../lib/constants";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-paper border-b border-ink" data-testid="site-navbar">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center shrink-0" data-testid="nav-logo-link">
          <BracketMark size={26} />
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
          <span className="mono-tag text-muted flex items-center gap-2" data-testid="nav-coming-soon">
            <span className="dot-live" /> COMING SOON
          </span>
          <Link to="/waitlist" className="btn-brut" data-testid="nav-waitlist-btn">
            Join the waitlist →
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/waitlist"
            className="hidden sm:inline-flex btn-brut !px-3 !py-2 !text-[11px]"
            data-testid="nav-mobile-waitlist-cta"
          >
            Join →
          </Link>
          <button
            className="p-2 border border-ink"
            onClick={() => setOpen((o) => !o)}
            data-testid="nav-mobile-toggle"
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-ink bg-paper" data-testid="nav-mobile-panel">
          <div className="px-5 sm:px-6 py-6 flex flex-col gap-5">
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
            <Link to="/waitlist" onClick={() => setOpen(false)} className="btn-brut justify-center" data-testid="nav-mobile-waitlist-btn">
              Join the waitlist →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
