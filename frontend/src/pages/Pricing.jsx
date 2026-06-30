import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { PRICING } from "../lib/constants";

export default function Pricing() {
  const [currency, setCurrency] = useState("INR");
  const cur = PRICING.currencies[currency];

  return (
    <div data-testid="pricing-page" className="page-enter">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 pt-20 md:pt-28 pb-12 md:pb-16 text-center">
          <span className="section-label"><span className="dot" />Pricing · early access</span>
          <h1 className="t-display mt-7 max-w-[820px] mx-auto">
            Free <span className="text-[var(--text-2)]">for now</span>.
          </h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[600px] mx-auto">
            Bracket is free to use during early access — no account, no card, no time limit. Paid tiers will arrive when the product graduates from early access; below is the shape they&apos;ll take.
          </p>
          <div className="mt-9 inline-flex items-center justify-center gap-3">
            <Link to="/app" className="btn-primary btn-lg" data-testid="pricing-hero-start-cta">
              Start a project <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="border-t border-[var(--hairline)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-16 md:py-20">
          {/* Early access banner */}
          <div
            className="card-linear p-5 sm:p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-[var(--hairline-strong)] bg-[var(--surface-2)]"
            data-testid="pricing-early-access-banner"
          >
            <div>
              <span className="status-pill status-pill--active">Free during early access</span>
              <p className="mt-3 text-[14px] text-[var(--text)]">
                Every feature in every tier is unlocked. No card. No upsell. Use it.
              </p>
            </div>
            <Link to="/app" className="btn-primary" data-testid="pricing-banner-start-cta">
              Start a project →
            </Link>
          </div>

          {/* Currency toggle */}
          <div className="flex justify-end mb-6">
            <div className="inline-flex items-center rounded-full p-1 border border-[var(--hairline)] bg-[var(--surface)]" data-testid="pricing-currency-toggle">
              {Object.keys(PRICING.currencies).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3.5 py-1 text-[12px] font-medium rounded-full transition-all ${currency === c ? "bg-[var(--surface-3)] text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text)]"}`}
                  data-testid={`currency-toggle-${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {PRICING.tiers.map((t) => {
              const isPro = t.id === "pro";
              const price = cur[t.id];
              return (
                <div
                  key={t.id}
                  className={`p-7 rounded-[12px] relative ${isPro ? "border border-[var(--hairline-strong)] bg-[var(--surface-2)]" : "card-linear card-linear-hover"}`}
                  data-testid={`pricing-tier-${t.id}`}
                  style={isPro ? { boxShadow: "0 24px 64px -24px rgba(0,0,0,0.6)" } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className="t-meta">{t.name}</span>
                    {t.badge && <span className="status-pill status-pill--active">Popular</span>}
                  </div>
                  <p className="mt-3 text-[13px] text-[var(--text-2)]">{t.tagline}</p>
                  <div className="mt-7 flex items-baseline gap-1.5">
                    <span className="font-semibold text-[44px] tracking-[-0.03em] leading-none">{cur.symbol}{price}</span>
                    <span className="t-meta">{t.id === "free" ? "/ forever" : "/ month"}</span>
                  </div>
                  <ul className="mt-7 space-y-2.5 min-h-[140px]">
                    {t.features.map((f, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-[1.55]">
                        <Check size={13} className="mt-1 shrink-0 text-[var(--text-2)]" />
                        <span className="text-[var(--text)]">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/app"
                    className={`mt-6 w-full justify-center ${isPro ? "btn-primary" : "btn-ghost"}`}
                    data-testid={`pricing-cta-${t.id}`}
                  >
                    {t.cta} <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--hairline)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-20 md:py-28 grid md:grid-cols-2 gap-10 md:gap-12">
          <div>
            <span className="section-label"><span className="dot" />Honest answers</span>
            <h2 className="t-hero mt-5 max-w-md">
              Questions you were going to ask anyway.
            </h2>
          </div>
          <div className="space-y-3">
            {[
              ["Is there a free trial?", "Free tier is 3 projects, forever. Test with real work before you pay."],
              ["Can I cancel any time?", "Yes. Monthly. No annual lock-ins. We'd rather earn it every month."],
              ["Do you offer student pricing?", "Email us with your .edu / college ID. We give it quietly."],
              ["What's in Studio but not Pro?", "Team roles, shared decision systems, and client-facing outputs. If you're solo, Pro is the move."],
            ].map(([q, a], i) => (
              <div key={i} className="card-linear card-linear-hover p-5">
                <p className="t-h3">{q}</p>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-[var(--hairline)]">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 py-24 md:py-32 text-center">
          <h2 className="t-display">Decisions, <span className="text-[var(--text-2)]">priced fairly</span>.</h2>
          <div className="mt-9">
            <Link to="/app" className="btn-primary btn-lg">Start a project <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
