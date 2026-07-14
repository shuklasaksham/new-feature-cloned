import React from "react";

/**
 * BracketMark — official Bracket brand mark.
 *
 * Uses `/logo-diamond.png` — the blue diamond icon without any text.
 * `label` and `variant` props are kept for API compatibility but the
 * mark is always the same square glyph now (no wordmark variant).
 */
export default function BracketMark({
  size = 24,
  label = false,
  variant = "chalk",
  className = "",
}) {
  // label + variant kept for API compatibility (unused).
  void label; void variant;
  return (
    <img
      src="/logo-diamond.png"
      alt="Bracket"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
      className={className}
    />
  );
}
