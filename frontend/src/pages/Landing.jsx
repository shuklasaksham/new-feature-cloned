import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { LAYERS, WALKTHROUGH, ARTIFACTS_SAMPLES, USE_CASES, CASE_STUDIES, PRICING } from "../lib/constants";

const Section = ({ id, label, children, className = "" }) => (
  <section id={id} className={`relative ${className}`}>
    {label && (
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-20 md:pt-28">
        <span className="section-label"><span className="dot" />{label}</span>
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
      "Decide before you ship",
      "Less input. Better judgement.",
      "Output with intent",
      "Confidence without arrogance",
      "For designers + freelancers",
      "Authority without ego",
    ],
    []
  );

  return (
    <div data-testid="landing-page" className="page-enter">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden pt-16 md:pt-24 pb-20 md:pb-28" data-testid="hero-section">
        <div className="hero-ambient" aria-hidden="true" />

        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 text-center">
          <span className="section-label slide-up" data-testid="hero-eyebrow">
            <span className="dot" />Bracket — Decision OS · v1.0
          </span>

          <h1 className="t-display mt-7 max-w-[820px] mx-auto slide-up" style={{ animationDelay: "60ms" }}>
            You don&apos;t need more tools.<br />
            <span className="text-[var(--text-2)]">You need better decisions.</span>
          </h1>

          <p className="mt-6 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[600px] mx-auto slide-up" style={{ animationDelay: "120ms" }}>
            A senior creative peer&apos;s judgement, installed between your input and your output. Bracket helps you decide <em className="not-italic text-[var(--text)]">what to do</em> — not just how to do it.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 slide-up" style={{ animationDelay: "180ms" }}>
            <Link to="/app" className="btn-primary btn-lg" data-testid="hero-primary-cta">
              Start a project <ArrowRight size={14} />
            </Link>
            <Link to="/how-it-works" className="btn-ghost btn-lg" data-testid="hero-secondary-cta">
              See how it works
            </Link>
          </div>

          <p className="mt-7 t-meta text-[var(--text-3)] slide-up" style={{ animationDelay: "240ms" }}>
            Free during early access · No credit card · 60-second start
          </p>
        </div>

        {/* Product preview placeholder — Linear-style dark surface */}
        <div className="relative max-w-[1080px] mx-auto px-5 sm:px-6 md:px-8 mt-16 md:mt-20 slide-up" style={{ animationDelay: "300ms" }}>
          <div className="liquid-glass overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--hairline)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5C5C]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80]/70" />
              <span className="ml-3 t-meta">bracket — acme rebrand · landing</span>
            </div>
            <div className="grid md:grid-cols-12 gap-0 min-h-[320px]">
              <div className="md:col-span-7 p-6 border-r border-[var(--hairline)]">
                <p className="t-meta">{"{ 01 / 05 }"} · Situation framing</p>
                <h3 className="t-h1 mt-3">Name what&apos;s really happening.</h3>
                <p className="text-[13px] text-[var(--text-2)] mt-3 leading-[1.65]">
                  Skip the brief. Describe the situation like you&apos;d tell it to a friend over coffee. Bracket will mirror it back clearly.
                </p>
                <div className="mt-5 space-y-3">
                  <div className="textarea-linear text-[13px] !min-h-0 !py-2.5">
                    Acme is rebranding their fintech landing — they want it &quot;more premium&quot; but the existing system is fine. Client keeps adding requests.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="suggest-chip">+ Add: "premium" is vague</span>
                    <span className="suggest-chip">+ Add: existing brand is solid</span>
                    <span className="suggest-chip">+ Add: scope is creeping</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-5 p-6 bg-[var(--surface-2)]/40">
                <p className="t-meta">{"{ output · live }"}</p>
                <p className="text-[13px] text-[var(--text)] mt-3 leading-[1.7]">
                  The client&apos;s real ask isn&apos;t a redesign — it&apos;s validation. They want their brand to feel more confident, not different. Anchor the conversation on hierarchy and tone before pixels.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 t-meta text-[var(--text-2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  AI thinking — confidence 92%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-y border-[var(--hairline)] py-5 overflow-hidden">
        <div className="marquee-track">
          {[...marquee, ...marquee].map((w, i) => (
            <span key={i} className="t-meta text-[var(--text-3)]">{w}</span>
          ))}
        </div>
      </div>

      {/* ============ PROBLEM ============ */}
      <Section id="problem" label="The problem">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-10 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-5">
              <h2 className="t-hero">
                Too many tools.<br />
                Not enough <span className="text-[var(--text-2)]">clarity</span>.
              </h2>
              <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-md">
                Every designer, freelancer, or indie creative has 40 tabs open and 3 Notion pages of &quot;requirements.&quot; None of it tells you what to do.
              </p>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-3">
              {[
                ["Clients ask vague things", "\"Make it pop.\" \"More premium.\" \"Bolder but cleaner.\" Decoded into nothing."],
                ["Scope creeps silently", "Each small \"just one more\" lands on your plate. The budget doesn't move. You do."],
                ["Decisions feel subjective", "You know it's right. You can't say why. The stakeholder wins the argument."],
                ["The brief is never the problem", "The real problem is underneath. No tool has helped you surface it."],
              ].map(([t, c], i) => (
                <div key={i} className="card-linear card-linear-hover p-5">
                  <p className="t-meta">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="t-h2 mt-2.5">{t}</h3>
                  <p className="text-[13.5px] leading-[1.65] text-[var(--text-2)] mt-2.5">{c}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ============ THE SHIFT (3 layers) ============ */}
      <Section id="shift" label="The shift">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-10 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
            <h2 className="t-hero lg:col-span-7">
              Three layers between <span className="text-[var(--text-2)]">chaos</span> and clarity.
            </h2>
            <p className="lg:col-span-5 text-[15px] leading-[1.65] text-[var(--text-2)]">
              Bracket isn&apos;t a feature checklist. It&apos;s a mental model. Every project moves through three layers before you open Figma.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-3">
            {LAYERS.map((l, idx) => (
              <div key={l.num} className="card-linear card-linear-hover p-6">
                <div className="flex items-center justify-between">
                  <span className="t-meta">{l.num}</span>
                  <ArrowRight size={14} className="text-[var(--text-3)]" />
                </div>
                <h3 className="t-h2 mt-4">{l.title}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{l.copy}</p>
                <div className="mt-5 space-y-2.5 pt-4 border-t border-[var(--hairline)]">
                  <div className="flex gap-2.5 items-start">
                    <X size={13} className="mt-0.5 text-[var(--danger)] shrink-0" />
                    <p className="text-[12.5px] leading-[1.6] text-[var(--text-3)]">{l.bad}</p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <Check size={13} className="mt-0.5 text-[var(--success)] shrink-0" />
                    <p className="text-[12.5px] leading-[1.6] text-[var(--text)]">{l.good}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ PRODUCT WALKTHROUGH ============ */}
      <Section id="walkthrough" label="Product walkthrough">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-10 pb-20 md:pb-28">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="t-hero max-w-3xl">
              Five steps. One <span className="text-[var(--text-2)]">stance</span>.
            </h2>
            <Link to="/how-it-works" className="btn-ghost" data-testid="walkthrough-deepdive-cta">
              Full walkthrough <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {WALKTHROUGH.map((w) => (
              <div key={w.num} className="card-linear card-linear-hover p-6" data-testid={`walkthrough-card-${w.num}`}>
                <div className="flex items-center justify-between">
                  <span className="t-meta">{"{ "}{w.num}{" / 05 }"}</span>
                </div>
                <h3 className="t-h2 mt-4">{w.title}</h3>
                <div className="mt-5 space-y-4 text-[13px] leading-[1.65]">
                  <div>
                    <p className="t-meta mb-1.5">What it does</p>
                    <p className="text-[var(--text)]">{w.what}</p>
                  </div>
                  <div>
                    <p className="t-meta mb-1.5">Why it matters</p>
                    <p className="text-[var(--text-2)]">{w.why}</p>
                  </div>
                </div>
                <p className="mt-5 pt-4 border-t border-[var(--hairline)] text-[13.5px] italic text-[var(--text)]">{w.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ ARTIFACTS ============ */}
      <Section id="artifacts" label="Real output">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-10 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <h2 className="t-hero lg:col-span-7">
              This is <span className="text-[var(--text-2)]">trust</span>. On paper.
            </h2>
            <p className="lg:col-span-5 text-[15px] leading-[1.65] text-[var(--text-2)]">
              Every project ends in artifacts you can send. No blank templates. No generic prose. Your stance, translated.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-3">
            {ARTIFACTS_SAMPLES.map((a) => (
              <div key={a.kind} className="card-linear card-linear-hover p-6" data-testid={`artifact-sample-${a.kind}`}>
                <div className="flex items-center justify-between">
                  <span className="t-meta">{a.kind.replace("_", " ")}</span>
                  <span className="status-pill status-pill--active">Exportable</span>
                </div>
                <h3 className="t-h2 mt-4">{a.title}</h3>
                <ul className="mt-5 space-y-2.5">
                  {a.body.map((line, i) => (
                    <li key={i} className="flex gap-3 text-[13px] leading-[1.65]">
                      <span className="font-mono text-[11px] text-[var(--text-3)] mt-1 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[var(--text)]">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ USE CASES ============ */}
      <Section id="use-cases" label="Who it's for">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-10 pb-20 md:pb-28">
          <h2 className="t-hero max-w-3xl">
            Built for <span className="text-[var(--text-2)]">creative pros</span> who ship decisions, not just deliverables.
          </h2>

          <div className="mt-12 grid md:grid-cols-2 gap-3">
            {USE_CASES.map((u, i) => (
              <div key={u.who} className="card-linear card-linear-hover p-6">
                <div className="flex items-center justify-between">
                  <span className="t-h2">{u.who}</span>
                  <span className="t-meta">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-4 text-[13px] leading-[1.65]">
                  <div>
                    <p className="t-meta mb-1.5">Pain</p>
                    <p className="text-[var(--text-2)]">{u.pain}</p>
                  </div>
                  <div>
                    <p className="t-meta mb-1.5">Win</p>
                    <p className="text-[var(--text)]">{u.win}</p>
                  </div>
                </div>
                <p className="mt-4 pt-4 border-t border-[var(--hairline)] text-[13px] italic text-[var(--text)]">{u.example}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ CASE STUDY teaser ============ */}
      <Section id="case-study" label="Case study">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-10 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <h2 className="t-hero lg:col-span-8">
              Before Bracket: <span className="text-[var(--text-2)]">chaos</span>.
            </h2>
            <Link to="/case-studies" className="btn-ghost lg:col-span-4 lg:justify-self-end" data-testid="case-study-all-cta">
              All case studies <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-3">
            <div className="card-linear p-6">
              <span className="status-pill status-pill--danger">Before</span>
              <h3 className="t-h1 mt-4">{CASE_STUDIES[0].brand}</h3>
              <p className="t-meta mt-1">{CASE_STUDIES[0].category}</p>
              <ul className="mt-5 space-y-2.5">
                {CASE_STUDIES[0].before.map((b, i) => (
                  <li key={i} className="flex gap-3 text-[13px] leading-[1.65] text-[var(--text-2)]">
                    <X size={13} className="mt-0.5 text-[var(--danger)] shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-linear p-6 border-[var(--hairline-strong)] bg-[var(--surface-2)]">
              <span className="status-pill status-pill--active">After</span>
              <h3 className="t-h1 mt-4">Structured decisions</h3>
              <p className="t-meta mt-1">Same client. Different posture.</p>
              <ul className="mt-5 space-y-2.5">
                {CASE_STUDIES[0].after.map((b, i) => (
                  <li key={i} className="flex gap-3 text-[13px] leading-[1.65] text-[var(--text)]">
                    <Check size={13} className="mt-0.5 text-[var(--text-2)] shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <blockquote className="mt-14 max-w-3xl t-display text-[var(--text)]">
            <span className="text-[var(--text-2)]">&ldquo;</span>{CASE_STUDIES[0].quote}<span className="text-[var(--text-2)]">&rdquo;</span>
          </blockquote>
        </div>
      </Section>

      {/* ============ PRICING ============ */}
      <Section id="pricing" label="Pricing">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-10 pb-20 md:pb-28">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="t-hero max-w-3xl">
              Simple pricing. <span className="text-[var(--text-2)]">No tier tetris</span>.
            </h2>
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

          <div className="mt-12 grid md:grid-cols-3 gap-3">
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
                    <span className="font-semibold text-[44px] tracking-[-0.03em] leading-none">
                      {cur.symbol}{price}
                    </span>
                    <span className="t-meta">
                      {t.id === "free" ? "/ forever" : "/ month"}
                    </span>
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
      </Section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden" data-testid="final-cta-section">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 pt-24 md:pt-32 pb-24 md:pb-32 text-center">
          <span className="section-label"><span className="dot" />Last word</span>
          <h2 className="t-display mt-7">
            Stop guessing.<br />
            <span className="text-[var(--text-2)]">Start deciding</span>.
          </h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[520px] mx-auto">
            Five quiet steps. Fifteen minutes per project. The reasoning is documented, so the call survives the room.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link to="/app" className="btn-primary btn-lg" data-testid="final-primary-cta">
              Start a project <ArrowRight size={14} />
            </Link>
            <Link to="/how-it-works" className="btn-ghost btn-lg" data-testid="final-secondary-cta">
              See the system first
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
