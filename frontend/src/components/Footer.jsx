import React from "react";
import { Link } from "react-router-dom";
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
          <p className="mono-label mb-3 md:mb-4">Join</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/waitlist" className="link-u">Waitlist</Link></li>
            <li><a href="mailto:hi@bracket.design" className="link-u break-all">hi@bracket.design</a></li>
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
