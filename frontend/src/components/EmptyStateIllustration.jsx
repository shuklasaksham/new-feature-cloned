import React from "react";

/**
 * EmptyStateIllustration — line-art SVG of two people pointing at a presentation chart.
 * Used on the dashboard empty state for the "Start a new project" moment.
 */
export default function EmptyStateIllustration({ size = 280, className = "" }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.72)}
      viewBox="0 0 400 290"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Two people presenting a chart"
    >
      <defs>
        <linearGradient id="cardgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>

      {/* Easel tripod */}
      <line x1="110" y1="260" x2="160" y2="100" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="290" y1="260" x2="240" y2="100" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="200" y1="220" x2="200" y2="270" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Presentation board */}
      <rect x="120" y="60" width="160" height="160" rx="6" fill="url(#cardgrad)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />

      {/* Chart bars */}
      <rect x="140" y="160" width="14" height="40" rx="2" fill="#22C55E" opacity="0.85" />
      <rect x="162" y="140" width="14" height="60" rx="2" fill="#FF7A6B" opacity="0.85" />
      <rect x="184" y="120" width="14" height="80" rx="2" fill="#F59E0B" opacity="0.85" />
      <rect x="206" y="148" width="14" height="52" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="228" y="132" width="14" height="68" rx="2" fill="rgba(255,255,255,0.65)" />
      <rect x="250" y="170" width="14" height="30" rx="2" fill="rgba(255,255,255,0.45)" />

      {/* Pie / donut */}
      <circle cx="178" cy="92" r="14" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="3" />
      <path d="M178 78 A14 14 0 0 1 188 102" fill="none" stroke="#FF7A6B" strokeWidth="3" strokeLinecap="round" />

      {/* Title bar lines */}
      <rect x="208" y="78" width="60" height="6" rx="3" fill="rgba(255,255,255,0.18)" />
      <rect x="208" y="92" width="40" height="6" rx="3" fill="rgba(255,255,255,0.10)" />

      {/* PERSON LEFT — pointing with stick */}
      {/* head */}
      <circle cx="78" cy="116" r="13" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" />
      {/* body */}
      <path d="M62 142 Q78 130 94 142 L96 200 Q78 210 60 200 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.40)" strokeWidth="1.6" strokeLinejoin="round" />
      {/* legs */}
      <line x1="68" y1="200" x2="64" y2="260" stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="86" y1="200" x2="90" y2="260" stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round" />
      {/* arm + pointing stick */}
      <line x1="94" y1="150" x2="138" y2="116" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="138" y1="116" x2="170" y2="100" stroke="#FF7A6B" strokeWidth="1.8" strokeLinecap="round" />

      {/* PERSON RIGHT */}
      <circle cx="320" cy="116" r="13" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" />
      <path d="M304 142 Q320 132 336 142 L338 200 Q320 210 302 200 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.40)" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="310" y1="200" x2="306" y2="260" stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="330" y1="200" x2="334" y2="260" stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round" />
      {/* arm pointing to chart */}
      <line x1="304" y1="150" x2="266" y2="124" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="266" cy="124" r="3" fill="#22C55E" />

      {/* Ground line */}
      <line x1="40" y1="265" x2="360" y2="265" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 4" />
    </svg>
  );
}
