import React from "react";

/**
 * BracketMark — official Bracket brand mark.
 *
 * Uses `/logo-diamond.png` — the blue diamond icon (no text).
 * The source PNG has whitespace padding on the sides; we let the img
 * naturally fit its container with a modest upscale to fill the box
 * without clipping the diamond corners.
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
  // Use ~1.55× the requested size so the visible diamond matches the
  // caller's intent (source PNG has ~35% empty padding around the mark).
  const box = Math.round(size * 1.55);
  return (
    <img
      src="/logo-diamond.png"
      alt="Bracket"
      width={box}
      height={box}
      className={className}
      style={{
        display: "block",
        flexShrink: 0,
        objectFit: "contain",
        marginLeft: `-${Math.round((box - size) / 2)}px`,
        marginRight: `-${Math.round((box - size) / 2)}px`,
      }}
    />
  );
}
