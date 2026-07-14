import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
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
        // Tight wrapper — just enough padding for italic ascenders and
        // descenders at extreme sizes, without inflating the line box (which
        // was creating a huge visual gap between adjacent H1 lines).
        <span
          key={i}
          className="inline-block overflow-hidden mr-[0.25em]"
          style={{
            lineHeight: 1.05,
            paddingTop: "0.22em",
            paddingBottom: "0.22em",
            marginTop: "-0.1em",
            marginBottom: "-0.2em",
            verticalAlign: "bottom",
          }}
        >
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

// Soft ambient orbs — scattered blurred spheres reminiscent of atmospheric
// bokeh. Positioned to frame the copy without overlapping it. Each orb
// drifts on a slow independent loop.
function HeroOrbs() {
  const shouldReduce = useReducedMotion();
  const orbs = [
    { size: 640, top: "-18%",  left: "-12%", bg: "rgba(255,255,255,0.05)", dx: 22,  dy: -14, dur: 14 },
    { size: 520, top: "34%",   left: "82%",  bg: "rgba(255,255,255,0.04)", dx: -22, dy: -10, dur: 18 },
    { size: 620, top: "66%",   left: "92%",  bg: "rgba(124,213,255,0.05)", dx: 16,  dy: 12,  dur: 20 },
  ];
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-[5] pointer-events-none overflow-hidden">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0 }}
          animate={shouldReduce ? { x: 0, y: 0 } : { x: [0, o.dx, 0], y: [0, o.dy, 0] }}
          transition={shouldReduce ? { duration: 0 } : { duration: o.dur, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full"
          style={{
            width: o.size,
            height: o.size,
            top: o.top,
            left: o.left,
            background: `radial-gradient(circle at 45% 45%, ${o.bg} 0%, rgba(255,255,255,0) 55%)`,
            filter: "blur(70px)",
          }}
        />
      ))}
    </div>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────
function Hero() {
  const shouldReduce = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden isolate min-h-[92vh] flex items-center"
      data-testid="landing-hero"
    >
      {/* Cinematic dark backdrop — same `.hero-ambient` treatment used on
         the Login page (blue-signal radial wash + subtle dot grid). Keeps
         the whole app in one visual universe, without a photo backdrop. */}
      <div aria-hidden="true" className="hero-ambient" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #08090A 0%, #06070A 55%, #050506 100%)" }}
      />

      {/* Ambient orbs — soft blurred spheres scattered across the stage.
         Layered above the base ambient, below the copy. Subtle slow drift
         gives the hero atmosphere without pulling attention from the type. */}
      <HeroOrbs />

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
          FROM CHAOS TO CLARITY
        </motion.div>

        <h1 className="mt-6 font-display font-semibold tracking-[-0.032em] leading-[1.05] text-[42px] sm:text-[64px] md:text-[82px] lg:text-[96px] text-[var(--text)]">
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
          Paste an email, WhatsApp chat or meeting notes. Bracket turns them into scope,
          deliverables, risks, timelines and client-ready documentation in under a minute.
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
            <span>Start your first project</span>
            <ArrowRight size={16} />
          </MagneticButton>
          <Link
            to="/how-it-works"
            className="landing-cta-ghost"
            data-testid="hero-cta-secondary"
          >
            <span>See it in action</span>
            <ArrowUpRight size={14} />
          </Link>
          <p className="hero-early-access-pill" data-testid="hero-early-access-pill">
            <Check size={12} strokeWidth={2.5} className="hero-early-access-check" aria-hidden="true" />
            Free during early access
          </p>
        </motion.div>

        {/* Live metrics micro-strip */}
        <HeroMetrics />
      </div>
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
    title: "Paste anything. Bracket understands it.",
    body:
      "Paste an email, WhatsApp chat, meeting notes or a transcript. Bracket uncovers the goals, assumptions, stakeholders and hidden context automatically.",
    output: "Structured Brief",
    accent: "#5E6AD2",
    icon: Compass,
  },
  {
    tag: "02 · SIMPLIFY",
    title: "The signal. Not the noise.",
    body:
      "Bracket filters distractions, surfaces what actually matters, and rewrites the problem into one clear, actionable direction.",
    output: "Clear Problem Statement",
    accent: "#7CD5FF",
    icon: Layers,
  },
  {
    tag: "03 · STRATEGY",
    title: "A decision. Not a debate.",
    body:
      "Bracket recommends the strongest path forward, explains why it works, and highlights the trade-offs before you commit.",
    output: "Confident Recommendation",
    accent: "#FFB84C",
    icon: Sparkles,
  },
  {
    tag: "04 · EXECUTION",
    title: "Scope. Message. Ready to send.",
    body:
      "Your scope, client message, deliverables and documentation are drafted in your voice — ready to review and share.",
    output: "Client-Ready Deliverables",
    accent: "#B7B7FF",
    icon: ListChecks,
  },
  {
    tag: "05 · DECISION",
    title: "Locked. Signed. Shipped.",
    body:
      "Export polished documents, share with clients, and keep every assumption and decision in one place for future reference.",
    output: "Complete Decision Record",
    accent: "#4BE39B",
    icon: AlertTriangle,
  },
];

