import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { PRICING } from "../lib/constants";

export default function Pricing() {
  const [currency, setCurrency] = useState("INR");
  const cur = PRICING.currencies[currency];

  return (
    <div data-testid="pricing-page">
      <section className="border-b border-ink bg-paper blueprint-bg">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="mono-label">{"{ pricing · early access }"}</p>
              <h1 className="font-display text-5xl sm:text-6xl md:text-8xl uppercase mt-5 md:mt-6">
                Free <span className="text-signal">for now.</span>
              </h1>
              <p className="mt-5 md:mt-6 text-muted max-w-xl text-sm md:text-base">
                Bracket is free to use during early access — no account, no card, no time limit. Paid tiers will arrive when the product graduates from early access; below is the shape they'll take.
              </p>
              <Link to="/app" className="btn-brut mt-6" data-testid="pricing-hero-start-cta">
                Start a project <ArrowRight size={14} />
              </Link>
            </div>
            <div className="inline-flex items-center border border-ink self-start md:self-auto" data-testid="pricing-currency-toggle">
              {Object.keys(PRICING.currencies).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-5 py-3 mono-tag ${currency === c ? "bg-ink text-chalk" : "bg-paper text-ink"}`}
                  data-testid={`currency-toggle-${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-chalk border-b border-ink">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-16">
          <div className="border border-ink bg-ink text-chalk p-5 sm:p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid="pricing-early-access-banner">
            <div>
              <p className="mono-label text-signal">{"{ everything below is free }"}</p>
              <p className="mt-2 text-sm sm:text-base text-chalk">
                During early access, every feature in every tier is unlocked. No card. No upsell. Use it.
              </p>
            </div>
            <Link to="/app" className="btn-brut bg-chalk text-ink border-chalk hover:bg-paper" data-testid="pricing-banner-start-cta">
              Start a project →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-0 border border-ink">
            {PRICING.tiers.map((t, idx) => {
              const isStudio = t.id === "studio";
              const price = cur[t.id];
              return (
                <div
                  key={t.id}
                  className={`p-6 sm:p-8 ${isStudio ? "bg-ink text-chalk" : "bg-chalk"} ${idx < 2 ? "md:border-r border-ink" : ""} ${idx < 2 ? "border-b md:border-b-0 border-ink" : ""}`}
                  data-testid={`pricing-tier-${t.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`mono-label ${isStudio ? "text-faint" : ""}`}>{t.name}</span>
                    {t.badge && <span className="mono-tag text-signal">{t.badge}</span>}
                  </div>
                  <p className={`mt-3 text-sm ${isStudio ? "text-faint" : "text-muted"}`}>{t.tagline}</p>
                  <div className="mt-6 md:mt-8 flex items-baseline gap-2">
                    <span className="font-display text-5xl md:text-6xl">{cur.symbol}{price}</span>
                    <span className={`mono-tag ${isStudio ? "text-faint" : "text-muted"}`}>
                      {t.id === "free" ? "/ FOREVER" : "/ MONTH"}
                    </span>
                  </div>
                  <ul className="mt-6 md:mt-8 space-y-3">
                    {t.features.map((f, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <Check size={14} className="mt-1 shrink-0 text-signal" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/app"
                    className={`mt-6 md:mt-8 w-full justify-center ${isStudio ? "btn-brut" : "btn-ghost"}`}
                    data-testid={`pricing-cta-${t.id}`}
                  >
                    Start a project <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-paper border-b border-ink">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-20 grid md:grid-cols-2 gap-8 md:gap-10">
          <div>
            <p className="mono-label">{"{ honest answers }"}</p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl uppercase mt-4">Questions you were going to ask anyway.</h2>
          </div>
          <div className="space-y-0 border border-ink">
            {[
              ["Is there a free trial?", "Free tier is 3 projects, forever. Test with real work before you pay."],
              ["Can I cancel any time?", "Yes. Monthly. No annual lock-ins. We'd rather earn it every month."],
              ["Do you offer student pricing?", "Email us with your .edu / college ID. We give it quietly."],
              ["What's in Studio but not Pro?", "Team roles, shared decision systems, and client-facing outputs. If you're solo, Pro is the move."],
            ].map(([q, a], i) => (
              <div key={i} className="p-5 sm:p-6 border-b border-ink last:border-b-0 bg-chalk">
                <p className="font-display text-xl">{q}</p>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-chalk">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-14 md:py-20">
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl uppercase">Decisions, priced fairly.</h2>
          <div className="mt-6 md:mt-8">
            <Link to="/app" className="btn-brut">Start a project <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
