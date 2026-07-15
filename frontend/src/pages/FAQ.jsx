import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Seo from "../components/Seo";
import { SectionBleed, GlowWash } from "../components/SectionBleed";

const FAQS = [
  {
    cat: "Getting started",
    items: [
      { q: "What is Bracket?", a: "Bracket is the AI decision workspace for client projects — built for anyone who works with clients: freelancers, consultants, agencies, developers, and creative pros. It sits between your input (a vague client ask) and your output (a defensible deliverable). Five steps. One stance. A document you can send." },
      { q: "How is it different from ChatGPT?", a: "ChatGPT will execute. Bracket helps you decide. It mirrors the situation, surfaces tensions, takes a stance with trade-offs, and produces an artifact you can defend in a room." },
      { q: "Do I need to sign up?", a: "No. Click \"Try it without an account\" on the login page and start a project as a guest. We'll ask for your email at step 5, when you lock the document." },
    ],
  },
  {
    cat: "Workflow",
    items: [
      { q: "What are the 5 steps?", a: "Situation framing → Context compression → Decision engine → Artifacts → Confidence lock-in. Each step has its own AI prompt tuned for that mode of thinking." },
      { q: "Can I edit AI suggestions?", a: "Yes. Bracket suggests; you decide. Every AI output is editable inline. Your text is what gets locked into the final document." },
      { q: "What happens after I lock?", a: "You get a shareable client review URL. The client can accept (with e-signature) or raise concerns (which Bracket helps you respond to). Locked documents are read-only and exportable." },
    ],
  },
  {
    cat: "Pricing & billing",
    items: [
      { q: "Is it really free?", a: "Yes — fully free during early access. Every tier is unlocked. No card. No upsell." },
      { q: "When will paid tiers start?", a: "When Bracket graduates from early access. We'll email all users at least 30 days before any pricing change. You can decide then." },
      { q: "Can I cancel anytime?", a: "Yes, monthly billing with no annual lock-in. We'd rather earn it every month." },
    ],
  },
  {
    cat: "Privacy & data",
    items: [
      { q: "Who can see my projects?", a: "Only you. Projects are tied to your account. The only exception is the public client-review URL — and only the people you share it with can open it." },
      { q: "Do you train AI on my work?", a: "No. Your project content is never used to train any model. Bracket AI runs inference on your prompt and hands the output back — nothing is retained for training." },
      { q: "Can I delete my data?", a: "Yes. Delete any project from the dashboard. To delete your full account + history, email support@use-bracket.com and we'll wipe it within 48h." },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-linear card-linear-hover" data-testid="faq-item">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-5 flex items-center justify-between gap-4"
        aria-expanded={open}
      >
        <span className="font-display font-semibold text-[15.5px] tracking-[-0.01em]">{q}</span>
        <ChevronDown
          size={16}
          className="text-[var(--text-3)] shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 -mt-1">
              <p className="text-[13.5px] leading-[1.65] text-[var(--text-2)]">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <div data-testid="faq-page" className="page-enter landing-page-bg">
      <Seo
        title="FAQ"
        description="Answers to common questions about Bracket — how the 5-step decision loop works, what makes it different from ChatGPT, pricing, privacy, and support."
        path="/faq"
      />
      {/* HERO */}
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative z-10 max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 pt-24 md:pt-32 pb-12 md:pb-20 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="section-label mx-auto"
          >
            <span className="dot" />FAQ
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="t-display mt-7"
          >
            Questions, <span className="landing-hero-gradient">answered</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[560px] mx-auto"
          >
            Everything we get asked, grouped by what you came for. Still stuck? Email <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
          </motion.p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="relative overflow-x-clip isolate">
        <SectionBleed className="-z-20" />
        <GlowWash
          color="#5E6AD2"
          className="inset-x-0 top-1/4 mx-auto h-[900px] w-[900px] -z-10"
        />
        <GlowWash
          color="#7CD5FF"
          opacity={0.08}
          className="inset-x-0 bottom-0 mx-auto h-[700px] w-[800px] -z-10"
        />
        <div className="max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 py-16 md:py-20 space-y-14">
          {FAQS.map((g, i) => (
            <motion.div
              key={g.cat}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              data-testid={`faq-cat-${g.cat.toLowerCase().split(" ")[0]}`}
            >
              <div className="flex items-baseline gap-4 mb-6">
                <span
                  className="font-display font-semibold text-[42px] leading-none tracking-[-0.03em] tabular-nums"
                  style={{
                    color: "transparent",
                    backgroundImage: "linear-gradient(135deg, #5E6AD2 0%, #7CD5FF 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="t-hero">{g.cat}</h2>
              </div>
              <div className="space-y-2.5">
                {g.items.map((it) => (
                  <FaqItem key={it.q} q={it.q} a={it.a} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-x-clip isolate">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative z-10 max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 py-28 md:py-36 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="t-display"
          >
            Still <span className="landing-hero-gradient">curious?</span>
          </motion.h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[480px] mx-auto">
            The best way to understand Bracket is to use it. Start a project — it&apos;s free.
          </p>
          <div className="mt-10">
            <Link to="/app" className="landing-cta-primary" data-testid="faq-final-cta">
              <span>Start a project</span> <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
