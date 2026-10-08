import React from "react";
import { Link } from "react-router-dom";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[var(--hairline)] bg-[#08090A]" data-testid="site-footer">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center" aria-label="Bracket home">
          <img src={BRACKET_LOGO} alt="Bracket" width={34} height={34} style={{ display: "block", filter: "brightness(0) invert(1)" }} />
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="text-[13px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors" data-testid="footer-privacy-link">Privacy</Link>
          <Link to="/terms" className="text-[13px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors" data-testid="footer-terms-link">Terms</Link>
          <span className="text-[13px] text-[var(--text-3)]">© 2026 Bracket</span>
        </div>
      </div>
    </footer>
  );
}
