import React from "react";

/**
 * BracketMark — official Bracket brand mark.
 *
 * The icon is the gradient `{ }` bracket shape at /logo-icon1.png (aspect
 * ratio ~0.9). When `label=true`, we render the icon + the wordmark
 * "Bracket" typeset in Poppins semibold next to it (kept in JSX so we can
 * theme its color per surface — dark navbars use var(--text), light
 * surfaces use var(--ink)).
 *
 * `variant` is kept for API compatibility with older callers but has no
 * visual effect (the PNG works on any background).
 */
export default function BracketMark({
  size = 24,
  label = false,
  variant: _variant = "chalk",  // eslint-disable-line no-unused-vars
  className = "",
}) {
  const iconAspect = 162 / 179; // width / height of the cropped `{ }` mark
  const iconWidth = Math.round(size * iconAspect);

  if (label) {
    return (
      <span
        className={`inline-flex items-center gap-2 ${className}`}
        style={{ height: size }}
      >
        <img
          src="/logo-icon1.png"
          alt=""
          aria-hidden="true"
          width={iconWidth}
          height={size}
          style={{ height: size, width: iconWidth, display: "block", flexShrink: 0 }}
        />
        <span
          className="font-display font-semibold tracking-[-0.02em] leading-none"
          style={{ fontSize: Math.round(size * 0.9) }}
        >
          Bracket
        </span>
      </span>
    );
  }
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
