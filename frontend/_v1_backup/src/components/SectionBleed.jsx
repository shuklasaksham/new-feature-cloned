import React from "react";

// Opaque section backdrop that bleeds past section edges. True smoothstep
// alpha stops + a noise dither layer prevent 8-bit gradient banding ("visible
// line") in the near-black fade zones. Shared by the landing page and every
// marketing subpage so all section backgrounds blend the same way.
const SECTION_BLEED_BG =
  "linear-gradient(180deg, rgba(8,9,10,0) 0%, rgba(8,9,10,0.04) 4%, rgba(8,9,10,0.16) 8%, rgba(8,9,10,0.32) 12%, rgba(8,9,10,0.5) 16%, rgba(8,9,10,0.68) 20%, rgba(8,9,10,0.84) 24%, rgba(8,9,10,0.96) 28%, #08090A 32%, #08090A 68%, rgba(8,9,10,0.96) 72%, rgba(8,9,10,0.84) 76%, rgba(8,9,10,0.68) 80%, rgba(8,9,10,0.5) 84%, rgba(8,9,10,0.32) 88%, rgba(8,9,10,0.16) 92%, rgba(8,9,10,0.04) 96%, rgba(8,9,10,0) 100%)";
const BLEED_NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23d)'/></svg>\")";

export function SectionBleed({ className = "" }) {
  const fadeMask = "linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%)";
  return (
    <div aria-hidden="true" className={`absolute inset-x-0 -top-64 -bottom-64 pointer-events-none ${className}`}>
      <div className="absolute inset-0" style={{ background: SECTION_BLEED_BG }} />
      {/* Dither layer — masked with the same fade so it never leaks a hard edge. */}
      <div
        className="absolute inset-0"
        style={{ background: BLEED_NOISE, maskImage: fadeMask, WebkitMaskImage: fadeMask }}
      />
    </div>
  );
}

// Soft radial colour wash — the same treatment the homepage layers on top of
// its SectionBleeds (blue over testimonials, amber over pricing, …).
export function GlowWash({ color = "#8184C4", opacity = 0.14, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute pointer-events-none ${className}`}
      style={{
        background: `radial-gradient(closest-side, ${color}, transparent 70%)`,
        opacity,
        filter: "blur(120px)",
      }}
    />
  );
}
