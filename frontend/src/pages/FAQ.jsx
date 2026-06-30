import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";

const FAQS = [
  {
    cat: "Getting started",
    items: [
      { q: "What is Bracket?", a: "Bracket is an AI decision OS for designers, freelancers, and creative pros. It sits between your input (a vague client ask) and your output (a defensible deliverable). Five steps. One stance. A document you can send." },
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
      { q: "Do you train AI on my work?", a: "No. Your project content is never used to train any model. We send your prompt to the underlying AI provider (Claude/OpenAI) for inference, and that's it." },
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
        <span className="t-h3">{q}</span>
        <ChevronDown
          size={16}
          className="text-[var(--text-3)] shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1">
          <p className="text-[14px] leading-[1.65] text-[var(--text-2)]">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div data-testid="faq-page" className="page-enter">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 pt-20 md:pt-28 pb-12 md:pb-16 text-center">
          <span className="section-label"><span className="dot" />FAQ</span>
          <h1 className="t-display mt-7">
            Questions, <span style={{ color: "var(--coral)" }}>answered</span>.
          </h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[560px] mx-auto">
            Everything we get asked, grouped by what you came for. Still stuck? Email <a className="link-accent" href="mailto:support@use-bracket.com">support@use-bracket.com</a>.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-t border-[var(--hairline)]">
        <div className="max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 py-16 md:py-20 space-y-12">
          {FAQS.map((g, i) => (
            <div key={g.cat} data-testid={`faq-cat-${g.cat.toLowerCase().split(" ")[0]}`}>
              <div className="flex items-baseline gap-3 mb-5">
                <span
                  className="font-semibold text-[15px] tabular-nums"
                  style={{ color: ["#22C55E", "#F59E0B", "#FF7A6B", "#7C5CFF"][i % 4] }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="t-h1">{g.cat}</h2>
              </div>
              <div className="space-y-2.5">
                {g.items.map((it) => (
                  <FaqItem key={it.q} q={it.q} a={it.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-[var(--hairline)]">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="relative max-w-[1000px] mx-auto px-5 sm:px-6 md:px-8 py-24 md:py-32 text-center">
          <h2 className="t-display">Still curious?</h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-[var(--text-2)] max-w-[480px] mx-auto">
            The best way to understand Bracket is to use it. Start a project — it&apos;s free.
          </p>
          <div className="mt-9">
            <Link to="/app" className="btn-primary btn-lg">Start a project <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
