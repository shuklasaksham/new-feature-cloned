import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { LAYERS, WALKTHROUGH, ARTIFACTS_SAMPLES, USE_CASES, CASE_STUDIES, PRICING } from "../lib/constants";

const Section = ({ id, label, children, className = "" }) => (
  <section id={id} className={`relative border-t border-ink/10 ${className}`}>
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
      "DECIDE BEFORE YOU SHIP",
      "{",
      "LESS INPUT. BETTER JUDGEMENT.",
      "}",
      "OUTPUT WITH INTENT",
      "{",
      "CONFIDENCE WITHOUT ARROGANCE",
      "}",
      "FOR DESIGNERS + FREELANCERS",
      "{",
      "AUTHORITY WITHOUT EGO",
      "}",
    ],
    []
  );

  return (
    <div data-testid="landing-page">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden" data-testid="hero-section">

        <div className="max-w-[1280px] mx-auto px-5 sm:px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-20">
          <div className="flex items-center gap-3">
            <span className="dot-live" />
            <p className="mono-label">Bracket — Decision OS · v1.0</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 mt-10 md:mt-12 items-start">
            <div className="lg:col-span-7">
              <h1 className="font-display text-[32px] sm:text-[40px] md:text-[48px] leading-[1.1] tracking-tight animate-fade-up max-w-[640px]">
                You don&apos;t need more tools.
                <br />
                <span className="text-muted">You need better decisions.</span>
              </h1>
              <p className="mt-5 t-helper text-[15px] leading-relaxed max-w-[560px]">
                Bracket helps you decide <em>what to do</em>, not just how to do it — a senior creative peer&apos;s judgement, installed between your input and your output.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/app" className="btn-brut" data-testid="hero-primary-cta">
                  Start a project <ArrowRight size={14} />
                </Link>
                <Link to="/how-it-works" className="btn-ghost" data-testid="hero-secondary-cta">
                  See how it works
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="card-brut p-6">
                <p className="mono-label">{"{ the pitch }"}</p>
                <p className="mt-3 t-body">
                  Most tools help you <em>execute</em>. Bracket helps you <em>decide</em>: reframe the brief, compress the context, name the trade-offs, draft the artifacts, then lock it before anyone reopens the conversation.
                </p>
                <ul className="mt-5 space-y-2.5 t-helper">
                  <li>· Five quiet steps. Fifteen minutes per project.</li>
                  <li>· The reasoning is documented, so the call survives the room.</li>
                  <li>· Free during early access.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="mx-5 sm:mx-6 md:mx-10 mt-2 mb-2 clay-dark overflow-hidden rounded-2xl">
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

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {[
              ["Clients ask vague things", "\"Make it pop.\" \"More premium.\" \"Bolder but cleaner.\" Decoded into nothing."],
              ["Scope creeps silently", "Each small \"just one more\" lands on your plate. The budget doesn't move. You do."],
              ["Decisions feel subjective", "You know it's right. You can't say why. The stakeholder wins the argument, not the work."],
              ["The brief is never the problem", "The real problem is underneath. No tool has helped you surface it."],
            ].map(([t, c], i) => (
              <div key={i} className="card-brut card-brut-hover p-7">
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

          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {LAYERS.map((l) => (
              <div key={l.num} className="card-brut card-brut-hover p-8">
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
      <Section id="artifacts" label="{ real output }" className="clay-dark !rounded-none text-chalk">
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
                className="liquid-glass text-ink p-7"
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

          <div className="mt-12 grid md:grid-cols-2 gap-4">
            {USE_CASES.map((u, i) => (
              <div key={u.who} className="card-brut card-brut-hover p-8">
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

          <div className="mt-12 grid md:grid-cols-2 gap-4">
            <div className="card-brut p-6 sm:p-8">
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
            <div className="clay-dark p-8 rounded-2xl">
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
            <div className="inline-flex items-center rounded-full glass p-1" data-testid="pricing-currency-toggle">
              {Object.keys(PRICING.currencies).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-2 mono-tag rounded-full transition-all ${currency === c ? "clay-dark text-chalk" : "text-ink hover:bg-white/30"}`}
                  data-testid={`currency-toggle-${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {PRICING.tiers.map((t) => {
              const isStudio = t.id === "studio";
              const price = cur[t.id];
              return (
                <div
                  key={t.id}
                  className={`p-8 rounded-2xl ${isStudio ? "clay-dark text-chalk" : "card-brut card-brut-hover"}`}
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
      <Section id="final" className="clay-dark text-chalk">
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
