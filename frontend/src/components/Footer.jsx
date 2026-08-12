import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Linkedin } from "lucide-react";
import BracketMark from "./BracketMark";

const colLabel = "text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--text-3)] mb-3";
const colLink = "text-[13px] text-[var(--text-2)] hover:text-[var(--text)] transition-colors";

export default function Footer() {
  return (
    <footer
      className="relative z-10 border-t border-[var(--hairline)] mt-0 bg-[#08090A]"
      data-testid="site-footer"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-14 md:py-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        <div className="col-span-2 md:col-span-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <BracketMark size={28} label={true} />
          </Link>
          <p className="mt-4 max-w-sm text-[13px] leading-[1.65] text-[var(--text-2)]">
            Bracket is the AI decision workspace for client projects. From messy conversations to client-ready deliverables — in minutes.
          </p>
          <p className="mt-5 text-[11px] font-mono tracking-[0.08em] uppercase text-[var(--text-3)]">v 1.0 · Designed to decide</p>

          <div className="mt-5 flex items-center gap-2" data-testid="footer-socials">
            <a
              href="https://www.instagram.com/use_bracket/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bracket on Instagram"
              className="icon-tile"
              data-testid="footer-instagram-link"
            >
              <Instagram size={14} />
            </a>
            <a
              href="https://www.linkedin.com/company/bracket-app/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bracket on LinkedIn"
              className="icon-tile"
              data-testid="footer-linkedin-link"
            >
              <Linkedin size={14} />
            </a>
          </div>
        </div>
        <div>
          <p className={colLabel}>Product</p>
          <ul className="space-y-2.5">
            <li><Link to="/how-it-works" className={colLink}>How it works</Link></li>
            <li><Link to="/use-cases" className={colLink}>Use cases</Link></li>
            <li><Link to="/pricing" className={colLink}>Pricing</Link></li>
            <li><Link to="/case-studies" className={colLink}>Case studies</Link></li>
          </ul>
        </div>
        <div>
          <p className={colLabel}>Connect</p>
          <ul className="space-y-2.5">
            <li><Link to="/app" className={colLink}>Start a project</Link></li>
            <li><a href="mailto:support@use-bracket.com" className={`${colLink} break-all`} data-testid="footer-email-link">support@use-bracket.com</a></li>
            <li><a href="https://www.instagram.com/use_bracket/" target="_blank" rel="noopener noreferrer" className={colLink}>@use_bracket</a></li>
            <li><a href="https://www.linkedin.com/company/bracket-app/" target="_blank" rel="noopener noreferrer" className={colLink}>LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--hairline)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <p className="text-[12px] text-[var(--text-3)]">© {new Date().getFullYear()} Bracket. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-[12px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors" data-testid="footer-privacy-link">Privacy</Link>
            <Link to="/terms" className="text-[12px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors" data-testid="footer-terms-link">Terms</Link>
            <p className="text-[11px] font-mono tracking-[0.08em] uppercase text-[var(--text-3)]">{"< designed to decide >"}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
