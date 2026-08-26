import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * EmptyState — one shared, illustrated first-run panel used across the app
 * (Dashboard, Activity, Connect Work) so empty screens feel intentional and
 * consistent rather than blank. Dark, minimal, Linear-grade.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  ctaTo,
  ctaOnClick,
  footnote,
  testid = "empty-state",
  children,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
      data-testid={testid}
    >
      <div className="px-6 sm:px-10 py-14 sm:py-16 flex flex-col items-center text-center">
        <EmptyArt icon={Icon} />
        {title && (
          <h2 className="mt-7 text-[20px] sm:text-[23px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-2.5 max-w-[440px] text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {description}
          </p>
        )}
        {cta && ctaTo && (
          <Link
            to={ctaTo}
            className="mt-6 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium"
            style={{ background: "var(--primary-bg)", color: "var(--primary-fg)", boxShadow: "0 8px 20px -8px rgba(59,130,246,0.5)" }}
            data-testid={`${testid}-cta`}
          >
            {cta}
          </Link>
        )}
        {cta && !ctaTo && ctaOnClick && (
          <button
            type="button"
            onClick={ctaOnClick}
            className="mt-6 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium"
            style={{ background: "var(--primary-bg)", color: "var(--primary-fg)", boxShadow: "0 8px 20px -8px rgba(59,130,246,0.5)" }}
            data-testid={`${testid}-cta`}
          >
            {cta}
          </button>
        )}
        {footnote && (
          <p className="mt-3 mono-tag text-[9.5px]" style={{ color: "var(--text-3)" }}>{footnote}</p>
        )}
        {children && <div className="mt-6 w-full">{children}</div>}
      </div>
    </motion.section>
  );
}

/* Minimal line-art: stacked cards behind a soft accent glow + node — reads as
   "a memory waiting to fill", consistent with the Project Memory empty art. */
function EmptyArt({ icon: Icon }) {
  return (
    <div className="relative" aria-hidden="true">
      <svg width="168" height="120" viewBox="0 0 168 120" fill="none" data-testid="empty-state-art">
        <circle cx="84" cy="60" r="56" fill="url(#es-glow)" opacity="0.6" />
        <rect x="40" y="26" width="88" height="20" rx="7" fill="var(--surface-2)" stroke="var(--hairline-strong)" />
        <rect x="48" y="34" width="10" height="4" rx="2" fill="var(--hairline-hover)" />
        <rect x="64" y="34" width="42" height="4" rx="2" fill="var(--hairline)" />
        <rect x="34" y="52" width="100" height="20" rx="7" fill="var(--surface-2)" stroke="var(--hairline-strong)" />
        <rect x="42" y="60" width="10" height="4" rx="2" fill="var(--accent)" opacity="0.8" />
        <rect x="58" y="60" width="54" height="4" rx="2" fill="var(--hairline)" />
        <rect x="46" y="78" width="76" height="20" rx="7" fill="var(--surface-2)" stroke="var(--hairline-strong)" opacity="0.7" />
        <rect x="54" y="86" width="10" height="4" rx="2" fill="var(--hairline-hover)" />
        <rect x="70" y="86" width="36" height="4" rx="2" fill="var(--hairline)" />
        <defs>
          <radialGradient id="es-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
                          gradientTransform="translate(84 60) rotate(90) scale(56)">
            <stop stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      {Icon && (
        <span
          className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-8 h-8 rounded-full"
          style={{ background: "var(--primary-bg)", color: "var(--primary-fg)", boxShadow: "0 6px 16px -6px rgba(59,130,246,0.6)" }}
        >
          <Icon size={15} />
        </span>
      )}
    </div>
  );
}

export default EmptyState;
