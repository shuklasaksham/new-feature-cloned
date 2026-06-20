import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Linkedin } from "lucide-react";
import BracketMark from "./BracketMark";

export default function Footer() {
  return (
    <footer className="border-t border-ink bg-paper" data-testid="site-footer">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-10 md:py-14 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
        <div className="col-span-2">
          <BracketMark size={28} />
          <p className="mt-4 md:mt-5 max-w-sm text-muted text-sm">
            Bracket helps designers decide what to do, not just how to do it. A professional operating system — not another tool.
          </p>
          <p className="mt-5 md:mt-6 mono-label">v 1.0 · Built for people who take the call.</p>

          <div className="mt-5 md:mt-6 flex items-center gap-3" data-testid="footer-socials">
            <a
              href="https://www.instagram.com/use_bracket/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bracket on Instagram"
              className="w-9 h-9 inline-flex items-center justify-center border border-ink bg-paper hover:bg-ink hover:text-chalk transition-colors"
              data-testid="footer-instagram-link"
            >
              <Instagram size={16} />
            </a>
            <a
              href="https://www.linkedin.com/company/bracket-app/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bracket on LinkedIn"
              className="w-9 h-9 inline-flex items-center justify-center border border-ink bg-paper hover:bg-ink hover:text-chalk transition-colors"
              data-testid="footer-linkedin-link"
            >
              <Linkedin size={16} />
            </a>
          </div>
        </div>
        <div>
          <p className="mono-label mb-3 md:mb-4">Product</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/how-it-works" className="link-u">How it works</Link></li>
            <li><Link to="/use-cases" className="link-u">Use cases</Link></li>
            <li><Link to="/pricing" className="link-u">Pricing</Link></li>
            <li><Link to="/case-studies" className="link-u">Case studies</Link></li>
          </ul>
        </div>
        <div>
          <p className="mono-label mb-3 md:mb-4">Connect</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/start" className="link-u">Start a project</Link></li>
            <li>
              <a
                href="mailto:support@use-bracket.com"
                className="link-u break-all"
                data-testid="footer-email-link"
              >
                support@use-bracket.com
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/use_bracket/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-u"
              >
                @use_bracket
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/company/bracket-app/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-u"
              >
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <p className="mono-tag text-muted">© {new Date().getFullYear()} Bracket. All rights reserved.</p>
          <p className="mono-tag text-muted">{"{ designed to decide }"}</p>
        </div>
      </div>
    </footer>
  );
}
