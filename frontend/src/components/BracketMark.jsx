import React from "react";

/**
 * BracketMark — official Bracket brand mark.
 *
 * Uses `/logo-diamond.png` — the blue diamond icon (no text).
 * The source PNG has ~40% whitespace padding on each side, so we render
 * inside a fixed-size wrapper and scale the img up so the actual diamond
 * fills the reserved box.
 *
 * `label` and `variant` are kept for API compatibility (unused now).
 */
export default function BracketMark({
  size = 24,
  label = false,
  variant = "chalk",
  className = "",
}) {
  void label; void variant;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <img
        src="/logo-diamond.png"
        alt="Bracket"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: "scale(1.75)",
          display: "block",
        }}
      />
    </span>
  );
}
