import React from "react";

/**
 * Bracket wordmark + glyph.
 * Pass `variant="ink"` (default, for light bg) or `variant="chalk"` (for dark bg).
 */
export default function BracketMark({ size = 28, label = true, variant = "ink", className = "" }) {
  const src = variant === "chalk" ? "/bracket-mark.png" : "/bracket-mark-ink.png";
  const textColor = variant === "chalk" ? "text-chalk" : "text-ink";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} data-testid="bracket-logo">
      <img
        src={src}
        alt="Bracket"
        width={size}
        height={Math.round(size * 149 / 140)}
        className="block select-none"
        draggable="false"
      />
      {label && (
        <span
          className={`font-display tracking-tight ${textColor}`}
          style={{ fontSize: Math.round(size * 0.82), lineHeight: 1 }}
        >
          Bracket
        </span>
      )}
    </span>
  );
}
