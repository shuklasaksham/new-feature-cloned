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
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="mono-label">{"{ pricing }"}</p>
              <h1 className="font-display text-6xl md:text-8xl uppercase mt-6">
                Pay for the <span className="text-signal">clarity.</span>
              </h1>
              <p className="mt-6 text-muted max-w-xl">
                One flat price. No seat gymnastics. Cancel whenever your thinking is sharp enough to not need us.
              </p>
            </div>
            <div className="inline-flex items-center border border-ink" data-testid="pricing-currency-toggle">
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
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16">
          <div className="grid md:grid-cols-3 gap-0 border border-ink">
            {PRICING.tiers.map((t, idx) => {
              const isStudio = t.id === "studio";
              const price = cur[t.id];
              return (
                <div
                  key={t.id}
                  className={`p-8 ${isStudio ? "bg-ink text-chalk" : "bg-chalk"} ${idx < 2 ? "md:border-r border-ink" : ""}`}
                  data-testid={`pricing-tier-${t.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`mono-label ${isStudio ? "text-faint" : ""}`}>{t.name}</span>
                    {t.badge && <span className="mono-tag text-signal">{t.badge}</span>}
                  </div>
                  <p className={`mt-3 text-sm ${isStudio ? "text-faint" : "text-muted"}`}>{t.tagline}</p>
                  <div className="mt-8 flex items-baseline gap-2">
                    <span className="font-display text-6xl">{cur.symbol}{price}</span>
                    <span className={`mono-tag ${isStudio ? "text-faint" : "text-muted"}`}>
                      {t.id === "free" ? "/ FOREVER" : "/ MONTH"}
                    </span>
                  </div>
                  <ul className="mt-8 space-y-3">
                    {t.features.map((f, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <Check size={14} className="mt-1 shrink-0 text-signal" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={`mt-8 w-full justify-center ${isStudio ? "btn-brut" : "btn-ghost"}`}
                    data-testid={`pricing-cta-${t.id}`}
                  >
                    {t.id === "free" ? t.cta : `Get ${t.name}`} <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-paper border-b border-ink">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 grid md:grid-cols-2 gap-10">
          <div>
            <p className="mono-label">{"{ honest answers }"}</p>
            <h2 className="font-display text-4xl md:text-5xl uppercase mt-4">Questions you were going to ask anyway.</h2>
          </div>
          <div className="space-y-0 border border-ink">
            {[
              ["Is there a free trial?", "Free tier is 3 projects, forever. Test with real work before you pay."],
              ["Can I cancel any time?", "Yes. Monthly. No annual lock-ins. We'd rather earn it every month."],
              ["Do you offer student pricing?", "Email us with your .edu / college ID. We give it quietly."],
              ["What's in Studio but not Pro?", "Team roles, shared decision systems, and client-facing outputs. If you're solo, Pro is the move."],
            ].map(([q, a], i) => (
              <div key={i} className="p-6 border-b border-ink last:border-b-0 bg-chalk">
                <p className="font-display text-xl">{q}</p>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-chalk">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
          <h2 className="font-display text-5xl md:text-7xl uppercase">Decisions, priced fairly.</h2>
          <div className="mt-8">
            <Link to="/signup" className="btn-brut">Start free <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
