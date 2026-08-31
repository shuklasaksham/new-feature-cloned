import React from "react";

/**
 * Bracket logo — a heavy monochrome `[ ]` mark + wordmark.
 * Pure currentColor so it stays crisp on any monochrome surface.
 */
export const BracketMark = ({ size = 26, className = "", strokeColor = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 3H3V25H9V21.5H6.5V6.5H9V3ZM19 3H25V25H19V21.5H21.5V6.5H19V3Z"
      fill={strokeColor}
    />
  </svg>
);

export default function BracketLogo({ size = 26, wordmark = true, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BracketMark size={size} />
      {wordmark && (
        <span
          className="font-display font-semibold tracking-[-0.02em] leading-none"
          style={{ fontSize: Math.round(size * 0.72), color: "currentColor" }}
        >
          Bracket
        </span>
      )}
    </span>
  );
}
