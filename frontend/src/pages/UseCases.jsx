import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { USE_CASES } from "../lib/constants";
import Seo from "../components/Seo";

export default function UseCases() {
  return (
    <div data-testid="use-cases-page" className="page-enter">
      <Seo
        title="Use cases"
        description="From brand refreshes to product retainers — see how designers and freelancers use Bracket to unblock scope, kill ambiguity, and close projects faster."
        path="/use-cases"
      />
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 pt-20 md:pt-28 pb-16 md:pb-20 text-center">
          <span className="section-label"><span className="dot" />Use cases</span>
          <h1 className="t-display mt-7 max-w-[820px] mx-auto">
            For the people who <span className="text-[var(--text-2)]">take</span> the call.
          </h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[600px] mx-auto">
            Bracket doesn&apos;t care about job titles. Designer, freelancer, copywriter, illustrator, photographer, indie dev — it cares who has to make the decision at 11pm on a Sunday.
          </p>
        </div>
      </section>

      {/* CASES */}
      <section className="border-t border-[var(--hairline)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-20 md:py-28">
          <div className="space-y-3">
            {USE_CASES.map((u, i) => (
              <div
                key={u.who}
                className="card-linear card-linear-hover p-6 grid lg:grid-cols-12 gap-6"
                data-testid={`usecase-row-${u.who.toLowerCase()}`}
              >
                <div className="lg:col-span-4">
                  <p className="t-meta">{String(i + 1).padStart(2, "0")}</p>
                  <h2 className="t-h1 mt-3">{u.who}</h2>
                </div>
                <div className="lg:col-span-4">
                  <p className="t-meta">Pain</p>
                  <p className="mt-1.5 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{u.pain}</p>
                  <p className="t-meta mt-4">Win</p>
                  <p className="mt-1.5 text-[13.5px] leading-[1.65] text-[var(--text)]">{u.win}</p>
                </div>
                <div className="lg:col-span-4 lg:border-l border-[var(--hairline)] lg:pl-6">
                  <p className="t-meta">In practice</p>
                  <p className="mt-1.5 text-[13.5px] leading-[1.65] italic text-[var(--text)]">{u.example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-[var(--hairline)]">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 py-24 md:py-32 text-center">
          <span className="section-label"><span className="dot" />Tell us</span>
          <h2 className="t-display mt-7">
            Which one are <span className="text-[var(--text-2)]">you</span>?
          </h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[520px] mx-auto">
            We&apos;ll ask in the onboarding. Bracket thinks differently based on how you work.
          </p>
          <div className="mt-9">
            <Link to="/app" className="btn-primary btn-lg">Start a project <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
