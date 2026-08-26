import React from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import Seo from "../components/Seo";
import ChangeDigestPanel from "../components/ChangeDigestPanel";

/**
 * Activity — the "what changed" roll-up across every connected project.
 * Moved off the main dashboard so the dashboard stays focused on projects.
 */
export default function Activity() {
  return (
    <div className="dashboard-root relative min-h-full" data-testid="activity-page">
      <Seo title="Activity" path="/app/activity" noindex />
      <div aria-hidden="true" className="hero-ambient hero-ambient--dashboard" />

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-[1000px] w-full mx-auto px-6 sm:px-8 md:px-10 py-6 md:py-8 flex flex-col gap-5"
      >
        <header>
          <p className="mono-tag text-muted text-[10px] inline-flex items-center gap-1.5">
            <TrendingUp size={11} /> ACTIVITY
          </p>
          <h1 className="mt-1.5 font-display font-semibold tracking-[-0.028em] leading-[1.1] text-[26px] sm:text-[30px] text-[var(--text)]">
            What changed
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-3)]">
            New decisions, deadlines, scope changes and questions across every connected project.
          </p>
        </header>

        <ChangeDigestPanel showEmptyState />
      </motion.main>
    </div>
  );
}
