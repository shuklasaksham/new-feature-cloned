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
        <img
          src="/logo-diamond.png"
          alt=""
          width={80}
          height={80}
          className="page-loader-diamond"
          aria-hidden="true"
        />

        {/* Signal-blue underline that grows from centre once the mark lands. */}
        <span className="page-loader-underline" aria-hidden="true" />
      </div>
    </div>
  );
}
