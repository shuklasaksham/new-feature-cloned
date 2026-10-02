import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertCircle, X, Plug, Radar, Sparkles, ShieldCheck, Layers, Search, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import Seo from "../components/Seo";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";

const SlackMark = (props) => (
  <svg viewBox="0 0 24 24" fill="#fff" width={20} height={20} aria-hidden="true" {...props}>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

const INTEGRATIONS = [
  { name: "Gmail", slug: "gmail" },
  { name: "Slack", slug: "slack", Mark: SlackMark },
  { name: "Figma", slug: "figma" },
  { name: "GitHub", slug: "github" },
  { name: "Notion", slug: "notion" },
];

const PILLARS = [
  {
    icon: Plug,
    num: "01",
    title: "Connect your tools",
    copy: "Gmail, Slack, Figma, GitHub, Notion and more feed into one shared memory — no copy-pasting, no manual updates.",
  },
  {
    icon: Radar,
    num: "02",
    title: "Catch every change",
    copy: "When scope, requirements, decisions or deadlines shift, Bracket surfaces exactly what changed and what it affects.",
  },
  {
    icon: Sparkles,
    num: "03",
    title: "Ask Bracket anything",
    copy: "Ask in plain language and get answers grounded in everything that's been said and done across your projects.",
  },
];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Nothing important slips",
    copy: "Quiet changes to scope, dates and decisions get flagged before they become surprises.",
  },
  {
    icon: Layers,
    title: "One place for project truth",
    copy: "Scattered threads become a single, organized memory you can trust.",
  },
  {
    icon: Search,
    title: "Answers without digging",
    copy: "Skip the scroll-back through months of messages — just ask and get the answer.",
  },
];

const FAQ = [
  {
    q: "What is Bracket?",
    a: "Bracket is the memory layer for your business. It connects the tools where your work already happens, keeps track of what's decided and what changes, and lets you ask questions about any project in plain language.",
  },
  {
    q: "What tools does it connect?",
    a: "Today Bracket connects Gmail, Slack, Figma, GitHub and Notion, with more sources on the way. Everything you connect feeds into one shared project memory.",
  },
  {
    q: "How does change detection work?",
    a: "As your connected tools update, Bracket watches for meaningful shifts — new requirements, changed scope, moved deadlines, reversed decisions — and surfaces exactly what changed and what it affects, so you're not re-reading every thread.",
  },
  {
    q: "What does \"Ask Bracket\" do?",
    a: "Ask Bracket is the in-app way to get answers. Ask a question about a project in plain English and Bracket responds based on everything that's been said and done across your connected sources.",
  },
  {
    q: "What about my data and privacy?",
    a: "Bracket only reads the sources you explicitly connect, and you stay in control of what's linked. You can disconnect a source at any time.",
  },
  {
    q: "How much does it cost?",
    a: "Your first project is free for 14 days — no card required. See the pricing page for full plan details.",
  },
];

const MEMORY_ORDER = [
  ["scope", "Scope"], ["deliverable", "Deliverables"], ["requirement", "Requirements"], ["decision", "Decisions"],
];

/* A faithful, static recreation of the Bracket Overview screen — real DOM,
   mirrors a REAL sample project so the numbers and change card are current. */
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

