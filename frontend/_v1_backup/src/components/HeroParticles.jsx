import React from "react";
import ParticleField from "./ParticleField";

// Full-bleed animated particle background for marketing hero sections.
// Mirrors the auth pages' aesthetic (pure-black canvas + drifting halftone).
// Place as the first child of a `relative` hero <section>; content should sit
// above it (z-10). A radial scrim keeps headings legible.
export default function HeroParticles() {
  return (
    <>
      <ParticleField variant="fill" className="marketing-hero-canvas" />
      <div className="marketing-hero-scrim" aria-hidden="true" />
    </>
  );
}
