import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import BracketMark from "./BracketMark";
import { NAV_LINKS } from "../lib/constants";
import { useAuth } from "../lib/AuthContext";

// Cinematic Navbar — matches Landing design language.
// - Glass panel, hairline border, subtle backdrop-blur
// - Solidifies on scroll (0 → 20px pulls in bg + border)
// - Animated underline on active + hover
// - Magnetic-ish CTA button (uses gradient white pill from Landing)
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const logoHref = user ? "/app" : "/";

  // Scroll-based solidification.
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 80], [0.35, 0.85]);
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 0.08]);

  // Close mobile panel on route change.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <motion.header
      className="cinema-nav"
      data-testid="site-navbar"
      style={{
        // The panel background & border animate their opacity on scroll.
        // Using CSS custom props so styling stays in index.css.
        "--nav-bg-a": bgOpacity,
        "--nav-border-a": borderOpacity,
      }}
    >
      <motion.div
        aria-hidden="true"
        className="cinema-nav-bg"
        style={{ opacity: bgOpacity }}
      />
      <motion.div
        aria-hidden="true"
        className="cinema-nav-border"
        style={{ opacity: borderOpacity }}
      />
      <div className="cinema-nav-inner">
        {/* Brand */}
        <Link to={logoHref} className="cinema-nav-brand group" data-testid="nav-logo-link">
          <BracketMark size={26} label={true} />
        </Link>

        {/* Center nav */}
        <nav className="cinema-nav-links" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `cinema-nav-link ${isActive ? "is-active" : ""}`}
              data-testid={`nav-link-${l.to.replace("/", "")}`}
            >
              <span>{l.label}</span>
              <span className="cinema-nav-underline" aria-hidden="true" />
            </NavLink>
          ))}
        </nav>

        {/* Right CTAs (desktop) */}
        <div className="cinema-nav-cta hidden lg:flex">
          {user ? (
            <Link to="/app" className="cinema-cta-pill" data-testid="nav-app-btn">
              <span>Open app</span> <ArrowRight size={12} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="cinema-nav-link" data-testid="nav-login-link">
                <span>Log in</span>
                <span className="cinema-nav-underline" aria-hidden="true" />
              </Link>
              <Link to="/app" className="cinema-cta-pill" data-testid="nav-start-btn">
                <span>Start a project</span> <ArrowRight size={12} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="cinema-nav-mobile lg:hidden">
          <Link to="/app" className="cinema-cta-pill cinema-cta-pill--sm" data-testid="nav-mobile-start-cta">
            {user ? "App" : "Start"}
          </Link>
          <button
            type="button"
            className="cinema-icon-tile"
            onClick={() => setOpen((o) => !o)}
            data-testid="nav-mobile-toggle"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="cinema-nav-panel lg:hidden"
            data-testid="nav-mobile-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cinema-nav-panel-inner">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="cinema-nav-mobile-link"
                  data-testid={`nav-mobile-link-${l.to.replace("/", "")}`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="cinema-nav-divider" />
              {!user && (
                <Link to="/login" className="cinema-nav-mobile-link" data-testid="nav-mobile-login">
                  Log in
                </Link>
              )}
              <Link
                to="/app"
                className="cinema-cta-pill mt-2 justify-center"
                data-testid="nav-mobile-start-btn"
              >
                <span>{user ? "Open app" : "Start a project"}</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
