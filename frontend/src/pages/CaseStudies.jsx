import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { CASE_STUDIES } from "../lib/constants";
import Seo from "../components/Seo";
import { SectionBleed, GlowWash } from "../components/SectionBleed";

// Colour rhythm for the case sections — mirrors the homepage's blue → cyan →
// green → amber wash cycle so backgrounds blend from one hue into the next.
const CASE_WASHES = ["#8184C4", "#989BE0", "#4BE39B", "#FFB84C", "#989BE0"];

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function CaseStudies() {
  return (
    <div data-testid="case-studies-page" className="page-enter landing-page-bg">
      <Seo
        title="Case studies"
        description="Real projects, real scopes, real client messages. See exactly how Bracket helped people who work with clients turn a vague brief into a locked-in decision."
        path="/case-studies"
      />

      {/* HERO */}
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 pt-24 md:pt-32 pb-16 md:pb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="section-label"
          >
            <span className="dot" />Case studies
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-6 max-w-[900px]"
          >
            Chaos <span className="landing-hero-gradient">→ clarity</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-6 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[600px]"
          >
            Five products you already know. The thing they share: the breakthrough
            wasn&apos;t the feature set — it was the decision they dared to make.
          </motion.p>
        </div>
      </section>

      {CASE_STUDIES.map((cs, idx) => (
        <section key={cs.slug} className="relative overflow-x-clip isolate">
          {/* Alternate opaque bleeds so neighbouring washes blend into each
              other instead of stacking hard edges — same rhythm as home. */}
          {idx % 2 === 0 && <SectionBleed className="-z-20" />}
          <GlowWash
            color={CASE_WASHES[idx % CASE_WASHES.length]}
            opacity={0.11}
            className="inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[1000px] w-[900px] -z-10"
          />
          <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-20 md:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-baseline gap-6 flex-wrap"
            >
              <span
                className="font-display font-semibold text-[56px] leading-none tracking-[-0.03em]"
                style={{
                  color: "transparent",
                  backgroundImage: "linear-gradient(135deg, #8184C4 0%, #989BE0 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="mono-tag text-signal">CASE / {String(CASE_STUDIES.length).padStart(2, "0")}</p>
                <h2 className="t-hero mt-2">{cs.brand}</h2>
                <p className="mt-1 text-[12.5px] text-[var(--text-3)]">{cs.category}</p>
              </div>
            </motion.div>

            <div className="mt-12 grid md:grid-cols-2 gap-4">
              <motion.div
                custom={0}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="card-linear p-7 relative overflow-hidden"
                style={{ borderColor: "rgba(239, 87, 87, 0.20)" }}
              >
                <div
                  aria-hidden="true"
                  className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-[50px] opacity-40"
                  style={{ background: "radial-gradient(closest-side, rgba(239,87,87,0.35), transparent)" }}
                />
                <p className="mono-tag" style={{ color: "#EF5757" }}>BEFORE</p>
                <ul className="mt-6 space-y-3">
                  {cs.before.map((b, i) => (
                    <li key={i} className="flex gap-3 text-[13.5px] leading-[1.65] text-[var(--text-2)]">
                      <X size={13} className="mt-0.5 shrink-0" style={{ color: "#EF5757" }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div
                custom={1}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="card-linear p-7 relative overflow-hidden"
                style={{ borderColor: "rgba(129, 132, 196, 0.25)" }}
              >
                <div
                  aria-hidden="true"
                  className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-[50px] opacity-50"
                  style={{ background: "radial-gradient(closest-side, rgba(129, 132, 196,0.4), transparent)" }}
                />
                <p className="mono-tag text-signal">AFTER</p>
                <ul className="mt-6 space-y-3">
                  {cs.after.map((b, i) => (
                    <li key={i} className="flex gap-3 text-[13.5px] leading-[1.65] text-[var(--text)]">
                      <Check size={13} className="mt-0.5 text-signal shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <motion.blockquote
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="mt-14 max-w-3xl"
            >
              <p className="font-display font-semibold italic text-[24px] sm:text-[30px] md:text-[36px] leading-[1.2] tracking-[-0.02em] text-[var(--text)]">
                <span className="landing-hero-gradient">&ldquo;</span>
                {cs.quote}
                <span className="landing-hero-gradient">&rdquo;</span>
              </p>
            </motion.blockquote>
          </div>
        </section>
      ))}

      {/* FINAL CTA */}
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient hero-ambient--contained hero-ambient--cta" aria-hidden="true" />
        <div className="relative z-10 max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 py-28 md:py-36 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-label mx-auto"
          >
            <span className="dot" />Your move
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-7"
          >
            Your <span className="landing-hero-gradient">turn</span>.
          </motion.h2>
          <div className="mt-10">
            <Link to="/app" className="landing-cta-primary" data-testid="case-studies-final-cta">
              <span>Start a project</span> <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
