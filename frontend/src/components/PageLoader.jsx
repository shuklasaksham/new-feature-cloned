import React, { useEffect, useState } from "react";

/**
 * PageLoader — full-screen brand animation shown on every hard reload.
 * The `{ }` bracket icon breathes and glows for ~900ms, then the whole
 * overlay fades out so the app is revealed in one smooth beat.
 *
 * Only shown on the very first mount of the app root (a hard reload).
 * Subsequent client-side navigations do NOT retrigger it.
 */
export default function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeAt = setTimeout(() => setFading(true), 900);
    const removeAt = setTimeout(() => setVisible(false), 1500);
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
      <div className="page-loader-inner">
        <img
          src="/logo-icon1.png"
          alt=""
          width={44}
          height={54}
          className="page-loader-logo"
        />
      </div>
    </div>
  );
}