function Showcase() {
  const stripRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Sync the active state with whichever card is currently centered in the strip.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const onScroll = () => {
      const cards = strip.querySelectorAll("[data-showcase-card]");
      if (!cards.length) return;
      const stripRect = strip.getBoundingClientRect();
      const centerX = stripRect.left + stripRect.width / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const d = Math.abs(c - centerX);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActiveIndex(best);
    };
    strip.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => strip.removeEventListener("scroll", onScroll);
  }, []);

  // Pointer drag-to-scroll — matches touch-drag UX for mouse users.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onPointerDown = (e) => {
      // Ignore drags starting on the arrow buttons.
      if (e.target.closest(".showcase-nav-btn")) return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = strip.scrollLeft;
      strip.classList.add("is-dragging");
      strip.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      strip.scrollLeft = startScroll - dx;
    };
    const endDrag = (e) => {
      if (!isDown) return;
      isDown = false;
      strip.classList.remove("is-dragging");
      strip.releasePointerCapture?.(e.pointerId);
    };
    // Suppress accidental link clicks that happen right after a drag.
    const onClickCapture = (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    strip.addEventListener("pointerdown", onPointerDown);
    strip.addEventListener("pointermove", onPointerMove);
    strip.addEventListener("pointerup", endDrag);
    strip.addEventListener("pointercancel", endDrag);
    strip.addEventListener("pointerleave", endDrag);
    strip.addEventListener("click", onClickCapture, true);
    return () => {
      strip.removeEventListener("pointerdown", onPointerDown);
      strip.removeEventListener("pointermove", onPointerMove);
      strip.removeEventListener("pointerup", endDrag);
      strip.removeEventListener("pointercancel", endDrag);
      strip.removeEventListener("pointerleave", endDrag);
      strip.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  const scrollToIndex = (i) => {
    const strip = stripRef.current;
    if (!strip) return;
    const cards = strip.querySelectorAll("[data-showcase-card]");
    const target = cards[Math.max(0, Math.min(cards.length - 1, i))];
    if (!target) return;
    const stripRect = strip.getBoundingClientRect();
    const cardRect = target.getBoundingClientRect();
    const delta =
      cardRect.left - stripRect.left - (stripRect.width - cardRect.width) / 2;
    strip.scrollBy({ left: delta, behavior: "smooth" });
  };

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < SHOWCASE.length - 1;

  return (
    <section className="relative py-24 md:py-32" data-testid="landing-showcase">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10">
        <SectionHeading
          tag="THE FLOW"
          title="From mess to decision, in five chapters."
        />
      </div>

      <div className="showcase-carousel-wrap mt-14">
        <div
          ref={stripRef}
          className="showcase-carousel flex gap-6 md:gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 px-[max(20px,calc((100vw-1200px)/2+20px))] md:px-[max(40px,calc((100vw-1200px)/2+40px))]"
          data-testid="showcase-strip"
        >
          {SHOWCASE.map((c) => (
            <div
              key={c.tag}
              data-showcase-card
              className="shrink-0 snap-center w-[86vw] sm:w-[62vw] md:w-[55vw] max-w-[620px]"
            >
              <ShowcaseCard card={c} />
            </div>
          ))}
        </div>

        {/* Side arrows — overlay controls */}
        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex - 1)}
          disabled={!canPrev}
          aria-label="Previous card"
          data-testid="showcase-prev"
          className="showcase-nav-btn showcase-nav-btn--side showcase-nav-btn--left"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={!canNext}
          aria-label="Next card"
          data-testid="showcase-next"
          className="showcase-nav-btn showcase-nav-btn--side showcase-nav-btn--right"
        >
          <ArrowRight size={18} />
        </button>
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
      <div className="relative z-10 p-7 sm:p-9 md:p-11">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: `${card.accent}22`, color: card.accent }}
          >
            <Icon size={16} />
          </span>
          <p className="mono-tag" style={{ color: card.accent }}>{card.tag}</p>
        </div>
        <h3 className="mt-5 font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[24px] sm:text-[30px] md:text-[36px]">
          {card.title}
        </h3>
        <p className="mt-4 max-w-[440px] text-[13.5px] sm:text-sm text-[var(--text-2)] leading-relaxed">
          {card.body}
        </p>
        {card.output && (
          <div
            className="mt-7 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11.5px] tracking-[0.02em]"
            style={{
              background: `${card.accent}14`,
              border: `1px solid ${card.accent}40`,
              color: card.accent,
            }}
          >
            <span className="mono-tag" style={{ color: card.accent, opacity: 0.75 }}>OUTPUT</span>
            <span style={{ color: "var(--text)" }}>{card.output}</span>
          </div>
        )}
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
  {
    span: "col-span-2 md:row-span-2",
    tag: "DASHBOARD",
    title: "Everything starts here.",
    hint: "Paste one client conversation. Bracket turns it into a structured project workspace.",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
  },
  {
    span: "col-span-1 md:col-span-1",
    tag: "SCOPE",
    title: "Scope. Ready to send.",
    hint: "Deliverables, timeline and assumptions drafted automatically.",
    img: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80",
  },
  {
    span: "col-span-1 md:col-span-1",
    tag: "RISKS",
    title: "Risks your client never mentioned.",
    hint: "Spot hidden risks before they become expensive revisions.",
    img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
  },
  {
    span: "col-span-1 md:col-span-1 md:row-span-2",
    tag: "DECISION",
    title: "Decisions backed by evidence.",
    hint: "Understand trade-offs and move forward with confidence.",
    img: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=800&q=80",
  },
  {
    span: "col-span-1 md:col-span-1",
    tag: "MESSAGE",
    title: "The client email, in your voice.",
    hint: "Generate polished responses from everything Bracket already knows.",
    img: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=800&q=80",
  },
  {
    span: "col-span-2 md:col-span-2",
    tag: "SPEED",
    title: "From brief to project in under a minute.",
    hint: "Skip the setup. Get straight to the work.",
    img: "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    span: "col-span-1 md:col-span-1",
    tag: "LOCK",
    title: "Locked. Signed. Shipped.",
    hint: "Export polished documents and keep every decision documented.",
    img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
  },
];

