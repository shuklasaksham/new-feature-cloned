import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { PRICING } from "../lib/constants";
import Seo from "../components/Seo";
import { SectionBleed, GlowWash } from "../components/SectionBleed";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Pricing() {
  const [currency, setCurrency] = useState("INR");
  const cur = PRICING.currencies[currency];

  return (
    <div data-testid="pricing-page" className="page-enter landing-page-bg">
      <Seo
        title="Pricing"
        description="Flat, transparent pricing for Bracket. Free early access with generous limits. Pro plan for anyone doing client work who needs unlimited decisions."
        path="/pricing"
      />

      {/* HERO */}
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative z-10 max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 pt-24 md:pt-32 pb-16 md:pb-20 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="section-label mx-auto"
          >
            <span className="dot" />Pricing · early access
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-7 max-w-[900px] mx-auto"
          >
            Choose the way<br />
            <span className="landing-hero-gradient">you work.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-6 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[600px] mx-auto"
          >
            Free during early access — no card, no time limit. Paid tiers arrive
            when the product graduates. Below is the shape they&apos;ll take.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="mt-6 flex justify-center"
          >
            <span className="pricing-early-access-banner" data-testid="pricing-page-early-access-banner">
              <span className="pricing-early-access-dot" aria-hidden="true" />
              <span><strong>Everything below is free while Bracket is in early access.</strong> You&apos;ll get 30 days&apos; notice before we start charging.</span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* CURRENCY + TIERS */}
      <section className="relative pb-24 md:pb-32 overflow-x-clip isolate">
        <SectionBleed className="-z-20" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-24 mx-auto h-[500px] w-[800px] blur-[120px] opacity-[0.18] pointer-events-none -z-10"
          style={{ background: "radial-gradient(closest-side, #FFB84C, transparent 70%)" }}
        />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 relative">
          <div className="flex justify-center">
            <div className="landing-currency-toggle" role="group" aria-label="Currency">
              {Object.keys(PRICING.currencies).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={currency === c ? "is-active" : ""}
                  data-testid={`currency-toggle-${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6 items-stretch">
            {PRICING.tiers.map((t, i) => {
              const isPro = t.id === "pro";
              const price = cur[t.id];
              return (
                <motion.div
                  key={t.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-60px" }}
                  whileHover={isPro ? { y: -8 } : { y: -4 }}
                  transition={{ duration: 0.4 }}
                  className={`pricing-card ${isPro ? "pricing-card--popular" : ""}`}
                  data-testid={`pricing-tier-${t.id}`}
                >
                  {isPro && (
                    <div className="pricing-ribbon"><span>Most popular</span></div>
                  )}
                  <div className="pricing-card-glow" aria-hidden="true" />
                  <div className="relative z-10 p-8 sm:p-10 flex flex-col h-full">
                    <p className="mono-tag" style={{ color: isPro ? "#FFB84C" : "var(--accent)" }}>{t.name}</p>
                    <p className="mt-1 text-[12px] text-[var(--text-3)] leading-relaxed">{t.tagline}</p>
                    {t.bestFor && (
                      <p
                        className="mt-3 inline-flex self-start items-center gap-1.5 px-2 py-1 rounded-full text-[10.5px] tracking-[0.02em] uppercase font-mono"
                        style={{
                          background: isPro ? "rgba(255,184,76,0.10)" : "rgba(94,106,210,0.10)",
                          color: isPro ? "#FFB84C" : "var(--accent)",
                          border: `1px solid ${isPro ? "rgba(255,184,76,0.25)" : "rgba(94,106,210,0.25)"}`,
                        }}
                      >
                        {t.bestFor}
                      </p>
                    )}
                    <div className="mt-6 flex items-baseline gap-2.5">
                      {price !== 0 && (
                        <span
                          className="font-display font-semibold text-[24px] leading-none tracking-[-0.02em] line-through text-[var(--text-3)]"
                          data-testid={`pricing-old-price-${t.id}`}
                        >
                          {cur.symbol}{price}
                        </span>
                      )}
                      <span className="font-display font-semibold text-[52px] leading-none tracking-[-0.03em]">
                        {price === 0 ? "Free" : `${cur.symbol}0`}
                      </span>
                      {price !== 0 && <span className="text-[12px] text-[var(--text-3)]">/ mo</span>}
                    </div>
                    <ul className="mt-8 space-y-3 flex-1">
                      {t.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-3 text-[13.5px] text-[var(--text-2)]">
                          <span className="mt-[3px] inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0"
                                style={{ background: isPro ? "rgba(255,184,76,0.15)" : "rgba(94,106,210,0.15)" }}>
                            <Check size={9} style={{ color: isPro ? "#FFB84C" : "var(--accent)" }} />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/login"
                      className={`mt-10 landing-plan-cta ${isPro ? "landing-plan-cta--popular" : ""}`}
                      data-testid={`pricing-cta-${t.id}`}
                    >
                      <span>{t.cta}</span> <ArrowRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-[12px] text-[var(--text-3)]">
            Every plan includes unlimited pastes, AI project understanding and secure cloud storage.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative overflow-x-clip isolate">
        <SectionBleed className="-z-20" />
        <GlowWash
          color="#5E6AD2"
          className="inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[900px] w-[900px] -z-10"
        />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-20 md:py-28 grid md:grid-cols-2 gap-10 md:gap-16">
          <div>
            <span className="section-label"><span className="dot" />Honest answers</span>
            <h2 className="t-hero mt-6 max-w-md">
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
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
                className="card-linear card-linear-hover p-6"
              >
                <p className="font-display font-semibold text-[15.5px] tracking-[-0.01em]">{q}</p>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient hero-ambient--contained hero-ambient--cta" aria-hidden="true" />
        <div className="relative z-10 max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 py-28 md:py-36 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="t-display"
          >
            Decisions, <span className="landing-hero-gradient">priced fairly</span>.
          </motion.h2>
          <div className="mt-10">
            <Link to="/app" className="landing-cta-primary" data-testid="pricing-final-cta">
              <span>Start a project</span> <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
