import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import Seo from "../components/Seo";
import { BracketMark } from "../components/BracketLogo";
import { useAuth } from "../lib/AuthContext";

const STEPS = [
  {
    num: "01",
    title: "Connect the conversation",
    copy: "Connect the Gmail conversation or other supported source where the client project already lives.",
  },
  {
    num: "02",
    title: "Bracket builds project memory",
    copy: "Scope, deliverables, requirements, decisions and deadlines stay organized as the conversation evolves.",
  },
  {
    num: "03",
    title: "Review what changed",
    copy: "When something meaningful changes, Bracket shows you what happened and what it affects. You approve the change once.",
  },
];

const MEMORY = [
  ["Scope", 8], ["Deliverables", 4], ["Requirements", 7], ["Decisions", 2],
];

/* A faithful, static recreation of the new Bracket Overview screen — real DOM,
   the interlocking sidebar/workspace geometry, monochrome. Not an image. */
function ProductVisual() {
  const NAV = [
    { label: "Home", active: true },
    { label: "Conversations", active: false },
    { label: "Timeline", active: false },
  ];
  return (
    <div className="lp-shot" data-testid="landing-product-visual">
      <div className="lp-shot-bar">
        <span className="lp-dot" /><span className="lp-dot" /><span className="lp-dot" />
      </div>
      <div className="lp-app">
        {/* Sidebar */}
        <aside className="lp-side">
          <div className="lp-brand"><BracketMark size={20} /><span>Bracket</span></div>
          <div className="lp-switch">SaaS Dashboard Redesign</div>
          <nav className="lp-nav">
            {NAV.map((n) => (
              <span key={n.label} className="lp-nav-item" data-active={n.active ? "true" : "false"}>{n.label}</span>
            ))}
          </nav>
          <p className="lp-side-label">SOURCES</p>
          <div className="lp-src"><span className="lp-src-dot" /> Gmail — Acme thread</div>
        </aside>

        {/* Workspace */}
        <div className="lp-main">
          <p className="lp-eyebrow">SaaS Dashboard Redesign</p>
          <div className="lp-synced"><span className="lp-live" /> Updated just now</div>

          <p className="lp-attn-label">NEEDS YOUR ATTENTION</p>
          <div className="lp-attn">
            <span className="lp-attn-ring"><AlertCircle size={18} /></span>
            <div className="lp-attn-body">
              <p className="lp-attn-title">Mobile screens requested</p>
              <p className="lp-attn-desc">Sarah asked to include mobile screens in this phase.</p>
              <div className="lp-attn-row">
                <span className="lp-review">Review <ArrowRight size={13} /></span>
                <span className="lp-more">+2 more</span>
              </div>
            </div>
          </div>

          <div className="lp-mem">
            {MEMORY.map(([label, n]) => (
              <div key={label} className="lp-mem-cell">
                <span className="lp-mem-n">{n}</span>
                <span className="lp-mem-l">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const startHref = user ? "/app" : "/login";

  return (
    <div data-testid="landing-page" className="lp-page">
      <Seo
        title="Bracket — project memory for client work"
        description="Connect the conversations where your project happens. Bracket keeps track of scope, deliverables, requirements, decisions and deadlines — and shows you when something changes."
        path="/"
      />

      {/* 1 — HERO */}
      <section className="lp-section lp-hero">
        <div className="lp-wrap lp-wrap--narrow">
          <motion.span
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="lp-label"
          >
            Project memory for client work
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="lp-h1"
          >
            Your client changed something.<br />Bracket already knows.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="lp-lede"
          >
            Connect the conversations where your project happens. Bracket keeps track of scope,
            deliverables, requirements, decisions and deadlines — and shows you when something changes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}
            className="lp-cta-row"
          >
            <Link to={startHref} className="lp-btn-primary" data-testid="landing-hero-cta">
              Get started <ArrowRight size={15} />
            </Link>
            <Link to="/pricing" className="lp-btn-ghost" data-testid="landing-hero-pricing">
              See pricing
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 2 — PRODUCT VISUAL */}
      <section className="lp-section lp-visual-section">
        <div className="lp-wrap">
          <motion.div
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <ProductVisual />
          </motion.div>
        </div>
      </section>

      {/* 3 — HOW IT WORKS */}
      <section className="lp-section">
        <div className="lp-wrap">
          <span className="lp-label" data-testid="landing-how-label">How it works</span>
          <h2 className="lp-h2 mt-6">Connect once.<br />Bracket keeps up.</h2>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="lp-step"
                data-testid={`landing-step-${i + 1}`}
              >
                <span className="lp-step-num">{s.num}</span>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-copy">{s.copy}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — FINAL CTA */}
      <section className="lp-section lp-final">
        <div className="lp-wrap lp-wrap--narrow">
          <span className="lp-label">Your project, remembered</span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lp-h2 mt-6"
          >
            Stop reconstructing<br />your projects from messages.
          </motion.h2>
          <p className="lp-lede">Connect your first client project and let Bracket keep the context.</p>
          <div className="lp-cta-row">
            <Link to={startHref} className="lp-btn-primary" data-testid="landing-final-cta">
              Get started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
