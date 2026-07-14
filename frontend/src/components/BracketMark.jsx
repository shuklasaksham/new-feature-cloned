import React from "react";

/**
 * BracketMark — official Bracket brand mark.
 *
 * • `label={false}` (default) → `/logo-icon1.png` — icon-only `{ }` bracket
 *   shape (145×179). Used in collapsed sidebar, ProjectFlow header, etc.
 * • `label={true}`            → `/logo-mark1.png` — full "BRA{ }KET"
 *   wordmark (688×179). Used in top navbars, footers, expanded sidebar.
 *
 * `variant` is kept for API compatibility but has no visual effect.
 */
export default function BracketMark({
  size = 24,
  label = false,
  // eslint-disable-next-line no-unused-vars
  variant = "chalk",
  className = "",
}) {
  // Both PNGs are 179px tall; widths differ (icon 145, wordmark 688).
  const src = label ? "/logo-mark1.png" : "/logo-icon1.png";
  const aspect = label ? 688 / 179 : 145 / 179;
  const width = Math.round(size * aspect);
  return (
    <img
      src={src}
      alt="Bracket"
      width={width}
      height={size}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
      className={className}
    />
  );
}
