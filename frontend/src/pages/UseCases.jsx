import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { USE_CASES } from "../lib/constants";
import Seo from "../components/Seo";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  }),
};

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
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 pt-24 md:pt-32 pb-16 md:pb-20 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="section-label mx-auto"
          >
            <span className="dot" />Use cases
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-7 max-w-[900px] mx-auto"
          >
            For the people who <span className="landing-hero-gradient">take the call</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-6 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[600px] mx-auto"
          >
            Bracket doesn&apos;t care about job titles. Designer, freelancer, copywriter,
            illustrator, photographer, indie dev — it cares who has to make the decision
            at 11pm on a Sunday.
          </motion.p>
        </div>
      </section>

      {/* CASES */}
      <section>
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 py-20 md:py-24 space-y-4">
          {USE_CASES.map((u, i) => (
            <motion.div
              key={u.who}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="card-linear p-7 grid lg:grid-cols-12 gap-6 md:gap-8 relative overflow-hidden"
              data-testid={`usecase-row-${u.who.toLowerCase()}`}
            >
              <div
                aria-hidden="true"
                className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-[50px] opacity-30 group-hover:opacity-60 transition-opacity"
                style={{ background: "radial-gradient(closest-side, rgba(94,106,210,0.35), transparent)" }}
              />
              <div className="lg:col-span-3 flex lg:flex-col items-baseline lg:items-start gap-3 lg:gap-2">
                <span
                  className="font-display font-semibold text-[42px] leading-none tracking-[-0.03em] tabular-nums"
                  style={{
                    color: "transparent",
                    backgroundImage: "linear-gradient(135deg, #5E6AD2 0%, #7CD5FF 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  0{i + 1}
                </span>
                <h2 className="font-display font-semibold text-[22px] tracking-[-0.02em]">{u.who}</h2>
              </div>
              <div className="lg:col-span-5">
                <p className="mono-tag text-signal">Pain</p>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{u.pain}</p>
                <p className="mono-tag text-signal mt-5">Win</p>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--text)]">{u.win}</p>
              </div>
              <div className="lg:col-span-4 lg:border-l border-[var(--hairline)] lg:pl-7">
                <p className="mono-tag text-signal">In practice</p>
                <p className="mt-2 text-[13.5px] leading-[1.65] italic text-[var(--text)]">{u.example}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-8 py-28 md:py-36 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-label mx-auto"
          >
            <span className="dot" />Tell us
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-7"
          >
            Which one are <span className="landing-hero-gradient">you</span>?
          </motion.h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[520px] mx-auto">
            We&apos;ll ask in the onboarding. Bracket thinks differently based on how you work.
          </p>
          <div className="mt-10">
            <Link to="/app" className="landing-cta-primary" data-testid="usecases-final-cta">
              <span>Start a project</span> <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
