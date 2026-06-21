import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { LAYERS, WALKTHROUGH } from "../lib/constants";

export default function HowItWorks() {
  return (
    <div data-testid="how-it-works-page">
      <section className="border-b border-ink bg-paper blueprint-bg">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-20">
          <p className="mono-label">{"{ how it works }"}</p>
          <h1 className="font-display text-5xl sm:text-6xl md:text-8xl uppercase mt-5 md:mt-6 max-w-5xl">
            Less a tool.
            <br />
            More a way of <span className="text-signal">thinking.</span>
          </h1>
          <p className="mt-5 md:mt-6 text-muted max-w-2xl text-sm md:text-base">
            Every Bracket project moves through the same five steps. Same for a ₹15k landing page. Same for a Series-A
            dashboard. The rigour doesn't change — the stakes do.
          </p>
        </div>
      </section>

      {/* 3 LAYERS */}
      <section className="border-b border-ink bg-chalk">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-24">
          <p className="mono-label">{"{ the mental model }"}</p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase mt-4">Three layers.</h2>
          <div className="mt-10 md:mt-12 grid md:grid-cols-3 gap-0 border border-ink">
            {LAYERS.map((l, i) => (
              <div key={l.num} className={`p-6 sm:p-8 bg-paper ${i < 2 ? "md:border-r border-ink" : ""} ${i < LAYERS.length - 1 ? "border-b md:border-b-0 border-ink" : ""}`}>
                <span className="mono-label">{l.num}</span>
                <h3 className="font-display text-2xl sm:text-3xl uppercase mt-4">{l.title}</h3>
                <p className="mt-4 text-ink text-sm sm:text-base">{l.copy}</p>
                <div className="mt-5 md:mt-6 space-y-3">
                  <div className="flex gap-2"><X size={14} className="mt-1 text-danger shrink-0" /><p className="text-sm text-muted">{l.bad}</p></div>
                  <div className="flex gap-2"><Check size={14} className="mt-1 text-signal shrink-0" /><p className="text-sm">{l.good}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 STEPS */}
      <section className="border-b border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-24">
          <p className="mono-label">{"{ the project flow }"}</p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase mt-4">Five steps.</h2>

          <div className="mt-10 md:mt-12 space-y-0">
            {WALKTHROUGH.map((w, i) => (
              <div key={w.num} className="grid lg:grid-cols-12 gap-5 md:gap-6 border border-ink border-b-0 last:border-b p-6 sm:p-8 bg-chalk">
                <div className="lg:col-span-2">
                  <p className="mono-label">{w.num}</p>
                  <p className="mono-tag text-signal mt-1">{w.label}</p>
                </div>
                <div className="lg:col-span-6">
                  <h3 className="font-display text-2xl sm:text-3xl md:text-4xl uppercase">{w.title}</h3>
                  <p className="mt-3 text-muted text-sm sm:text-base">{w.what}</p>
                </div>
                <div className="lg:col-span-4 border-l-0 lg:border-l border-ink lg:pl-6">
                  <p className="mono-tag text-muted">WHY IT MATTERS</p>
                  <p className="mt-2 text-sm">{w.why}</p>
                  <p className="mt-4 font-display text-lg sm:text-xl text-signal">{w.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-chalk">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-14 md:py-20">
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl uppercase">
            Stop guessing.
            <br />
            <span className="text-signal">Start deciding.</span>
          </h2>
          <div className="mt-6 md:mt-8">
            <Link to="/app" className="btn-brut">Start a project <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
