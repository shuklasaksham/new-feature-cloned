import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Layers,
  ListChecks,
  Compass,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  animate,
} from "framer-motion";
import Lenis from "@studio-freight/lenis";
import { PRICING } from "../lib/constants";
import { api } from "../lib/api";
import Seo from "../components/Seo";

// ─────────────────────────────────────────────────────────────────────────
// Landing (cinematic rewrite)
// Sections:
//   1. Hero — looping muted video + gradient scrim + staggered word reveal
//   2. Scroll-pinned feature showcase — horizontal parallax cards
//   3. Bento grid — product shots with hover glow
//   4. Pricing — glassmorphic, middle card amber-glowed
//   5. Footer CTA — oversized serif, gradient underline, magnetic button, grain
// Reduced-motion: everything gracefully degrades to static.
// ─────────────────────────────────────────────────────────────────────────

// Reusable staggered word reveal for cinematic headlines.
const wordReveal = {
  hidden: { opacity: 0, y: "1.1em" },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  }),
};

function WordReveal({ text, className = "", tag: Tag = "span", delayBase = 0 }) {
  const shouldReduce = useReducedMotion();
  const words = text.split(" ");
  if (shouldReduce) return <Tag className={className}>{text}</Tag>;
  return (
    <Tag className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-baseline pb-[0.05em] mr-[0.25em]">
          <motion.span
            className="inline-block"
            custom={i + delayBase}
            variants={wordReveal}
            initial="hidden"
            animate="show"
          >
            {w}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

// Film grain overlay — SVG turbulence baked as data URI, animated with a slow
// translate for subtle life. Non-interactive.
function FilmGrain({ opacity = 0.06 }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mix-blend-overlay z-10"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  );
}

// Magnetic button — subtle cursor-tracking translate + spring back on leave.
// Falls back to a normal button under reduced-motion.
function MagneticButton({ children, to, testid, className = "", ...rest }) {
  const shouldReduce = useReducedMotion();
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18 });
  const springY = useSpring(y, { stiffness: 220, damping: 18 });

  const onMove = (e) => {
    if (shouldReduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    x.set(relX * 0.22);
    y.set(relY * 0.22);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Comp = to ? Link : "button";
  const compProps = to ? { to } : rest;
  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY, display: "inline-block" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <Comp className={className} data-testid={testid} {...compProps}>
        {children}
      </Comp>
    </motion.div>
  );
}

// Metrics count-up on view.
function CountUp({ to, suffix = "", className = "" }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const shouldReduce = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduce) {
      setVal(to);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const c = animate(0, to, {
          duration: 1.6,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: (v) => setVal(Math.floor(v)),
        });
        io.disconnect();
        return () => c.stop();
      }
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to, shouldReduce]);
  return (
    <span ref={ref} className={className}>
      {val.toLocaleString()}{suffix}
    </span>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────
function Hero() {
  const shouldReduce = useReducedMotion();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const scrimOpacity = useTransform(scrollYProgress, [0, 0.6], [0.55, 0.95]);

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden isolate min-h-[92vh] flex items-center"
      data-testid="landing-hero"
    >
      {/* Cinematic dark backdrop image (Unsplash — swappable) */}
      <motion.div
        style={{ y: shouldReduce ? 0 : videoY }}
        className="absolute inset-0 -z-20"
      >
        <img
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2600&q=85"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
      </motion.div>

      {/* Gradient scrim */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: shouldReduce ? 0.9 : scrimOpacity }}
        className="absolute inset-0 -z-10"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 20%, rgba(46,91,255,0.20) 0%, rgba(8,9,10,0.65) 40%, rgba(8,9,10,0.94) 75%, #08090A 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,9,10,0.35) 0%, rgba(8,9,10,0.35) 50%, rgba(8,9,10,0.9) 100%)",
          }}
        />
      </motion.div>

      <FilmGrain opacity={0.06} />

      {/* Copy */}
      <div className="relative z-20 max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mono-tag text-signal inline-flex items-center gap-2"
        >
          <span className="dot" style={{ background: "var(--accent)" }} />
          The decision OS for freelancers
        </motion.div>

        <h1 className="mt-6 font-display font-semibold tracking-[-0.032em] leading-[0.98] text-[42px] sm:text-[64px] md:text-[82px] lg:text-[96px] text-[var(--text)]">
          <WordReveal text="Paste the mess." tag="span" />
          <br />
          <span className="landing-hero-gradient">
            <WordReveal text="Ship the decision." tag="span" delayBase={2} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mt-6 max-w-[620px] text-[15px] sm:text-lg text-[var(--text-2)] leading-relaxed"
        >
          Bracket turns a messy client conversation — an email, a WhatsApp thread, a Loom
          transcript — into a decision, a scope doc, a client message and a paper trail.
          In under a minute.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="mt-10 flex items-center gap-4 flex-wrap"
        >
          <MagneticButton
            to="/login"
            testid="hero-cta-primary"
            className="landing-cta-primary"
          >
            <span>Start free</span>
            <ArrowRight size={16} />
          </MagneticButton>
          <Link
            to="/how-it-works"
            className="landing-cta-ghost"
            data-testid="hero-cta-secondary"
          >
            <span>How it works</span>
            <ArrowUpRight size={14} />
          </Link>
        </motion.div>

        {/* Live metrics micro-strip */}
        <HeroMetrics />
      </div>

      {/* Scroll cue */}
      {!shouldReduce && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          className="absolute left-1/2 bottom-8 -translate-x-1/2 z-20 text-[var(--text-3)] text-[11px] tracking-[0.2em] uppercase"
        >
          <span className="block text-center">Scroll</span>
          <motion.span
            className="block mx-auto mt-2 h-8 w-px bg-[var(--text-3)]"
            animate={{ scaleY: [0.3, 1, 0.3] }}
            style={{ transformOrigin: "top" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </section>
  );
}

function HeroMetrics() {
  const [m, setM] = useState({ projects_created_total: 0, decisions_locked_total: 0, users_total: 0 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/public/metrics");
        if (!cancelled) setM(data);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.8 }}
      className="mt-12 flex items-center gap-8 flex-wrap"
    >
      {[
        { n: m.projects_created_total || 128, label: "briefs turned into projects" },
        { n: m.decisions_locked_total || 47, label: "decisions locked" },
        { n: m.users_total || 92, label: "designers on Bracket" },
      ].map((it, i) => (
        <div key={i} className="flex items-baseline gap-2">
          <CountUp to={it.n} className="font-display text-3xl md:text-4xl text-[var(--text)] tabular-nums" />
          <span className="mono-tag text-muted text-[10.5px] max-w-[160px]">{it.label}</span>
        </div>
      ))}
    </motion.div>
  );
}

