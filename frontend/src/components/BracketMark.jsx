import React from "react";

/**
 * BracketMark — uses the exact PNG logo from /public.
 * variant="chalk" => /bracket-mark.png (white-on-dark) — used on dark UI
 * variant="ink"   => /bracket-mark-ink.png (dark-on-light) — used on light surfaces
 * label=true      => render the `{B}racket` wordmark (/bracket-logo.png)
 */
export default function BracketMark({
  size = 24,
  label = false,
  variant = "chalk",
  className = "",
}) {
  if (label) {
    const src = "/bracket-logo.png";
    return (
      <span
        className={`inline-flex items-center ${className}`}
        style={{ height: size }}
      >
        <img
          src={src}
          alt="Bracket"
          style={{ height: size, width: "auto", display: "block" }}
        />
      </span>
    );
  }
  const src = variant === "ink" ? "/bracket-mark-ink.png" : "/bracket-mark.png";
  return (
    <img
      src={src}
      alt="Bracket"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0, borderRadius: 6 }}
      className={className}
    />
  );
}
