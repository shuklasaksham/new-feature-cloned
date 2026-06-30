import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { CASE_STUDIES } from "../lib/constants";

export default function CaseStudies() {
  return (
    <div data-testid="case-studies-page" className="page-enter">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 pt-20 md:pt-28 pb-16 md:pb-20 text-center">
          <span className="section-label"><span className="dot" />Case studies</span>
          <h1 className="t-display mt-7 max-w-[820px] mx-auto">
            Chaos → <span className="text-[var(--accent)]">clarity</span>.
          </h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[600px] mx-auto">
            Five products you already know. The thing they share: the breakthrough wasn&apos;t the feature set — it was the decision they dared to make.
          </p>
        </div>
      </section>

      {CASE_STUDIES.map((cs, idx) => (
        <section key={cs.slug} className="border-t border-[var(--hairline)]">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-20 md:py-28">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <p className="t-meta">CASE {String(idx + 1).padStart(2, "0")} / {String(CASE_STUDIES.length).padStart(2, "0")}</p>
                <h2 className="t-hero mt-3">{cs.brand}</h2>
                <p className="t-meta mt-2 normal-case tracking-normal text-[12px] text-[var(--text-3)]">{cs.category}</p>
              </div>
            </div>

            <div className="mt-12 grid md:grid-cols-2 gap-3">
              <div className="card-linear p-6">
                <span className="status-pill status-pill--danger">Before</span>
                <ul className="mt-5 space-y-2.5">
                  {cs.before.map((b, i) => (
                    <li key={i} className="flex gap-3 text-[13px] leading-[1.65] text-[var(--text-2)]">
                      <X size={13} className="mt-0.5 text-[var(--danger)] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-linear p-6 border-[rgba(124,92,255,0.30)] bg-[rgba(124,92,255,0.05)]">
                <span className="status-pill status-pill--active">After</span>
                <ul className="mt-5 space-y-2.5">
                  {cs.after.map((b, i) => (
                    <li key={i} className="flex gap-3 text-[13px] leading-[1.65] text-[var(--text)]">
                      <Check size={13} className="mt-0.5 text-[var(--accent)] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <blockquote className="mt-12 max-w-3xl t-h1 text-[var(--text)]">
              <span className="text-[var(--accent)]">&ldquo;</span>{cs.quote}<span className="text-[var(--accent)]">&rdquo;</span>
            </blockquote>
          </div>
        </section>
      ))}

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-[var(--hairline)]">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 py-24 md:py-32 text-center">
          <span className="section-label"><span className="dot" />Your move</span>
          <h2 className="t-display mt-7">
            Your <span className="text-[var(--accent)]">turn</span>.
          </h2>
          <div className="mt-9">
            <Link to="/app" className="btn-primary btn-lg">Start a project <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