// ─── SECTION 2: SCROLL-PINNED FEATURE SHOWCASE (horizontal parallax) ─────
const SHOWCASE = [
  {
    tag: "01 · UNDERSTAND",
    title: "Paste anything. Bracket reads it.",
    body:
      "Emails, WhatsApp threads, Loom transcripts, unformatted PDFs. Bracket parses raw client mess into a reframed problem, a clarity score, and the tensions no one said out loud.",
    accent: "#2E5BFF",
    icon: Compass,
  },
  {
    tag: "02 · SIMPLIFY",
    title: "The signal. Not the noise.",
    body:
      "Keeps only what moves the call. Cuts noise, surfaces hidden assumptions everyone's quietly acting on, and hands you a two-sentence version of the problem.",
    accent: "#7CD5FF",
    icon: Layers,
  },
  {
    tag: "03 · STRATEGY",
    title: "A stance. Not a menu.",
    body:
      "Bracket picks a side, scores its confidence, stress-tests it against the risks your client never mentioned, and shows you the runner-up if you challenge it.",
    accent: "#FFB84C",
    icon: Sparkles,
  },
  {
    tag: "04 · EXECUTION",
    title: "Scope. Message. Ready to send.",
    body:
      "The scope doc, the client message, the assumptions, the risk flags — drafted in your voice. Copy-paste ready. Zero rewriting.",
    accent: "#B7B7FF",
    icon: ListChecks,
  },
  {
    tag: "05 · REVIEW",
    title: "Locked. Signed. Shipped.",
    body:
      "Lock the call so it survives the 3am rethink. Open the polished document — PDF export or a client review link, straight from Bracket.",
    accent: "#4BE39B",
    icon: AlertTriangle,
  },
];

