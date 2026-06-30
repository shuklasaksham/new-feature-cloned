import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { LAYERS, WALKTHROUGH, ARTIFACTS_SAMPLES, USE_CASES, CASE_STUDIES, PRICING } from "../lib/constants";

const Section = ({ id, label, children, className = "" }) => (
  <section id={id} className={`relative border-t border-ink ${className}`}>
    {label && (
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-10">
        <p className="mono-label">{label}</p>
      </div>
    )}
    {children}
  </section>
);

export default function Landing() {
  const [currency, setCurrency] = useState("INR");
  const cur = PRICING.currencies[currency];

  const marquee = useMemo(
    () => [
      "DECIDE BEFORE YOU DESIGN",
      "{",
      "LESS INPUT. BETTER JUDGEMENT.",
      "}",
      "OUTPUT WITH INTENT",
      "{",
      "CONFIDENCE WITHOUT ARROGANCE",
      "}",
      "STRUCTURE WITHOUT RIGIDITY",
      "{",
      "AUTHORITY WITHOUT EGO",
      "}",
    ],
    []
  );

  return (
    <div data-testid="landing-page">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden blueprint-bg" data-testid="hero-section">
        {/* giant brackets */}
        <span
          className="bracket-mark absolute -top-16 sm:-top-24 -left-6 sm:-left-10 select-none text-[260px] sm:text-[380px] lg:text-[560px]"
        >
          {"{"}
        </span>
        <span
          className="bracket-mark absolute -bottom-28 sm:-bottom-40 -right-6 sm:-right-10 select-none text-[260px] sm:text-[380px] lg:text-[560px]"
        >
          {"}"}
        </span>

        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 pt-10 md:pt-14 pb-10">
          <div className="flex items-center gap-3">
            <span className="dot-live" />
            <p className="mono-label">BRACKET · PROFESSIONAL OPERATING SYSTEM · V1.0</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 mt-8 md:mt-10 items-end">
            <div className="lg:col-span-8">
              <h1 className="font-display text-[44px] sm:text-[72px] md:text-[104px] lg:text-[148px] uppercase animate-fade-up">
                Designers
                <br />
                don't need
                <br />
                more <span className="text-signal">tools.</span>
              </h1>
              <h2 className="font-display text-[24px] sm:text-[36px] md:text-[52px] lg:text-[64px] mt-4 text-muted uppercase animate-fade-up">
                They need better decisions<span className="blink" />
              </h2>
            </div>

            <div className="lg:col-span-4">
              <div className="card-brut p-5 sm:p-7 relative">
                <p className="mono-label">{"{ the pitch }"}</p>
                <p className="mt-4 text-base md:text-lg leading-relaxed">
                  Bracket helps you decide <em>what to do</em>, not just how to do it. A senior creative peer's brain,
                  installed between your input and your output.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link to="/app" className="btn-brut justify-center" data-testid="hero-primary-cta">
                    Start a project <ArrowRight size={16} />
                  </Link>
                  <Link to="/how-it-works" className="btn-ghost justify-center" data-testid="hero-secondary-cta">
                    See how it works
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="border-t border-ink bg-ink text-chalk overflow-hidden">
          <div className="marquee-track py-4">
            {[...marquee, ...marquee].map((w, i) => (
              <span
                key={i}
                className="px-8 mono-tag text-chalk"
                style={{ fontSize: 13 }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROBLEM ============ */}
      <Section id="problem" label="{ the problem }" className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase">
              Too many tools.
              <br />
              Not enough <span className="text-signal">clarity.</span>
            </h2>
            <p className="mt-6 text-muted max-w-md">
              Every designer, freelancer, or indie creative has 40 tabs open and 3 Notion pages of "requirements." None of it tells you what to do.
            </p>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-0 border border-ink">
            {[
              ["Clients ask vague things", "\"Make it pop.\" \"More premium.\" \"Bolder but cleaner.\" Decoded into nothing."],
              ["Scope creeps silently", "Each small \"just one more\" lands on your plate. The budget doesn't move. You do."],
              ["Decisions feel subjective", "You know it's right. You can't say why. The stakeholder wins the argument, not the work."],
              ["The brief is never the problem", "The real problem is underneath. No tool has helped you surface it."],
            ].map(([t, c], i) => (
              <div key={i} className="p-7 border border-ink -m-[0.5px] bg-chalk">
                <p className="mono-label">0{i + 1}</p>
                <h3 className="font-display text-2xl mt-2">{t}</h3>
                <p className="text-sm text-muted mt-3 leading-relaxed">{c}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ THE SHIFT ============ */}
      <Section id="shift" label="{ the shift }" className="bg-chalk">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-5xl md:text-6xl uppercase">
                Three layers
                <br />
                between <span className="text-signal">chaos</span> and clarity.
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-muted">
                Bracket isn't a feature checklist. It's a mental model. Every project moves through three layers before you
                open Figma.
              </p>
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-0 border border-ink">
            {LAYERS.map((l, i) => (
              <div key={l.num} className={`p-8 bg-paper ${i < LAYERS.length - 1 ? "md:border-r border-ink" : ""} border-b md:border-b-0 border-ink`}>
                <div className="flex items-center justify-between">
                  <span className="mono-label text-ink">{l.num}</span>
                  <span className="font-mono text-signal text-sm">→</span>
                </div>
                <h3 className="font-display text-3xl mt-5 uppercase leading-[0.95]">{l.title}</h3>
                <p className="mt-4 text-ink">{l.copy}</p>
                <div className="mt-6 space-y-3">
                  <div className="flex gap-2 items-start">
                    <X size={14} className="mt-1 text-danger shrink-0" />
                    <p className="text-sm text-muted">{l.bad}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Check size={14} className="mt-1 text-signal shrink-0" />
                    <p className="text-sm">{l.good}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ PRODUCT WALKTHROUGH ============ */}
      <Section id="walkthrough" label="{ product walkthrough }" className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="font-display text-5xl md:text-6xl uppercase max-w-3xl">
              Five steps. One <span className="text-signal">stance.</span>
            </h2>
            <Link to="/how-it-works" className="btn-ghost" data-testid="walkthrough-deepdive-cta">
              Full walkthrough <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WALKTHROUGH.map((w) => (
              <div key={w.num} className="card-brut card-brut-hover p-7" data-testid={`walkthrough-card-${w.num}`}>
                <div className="flex items-center justify-between">
                  <span className="mono-label text-ink">{w.num}</span>
                  <span className="mono-tag text-signal">{w.label}</span>
                </div>
                <h3 className="font-display text-[28px] mt-5 uppercase leading-[0.95]">{w.title}</h3>
                <div className="mt-5 space-y-4 text-sm">
                  <div>
                    <p className="mono-tag text-muted">WHAT IT DOES</p>
                    <p className="mt-1">{w.what}</p>
                  </div>
                  <div>
                    <p className="mono-tag text-muted">WHY IT MATTERS</p>
                    <p className="mt-1">{w.why}</p>
                  </div>
                </div>
                <p className="mt-6 border-t border-ink pt-4 font-display text-lg text-signal">{w.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ ARTIFACTS ============ */}
      <Section id="artifacts" label="{ real output }" className="bg-ink text-chalk">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase text-chalk">
                This is <span className="text-signal">trust.</span>
                <br />
                On paper.
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-faint">
                Every project ends in artifacts you can send. No blank templates. No generic prose. Your stance, translated.
              </p>
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {ARTIFACTS_SAMPLES.map((a) => (
              <div
                key={a.kind}
                className="bg-paper text-ink p-7 border border-chalk shadow-brutBlue"
                data-testid={`artifact-sample-${a.kind}`}
              >
                <div className="flex items-center justify-between">
                  <span className="mono-label text-ink">{a.kind.replace("_", " ")}</span>
                  <span className="mono-tag text-signal">EXPORTABLE</span>
                </div>
                <h3 className="font-display text-2xl mt-3 leading-tight">{a.title}</h3>
                <ul className="mt-5 space-y-3 text-sm">
                  {a.body.map((line, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-mono text-signal">{String(i + 1).padStart(2, "0")}</span>
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ USE CASES ============ */}
      <Section id="use-cases" label="{ who it's for }" className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase max-w-4xl">
            Built for <span className="text-signal">creative pros</span> who ship decisions, not just deliverables.
          </h2>

          <div className="mt-12 grid md:grid-cols-2 gap-0 border border-ink">
            {USE_CASES.map((u, i) => (
              <div key={u.who} className={`p-8 bg-chalk ${i % 2 === 0 ? "md:border-r border-ink" : ""} ${i < 2 ? "border-b border-ink" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl uppercase">{u.who}</span>
                  <span className="mono-tag text-signal">USE CASE 0{i + 1}</span>
                </div>
                <div className="mt-5 grid sm:grid-cols-2 gap-5 text-sm">
                  <div>
                    <p className="mono-tag text-muted">PAIN</p>
                    <p className="mt-1">{u.pain}</p>
                  </div>
                  <div>
                    <p className="mono-tag text-muted">WIN</p>
                    <p className="mt-1">{u.win}</p>
                  </div>
                </div>
                <p className="mt-5 border-t border-ink pt-4 italic text-ink">{u.example}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ CASE STUDY (first one) ============ */}
      <Section id="case-study" label="{ case study }" className="bg-chalk">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase lg:col-span-8">
              Before Bracket:
              <br />
              <span className="text-signal">chaos.</span>
            </h2>
            <Link to="/case-studies" className="btn-ghost lg:col-span-4 lg:justify-self-end" data-testid="case-study-all-cta">
              All case studies <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-0 border border-ink">
            <div className="p-6 sm:p-8 bg-paper md:border-r border-b md:border-b-0 border-ink">
              <p className="mono-label text-danger">BEFORE</p>
              <h3 className="font-display text-3xl mt-2">{CASE_STUDIES[0].brand}</h3>
              <p className="mono-tag text-muted mt-1">{CASE_STUDIES[0].category}</p>
              <ul className="mt-6 space-y-3">
                {CASE_STUDIES[0].before.map((b, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <X size={14} className="mt-1 text-danger shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 bg-ink text-chalk">
              <p className="mono-label text-signal">AFTER</p>
              <h3 className="font-display text-3xl mt-2 text-chalk">Structured decisions</h3>
              <p className="mono-tag text-faint mt-1">Same client. Different posture.</p>
              <ul className="mt-6 space-y-3">
                {CASE_STUDIES[0].after.map((b, i) => (
                  <li key={i} className="flex gap-3 text-sm text-chalk">
                    <Check size={14} className="mt-1 text-signal shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <blockquote className="mt-12 max-w-3xl font-display text-2xl sm:text-3xl md:text-4xl leading-[1.05]">
            <span className="text-signal">"</span>
            {CASE_STUDIES[0].quote}
            <span className="text-signal">"</span>
          </blockquote>
        </div>
      </Section>

      {/* ============ PRICING ============ */}
      <Section id="pricing" label="{ pricing }" className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase max-w-3xl">
              Simple pricing.
              <br />
              <span className="text-signal">No tier tetris.</span>
            </h2>
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

          <div className="mt-12 grid md:grid-cols-3 gap-0 border border-ink">
            {PRICING.tiers.map((t, idx) => {
              const isStudio = t.id === "studio";
              const price = cur[t.id];
              return (
                <div
                  key={t.id}
                  className={`p-8 ${isStudio ? "bg-ink text-chalk" : "bg-chalk"} ${idx < 2 ? "md:border-r border-ink" : ""} ${idx < 2 ? "border-b md:border-b-0 border-ink" : ""}`}
                  data-testid={`pricing-tier-${t.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`mono-label ${isStudio ? "text-faint" : ""}`}>{t.name}</span>
                    {t.badge && <span className="mono-tag text-signal">{t.badge}</span>}
                  </div>
                  <p className={`mt-3 text-sm ${isStudio ? "text-faint" : "text-muted"}`}>{t.tagline}</p>
                  <div className="mt-8 flex items-baseline gap-2">
                    <span className="font-display text-6xl">
                      {cur.symbol}
                      {price}
                    </span>
                    <span className={`mono-tag ${isStudio ? "text-faint" : "text-muted"}`}>
                      {t.id === "free" ? "/ FOREVER" : "/ MONTH"}
                    </span>
                  </div>
                  <ul className="mt-8 space-y-3">
                    {t.features.map((f, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <Check size={14} className={`mt-1 shrink-0 ${isStudio ? "text-signal" : "text-signal"}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/app"
                    className={`mt-8 w-full justify-center ${isStudio ? "btn-brut" : "btn-ghost"}`}
                    data-testid={`pricing-cta-${t.id}`}
                  >
                    Start a project <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ============ FINAL CTA ============ */}
      <Section id="final" className="bg-ink text-chalk">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-16 md:py-32 relative">
          <span
            className="bracket-mark absolute -top-6 sm:-top-10 -left-4 sm:-left-6 text-[180px] sm:text-[280px] md:text-[380px]"
            style={{ color: "#fff", opacity: 0.08 }}
          >
            {"{"}
          </span>
          <span
            className="bracket-mark absolute -bottom-10 sm:-bottom-16 -right-4 sm:-right-6 text-[180px] sm:text-[280px] md:text-[380px]"
            style={{ color: "#fff", opacity: 0.08 }}
          >
            {"}"}
          </span>

          <p className="mono-label text-faint">{"{ last word }"}</p>
          <h2 className="font-display text-5xl sm:text-6xl md:text-8xl lg:text-9xl uppercase mt-6 text-chalk">
            Stop guessing.
            <br />
            <span className="text-signal">Start deciding.</span>
          </h2>
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-4">
            <Link to="/app" className="btn-brut" data-testid="final-primary-cta">
              Start a project <ArrowRight size={16} />
            </Link>
            <Link to="/how-it-works" className="btn-ghost text-chalk border-chalk hover:bg-chalk hover:text-ink" data-testid="final-secondary-cta">
              See the system first
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
