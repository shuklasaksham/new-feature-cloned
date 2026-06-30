import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { LAYERS, WALKTHROUGH } from "../lib/constants";

export default function HowItWorks() {
  return (
    <div data-testid="how-it-works-page" className="page-enter">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 pt-20 md:pt-28 pb-16 md:pb-20 text-center">
          <span className="section-label"><span className="dot" />How it works</span>
          <h1 className="t-display mt-7 max-w-[820px] mx-auto">
            Less a tool.<br />
            More a way of <span className="text-[var(--accent)]">thinking</span>.
          </h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[560px] mx-auto">
            Every Bracket project moves through the same five steps. Same for a ₹15k landing page. Same for a Series-A dashboard. The rigour doesn&apos;t change — the stakes do.
          </p>
        </div>
      </section>

      {/* 3 LAYERS */}
      <section className="border-t border-[var(--hairline)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-20 md:py-28">
          <span className="section-label"><span className="dot" />The mental model</span>
          <h2 className="t-hero mt-5">Three layers.</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-3">
            {LAYERS.map((l) => (
              <div key={l.num} className="card-linear card-linear-hover p-6">
                <p className="t-meta">{l.num}</p>
                <h3 className="t-h2 mt-3">{l.title}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{l.copy}</p>
                <div className="mt-5 space-y-2.5 pt-4 border-t border-[var(--hairline)]">
                  <div className="flex gap-2.5 items-start"><X size={13} className="mt-0.5 text-[var(--danger)] shrink-0" /><p className="text-[12.5px] leading-[1.6] text-[var(--text-3)]">{l.bad}</p></div>
                  <div className="flex gap-2.5 items-start"><Check size={13} className="mt-0.5 text-[var(--success)] shrink-0" /><p className="text-[12.5px] leading-[1.6] text-[var(--text)]">{l.good}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 STEPS */}
      <section className="border-t border-[var(--hairline)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-20 md:py-28">
          <span className="section-label"><span className="dot" />The project flow</span>
          <h2 className="t-hero mt-5">Five steps.</h2>

          <div className="mt-12 space-y-3">
            {WALKTHROUGH.map((w) => (
              <div key={w.num} className="card-linear p-6 grid lg:grid-cols-12 gap-5 md:gap-6">
                <div className="lg:col-span-2">
                  <p className="t-meta">{"{ "}{w.num}{" / 05 }"}</p>
                  <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-2)] mt-1.5">{w.label}</p>
                </div>
                <div className="lg:col-span-6">
                  <h3 className="t-h1">{w.title}</h3>
                  <p className="mt-3 text-[14px] leading-[1.65] text-[var(--text-2)]">{w.what}</p>
                </div>
                <div className="lg:col-span-4 lg:border-l border-[var(--hairline)] lg:pl-6">
                  <p className="t-meta">Why it matters</p>
                  <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--text)]">{w.why}</p>
                  <p className="mt-4 text-[13.5px] italic text-[var(--accent)]">{w.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-[var(--hairline)]">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 py-24 md:py-32 text-center">
          <span className="section-label"><span className="dot" />Last word</span>
          <h2 className="t-display mt-7">
            Stop guessing.<br />
            <span className="text-[var(--accent)]">Start deciding</span>.
          </h2>
          <div className="mt-9">
            <Link to="/app" className="btn-primary btn-lg">Start a project <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