function Bento() {
  return (
    <section className="relative py-24 md:py-32" data-testid="landing-bento">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10">
        <SectionHeading
          tag="WHAT'S INSIDE"
          title="Everything you need before you hit send."
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
      className={`bento-card group ${tile.span}`}
    >
      {/* Stock image with dark gradient scrim so text stays readable.
         Zooms in on hover for that "peek into the product" feel. */}
      {tile.img && (
        <>
          <img
            src={tile.img}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-40 group-hover:opacity-70 scale-100 group-hover:scale-110 transition-[opacity,transform] duration-[700ms] ease-out"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,9,10,0.4) 0%, rgba(8,9,10,0.75) 55%, rgba(8,9,10,0.95) 100%)",
            }}
          />
        </>
      )}
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

// ─── SECTION 4b: OUR STORY (timeline — origin → mistakes → now → future) ─
const STORY = [
  {
    chapter: "01 · ORIGIN",
    year: "Aug 2025",
    title: "Bracket started at 3am.",
    body:
      "A freelancer receives a messy client brief. Hours disappear trying to understand the scope, price the work, and write the perfect response. We built Bracket to compress that entire process into minutes.",
    accent: "#5E6AD2",
  },
  {
    chapter: "02 · MISTAKES",
    year: "Oct → Dec 2025",
    title: "We tried to be another writing tool.",
    body:
      "Version one generated better documents. The problem wasn't writing — it was deciding. We rebuilt Bracket around one question: \u201CWhat would an experienced product designer do next?\u201D",
    accent: "#FF6B6B",
  },
  {
    chapter: "03 · NOW",
    year: "Feb 2026",
    title: "A decision, not a document.",
    body:
      "Bracket understands your client brief, recommends a direction, explains the trade-offs, and prepares everything you need to move forward — from scope and deliverables to client-ready communication.",
    accent: "#4BE39B",
  },
  {
    chapter: "04 · FUTURE",
    year: "Q3 2026 →",
    title: "Where we're going.",
    body:
      "We're building the operating system for client work — where every decision, conversation, revision and document stays connected. Same promise. Better decisions, not more tools.",
    accent: "#B7B7FF",
  },
];

