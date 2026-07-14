import React from "react";

/**
 * BracketMark — official Bracket brand mark.
 *
 * The logo is the `<◇>` glyph (angle brackets flanking a diamond) from
 * `/logo-diamond.png`. Renders at `size × size` — the source is roughly
 * 2:1 wide-to-tall so we let `object-fit: contain` letterbox it into the
 * requested square (or the caller can pass a wider aspect via className).
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
    <img
      src="/logo-diamond.png"
      alt="Bracket"
      height={size}
      width={size * 2}
      className={className}
      style={{
        display: "block",
        flexShrink: 0,
        objectFit: "contain",
        height: size,
        width: "auto",
      }}
    />
  );
}