function Showcase() {
  const shouldReduce = useReducedMotion();
  const wrapRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });
  const cards = SHOWCASE.length;
  // Total scroll length: ~(cards-1) * 90vh horizontal traversal + a small
  // entry buffer. Keeps the pinning tight so there's no blank space after
  // the last card and before the next section.
  const totalHeight = (cards - 1) * 85 + 40;
  // Each card is 78vw + ~2vw gap; total shift is (cards-1) * 80vw.
  // Using vw units so the transform is deterministic (framer's "%" applies
  // to the element's own width, which is ~cards*78vw — hard to reason about).
  const x = useTransform(
    scrollYProgress,
    [0.02, 0.98],
    ["0vw", `-${(cards - 1) * 80}vw`]
  );

  if (shouldReduce) {
    return (
      <section className="landing-showcase-static" data-testid="landing-showcase-static">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-24 md:py-32">
          <SectionHeading
            tag="THE FLOW"
            title="From mess to decision, in five chapters."
          />
          <div className="mt-14 grid md:grid-cols-2 gap-6">
            {SHOWCASE.map((c) => <ShowcaseCard key={c.tag} card={c} />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={wrapRef}
      className="relative"
      style={{ height: `${totalHeight}vh` }}
      data-testid="landing-showcase"
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 pt-20 md:pt-28 w-full">
          <SectionHeading
            tag="THE FLOW"
            title="From mess to decision, in five chapters."
          />
        </div>
        <div className="relative flex-1 flex items-center overflow-hidden">
          <motion.div
            style={{ x }}
            className="flex gap-8 pl-[5vw] will-change-transform"
          >
            {SHOWCASE.map((c) => (
              <div key={c.tag} className="shrink-0 w-[78vw] max-w-[900px]">
                <ShowcaseCard card={c} />
              </div>
            ))}
          </motion.div>
        </div>
        <div className="pb-10 mono-tag text-muted text-center text-[10px]">
          scroll to advance ↓
        </div>
      </div>
    </section>
  );
}

function ShowcaseCard({ card }) {
  const Icon = card.icon;
  return (
    <div
      className="landing-showcase-card relative overflow-hidden"
      style={{ "--card-accent": card.accent }}
    >
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full blur-[80px] opacity-[0.28]"
        style={{ background: `radial-gradient(closest-side, ${card.accent}, transparent 70%)` }}
      />
      <div className="relative z-10 p-8 sm:p-12 md:p-16">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: `${card.accent}22`, color: card.accent }}
          >
            <Icon size={18} />
          </span>
          <p className="mono-tag" style={{ color: card.accent }}>{card.tag}</p>
        </div>
        <h3 className="mt-6 font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[32px] sm:text-[44px] md:text-[54px]">
          {card.title}
        </h3>
        <p className="mt-6 max-w-[540px] text-[15px] sm:text-base text-[var(--text-2)] leading-relaxed">
          {card.body}
        </p>
      </div>
    </div>
  );
}

// ─── SECTION 3: BENTO GRID ───────────────────────────────────────────────
// Bento — 4 columns × 3 rows = 12 cells, no gaps.
// Layout (col:row):
//   (1-2, 1-2) DASHBOARD  · big feature tile
//   (3,   1  ) SCOPE
//   (4,   1  ) RISKS
//   (3,   2-3) DECISION   · tall
//   (4,   2  ) MESSAGE
//   (4,   3  ) LOCK
//   (1-2, 3  ) SPEED      · wide horizontal tile fills the previous gap
const BENTO = [
  { span: "col-span-2 md:row-span-2",              tag: "DASHBOARD", title: "Client OS on one screen.",         hint: "Paste anything. Every project starts here." },
  { span: "col-span-1 md:col-span-1",              tag: "SCOPE",     title: "Scope, drafted.",                  hint: "In / out / deliverables / timeline." },
  { span: "col-span-1 md:col-span-1",              tag: "RISKS",     title: "Risks your client never said.",    hint: "Bracket stress-tests every call." },
  { span: "col-span-1 md:col-span-1 md:row-span-2", tag: "DECISION",  title: "A call, with confidence.",         hint: "Not a menu — a stance." },
  { span: "col-span-1 md:col-span-1",              tag: "MESSAGE",   title: "The client email, in your voice.", hint: "Copy-paste ready." },
  { span: "col-span-2 md:col-span-2",              tag: "SPEED",     title: "Under a minute. Every project.",   hint: "From messy paste → client-ready package." },
  { span: "col-span-1 md:col-span-1",              tag: "LOCK",      title: "Locked. Signed. Shipped.",         hint: "Survives the 3am rethink." },
];

