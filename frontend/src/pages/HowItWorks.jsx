import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { LAYERS, WALKTHROUGH } from "../lib/constants";
import Seo from "../components/Seo";
import { SectionBleed, GlowWash } from "../components/SectionBleed";

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
    <div data-testid="how-it-works-page" className="page-enter landing-page-bg">
      <Seo
        title="How it works"
        description="See how Bracket connects your tools (Gmail, Slack, Figma, GitHub), builds a live Project Memory of every deliverable, scope change, decision and deadline, tells you the one thing that needs your attention, and even drafts client replies for you."
        path="/how-it-works"
      />

      {/* HERO */}
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 pt-24 md:pt-32 pb-16 md:pb-24">
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
            Connect the tools where your client work already happens — email, Slack, Figma, GitHub — and Bracket keeps
            a live record of what was agreed, what changed, and what needs you next. No manual updating. When you need
            to lock a decision, an optional step-by-step flow gets you to client sign-off.
          </motion.p>
        </div>
      </section>

      {/* HOW IT ACTUALLY WORKS — Project Memory from connected tools */}
      <section className="relative overflow-x-clip isolate">
        <SectionBleed className="-z-20" />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-24 md:py-32">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-label"
          >
            <span className="dot" />The everyday loop
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="t-hero mt-6"
          >
            Connect once. Bracket keeps up.
          </motion.h2>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "01", title: "Connect your tools", copy: "Link a specific Gmail thread, Slack channel, Figma file or GitHub repo. You pick exactly what Bracket sees — nothing more." },
              { n: "02", title: "Bracket reads it for you", copy: "It reads the conversations automatically and sorts everything into six buckets: deliverables, scope, timelines, requirements, decisions and deadlines." },
              { n: "03", title: "See the one thing that matters", copy: "Open a project and read a 5-second briefing: what needs you, what changed since last time, and what's due this week. If nothing needs you, it says so." },
              { n: "04", title: "Approve — and reply — in one move", copy: "Review every change together and approve or reject it all at once. Ask Bracket to draft a client reply and send it straight into the thread." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="card-linear card-linear-hover p-7"
              >
                <p
                  className="font-display font-semibold text-[34px] leading-none tracking-[-0.03em] tabular-nums"
                  style={{
                    color: "transparent",
                    backgroundImage: "linear-gradient(135deg, #8184C4 0%, #989BE0 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  {s.n}
                </p>
                <h3 className="font-display text-[18px] mt-3 font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{s.copy}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 LAYERS */}
      <section className="relative overflow-x-clip isolate">
        <SectionBleed className="-z-20" />
        <GlowWash
          color="#8184C4"
          className="inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[900px] w-[900px] -z-10"
        />
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
                  style={{ background: "radial-gradient(closest-side, rgba(129, 132, 196,0.4), transparent)" }}
                />
                <p
                  className="font-display font-semibold text-[38px] leading-none tracking-[-0.03em] tabular-nums"
                  style={{
                    color: "transparent",
                    backgroundImage: "linear-gradient(135deg, #8184C4 0%, #989BE0 100%)",
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
      <section className="relative overflow-x-clip isolate">
        <SectionBleed className="-z-20" />
        <GlowWash
          color="#989BE0"
          opacity={0.09}
          className="inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[1100px] w-[900px] -z-10"
        />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-24 md:py-32">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-label"
          >
            <span className="dot" />The decision &amp; sign-off flow (optional)
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
                      backgroundImage: "linear-gradient(135deg, #8184C4 0%, #989BE0 100%)",
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
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient hero-ambient--contained hero-ambient--cta" aria-hidden="true" />
        <div className="relative z-10 max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 py-28 md:py-40 text-center">
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
