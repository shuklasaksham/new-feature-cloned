import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Seo from "../components/Seo";
import HeroParticles from "../components/HeroParticles";
import { useAuth } from "../lib/AuthContext";

const PLANS = [
  {
    id: "monthly",
    price: "2,499",
    unit: "/month",
    tagline: "Best for ongoing client work",
    features: ["Up to 10 active projects", "Unlimited connected tools", "Live project memory & updates", "Draft & send client replies"],
    highlight: true,
  },
  {
    id: "project",
    price: "749",
    unit: "/project",
    tagline: "Best for occasional client work",
    features: ["One project, active for 60 days", "Unlimited connected tools", "Live project memory & updates", "Draft & send client replies"],
    highlight: false,
  },
];

const FAQS = [
  { q: "What exactly does Bracket do?", a: "Bracket connects to the tools where your project already lives — Gmail, Slack, Figma, GitHub — and keeps one always-current record of scope, decisions, deadlines and deliverables. It shows you the one thing that needs your attention and can draft client replies for you." },
  { q: "What's the difference between the two plans?", a: "Monthly (₹2,499) is for people running client work continuously — up to 10 active projects at once. Per-project (₹749) is a one-off: a single project that stays active for 60 days. You can switch or cancel anytime from Settings → Billing." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from Settings → Billing in one click. Your monthly plan simply won't renew; a per-project purchase stays active for its 60 days." },
  { q: "Is my data private?", a: "Only you can see your projects. Bracket connects the specific sources you select — not your whole account — and uses AI providers only to generate the outputs you ask for. We don't sell your data or use it for advertising. See our Privacy Policy for how connected-source data (including Gmail) is handled." },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-linear card-linear-hover" data-testid="pricing-faq-item">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-5 flex items-center justify-between gap-4" aria-expanded={open}>
        <span className="font-display font-semibold text-[15px] tracking-[-0.01em]">{q}</span>
        <ChevronDown size={16} className="text-[var(--text-3)] shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <div className="px-5 pb-5 -mt-1"><p className="text-[13.5px] leading-[1.65] text-[var(--text-2)]">{a}</p></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Pricing() {
  const { user } = useAuth();
  const startHref = user ? "/plan" : "/login";

  return (
    <div data-testid="pricing-page" className="page-enter landing-page-bg">
      <Seo title="Pricing" description="Simple pricing for Bracket — ₹2,499/month for ongoing client work, or ₹749 per project. Cancel anytime." path="/pricing" />

      {/* HERO */}
      <section className="relative overflow-x-clip isolate">
        <HeroParticles />
        <div className="relative z-10 max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 pt-24 md:pt-32 pb-6 text-center">
          <span className="section-label mx-auto"><span className="dot" />Pricing</span>
          <h1 className="t-display mt-7">Simple, <span className="landing-hero-gradient">honest</span> pricing.</h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[520px] mx-auto">
            Pay monthly if client work is your day-to-day, or pay once for a single project. Cancel anytime.
          </p>
        </div>
      </section>

      {/* PLANS */}
      <section className="relative overflow-x-clip isolate">
        <div className="max-w-[820px] mx-auto px-5 sm:px-6 md:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className="card-linear p-7 flex flex-col relative"
              style={p.highlight ? { borderColor: "rgba(255,255,255,0.24)" } : undefined}
              data-testid={`pricing-plan-${p.id}`}
            >
              {p.highlight && (
                <span className="mono-tag absolute top-5 right-5 px-2 py-0.5 rounded text-[9.5px]" style={{ background: "rgba(255,255,255,0.06)", color: "#e5e5e5", border: "1px solid rgba(255,255,255,0.18)" }}>POPULAR</span>
              )}
              <p className="leading-none">
                <span className="font-display font-semibold text-[38px] tracking-[-0.02em]">₹{p.price}</span>
                <span className="text-[15px] text-[var(--text-3)] font-mono">{p.unit}</span>
              </p>
              <p className="mt-2 text-[13px] text-[var(--text-2)]">{p.tagline}</p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-[var(--text-2)]">
                    <Check size={15} className="shrink-0 mt-0.5" style={{ color: "#d0d0d0" }} /> {f}
                  </li>
                ))}
              </ul>
              <Link to={startHref} className={`mt-7 ${p.highlight ? "landing-cta-primary" : "cinema-cta-pill"} justify-center`} data-testid={`pricing-cta-${p.id}`}>
                <span>Get started</span> <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative overflow-x-clip isolate">
        <div className="max-w-[720px] mx-auto px-5 sm:px-6 md:px-8 pb-24 md:pb-32">
          <h2 className="t-hero text-center">Questions</h2>
          <div className="mt-8 space-y-2.5">
            {FAQS.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}
          </div>
          <p className="text-center mt-8 text-[13px] text-[var(--text-3)]">
            Still stuck? Email <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
