import React from "react";

/**
 * BracketMark — the {B} logo as inline SVG.
 * variant="chalk" => white tile + dark glyph (for dark UI surfaces)
 * variant="ink"   => dark tile + white glyph (for light surfaces)
 */
export default function BracketMark({
  size = 24,
  label = false,
  variant = "chalk",
  className = "",
}) {
  const tile = variant === "ink" ? "#0A0A0C" : "#F7F7F8";
  const glyph = variant === "ink" ? "#F7F7F8" : "#0A0A0C";

  const Tile = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Bracket"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect x="2" y="2" width="60" height="60" rx="14" ry="14" fill={tile} />
      {/* `{` left bracket */}
      <path
        d="M27.4 16.4c-3.6 0-5.6 1.7-5.6 5.3v4.6c0 2.6-1 3.6-3.4 3.6v3.6c2.4 0 3.4 1 3.4 3.6v4.6c0 3.6 2 5.3 5.6 5.3h2.2v-3.6h-1.4c-2 0-2.6-.8-2.6-2.9v-3.6c0-2.7-1-4.1-3.1-4.7 2.1-.6 3.1-2 3.1-4.7v-3.6c0-2.1.6-2.9 2.6-2.9h1.4v-3.6h-2.2Z"
        fill={glyph}
      />
      {/* `B` letter — stem + two lobes */}
      <path
        d="M34 16.4v31.2h7.4c5.7 0 8.6-2.5 8.6-7.4 0-3.4-1.4-5.7-4-6.7v-.2c1.9-.9 3-2.8 3-5.4 0-4.7-2.7-7.5-8-7.5H34Zm4 3.6h3c2.7 0 4 1.3 4 3.9 0 2.5-1.3 3.9-4 3.9h-3V20Zm0 11.4h3.6c2.9 0 4.3 1.5 4.3 4.2 0 2.7-1.4 4.2-4.3 4.2H38V31.4Z"
        fill={glyph}
      />
    </svg>
  );

  if (!label) {
    return <span className={className}>{Tile}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {Tile}
      <span
        style={{
          fontFamily: "Poppins, sans-serif",
          fontWeight: 600,
          fontSize: Math.round(size * 0.78),
          letterSpacing: "-0.018em",
          color: variant === "ink" ? "#0A0A0C" : "#F7F7F8",
          lineHeight: 1,
        }}
      >
        racket
      </span>
    </span>
  );
}
