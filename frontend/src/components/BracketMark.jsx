import React from "react";

/**
 * BracketMark — the official Bracket brand mark.
 *
 * Always renders the gradient `{ }` icon at `/logo-icon1.png`. Older callers
 * that pass `label={true}` (Navbar, Login, Footer, Sidebar-expanded) still
 * work — we ignore the flag and render icon-only, per the brand direction
 * (no wordmark, just the mark).
 */
export default function BracketMark({
  size = 24,
  // eslint-disable-next-line no-unused-vars
  label = false,
  // eslint-disable-next-line no-unused-vars
  variant = "chalk",
  className = "",
}) {
  const iconAspect = 688 / 179; // width / height of the attached PNG (as-is)
  const iconWidth = Math.round(size * iconAspect);
  return (
    <img
      src="/logo-icon1.png"
      alt="Bracket"
      width={iconWidth}
      height={size}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
      className={className}
    />
  );
}
