import React from "react";

/**
 * BracketMark — uses the official PNG brand assets from /public.
 *
 * label=false (default) -> /logo-icon1.png  (the boxed {B} mark, used when collapsed)
 * label=true            -> /logo-mark1.png  (the {B}racket wordmark, used in nav + expanded sidebar)
 *
 * The PNGs already render correctly on dark backgrounds, so the `variant` prop
 * is kept for API compatibility but has no visual effect.
 */
export default function BracketMark({
  size = 24,
  label = false,
  variant: _variant = "chalk",  // eslint-disable-line no-unused-vars
  className = "",
}) {
  if (label) {
    return (
      <span
        className={`inline-flex items-center ${className}`}
        style={{ height: size }}
      >
        <img
          src="/logo-mark1.png"
          alt="Bracket"
          style={{ height: size, width: "auto", display: "block" }}
        />
      </span>
    );
  }
  return (
    <img
      src="/logo-icon1.png"
      alt="Bracket"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
      className={className}
    />
  );
}
