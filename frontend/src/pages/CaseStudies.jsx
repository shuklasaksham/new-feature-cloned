import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { CASE_STUDIES } from "../lib/constants";

export default function CaseStudies() {
  return (
    <div data-testid="case-studies-page">
      <section className="border-b border-ink bg-paper blueprint-bg">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
          <p className="mono-label">{"{ case studies }"}</p>
          <h1 className="font-display text-6xl md:text-8xl uppercase mt-6 max-w-5xl">
            Chaos → <span className="text-signal">clarity.</span>
          </h1>
          <p className="mt-6 text-muted max-w-2xl">
            Real projects. Real designers. Same pattern: the design didn't get better. The decisions did.
          </p>
        </div>
      </section>

      {CASE_STUDIES.map((cs, idx) => (
        <section key={cs.slug} className={`border-b border-ink ${idx % 2 === 0 ? "bg-chalk" : "bg-paper"}`}>
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20">
            <p className="mono-label">CASE 0{idx + 1} / {CASE_STUDIES.length.toString().padStart(2, "0")}</p>
            <h2 className="font-display text-4xl md:text-6xl uppercase mt-4">{cs.brand}</h2>
            <p className="mono-tag text-muted mt-2">{cs.role}</p>

            <div className="mt-10 grid md:grid-cols-2 gap-0 border border-ink">
              <div className="p-8 bg-paper border-r border-ink">
                <p className="mono-label text-danger">BEFORE</p>
                <ul className="mt-4 space-y-3">
                  {cs.before.map((b, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <X size={14} className="mt-1 text-danger shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-8 bg-ink text-chalk">
                <p className="mono-label text-signal">AFTER</p>
                <ul className="mt-4 space-y-3">
                  {cs.after.map((b, i) => (
                    <li key={i} className="flex gap-3 text-sm text-chalk">
                      <Check size={14} className="mt-1 text-signal shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <blockquote className="mt-10 max-w-3xl font-display text-3xl md:text-4xl leading-[1.05]">
              <span className="text-signal">"</span>{cs.quote}<span className="text-signal">"</span>
            </blockquote>
          </div>
        </section>
      ))}

      <section className="bg-ink text-chalk">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
          <h2 className="font-display text-5xl md:text-7xl uppercase">Your turn.</h2>
          <div className="mt-8">
            <Link to="/signup" className="btn-brut">Start your first project <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
