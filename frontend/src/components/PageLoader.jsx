import React, { useEffect, useState } from "react";

/**
 * PageLoader — full-screen brand animation shown on every hard reload.
 * Bracket mark: brackets quietly focus inward while the diamond core
 * spins/breathes with a glow pulse, an edge trace orbits the diamond and
 * a light band sweeps through the mark. Shown for 3s, then fades out.
 */
export default function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeAt = setTimeout(() => setFading(true), 3000);
    const removeAt = setTimeout(() => setVisible(false), 3550);
    return () => {
      clearTimeout(fadeAt);
      clearTimeout(removeAt);
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      className={`page-loader ${fading ? "is-fading" : ""}`}
      role="status"
      aria-label="Loading"
      data-testid="page-loader"
    >
      <div className="plx-stage">
        <svg className="plx-mark" viewBox="0 0 384.65 196.33" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="plx-soften" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
            <linearGradient id="plx-beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <clipPath id="plx-logo-clip">
              <polygon points="257.8 36.05 290.37 3.47 384.65 101.19 288.23 196.33 256.08 165.04 320.37 99.9 257.8 36.05" />
              <polygon points="126.86 32.57 94.29 0 0 97.71 96.43 192.86 128.57 161.57 64.29 96.43 126.86 32.57" />
              <polygon points="121.37 98.76 193.08 29.33 261.94 100.47 191.37 169.33 121.37 98.76" />
            </clipPath>
          </defs>

          {/* Glow halo behind the solid diamond */}
          <polygon className="plx-core-halo" points="121.37 98.76 193.08 29.33 261.94 100.47 191.37 169.33 121.37 98.76" />

          {/* The mark itself */}
          <polygon className="plx-bracket-right" points="257.8 36.05 290.37 3.47 384.65 101.19 288.23 196.33 256.08 165.04 320.37 99.9 257.8 36.05" />
          <polygon className="plx-bracket-left" points="126.86 32.57 94.29 0 0 97.71 96.43 192.86 128.57 161.57 64.29 96.43 126.86 32.57" />

          <g className="plx-core-rot">
            <polygon className="plx-core" points="121.37 98.76 193.08 29.33 261.94 100.47 191.37 169.33 121.37 98.76" />
            {/* Circulating edge trace on the diamond */}
            <polygon className="plx-trace" points="121.37 98.76 193.08 29.33 261.94 100.47 191.37 169.33 121.37 98.76" />
          </g>

          {/* Flowing energy sweep, clipped to the logo shapes */}
          <g clipPath="url(#plx-logo-clip)" style={{ mixBlendMode: "screen" }}>
            <rect className="plx-sweep" x="0" y="-20" width="150" height="240" fill="url(#plx-beam)" transform="skewX(-18)" />
          </g>
        </svg>
      </div>
    </div>
  );
}
