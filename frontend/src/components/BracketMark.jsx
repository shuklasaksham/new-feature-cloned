import React from "react";

/**
 * BracketMark — official Bracket brand mark, inline SVG.
 *
 * The `< ◇ >` glyph: white angle brackets flanking a blue diamond. Same
 * geometry as the loading animation (PageLoader.jsx). Rendered as SVG so the
 * diamond (`.bracket-mark-core`) can animate independently — the navbar
 * rotates it on hover (see .cinema-nav-brand rules in index.css).
 *
 * `label` and `variant` are kept for API compatibility (unused).
 */
export default function BracketMark({
  size = 24,
  label = false,
  variant = "chalk",
  className = "",
}) {
  void label; void variant;
  return (
    <svg
      viewBox="0 0 384.65 196.33"
      height={size}
      width={size * 1.96}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
      role="img"
      aria-label="Bracket"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bracket-mark-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8184C4" />
          <stop offset="1" stopColor="#8184C4" />
        </linearGradient>
      </defs>
      <polygon
        fill="#F4F5F7"
        points="257.8 36.05 290.37 3.47 384.65 101.19 288.23 196.33 256.08 165.04 320.37 99.9 257.8 36.05"
      />
      <polygon
        fill="#F4F5F7"
        points="126.86 32.57 94.29 0 0 97.71 96.43 192.86 128.57 161.57 64.29 96.43 126.86 32.57"
      />
      <polygon
        className="bracket-mark-core"
        fill="url(#bracket-mark-blue)"
        points="121.37 98.76 193.08 29.33 261.94 100.47 191.37 169.33 121.37 98.76"
      />
    </svg>
  );
}
