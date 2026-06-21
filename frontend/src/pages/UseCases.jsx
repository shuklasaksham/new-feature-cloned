import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { USE_CASES } from "../lib/constants";

export default function UseCases() {
  return (
    <div data-testid="use-cases-page">
      <section className="border-b border-ink bg-paper blueprint-bg">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-20">
          <p className="mono-label">{"{ use cases }"}</p>
          <h1 className="font-display text-5xl sm:text-6xl md:text-8xl uppercase mt-5 md:mt-6 max-w-5xl">
            For designers who <span className="text-signal">take</span> the call.
          </h1>
          <p className="mt-5 md:mt-6 text-muted max-w-2xl text-sm md:text-base">
            Bracket doesn't care about job titles. It cares who has to make the decision at 11pm on a Sunday.
          </p>
        </div>
      </section>

      <section className="bg-chalk border-b border-ink">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-24 space-y-0 border border-ink border-r-0 border-l-0">
          {USE_CASES.map((u, i) => (
            <div
              key={u.who}
              className={`grid lg:grid-cols-12 gap-6 md:gap-8 p-6 sm:p-8 ${i % 2 === 0 ? "bg-paper" : "bg-chalk"} border-t border-ink`}
              data-testid={`usecase-row-${u.who.toLowerCase()}`}
            >
              <div className="lg:col-span-4">
                <p className="mono-label">0{i + 1}</p>
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl uppercase mt-3">{u.who}</h2>
              </div>
              <div className="lg:col-span-4">
                <p className="mono-tag text-muted">PAIN</p>
                <p className="mt-2 text-sm sm:text-base">{u.pain}</p>
                <p className="mono-tag text-muted mt-5 md:mt-6">WIN</p>
                <p className="mt-2 text-sm sm:text-base">{u.win}</p>
              </div>
              <div className="lg:col-span-4 border-l-0 lg:border-l border-ink lg:pl-6">
                <p className="mono-tag text-muted">IN PRACTICE</p>
                <p className="mt-2 italic text-sm sm:text-base">{u.example}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-chalk">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-14 md:py-20">
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl uppercase">
            Which one are <span className="text-signal">you?</span>
          </h2>
          <p className="mt-5 md:mt-6 text-faint max-w-xl text-sm md:text-base">We'll ask you in the onboarding. Your Bracket will think differently based on how you work.</p>
          <div className="mt-6 md:mt-8">
            <Link to="/app" className="btn-brut">Start a project <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
