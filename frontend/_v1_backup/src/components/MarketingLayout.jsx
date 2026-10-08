import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

// Cinematic backdrop applied to every marketing page except the Landing
// (which renders its own hero video + gradient scrim). Ensures HowItWorks,
// UseCases, Pricing, CaseStudies and FAQ share the same near-black + subtle
// blue-signal wash + film grain that Landing established.
export default function MarketingLayout() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  return (
    <div className="marketing-shell min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col relative isolate">
      {!isLanding && (
        <>
          <div className="marketing-ambient" aria-hidden="true" />
          <div className="marketing-grain" aria-hidden="true" />
        </>
      )}
      <Navbar />
      <main className="flex-1 relative z-10 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
