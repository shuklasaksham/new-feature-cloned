import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { LAYERS, WALKTHROUGH } from "../lib/constants";
import Seo from "../components/Seo";

// Cinematic wrapper for motion-in tiles.
const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function HowItWorks() {
  return (
    <div data-testid="how-it-works-page" className="page-enter">
      <Seo
        title="How it works"
        description="See how Bracket's five-step decision loop turns messy briefs into a locked-in scope, decision doc, and client-ready message — in under 20 minutes."
        path="/how-it-works"
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 pt-24 md:pt-32 pb-16 md:pb-24">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="section-label"
          >
            <span className="dot" />How it works
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-6 max-w-[900px]"
          >
            Less a tool.<br />
            More a <span className="landing-hero-gradient">way of thinking</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-6 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[600px]"
          >
            Every Bracket project moves through the same five steps. Same for a ₹15k landing page.
            Same for a Series-A dashboard. The rigour doesn&apos;t change — the stakes do.
          </motion.p>
        </div>
      </section>

      {/* 3 LAYERS */}
      <section className="relative">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-24 md:py-32">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-label"
          >
            <span className="dot" />The mental model
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="t-hero mt-6"
          >
            Three layers.
          </motion.h2>
          <div className="mt-14 grid md:grid-cols-3 gap-4">
            {LAYERS.map((l, i) => (
              <motion.div
                key={l.num}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="card-linear card-linear-hover p-7 relative overflow-hidden group"
              >
                <div
                  aria-hidden="true"
                  className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-[50px] opacity-0 group-hover:opacity-60 transition-opacity duration-500"
                  style={{ background: "radial-gradient(closest-side, rgba(94,106,210,0.4), transparent)" }}
                />
                <p
                  className="font-display font-semibold text-[38px] leading-none tracking-[-0.03em] tabular-nums"
                  style={{
                    color: "transparent",
                    backgroundImage: "linear-gradient(135deg, #5E6AD2 0%, #7CD5FF 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  {l.num}
                </p>
                <h3 className="font-display text-[22px] mt-3 font-semibold tracking-[-0.02em]">{l.title}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{l.copy}</p>
                <div className="mt-6 space-y-3 pt-5 border-t border-[var(--hairline)]">
                  <div className="flex gap-2.5 items-start">
                    <X size={13} className="mt-0.5 text-[var(--danger)] shrink-0" />
                    <p className="text-[12.5px] leading-[1.6] text-[var(--text-3)]">{l.bad}</p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <Check size={13} className="mt-0.5 text-signal shrink-0" />
                    <p className="text-[12.5px] leading-[1.6] text-[var(--text)]">{l.good}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 STEPS */}
      <section className="relative">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-24 md:py-32">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-label"
          >
            <span className="dot" />The project flow
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="t-hero mt-6"
          >
            Five steps.
          </motion.h2>

          <div className="mt-14 space-y-4">
            {WALKTHROUGH.map((w, i) => (
              <motion.div
                key={w.num}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="card-linear p-7 grid lg:grid-cols-12 gap-6 md:gap-8"
              >
                <div className="lg:col-span-2 flex lg:flex-col items-baseline lg:items-start gap-3 lg:gap-1">
                  <span
                    className="font-display font-semibold text-[42px] leading-none tracking-[-0.03em]"
                    style={{
                      color: "transparent",
                      backgroundImage: "linear-gradient(135deg, #5E6AD2 0%, #7CD5FF 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                    }}
                  >
                    0{w.num}
                  </span>
                  <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-signal">{w.label}</p>
                </div>
                <div className="lg:col-span-6">
                  <h3 className="font-display font-semibold text-[22px] tracking-[-0.02em]">{w.title}</h3>
                  <p className="mt-3 text-[14px] leading-[1.65] text-[var(--text-2)]">{w.what}</p>
                </div>
                <div className="lg:col-span-4 lg:border-l border-[var(--hairline)] lg:pl-7">
                  <p className="mono-tag text-signal">Why it matters</p>
                  <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--text)]">{w.why}</p>
                  <p className="mt-4 text-[13.5px] italic text-[var(--text-2)]">{w.quote}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 py-28 md:py-40 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-label"
          >
            <span className="dot" />Last word
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-7"
          >
            Stop guessing.<br />
            <span className="landing-hero-gradient">Start deciding.</span>
          </motion.h2>
          <div className="mt-10">
            <Link to="/app" className="landing-cta-primary" data-testid="how-final-cta">
              <span>Start a project</span> <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
