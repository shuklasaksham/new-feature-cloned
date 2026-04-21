import React from "react";

/**
 * Bracket logo lockup (square {B} mark + "Bracket" wordmark in one image).
 * Variants:
 *   - "ink"   (default): use as-is on light backgrounds.
 *   - "chalk": inverts the PNG for dark backgrounds.
 *
 * `label` is kept for backward compatibility; when false we render only the
 * square mark by cropping the image via CSS.
 */
export default function BracketMark({ size = 28, label = true, variant = "ink", className = "" }) {
  const INTRINSIC_W = 776;
  const INTRINSIC_H = 233;
  const markOnly = !label;
  const height = size;
  // Full lockup width-to-height ratio preserved from the source artwork.
  const width = markOnly ? size : Math.round(size * (INTRINSIC_W / INTRINSIC_H));

  const style = markOnly
    ? {
        width,
        height,
        backgroundImage: "url('/bracket-logo.png')",
        backgroundRepeat: "no-repeat",
        // Fit by height, crop to the leftmost square (the {B} glyph).
        backgroundSize: `auto ${height}px`,
        backgroundPosition: "left center",
      }
    : { height };

  return (
    <span
      className={`inline-flex items-center ${className}`}
      data-testid="bracket-logo"
    >
      {markOnly ? (
        <span
          aria-label="Bracket"
          role="img"
          className={`block select-none ${variant === "chalk" ? "invert" : ""}`}
          style={style}
          draggable="false"
        />
      ) : (
        <img
          src="/bracket-logo.png"
          alt="Bracket"
          height={height}
          width={width}
          className={`block select-none ${variant === "chalk" ? "invert" : ""}`}
          draggable="false"
          style={{ height, width: "auto" }}
        />
      )}
    </span>
  );
}
