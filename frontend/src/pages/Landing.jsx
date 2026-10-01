import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import Seo from "../components/Seo";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";

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

const MEMORY_ORDER = [
  ["scope", "Scope"], ["deliverable", "Deliverables"], ["requirement", "Requirements"], ["decision", "Decisions"],
];

/* A faithful, static recreation of the new Bracket Overview screen — real DOM,
   the interlocking sidebar/workspace geometry, monochrome. Mirrors a REAL
   sample project so the numbers and change card are always current. */
function ProductVisual() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/public/showcase").then(({ data }) => setData(data)).catch(() => {});
  }, []);

  const NAV = [
    { label: "Home", active: true },
    { label: "Conversations", active: false },
    { label: "Timeline", active: false },
  ];
  const name = data?.name || "SaaS Dashboard Redesign";
  const counts = data?.counts || { scope: 0, deliverable: 0, requirement: 0, decision: 0 };
  const hl = data?.highlight;
  const more = data?.more || 0;

  return (
    <div className="lp-shot" data-testid="landing-product-visual">
      <div className="lp-shot-bar">
        <span className="lp-dot" /><span className="lp-dot" /><span className="lp-dot" />
      </div>
      <div className="lp-app">
        {/* Sidebar */}
        <aside className="lp-side">
          <div className="lp-brand">
            <img src={BRACKET_LOGO} alt="" width={20} height={20} style={{ filter: "brightness(0) invert(1)" }} />
            <span>Bracket</span>
          </div>
          <div className="lp-switch">{name}</div>
          <nav className="lp-nav">
            {NAV.map((n) => (
              <span key={n.label} className="lp-nav-item" data-active={n.active ? "true" : "false"}>{n.label}</span>
            ))}
          </nav>
          <p className="lp-side-label">SOURCES</p>
          <div className="lp-src"><span className="lp-src-dot" /> Gmail — client thread</div>
        </aside>

        {/* Workspace */}
        <div className="lp-main">
          <p className="lp-eyebrow">{name}</p>
          <div className="lp-synced"><span className="lp-live" /> Updated just now</div>

          <p className="lp-attn-label">NEEDS YOUR ATTENTION</p>
          <div className="lp-attn">
            <span className="lp-attn-ring"><AlertCircle size={18} /></span>
            <div className="lp-attn-body">
              <p className="lp-attn-title">{hl?.title || "Mobile screens requested"}</p>
              <p className="lp-attn-desc">{hl?.detail || "The client added a request that affects this phase."}</p>
              <div className="lp-attn-row">
                {hl?.category && <span className="lp-tag">{hl.category}</span>}
                {more > 0 && <span className="lp-more">+{more} more</span>}
              </div>
            </div>
          </div>

          <div className="lp-mem">
            {MEMORY_ORDER.map(([key, label]) => (
              <div key={key} className="lp-mem-cell">
                <span className="lp-mem-n">{counts[key] ?? 0}</span>
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
  const [phOn, setPhOn] = useState(false);
  const [ribbonDismissed, setRibbonDismissed] = useState(() => {
    try { return localStorage.getItem("bracket.ph_ribbon_dismissed") === "1"; } catch { return false; }
  });

  useEffect(() => {
    api.get("/public/ph-launch").then(({ data }) => setPhOn(!!data.enabled)).catch(() => {});
  }, []);

  const dismissRibbon = () => {
    setRibbonDismissed(true);
    try { localStorage.setItem("bracket.ph_ribbon_dismissed", "1"); } catch { /* ignore */ }
  };

  return (
    <div data-testid="landing-page" className="lp-page">
      <Seo
        title="Bracket — project memory for client work"
        description="Connect the conversations where your project happens. Bracket keeps track of scope, deliverables, requirements, decisions and deadlines — and shows you when something changes."
        path="/"
      />

      {phOn && !ribbonDismissed && (
        <div className="ph-ribbon" data-testid="ph-launch-ribbon">
          <Link to="/login" className="ph-ribbon-msg" data-testid="ph-launch-ribbon-cta">
            <span className="ph-ribbon-badge">🚀 Product Hunt</span>
            <span className="ph-ribbon-text">
              Your first project is <strong>free for 14 days</strong> — no card required.
            </span>
            <span className="ph-ribbon-link">Claim it <ArrowRight size={13} /></span>
          </Link>
          <button
            type="button"
            className="ph-ribbon-close"
            onClick={dismissRibbon}
            aria-label="Dismiss"
            data-testid="ph-launch-ribbon-close"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
          <motion.a
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.42 }}
            href="https://www.producthunt.com/products/bracket-2027?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-bracket-2028"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-ph-badge"
            data-testid="landing-hero-ph-badge"
          >
            <img
              alt="Bracket - The memory layer for your business | Product Hunt"
              width="250"
              height="54"
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1258620&theme=dark&t=1790848229024"
            />
          </motion.a>
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
