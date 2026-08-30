import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Link2, Radar, Bell } from "lucide-react";
import { motion } from "framer-motion";
import Seo from "../components/Seo";
import HeroParticles from "../components/HeroParticles";
import { useAuth } from "../lib/AuthContext";

const PRODUCT_VISUAL = "/product-visual.png";

const STEPS = [
  {
    icon: Link2,
    title: "Connect your tools",
    copy: "Link the Gmail thread, Slack channel, Figma file or GitHub repo where the project already lives.",
  },
  {
    icon: Radar,
    title: "Bracket keeps track",
    copy: "It reads everything automatically and keeps one live record of scope, decisions, deadlines and deliverables.",
  },
  {
    icon: Bell,
    title: "You know what changed",
    copy: "Open Bracket and see the one thing that needs you next — no scrolling back through weeks of messages.",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const startHref = user ? "/app" : "/login";

  return (
    <div data-testid="landing-page" className="landing-page-bg">
      <Seo
        title="Bracket — project memory for client work"
        description="Bracket connects to the tools where your work already happens and keeps one always-current record of what was decided, what changed, and what needs you next."
        path="/"
      />

      {/* 1 — HERO */}
      <section className="relative overflow-x-clip isolate min-h-[86vh] flex items-center">
        <HeroParticles />
        <div className="relative z-10 w-full max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 pt-28 md:pt-36 pb-10 md:pb-14 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="section-label mx-auto"
          >
            <span className="dot" />Project memory for client work
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-7"
          >
            Never lose track of a <span className="landing-hero-gradient">client project</span> again.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-5 text-[15px] md:text-[16px] leading-[1.65] text-[var(--text-2)] max-w-[600px] mx-auto"
          >
            Bracket connects to the tools where your work already happens and keeps one
            always-current record of what was decided, what changed, and what needs you next.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex items-center justify-center gap-3"
          >
            <Link to={startHref} className="landing-cta-primary" data-testid="landing-hero-cta">
              <span>Get started</span> <ArrowRight size={14} />
            </Link>
            <Link to="/pricing" className="cinema-nav-link !px-1" data-testid="landing-hero-pricing">
              <span>See pricing</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 2 — PRODUCT VISUAL */}
      <section className="relative overflow-x-clip isolate">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-6 md:px-8 pb-20 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="landing-shot"
            data-testid="landing-product-visual"
          >
            <img
              src={PRODUCT_VISUAL}
              alt="The Bracket workspace — a live project memory of decisions, scope and deadlines"
              className="block w-full h-auto"
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* 3 — HOW IT WORKS */}
      <section className="relative overflow-x-clip isolate">
        <div className="relative z-10 max-w-[1080px] mx-auto px-5 sm:px-6 md:px-8 py-8 md:py-12">
          <div className="text-center max-w-[560px] mx-auto">
            <span className="section-label mx-auto"><span className="dot" />How it works</span>
            <h2 className="t-hero mt-6">Three steps. Then it just runs.</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="card-linear p-6"
                data-testid={`landing-step-${i + 1}`}
              >
                <span
                  className="inline-flex items-center justify-center"
                  style={{ width: 40, height: 40, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", color: "#e5e5e5" }}
                >
                  <s.icon size={18} strokeWidth={1.75} />
                </span>
                <p className="mono-tag text-[10px] text-[var(--text-3)] mt-5">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="font-display font-semibold text-[17px] tracking-[-0.01em] mt-1.5">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--text-2)]">{s.copy}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — FINAL CTA */}
      <section className="relative overflow-x-clip isolate">
        <HeroParticles />
        <div className="relative z-10 max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 py-28 md:py-36 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="t-display"
          >
            Bring your first project <br className="hidden sm:block" />into <span className="landing-hero-gradient">Bracket</span>.
          </motion.h2>
          <div className="mt-10">
            <Link to={startHref} className="landing-cta-primary" data-testid="landing-final-cta">
              <span>Get started</span> <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