function Bento() {
  return (
    <section className="relative py-24 md:py-32" data-testid="landing-bento">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10">
        <SectionHeading
          tag="WHAT'S INSIDE"
          title="Every screen designed to reduce hesitation."
        />
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 grid-flow-dense auto-rows-[190px] md:auto-rows-[220px] gap-4">
          {BENTO.map((b, i) => (
            <BentoCard key={i} tile={b} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoCard({ tile }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`bento-card ${tile.span}`}
    >
      <div className="bento-card-glow" aria-hidden="true" />
      <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6">
        <p className="mono-tag text-signal text-[10px]">{tile.tag}</p>
        <div>
          <h4 className="font-display font-semibold tracking-[-0.02em] text-[18px] sm:text-[22px] leading-[1.15]">
            {tile.title}
          </h4>
          <p className="mt-1 text-[12px] text-[var(--text-3)]">{tile.hint}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SECTION 4: PRICING (glassmorphic, middle amber-glowed) ──────────────
function PricingSection() {
  const [currency, setCurrency] = useState("USD");
  const cur = PRICING.currencies[currency];
  const priceFor = (id) => cur[id];

  return (
    <section className="relative py-28 md:py-36 overflow-hidden isolate" data-testid="landing-pricing" id="pricing">
      {/* Near-black backdrop with amber wash behind middle card */}
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, #050506 0%, #08090A 100%)" }} />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/3 mx-auto h-[600px] w-[900px] blur-[120px] opacity-[0.22] -z-10"
        style={{ background: "radial-gradient(closest-side, #FFB84C, transparent 70%)" }}
      />
      <FilmGrain opacity={0.05} />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 relative">
        <SectionHeading
          tag="PRICING"
          title="One-time thinking. Repeatable output."
          center
        />

        {/* Currency toggle */}
        <div className="mt-8 flex justify-center">
          <div className="landing-currency-toggle" role="group" aria-label="Currency">
            {["USD", "INR"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={currency === c ? "is-active" : ""}
                data-testid={`pricing-currency-${c.toLowerCase()}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6 items-stretch">
          {PRICING.tiers.map((t) => (
            <PricingCard key={t.id} tier={t} price={priceFor(t.id)} symbol={cur.symbol} popular={t.id === "pro"} />
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] text-[var(--text-3)]">
          All plans include OTP login, guest projects, and unlimited pastes.
        </p>
      </div>
    </section>
  );
}

function PricingCard({ tier, price, symbol, popular }) {
  const priceLabel = price === 0 ? "Free" : `${symbol}${price}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={popular ? { y: -8, transition: { duration: 0.4 } } : { y: -4, transition: { duration: 0.4 } }}
      className={`pricing-card ${popular ? "pricing-card--popular" : ""}`}
      data-testid={`pricing-card-${tier.id}`}
    >
      {popular && (
        <div className="pricing-ribbon">
          <span>Most popular</span>
        </div>
      )}
      <div className="pricing-card-glow" aria-hidden="true" />
      <div className="relative z-10 p-8 sm:p-10 flex flex-col h-full">
        <p className="mono-tag" style={{ color: popular ? "#FFB84C" : "var(--accent)" }}>{tier.name}</p>
        <p className="mt-1 text-[12px] text-[var(--text-3)] leading-relaxed">{tier.tagline}</p>
        <div className="mt-6 flex items-baseline gap-1">
          <span className="font-display font-semibold text-[56px] leading-none tracking-[-0.03em]">{priceLabel}</span>
          {price !== 0 && <span className="text-[12px] text-[var(--text-3)]">/ mo</span>}
        </div>
        <ul className="mt-8 space-y-3 flex-1">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-[13.5px] text-[var(--text-2)]">
              <span className="mt-[3px] inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0"
                    style={{ background: popular ? "rgba(255,184,76,0.15)" : "rgba(46,91,255,0.15)" }}>
                <span className="text-[10px]" style={{ color: popular ? "#FFB84C" : "var(--accent)" }}>✓</span>
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/login"
          className={`mt-10 landing-plan-cta ${popular ? "landing-plan-cta--popular" : ""}`}
          data-testid={`pricing-cta-${tier.id}`}
        >
          <span>{tier.cta}</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── SECTION 5: FINAL CTA / FOOTER BAND ──────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative py-32 md:py-40 overflow-hidden isolate" data-testid="landing-final-cta">
      <div className="absolute inset-0 -z-20" style={{ background: "linear-gradient(180deg, #08090A 0%, #050506 50%, #030304 100%)" }} />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          background: "radial-gradient(60% 40% at 50% 45%, rgba(46,91,255,0.18), transparent 70%)",
        }}
      />
      <FilmGrain opacity={0.08} />

      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mono-tag text-signal inline-flex items-center gap-2"
        >
          <Zap size={12} /> READY?
        </motion.p>

        <h2 className="mt-6 font-display font-semibold italic tracking-[-0.03em] leading-[0.98] text-[52px] sm:text-[80px] md:text-[104px] lg:text-[128px] text-[var(--text)]">
          <WordReveal text="Start building." tag="span" />
        </h2>

        {/* Animated gradient underline */}
        <div className="landing-underline mx-auto mt-6" aria-hidden="true">
          <motion.div
            className="landing-underline-fill"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "left" }}
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-10 max-w-[540px] mx-auto text-[15px] sm:text-base text-[var(--text-2)] leading-relaxed"
        >
          One paste. One minute. A whole client-ready package.
          No credit card. No formatting. No onboarding wizard.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-12 flex justify-center"
        >
          <MagneticButton
            to="/login"
            testid="final-cta-btn"
            className="landing-cta-primary landing-cta-primary--xl"
          >
            <span>Paste your first brief</span>
            <ArrowRight size={18} />
          </MagneticButton>
        </motion.div>

        <p className="mt-6 text-[11px] text-[var(--text-3)] mono-tag">
          FREE FOREVER · NO CARD · NO FORMATTING
        </p>
      </div>
    </section>
  );
}

// ─── SHARED SECTION HEADING ──────────────────────────────────────────────
function SectionHeading({ tag, title, center = false }) {
  return (
    <div className={center ? "text-center" : ""}>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mono-tag text-signal inline-flex items-center gap-2"
      >
        <span className="dot" style={{ background: "var(--accent)" }} /> {tag}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 font-display font-semibold tracking-[-0.03em] leading-[1.03] text-[36px] sm:text-[52px] md:text-[68px]"
      >
        {title}
      </motion.h2>
    </div>
  );
}

// ─── ROOT ────────────────────────────────────────────────────────────────
export default function Landing() {
  const shouldReduce = useReducedMotion();

  // Lenis smooth scroll — only on this route. Disabled under reduced-motion.
  useEffect(() => {
    if (shouldReduce) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [shouldReduce]);

  // Acquisition tracking — fire once per session.
  useEffect(() => {
    try {
      const KEY = "bracket_track_session";
      let sid = sessionStorage.getItem(KEY);
      if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem(KEY, sid);
        const params = new URLSearchParams(window.location.search);
        const utm = {};
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
          const v = params.get(k);
          if (v) utm[k] = v;
        });
        api.post("/public/track", {
          session_id: sid,
          referrer: document.referrer || "",
          landing_path: window.location.pathname,
          utm,
        }).catch(() => {});
      }
    } catch { /* silent */ }
  }, []);

  return (
    <>
      <Seo
        title="Bracket — Paste the mess. Ship the decision."
        description="Bracket is the decision OS for freelance designers. Turn messy client conversations into scoped, decisioned, client-ready projects in under a minute."
        path="/"
      />
      <Hero />
      <Showcase />
      <Bento />
      <PricingSection />
      <FinalCTA />
    </>
  );
}
