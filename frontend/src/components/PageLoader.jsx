import React, { useEffect, useState } from "react";

/**
 * PageLoader — full-screen brand animation shown on every hard reload.
 *
 * Cinematic sequence:
 * 1) The `{` strokes in from top to bottom (900ms)
 * 2) The `}` strokes in from top to bottom, offset by 120ms — so they
 *    feel like a hand-drawn signature, not a spinner.
 * 3) A signal-blue underline expands from centre once both braces land.
 * 4) The whole overlay fades out.
 *
 * Only shown on the very first mount of the app root (a hard reload).
 * Subsequent client-side navigations do NOT retrigger it.
 */
export default function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeAt = setTimeout(() => setFading(true), 1650);
    const removeAt = setTimeout(() => setVisible(false), 2200);
    return () => {
      clearTimeout(fadeAt);
      clearTimeout(removeAt);
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      className={`page-loader ${fading ? "is-fading" : ""}`}
      aria-hidden="true"
      data-testid="page-loader"
    >
      <div className="page-loader-halo" aria-hidden="true" />

      <div className="page-loader-mark">
        <svg
          viewBox="0 0 84 84"
          width="84"
          height="84"
          className="page-loader-svg"
          aria-hidden="true"
        >
          {/* Left brace { — hand-drawn typographic curl */}
          <path
            className="page-loader-brace page-loader-brace--left"
            d="M 34 14 C 24 14, 20 18, 20 26 L 20 36 C 20 40, 16 42, 10 42 C 16 42, 20 44, 20 48 L 20 58 C 20 66, 24 70, 34 70"
          />
          {/* Right brace } — mirror curl */}
          <path
            className="page-loader-brace page-loader-brace--right"
            d="M 50 14 C 60 14, 64 18, 64 26 L 64 36 C 64 40, 68 42, 74 42 C 68 42, 64 44, 64 48 L 64 58 C 64 66, 60 70, 50 70"
          />
        </svg>

        {/* Signal-blue underline that grows from centre once the braces land. */}
        <span className="page-loader-underline" aria-hidden="true" />
      </div>
    </div>
  );
}