function Story() {
  return (
    <section className="relative py-28 md:py-36 overflow-hidden isolate" data-testid="landing-story" id="story">
      {/* Soft signal-blue wash bottom-left, matches the cinematic gradient
         language on the rest of the page. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 mx-auto h-[500px] w-[900px] blur-[120px] opacity-[0.16] -z-10"
        style={{ background: "radial-gradient(closest-side, #5E6AD2, transparent 70%)" }}
      />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10">
        <SectionHeading
          tag="THE STORY"
          title="The turning point."
        />
        <div className="mt-14 md:mt-20 grid gap-6 md:gap-8 md:grid-cols-2">
          {STORY.map((s, i) => (
            <StoryChapter key={s.chapter} chapter={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryChapter({ chapter, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="story-chapter liquid-glass p-8 md:p-10 relative isolate"
      style={{ "--chapter-accent": chapter.accent }}
      data-testid={`story-chapter-${index + 1}`}
    >
      {/* Corner glow — matches the accent color unique to each chapter. */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 h-[360px] w-[360px] rounded-full blur-[80px] opacity-[0.22] -z-10"
        style={{ background: `radial-gradient(closest-side, ${chapter.accent}, transparent 70%)` }}
      />
      <div className="flex items-baseline justify-between gap-4">
        <p className="mono-tag" style={{ color: chapter.accent }}>{chapter.chapter}</p>
        <p className="mono-tag text-muted text-[10px]">{chapter.year}</p>
      </div>
      <h3 className="mt-5 font-display font-semibold tracking-[-0.02em] leading-[1.08] text-[26px] sm:text-[30px] md:text-[34px]">
        {chapter.title}
      </h3>
      <p className="mt-5 text-[14px] sm:text-[14.5px] text-[var(--text-2)] leading-relaxed">
        {chapter.body}
      </p>
    </motion.article>
  );
}

// ─── SECTION 4c: TESTIMONIALS (marquee, cinematic) ───────────────────────
const TESTIMONIALS = [
  {
    quote:
      "Bracket turns unstructured client discussions into a clear project scope. Less ambiguity, better communication, more confidence.",
    name: "Kshitij Sahu",
    role: "Experience Designer",
    accent: "#5E6AD2",
  },
  {
    quote:
      "Bracket has changed how our design team collaborates. Everything stays organized, reviews are faster, and our workflow is noticeably smoother.",
    name: "Tanay Vyas",
    role: "Founder",
    accent: "#7CD5FF",
  },
  {
    quote:
      "Bracket organizes project requirements in one place — teams avoid the mistakes unclear communication creates.",
    name: "Karthick D",
    role: "QA Expert",
    accent: "#4BE39B",
  },
  {
    quote:
      "I scoped a ₹1 lakh clothing order with a 14-day deadline. Clear agreement, transparent timelines, delivered on time.",
    name: "Yash Kamdar",
    role: "Manager",
    accent: "#FFB84C",
  },
  {
    quote:
      "I use Bracket for every new project. It clarifies the brief and helps me set a realistic timeline with confidence.",
    name: "Abhinav Sharma",
    role: "Motion Designer",
    accent: "#B7B7FF",
  },
];

function Testimonials() {
  // Duplicate the array so the CSS marquee (translateX -50%) loops seamlessly.
  const track = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="relative py-28 md:py-36 overflow-hidden isolate" data-testid="landing-testimonials" id="testimonials">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[420px] w-[900px] blur-[120px] opacity-[0.12] -z-10"
        style={{ background: "radial-gradient(closest-side, #5E6AD2, transparent 70%)" }}
      />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10">
        <SectionHeading
          tag="FROM THE FIELD"
          title="Freelancers ship faster with Bracket."
          center
        />
      </div>
      {/* Marquee row — full-bleed, hover pauses. */}
      <div className="mt-14 md:mt-20 overflow-hidden" data-testid="testimonials-track-wrap">
        <div className="testimonial-track">
          {track.map((t, i) => (
            <TestimonialCard key={i} card={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ card }) {
  return (
    <div
      className="testimonial-card liquid-glass shrink-0 w-[360px] sm:w-[420px] p-7 sm:p-8 relative isolate"
      style={{ "--card-accent": card.accent }}
    >
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 h-[260px] w-[260px] rounded-full blur-[70px] opacity-[0.20] -z-10"
        style={{ background: `radial-gradient(closest-side, ${card.accent}, transparent 70%)` }}
      />
      <p className="font-display italic tracking-[-0.01em] leading-[1.35] text-[16px] sm:text-[17.5px] text-[var(--text)]">
        &ldquo;{card.quote}&rdquo;
      </p>
      <div className="mt-6 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full font-display font-semibold text-[13px]"
          style={{
            background: `${card.accent}22`,
            color: card.accent,
          }}
        >
          {card.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </span>
        <div>
          <p className="text-[13px] font-medium text-[var(--text)]">{card.name}</p>
          <p className="mono-tag text-muted text-[10px]">{card.role}</p>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION 5: PRICING (glassmorphic, middle amber-glowed) ──────────────
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

        {/* Early-access banner — announces free until v1.0 without dictating
           when that is. Sits above the currency toggle so it's the first
           thing pricing-curious visitors read. */}
        <div className="mt-6 flex justify-center">
          <div className="pricing-early-access-banner" data-testid="pricing-early-access-banner">
            <span className="pricing-early-access-dot" aria-hidden="true" />
            <span>
              <strong>Bracket is in early access — everything below is free while we ship v1.</strong>{" "}
              You&apos;ll get a heads-up 30 days before we start charging.
            </span>
          </div>
        </div>

        {/* Currency toggle */}
        <div className="mt-6 flex justify-center">
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
                    style={{ background: popular ? "rgba(255,184,76,0.15)" : "rgba(94,106,210,0.15)" }}>
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
          background: "radial-gradient(60% 40% at 50% 45%, rgba(94,106,210,0.18), transparent 70%)",
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

        <h2 className="mt-6 font-display font-semibold italic tracking-[-0.02em] leading-[1.05] text-[36px] sm:text-[48px] md:text-[60px] lg:text-[72px] text-[var(--text)]">
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
      <Story />
      <Testimonials />
      <PricingSection />
      <FinalCTA />
    </>
  );
}
