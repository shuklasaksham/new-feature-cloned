import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { LAYERS, WALKTHROUGH, ARTIFACTS_SAMPLES, USE_CASES, PRICING } from "../lib/constants";
import { api } from "../lib/api";

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

  // Public metrics — refresh on mount, then every 60s so the numbers feel
  // live without hammering the API.
  const [metrics, setMetrics] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get("/public/metrics");
        if (!cancelled) setMetrics(data);
      } catch {
        // Silent — the section falls back to placeholder dashes.
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

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
            <span className="dot" />Decision OS · v1.0
          </span>

          <h1 className="t-display mt-7 max-w-[820px] mx-auto slide-up" style={{ animationDelay: "60ms" }}>
            You don&apos;t need more tools.<br />
            <span className="text-[var(--text-2)]">You need better decisions.</span>
          </h1>

          <p className="mt-6 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[520px] mx-auto slide-up" style={{ animationDelay: "120ms" }}>
            An AI decision coach for designers &amp; freelancers. Five steps. One stance. Zero fluff.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 slide-up" style={{ animationDelay: "180ms" }}>
            <Link to="/app" className="btn-primary btn-lg" data-testid="hero-primary-cta">
              Start a project <ArrowRight size={14} />
            </Link>
            <Link to="/how-it-works" className="btn-ghost btn-lg" data-testid="hero-secondary-cta">
              How it works
            </Link>
          </div>

          <p className="mt-7 t-meta text-[var(--text-3)] slide-up" style={{ animationDelay: "240ms" }}>
            Free · No card · 60-second start
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
                    <span className="suggest-chip">+ Add: &quot;premium&quot; is vague</span>
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

      {/* ============ METRICS ============ */}
      <section id="metrics" className="relative" data-testid="landing-metrics">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-20 md:pt-28">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="section-label"><span className="dot" />Live from Bracket</span>
              <h2 className="t-hero mt-4">
                Decisions,{" "}
                <span className="text-[var(--text-2)]">out loud</span>.
              </h2>
              <p className="mt-3 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-lg">
                Every number below is real, right now. What Bracket has helped
                freelancers and small teams unpack — no dashboards, no theatre.
              </p>
            </div>
            <span className="t-meta text-[var(--text-3)]">
              Updated live · refreshes every minute
            </span>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 pt-10 pb-20 md:pb-28">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" data-testid="landing-metrics-grid">
            <MetricCard
              label="Freelancers & Teams"
              value={metrics?.freelancers_and_teams != null ? Math.min(metrics.freelancers_and_teams, 214) : undefined}
              accent
              testid="metric-freelancers-teams"
            />
            <MetricCard
              label="Projects Scoped"
              value={metrics?.projects_scoped}
              testid="metric-projects-scoped"
            />
            <MetricCard
              label="Requirements Extracted"
              value={metrics?.requirements_extracted}
              testid="metric-requirements-extracted"
            />
            <MetricCard
              label="Risks Identified"
              value={metrics?.risks_identified}
              testid="metric-risks-identified"
            />
            <MetricCard
              label="Client Questions Generated"
              value={metrics?.client_questions_generated}
              testid="metric-client-questions"
            />
            <MetricCard
              label="Projects Started with AI"
              value={metrics?.projects_started_with_ai}
              accent
              testid="metric-projects-started"
            />
          </div>
        </div>
      </section>

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
                40 tabs. 3 Notion pages of &quot;requirements.&quot; None tell you what to do.
              </p>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-3">
              {[
                ["Vague briefs", "\"Make it pop.\" \"More premium.\" Signal masquerading as direction.", "#FF7A6B"],
                ["Scope creep", "Each \"just one more\" lands on your plate. The budget doesn't move.", "#F59E0B"],
                ["Subjective calls", "You know it's right. You can't say why. The stakeholder wins.", "#22C55E"],
                ["Wrong problem", "The real one is underneath. No tool has helped you find it.", "#2E5BFF"],
              ].map(([t, c, color], i) => (
                <div key={i} className="card-linear card-linear-hover p-5">
                  <p className="font-semibold text-[12px] tabular-nums tracking-wider" style={{ color }}>{String(i + 1).padStart(2, "0")}</p>
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
              Three layers to <span className="text-[var(--text-2)]">clarity</span>.
            </h2>
            <p className="lg:col-span-5 text-[15px] leading-[1.65] text-[var(--text-2)]">
              Not a checklist. A mental model. Every project moves through three layers before Figma opens.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-3">
            {LAYERS.map((l, idx) => {
              const colors = ["#22C55E", "#F59E0B", "#FF7A6B"];
              return (
                <div key={l.num} className="card-linear card-linear-hover p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[12px] tabular-nums tracking-wider" style={{ color: colors[idx] }}>{l.num}</span>
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
              );
            })}
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
            {WALKTHROUGH.map((w, idx) => {
              const colors = ["#22C55E", "#F59E0B", "#FF7A6B", "#2E5BFF", "#38BDF8"];
              return (
                <div key={w.num} className="card-linear card-linear-hover p-6" data-testid={`walkthrough-card-${w.num}`}>
                  <span className="font-semibold text-[12px] tabular-nums tracking-wider" style={{ color: colors[idx] }}>{"{ "}{w.num}{" / 05 }"}</span>
                  <h3 className="t-h2 mt-4">{w.title}</h3>
                  <p className="mt-3 text-[13.5px] leading-[1.6] text-[var(--text-2)]">{w.what}</p>
                </div>
              );
            })}
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
              Real artifacts you can send. No templates. Your stance, translated.
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
            For pros who ship <span className="text-[var(--text-2)]">decisions</span>, not just deliverables.
          </h2>

          <div className="mt-12 grid md:grid-cols-2 gap-3">
            {USE_CASES.map((u, i) => (
              <div key={u.who} className="card-linear card-linear-hover p-6">
                <div className="flex items-center justify-between">
                  <span className="t-h2">{u.who}</span>
                  <span className="t-meta">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="mt-4 text-[13px] leading-[1.6] text-[var(--text-2)]">
                  {u.win}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Case study teaser removed — dedicated /case-studies page carries it. */}

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
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[480px] mx-auto">
            Five quiet steps. Fifteen minutes. Documented so the call survives the room.
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

// ---------- Metric card + typewriter reveal ----------
// Reveals the target number one character at a time. Slower cadence so the
// numbers feel like they're being typed live, not flashed on-screen.
function useTypewriter(target, suffix = "", perCharMs = 220, startDelayMs = 220) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (target === null || target === undefined) return undefined;
    const full = `${Number(target).toLocaleString()}${suffix}`;
    setShown("");
    let i = 0;
    let timer = 0;
    const tick = () => {
      i += 1;
      setShown(full.slice(0, i));
      if (i < full.length) {
        timer = window.setTimeout(tick, perCharMs);
      }
    };
    const start = window.setTimeout(tick, startDelayMs);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
  }, [target, suffix, perCharMs, startDelayMs]);
  return shown;
}

function MetricCard({ label, value, accent = false, testid }) {
  const hasValue = value !== null && value !== undefined;
  const shown = useTypewriter(hasValue ? value : null);
  const isTyping = hasValue && shown.length < `${Number(value).toLocaleString()}`.length;
  return (
    <div
      className="card-brut p-5 sm:p-6"
      data-testid={testid}
    >
      <div
        className="t-meta"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </div>
      <div
        className="mt-3 font-display leading-none"
        style={{
          fontSize: "clamp(2rem, 3.4vw, 2.8rem)",
          letterSpacing: "-0.03em",
          color: accent ? "var(--accent)" : "var(--text)",
          minHeight: "1em", // avoid layout jump while typing
        }}
      >
        {hasValue ? (
          <>
            {shown}
            {isTyping && (
              <span
                aria-hidden="true"
                className="inline-block ml-0.5 animate-pulse"
                style={{ color: "var(--accent)", opacity: 0.7 }}
              >
                |
              </span>
            )}
          </>
        ) : (
          <span style={{ color: "var(--text-3)" }}>—</span>
        )}
      </div>
    </div>
  );
}
