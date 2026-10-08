import React from "react";

/**
 * EmptyStateIllustration — renders the official /illustration.svg asset.
 */
export default function EmptyStateIllustration({ size = 320, className = "" }) {
  return (
    <img
      src="/illustration.svg"
      alt="Two people presenting a chart"
      style={{ width: size, height: "auto", display: "block" }}
      className={className}
    />
  );
}