function FaqItem({ item, open, onToggle, index }) {
  return (
    <div className="lp-faq-item" data-testid={`landing-faq-item-${index + 1}`}>
      <button
        type="button"
        className="lp-faq-q"
        onClick={onToggle}
        aria-expanded={open}
        data-testid={`landing-faq-toggle-${index + 1}`}
      >
        <span>{item.q}</span>
        {open ? <Minus size={18} /> : <Plus size={18} />}
      </button>
      {open && (
        <motion.p
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="lp-faq-a"
        >
          {item.a}
        </motion.p>
      )}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const startHref = user ? "/app" : "/login";
  const [phOn, setPhOn] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
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
        title="Bracket — the memory layer for your business"
        description="Bracket connects the tools where your work happens, catches what changes across your projects, and answers anything you ask. Connect Gmail, Slack, Figma, GitHub and Notion into one memory."
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
            The memory layer for your business
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="lp-h1"
          >
            Your projects,<br />remembered.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="lp-lede"
          >
            Bracket connects the tools where your work already happens, notices when something
            important changes, and lets you ask it anything about your projects — in plain language.
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

      {/* 2 — INTEGRATIONS STRIP */}
      <section className="lp-section lp-integrations" data-testid="landing-integrations">
        <div className="lp-wrap lp-wrap--narrow">
          <p className="lp-integrations-line">Connects the tools your team already uses</p>
          <motion.div
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.6 }}
            className="lp-logos"
          >
            {INTEGRATIONS.map((it) => (
              <div key={it.slug} className="lp-logo" data-testid={`landing-logo-${it.slug}`} title={it.name}>
                {it.Mark
                  ? <it.Mark width={22} height={22} />
                  : <img src={`https://cdn.simpleicons.org/${it.slug}/ffffff`} alt={it.name} width={22} height={22} />}
                <span>{it.name}</span>
              </div>
            ))}
            <span className="lp-logo-more">+ more</span>
          </motion.div>
        </div>
      </section>

      {/* 3 — PROBLEM */}
      <section className="lp-section">
        <div className="lp-wrap">
          <span className="lp-label">The problem</span>
          <h2 className="lp-h2 mt-6">Your project lives in<br />a dozen places at once.</h2>
          <div className="lp-prose">
            <p>
              Decisions get made in email. Requirements change in a Slack thread. A deadline moves in
              a comment on a design. By the time you notice, the context is buried under a hundred
              other messages.
            </p>
            <p>
              So you spend your week reconstructing what was agreed, chasing what changed, and hoping
              nothing important slipped through. The work is scattered — and remembering it all is
              somehow your job.
            </p>
          </div>
        </div>
      </section>

      {/* 4 — HOW IT WORKS (3 pillars) */}
      <section className="lp-section" data-testid="landing-how">
        <div className="lp-wrap">
          <span className="lp-label" data-testid="landing-how-label">How it works</span>
          <h2 className="lp-h2 mt-6">Connect. Detect. Ask.</h2>
          <div className="lp-pillars">
            {PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.num}
                  initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="lp-pillar"
                  data-testid={`landing-pillar-${i + 1}`}
                >
                  <span className="lp-pillar-icon"><Icon size={20} /></span>
                  <span className="lp-pillar-num">{p.num}</span>
                  <h3 className="lp-pillar-title">{p.title}</h3>
                  <p className="lp-pillar-copy">{p.copy}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5 — BENEFITS */}
      <section className="lp-section" data-testid="landing-benefits">
        <div className="lp-wrap">
          <span className="lp-label">What you get</span>
          <h2 className="lp-h2 mt-6">Less chasing.<br />More knowing.</h2>
          <div className="lp-benefits">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="lp-benefit"
                  data-testid={`landing-benefit-${i + 1}`}
                >
                  <span className="lp-benefit-icon"><Icon size={18} /></span>
                  <h3 className="lp-benefit-title">{b.title}</h3>
                  <p className="lp-benefit-copy">{b.copy}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6 — PRODUCT VISUAL */}
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

      {/* 7 — FAQ */}
      <section className="lp-section" data-testid="landing-faq">
        <div className="lp-wrap lp-wrap--narrow lp-faq-wrap">
          <span className="lp-label">FAQ</span>
          <h2 className="lp-h2 mt-6">Questions, answered.</h2>
          <div className="lp-faq">
            {FAQ.map((item, i) => (
              <FaqItem
                key={item.q}
                item={item}
                index={i}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 8 — FINAL CTA */}
      <section className="lp-section lp-final">
        <div className="lp-wrap lp-wrap--narrow">
          <span className="lp-label">Start remembering</span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lp-h2 mt-6"
          >
            Give your projects<br />a memory that keeps up.
          </motion.h2>
          <p className="lp-lede">Connect your tools and let Bracket hold the context. Your first project is free for 14 days — no card required.</p>
          <div className="lp-cta-row">
            <Link to={startHref} className="lp-btn-primary" data-testid="landing-final-cta">
              Get started <ArrowRight size={15} />
            </Link>
            <Link to="/pricing" className="lp-btn-ghost" data-testid="landing-final-pricing">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
