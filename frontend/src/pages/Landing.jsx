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
  LayoutDashboard,
  GitBranch,
  Mail,
  Lock,
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
          className="inline-block overflow-hidden"
          style={{
            lineHeight: 1.05,
            paddingTop: "0.22em",
            paddingBottom: "0.22em",
            paddingLeft: "0.14em",
            paddingRight: "0.14em",
            marginTop: "-0.1em",
            marginBottom: "-0.2em",
            marginLeft: "-0.14em",
            marginRight: "calc(0.25em - 0.14em)",
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

// Opaque section backdrop + colour washes — shared with the marketing
// subpages so every page's sections blend the same way.
import { SectionBleed } from "../components/SectionBleed";

// Film grain overlay — SVG turbulence baked as data URI, animated with a slow
// translate for subtle life. Non-interactive.
function FilmGrain({ opacity = 0.06, fadeBottom = false, fadeTop = false }) {
  const stops = `${fadeTop ? "transparent 0%, #000 20%" : "#000 0%"}, ${fadeBottom ? "#000 60%, transparent 100%" : "#000 100%"}`;
  const mask = fadeTop || fadeBottom ? `linear-gradient(180deg, ${stops})` : undefined;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mix-blend-overlay z-10"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        ...(mask ? { maskImage: mask, WebkitMaskImage: mask } : {}),
      }}
    />
  );
}

/**
 * ParallaxGlow — thin motion.div wrapper that drifts vertically ~40px
 * slower than the page scroll while its section is on-screen. Gives every
 * section-level ambient a subtle Awwwards-style depth without adding new
 * assets or changing the design. Falls back to a static div under
 * reduced-motion.
 *
 * Usage: wraps the existing ambient decoration — it forwards `className`,
 * `style` and children unchanged.
 */
function ParallaxGlow({ className, style, children, distance = 40, testid }) {
  const shouldReduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Scroll goes 0 → 1 as the section passes through viewport. Map to
  // -distance → +distance so the glow drifts slightly against scroll for
  // the classic parallax feel.
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);
  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      data-testid={testid}
      className={`pointer-events-none ${className || ""}`}
      style={shouldReduce ? style : { ...style, y, willChange: "transform" }}
    >
      {children}
    </motion.div>
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
  const valRef = useRef(0);
  const startedRef = useRef(false);
  const [val, setVal] = useState(0);
  const shouldReduce = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (shouldReduce) {
      valRef.current = to;
      setVal(to);
      return;
    }
    const tick = (v) => {
      valRef.current = v;
      setVal(Math.floor(v));
    };
    // After the first reveal, glide from the current value — lets live
    // metric updates animate smoothly instead of restarting from 0.
    if (startedRef.current) {
      const c = animate(valRef.current, to, { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: tick });
      return () => c.stop();
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        startedRef.current = true;
        const c = animate(0, to, {
          duration: 1.6,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: tick,
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
      className="relative overflow-x-clip isolate min-h-[92vh] flex items-center"
      data-testid="landing-hero"
    >
      {/* Cinematic dark backdrop — same `.hero-ambient` treatment used on
         the Login page (blue-signal radial wash + subtle dot grid). Keeps
         the whole app in one visual universe, without a photo backdrop.
         Parallax-drift makes it feel like it lives BEHIND the stage. */}
      <ParallaxGlow distance={30} className="hero-ambient hero-ambient--contained" />
      {/* Ambient orbs — soft blurred spheres scattered across the stage.
         Layered above the base ambient, below the copy. Subtle slow drift
         gives the hero atmosphere without pulling attention from the type. */}
      <HeroOrbs />

      <FilmGrain opacity={0.06} fadeBottom />

      {/* Copy */}
      <div className="relative z-20 max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mono-tag text-signal inline-flex items-center gap-2"
        >
          <span className="dot" style={{ background: "var(--accent)" }} />
          THE PROJECT MEMORY OS FOR CLIENT WORK
        </motion.div>

        <h1 className="mt-6 font-display font-semibold tracking-[-0.032em] leading-[1.05] text-[42px] sm:text-[64px] md:text-[82px] lg:text-[96px] text-[var(--text)]">
          <WordReveal text="Your client work." tag="span" />
          <br />
          <span className="landing-hero-gradient">
            <WordReveal text="Remembered." tag="span" delayBase={2} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mt-6 max-w-[640px] text-[15px] sm:text-lg text-[var(--text-2)] leading-relaxed"
        >
          Connect Gmail, Slack, Figma or GitHub in one click. Bracket keeps a live
          memory of every deliverable, scope item, timeline, requirement, decision
          and deadline — and drafts on-demand replies grounded in what your client
          actually said.
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

        {/* Product Hunt featured badge — dark theme, matches the stage */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.7 }}
          className="mt-8"
        >
          <a
            href="https://www.producthunt.com/products/bracket-2027?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-bracket-2027"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="hero-producthunt-badge"
            className="inline-block rounded-[10px] transition-transform duration-300 hover:-translate-y-0.5"
            style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))" }}
          >
            <img
              alt="Bracket - Stop Guessing. Start Deciding. | Product Hunt"
              width="250"
              height="54"
              loading="lazy"
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1201782&theme=dark&t=1784615169393"
            />
          </a>
        </motion.div>

        {/* Live metrics micro-strip */}
        <HeroMetrics />
      </div>
    </section>
  );
}

// ─── PRODUCT HUNT EMBED CARD (Bracket-styled) ────────────────────────────
function ProductHuntCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="mx-auto mt-14 max-w-[500px] rounded-2xl p-5 sm:p-6 text-left"
      data-testid="producthunt-card"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div className="flex items-center gap-4">
        <img
          alt="Bracket on Product Hunt"
          src="https://ph-files.imgix.net/e047fa31-e8b0-48de-8636-46381e6c91a0.png?auto=compress,format&codec=mozjpeg&cs=strip&fit=crop&h=80&w=80"
          loading="lazy"
          className="w-14 h-14 rounded-xl object-cover shrink-0"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="m-0 font-display font-semibold text-[17px] text-[var(--text)] truncate">
              Bracket
            </h3>
            <span
              className="mono-tag text-[9.5px] px-2 py-[3px] rounded-full shrink-0"
              style={{
                background: "rgba(255,97,84,0.10)",
                color: "#FF6154",
                border: "1px solid rgba(255,97,84,0.25)",
              }}
            >
              LIVE ON PRODUCT HUNT
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-[var(--text-2)] leading-snug truncate">
            Stop Guessing. Start Deciding.
          </p>
        </div>
      </div>
      <a
        href="https://www.producthunt.com/products/bracket-2027?embed=true&utm_source=embed&utm_medium=post_embed"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="producthunt-card-cta"
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
        style={{
          background: "#FF6154",
          boxShadow: "0 8px 24px rgba(255,97,84,0.25)",
        }}
      >
        <span>Check it out on Product Hunt</span>
        <ArrowUpRight size={14} />
      </a>
    </motion.div>
  );
}

function HeroMetrics() {
  // Live platform KPIs — same aggregates the admin panel reports. Fetched
  // from /public/metrics and refreshed every 12s. The strip stays hidden
  // until REAL data arrives — no placeholder numbers, ever.
  const [m, setM] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const fetchMetrics = async () => {
      try {
        const { data } = await api.get("/public/metrics", {
          headers: { "Cache-Control": "no-cache" },
        });
        if (!cancelled) setM(data);
      } catch { /* silent — keep last known values */ }
    };
    fetchMetrics();
    const t = setInterval(fetchMetrics, 12000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  if (!m) return <div className="mt-12 h-10" data-testid="hero-metrics" aria-hidden="true" />;
  const items = [
    { n: m.projects_started_with_ai ?? 0, label: "projects with live memory" },
    { n: m.projects_scoped ?? 0, label: "decisions tracked in Bracket" },
    { n: m.freelancers_and_teams ?? 0, label: "professionals on Bracket" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="mt-12 flex items-center gap-8 flex-wrap"
      data-testid="hero-metrics"
    >
      {items.map((it, i) => (
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
    tag: "01 · CONNECT",
    title: "One-click access to where work already lives.",
    body:
      "Connect Gmail threads, Slack channels, Figma files or GitHub repos. Bracket only reads the sources you pick — nothing else.",
    output: "Live-Synced Sources",
    accent: "#5E6AD2",
    icon: Compass,
  },
  {
    tag: "02 · SYNC",
    title: "Every ten seconds. Continuously.",
    body:
      "Bracket polls your connected sources on a live 10-second cadence, so the project always reflects the freshest client conversation.",
    output: "Always Fresh",
    accent: "#7CD5FF",
    icon: Zap,
  },
  {
    tag: "03 · REMEMBER",
    title: "Six categories. Nothing forgotten.",
    body:
      "Deliverables, Scope, Timelines, Requirements, Decisions, Deadlines — extracted, categorized and history-tracked automatically.",
    output: "Project Memory",
    accent: "#FFB84C",
    icon: Layers,
  },
  {
    tag: "04 · ASK",
    title: "Chat with your project. Reply on demand.",
    body:
      "Tell Bracket what you want — “draft a reply”, “push back on scope”, “ask for the missing details”. You get a grounded response using this project's memory.",
    output: "Chat-Style Reply",
    accent: "#B7B7FF",
    icon: Sparkles,
  },
  {
    tag: "05 · TRACK",
    title: "Every decision. Every change.",
    body:
      "Bracket keeps a full history of what changed, when, and from which source — with scope-creep alerts and change digests so nothing slips.",
    output: "Decision Provenance",
    accent: "#4BE39B",
    icon: ListChecks,
  },
];

function Showcase() {
  const stripRef = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  // Track whether the strip is at its extreme left/right — arrows hide there.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const onScroll = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      setEdges({ atStart: strip.scrollLeft <= 4, atEnd: strip.scrollLeft >= max - 4 });
    };
    strip.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      strip.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Pointer drag-to-scroll — matches touch-drag UX for mouse users.
  // Uses a raf-driven lerp during drag and momentum decay on release for
  // premium, silky feel. Direct-assign scrollLeft = target would work but
  // feels rigid; interpolating gives a subtle trailing/glide.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    let isDown = false;
    let startX = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;      // px per 16.7ms (60fps)
    let targetScroll = strip.scrollLeft;
    let startScroll = 0;
    let moved = false;
    let raf = null;

    const cancelLoop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    const loop = () => {
      const cur = strip.scrollLeft;
      if (isDown) {
        // Ease toward pointer target — 0.22 gives a slight glide without
        // feeling laggy. Snap when we're within a subpixel.
        const diff = targetScroll - cur;
        if (Math.abs(diff) < 0.4) {
          strip.scrollLeft = targetScroll;
        } else {
          strip.scrollLeft = cur + diff * 0.22;
        }
        raf = requestAnimationFrame(loop);
      } else {
        // Release phase — apply momentum with friction.
        if (Math.abs(velocity) < 0.25) {
          raf = null;
          velocity = 0;
          return;
        }
        strip.scrollLeft = cur - velocity;
        velocity *= 0.94;
        raf = requestAnimationFrame(loop);
      }
    };

    const onPointerDown = (e) => {
      // Ignore drags starting on the arrow buttons.
      if (e.target.closest(".showcase-nav-btn")) return;
      cancelLoop();
      isDown = true;
      moved = false;
      startX = e.clientX;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      startScroll = strip.scrollLeft;
      targetScroll = strip.scrollLeft;
      strip.classList.add("is-dragging");
      strip.setPointerCapture?.(e.pointerId);
      raf = requestAnimationFrame(loop);
    };
    const onPointerMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      // Track instantaneous velocity for the release phase.
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      // px per 16.7ms → gives a natural feel at 60fps
      velocity = ((e.clientX - lastX) / dt) * 16.7;
      lastX = e.clientX;
      lastT = now;
      // Update the ease target — the raf loop will glide toward this.
      targetScroll = startScroll - dx;
    };
    const endDrag = (e) => {
      if (!isDown) return;
      isDown = false;
      strip.classList.remove("is-dragging");
      strip.releasePointerCapture?.(e.pointerId);
      // Loop is already running — it'll switch to momentum mode next tick.
      if (!raf && Math.abs(velocity) > 0.5) {
        raf = requestAnimationFrame(loop);
      }
    };
    // Suppress accidental link clicks that happen right after a drag.
    const onClickCapture = (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    // A wheel event should cancel any lingering inertia so the user is
    // in control immediately when they take over.
    const onWheel = () => cancelLoop();

    strip.addEventListener("pointerdown", onPointerDown);
    strip.addEventListener("pointermove", onPointerMove);
    strip.addEventListener("pointerup", endDrag);
    strip.addEventListener("pointercancel", endDrag);
    strip.addEventListener("pointerleave", endDrag);
    strip.addEventListener("click", onClickCapture, true);
    strip.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      cancelLoop();
      strip.removeEventListener("pointerdown", onPointerDown);
      strip.removeEventListener("pointermove", onPointerMove);
      strip.removeEventListener("pointerup", endDrag);
      strip.removeEventListener("pointercancel", endDrag);
      strip.removeEventListener("pointerleave", endDrag);
      strip.removeEventListener("click", onClickCapture, true);
      strip.removeEventListener("wheel", onWheel);
    };
  }, []);

  const scrollByCard = (dir) => {
    const strip = stripRef.current;
    const card = strip?.querySelector("[data-showcase-card]");
    if (!strip || !card) return;
    const gap = parseFloat(getComputedStyle(strip).columnGap) || 24;
    strip.scrollBy({ left: dir * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  };

  return (
    <section className="relative py-24 md:py-32" data-testid="landing-showcase">
      {/* Opaque backdrop that bleeds past the section into the hero above
          and the What's Inside section below. */}
      <SectionBleed />
      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10">
        <SectionHeading
          tag="HOW IT WORKS"
          title="Connect once. Bracket does the rest."
        />
      </div>

      <div className="showcase-carousel-wrap mt-14">
        <div
          ref={stripRef}
          className="showcase-carousel flex gap-6 md:gap-8 overflow-x-auto pb-4 pl-5 sm:pl-6 md:pl-10 pr-5 sm:pr-6 md:pr-10"
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

        {/* Side arrows — overlay controls, hidden at the extremes */}
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Previous card"
          data-testid="showcase-prev"
          className={`showcase-nav-btn showcase-nav-btn--side showcase-nav-btn--left ${edges.atStart ? "is-hidden" : ""}`}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Next card"
          data-testid="showcase-next"
          className={`showcase-nav-btn showcase-nav-btn--side showcase-nav-btn--right ${edges.atEnd ? "is-hidden" : ""}`}
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
    tag: "PROJECT MEMORY",
    title: "Six categories, one live memory.",
    hint: "Deliverables, Scope, Timelines, Requirements, Decisions, Deadlines — extracted continuously from your connected sources.",
    icon: "LayoutDashboard",
    ghost: "cards",
  },
  {
    span: "col-span-1 md:col-span-1",
    tag: "SCOPE CREEP",
    title: "See scope creep the moment it starts.",
    hint: "Bracket flags every change with a red badge so you catch drift before it costs you.",
    icon: "AlertTriangle",
    ghost: "risk",
  },
  {
    span: "col-span-1 md:col-span-1",
    tag: "SOURCES",
    title: "Gmail. Slack. Figma. GitHub.",
    hint: "One-click OAuth. Bracket only reads the specific threads, channels or files you pick.",
    icon: "GitBranch",
    ghost: "checklist",
  },
  {
    span: "col-span-1 md:col-span-1 md:row-span-2",
    tag: "ASK BRACKET",
    title: "Chat-style replies, on demand.",
    hint: "Tell Bracket what to do — draft a reply, push back on scope, or ask for missing details — grounded in the project.",
    icon: "Mail",
    ghost: "bubbles",
  },
  {
    span: "col-span-1 md:col-span-1",
    tag: "HISTORY",
    title: "Every decision, provenance-tracked.",
    hint: "See exactly when a decision changed, and from which source it came.",
    icon: "GitBranch",
    ghost: "tree",
  },
  {
    span: "col-span-2 md:col-span-2",
    tag: "10-SEC SYNC",
    title: "Always fresh. Always live.",
    hint: "Bracket polls your sources every 10 seconds so the project reflects the newest conversation, not last week's.",
    icon: "Zap",
    ghost: "timeline",
  },
  {
    span: "col-span-1 md:col-span-1",
    tag: "PRIVACY",
    title: "Only the sources you pick.",
    hint: "Bracket never reads your whole workspace. Disconnect a source anytime.",
    icon: "Lock",
    ghost: "signed",
  },
];

const BENTO_ICON_MAP = {
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  GitBranch,
  Mail,
  Zap,
  Lock,
};

function Bento() {
  return (
    <section className="relative py-24 md:py-32" data-testid="landing-bento">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10">
        <SectionHeading
          tag="WHAT'S INSIDE"
          title="Everything a project keeps forgetting."
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
  const Icon = tile.icon ? BENTO_ICON_MAP[tile.icon] : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`bento-card group ${tile.span}`}
      data-testid={`bento-${tile.ghost}`}
    >
      <div className="bento-card-glow" aria-hidden="true" />
      {/* Ghost interface fragment — abstract UI hint that lives BEHIND the
         card content. Each variant is tuned per-card so it never encroaches
         on the title/hint text. */}
      {tile.ghost && <BentoGhost variant={tile.ghost} />}
      <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="mono-tag text-signal text-[10px]">{tile.tag}</p>
          {Icon && (
            <span className="bento-card-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={1.6} />
            </span>
          )}
        </div>
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

// Conceptual feature visualizations — premium diagram language shared across
// all cards: thin strokes, soft gradients, faint dot grids, gentle motion.
// No product screenshots.
function BentoGhost({ variant }) {
  const Comp = {
    cards: GhostFlow,
    checklist: GhostScope,
    risk: GhostRisk,
    tree: GhostTree,
    bubbles: GhostMessage,
    timeline: GhostTimeline,
    signed: GhostSigned,
  }[variant];
  return (
    <div className={`bento-ghost bento-ghost-wrap--${variant}`} aria-hidden="true">
      {Comp && <Comp />}
    </div>
  );
}

const MONO = "ui-monospace,monospace";

// Shared defs used by every illustration (unique ids per svg via prefix).
function GhostDefs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-panel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(94,106,210,0.14)" />
        <stop offset="100%" stopColor="rgba(94,106,210,0.02)" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="rgba(94,106,210,0.45)" />
        <stop offset="100%" stopColor="rgba(94,106,210,0)" />
      </radialGradient>
      <pattern id={`${id}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.055)" />
      </pattern>
    </defs>
  );
}

// DASHBOARD (large tile) — "mess in → structure out": chat scraps flow
// through a glowing Bracket node into a structured workspace panel.
function GhostFlow() {
  return (
    <svg viewBox="0 0 460 280" className="bento-ghost-svg bento-ghost--cards">
      <GhostDefs id="gf" />
      <rect x="0" y="0" width="460" height="280" fill="url(#gf-dots)" />

      {/* messy input scraps */}
      <g fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.12)" strokeWidth="1">
        <g transform="rotate(-4 60 66)">
          <rect x="14" y="42" width="96" height="42" rx="9" />
          <path d="M26 56 q8 -6 16 0 t18 -2 t22 3" stroke="rgba(255,255,255,0.18)" fill="none" />
          <path d="M26 70 q10 4 20 0 t24 2" stroke="rgba(255,255,255,0.10)" fill="none" />
        </g>
        <g transform="rotate(3 62 140)">
          <rect x="18" y="118" width="84" height="38" rx="9" />
          <path d="M30 132 q9 -5 18 1 t20 -3" stroke="rgba(255,255,255,0.16)" fill="none" />
          <path d="M30 144 q12 5 26 0" stroke="rgba(255,255,255,0.09)" fill="none" />
        </g>
        <g transform="rotate(-2 58 208)">
          <rect x="12" y="188" width="100" height="36" rx="9" />
          <path d="M24 202 q10 -6 22 0 t26 -2" stroke="rgba(255,255,255,0.15)" fill="none" />
          <path d="M24 213 q8 4 18 1 t22 1" stroke="rgba(255,255,255,0.09)" fill="none" />
        </g>
      </g>

      {/* converging flow lines */}
      <g fill="none" stroke="rgba(94,106,210,0.42)" strokeWidth="1.1" className="bg-flowdash">
        <path d="M112 62 C 160 70, 178 108, 200 130" />
        <path d="M104 138 C 140 140, 168 140, 196 140" />
        <path d="M114 206 C 160 200, 180 168, 200 150" />
      </g>

      {/* Bracket node — glow + ring + diamond core */}
      <g transform="translate(222, 140)">
        <circle r="44" fill="url(#gf-glow)" className="bg-pulse" style={{ transformOrigin: "0px 0px", transformBox: "fill-box" }} />
        <circle r="21" fill="rgba(8,9,10,0.6)" stroke="rgba(94,106,210,0.55)" strokeWidth="1.1" />
        <circle r="27" fill="none" stroke="rgba(94,106,210,0.22)" strokeWidth="1" strokeDasharray="2.5 5" className="bg-slowspin" style={{ transformOrigin: "0px 0px", transformBox: "fill-box" }} />
        <rect x="-7" y="-7" width="14" height="14" rx="2.5" transform="rotate(45)" fill="rgba(94,106,210,0.85)" />
      </g>

      {/* node → workspace */}
      <path d="M250 140 C 268 140, 272 140, 288 140" fill="none" stroke="rgba(94,106,210,0.5)" strokeWidth="1.2" className="bg-flowdash" />

      {/* structured workspace panel */}
      <g>
        <rect x="292" y="46" width="156" height="188" rx="12" fill="url(#gf-panel)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <text x="306" y="68" fontSize="7.5" fontFamily={MONO} letterSpacing="1.5" fill="rgba(94,106,210,0.85)">WORKSPACE</text>
        <line x1="306" y1="78" x2="434" y2="78" stroke="rgba(255,255,255,0.10)" />
        {[92, 106, 120].map((y, i) => (
          <g key={y}>
            <circle cx="311" cy={y} r="2.2" fill="rgba(94,106,210,0.7)" />
            <line x1="320" y1={y} x2={320 + [104, 84, 96][i]} y2={y} stroke={`rgba(255,255,255,${0.22 - i * 0.05})`} strokeWidth="1.2" />
          </g>
        ))}
        {/* structured chips */}
        <g fontFamily={MONO} fontSize="6.5" letterSpacing="1">
          <rect x="306" y="138" width="52" height="16" rx="8" fill="rgba(94,106,210,0.16)" stroke="rgba(94,106,210,0.4)" strokeWidth="0.8" />
          <text x="332" y="148.5" textAnchor="middle" fill="rgba(197,203,255,0.9)">SCOPE</text>
          <rect x="364" y="138" width="52" height="16" rx="8" fill="rgba(239,68,68,0.10)" stroke="rgba(239,68,68,0.35)" strokeWidth="0.8" />
          <text x="390" y="148.5" textAnchor="middle" fill="rgba(252,165,165,0.85)">RISKS</text>
          <rect x="306" y="160" width="64" height="16" rx="8" fill="rgba(34,197,94,0.10)" stroke="rgba(34,197,94,0.32)" strokeWidth="0.8" />
          <text x="338" y="170.5" textAnchor="middle" fill="rgba(134,239,172,0.85)">DECISION</text>
        </g>
        {/* progress */}
        <rect x="306" y="192" width="128" height="4" rx="2" fill="rgba(255,255,255,0.07)" />
        <rect x="306" y="192" width="96" height="4" rx="2" fill="rgba(94,106,210,0.65)" className="bg-progress" />
        <text x="306" y="214" fontSize="6.5" fontFamily={MONO} fill="rgba(255,255,255,0.35)" letterSpacing="1">STEP 4 / 5</text>
      </g>
    </svg>
  );
}

// SCOPE — structured document: deliverable checklist + week timeline strip.
function GhostScope() {
  return (
    <svg viewBox="0 0 220 172" className="bento-ghost-svg bento-ghost--checklist">
      <GhostDefs id="gs" />
      <rect x="0" y="0" width="220" height="172" fill="url(#gs-dots)" />
      <rect x="16" y="8" width="188" height="150" rx="12" fill="url(#gs-panel)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <text x="30" y="28" fontSize="7.5" fontFamily={MONO} letterSpacing="1.5" fill="rgba(94,106,210,0.85)">SCOPE · V1</text>
      <line x1="30" y1="37" x2="190" y2="37" stroke="rgba(255,255,255,0.10)" />
      {[
        { y: 53, w: 108, on: true },
        { y: 71, w: 88, on: true },
        { y: 89, w: 118, on: false },
      ].map((r, i) => (
        <g key={i}>
          <circle cx="37" cy={r.y} r="6" fill={r.on ? "rgba(94,106,210,0.32)" : "transparent"} stroke={r.on ? "rgba(94,106,210,0.7)" : "rgba(255,255,255,0.16)"} strokeWidth="1.1" />
          {r.on && <path d={`M33.6 ${r.y} l2.4 2.4 l4.6 -4.8`} stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          <line x1="50" y1={r.y} x2={50 + r.w} y2={r.y} stroke={r.on ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.12)"} strokeWidth="1.2" />
        </g>
      ))}
      {/* timeline strip */}
      <text x="30" y="118" fontSize="6.5" fontFamily={MONO} letterSpacing="1.2" fill="rgba(255,255,255,0.35)">TIMELINE</text>
      <g>
        <rect x="30" y="126" width="160" height="6" rx="3" fill="rgba(255,255,255,0.06)" />
        <rect x="30" y="126" width="64" height="6" rx="3" fill="rgba(94,106,210,0.55)" />
        <rect x="98" y="126" width="52" height="6" rx="3" fill="rgba(94,106,210,0.28)" />
        {["W1", "W2", "W3"].map((w, i) => (
          <text key={w} x={34 + i * 66} y="146" fontSize="6" fontFamily={MONO} fill="rgba(255,255,255,0.30)">{w}</text>
        ))}
      </g>
    </svg>
  );
}

// RISKS — document lines with one highlighted risk + scanning beam.
function GhostRisk() {
  return (
    <svg viewBox="0 0 220 172" className="bento-ghost-svg bento-ghost--risk">
      <GhostDefs id="gr" />
      <rect x="0" y="0" width="220" height="172" fill="url(#gr-dots)" />
      <rect x="16" y="8" width="188" height="150" rx="12" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* risk count chip */}
      <rect x="138" y="18" width="54" height="16" rx="8" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.4)" strokeWidth="0.8" />
      <circle cx="149" cy="26" r="2.4" fill="rgba(239,68,68,0.9)" className="bg-pulse" style={{ transformOrigin: "149px 26px" }} />
      <text x="157" y="29" fontSize="6.5" fontFamily={MONO} letterSpacing="1" fill="rgba(252,165,165,0.9)">3 RISKS</text>
      {/* body rows */}
      <g stroke="rgba(255,255,255,0.14)" strokeWidth="1.2">
        <line x1="30" y1="52" x2="150" y2="52" />
        <line x1="30" y1="68" x2="126" y2="68" strokeOpacity="0.6" />
        <line x1="30" y1="116" x2="140" y2="116" strokeOpacity="0.6" />
        <line x1="30" y1="132" x2="112" y2="132" strokeOpacity="0.45" />
      </g>
      {/* highlighted risk row */}
      <rect x="24" y="80" width="172" height="22" rx="6" fill="rgba(239,68,68,0.10)" stroke="rgba(239,68,68,0.35)" strokeWidth="1" />
      <line x1="34" y1="91" x2="146" y2="91" stroke="rgba(255,255,255,0.32)" strokeWidth="1.2" />
      <path d="M34 98 q4 3 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" stroke="rgba(239,68,68,0.6)" strokeWidth="1" fill="none" />
      <text x="168" y="94" fontSize="6" fontFamily={MONO} fill="rgba(252,165,165,0.85)" letterSpacing="0.5">RISK</text>
      {/* scanning beam */}
      <rect x="24" y="44" width="172" height="14" rx="4" fill="rgba(94,106,210,0.10)" className="bg-scan" />
    </svg>
  );
}

// DECISION (tall) — branching paths: one option chosen with confidence + evidence.
function GhostTree() {
  return (
    <svg viewBox="0 0 220 400" className="bento-ghost-svg bento-ghost--tree" preserveAspectRatio="xMidYMid meet">
      <GhostDefs id="gt" />
      <rect x="0" y="0" width="220" height="400" fill="url(#gt-dots)" />
      {/* brief chip */}
      <rect x="76" y="22" width="68" height="20" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <text x="110" y="35" fontSize="7" fontFamily={MONO} letterSpacing="1.5" fill="rgba(255,255,255,0.5)" textAnchor="middle">BRIEF</text>
      {/* trunk + branches */}
      <line x1="110" y1="42" x2="110" y2="88" stroke="rgba(255,255,255,0.16)" strokeWidth="1.1" />
      <path d="M110 88 C 110 118, 58 122, 58 152" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.1" strokeDasharray="3 4" />
      <path d="M110 88 C 110 118, 162 122, 162 152" fill="none" stroke="rgba(94,106,210,0.65)" strokeWidth="1.4" className="bg-draw" />
      {/* option A — dimmed */}
      <g opacity="0.55">
        <rect x="22" y="152" width="72" height="46" rx="9" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
        <text x="32" y="167" fontSize="6.5" fontFamily={MONO} letterSpacing="1" fill="rgba(255,255,255,0.4)">PATH A</text>
        <line x1="32" y1="177" x2="82" y2="177" stroke="rgba(255,255,255,0.14)" />
        <line x1="32" y1="186" x2="68" y2="186" stroke="rgba(255,255,255,0.09)" />
      </g>
      {/* option B — chosen */}
      <g>
        <rect x="126" y="148" width="76" height="54" rx="9" fill="url(#gt-panel)" stroke="rgba(94,106,210,0.55)" strokeWidth="1.1" />
        <text x="136" y="163" fontSize="6.5" fontFamily={MONO} letterSpacing="1" fill="rgba(197,203,255,0.95)">PATH B ✓</text>
        <line x1="136" y1="173" x2="192" y2="173" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <line x1="136" y1="182" x2="176" y2="182" stroke="rgba(255,255,255,0.13)" />
        <text x="136" y="196" fontSize="5.8" fontFamily={MONO} fill="rgba(255,255,255,0.35)">RECOMMENDED</text>
      </g>
      {/* confidence */}
      <text x="30" y="238" fontSize="6.5" fontFamily={MONO} letterSpacing="1.2" fill="rgba(255,255,255,0.4)">CONFIDENCE</text>
      <rect x="30" y="246" width="160" height="5" rx="2.5" fill="rgba(255,255,255,0.07)" />
      <rect x="30" y="246" width="132" height="5" rx="2.5" fill="rgba(94,106,210,0.65)" className="bg-progress" />
      <text x="196" y="252" fontSize="7" fontFamily={MONO} fill="rgba(197,203,255,0.9)" textAnchor="end">92%</text>
      {/* evidence rows */}
      <text x="30" y="282" fontSize="6.5" fontFamily={MONO} letterSpacing="1.2" fill="rgba(255,255,255,0.4)">EVIDENCE</text>
      {[296, 314, 332].map((y, i) => (
        <g key={y}>
          <rect x="30" y={y - 8} width="160" height="14" rx="4" fill={`rgba(255,255,255,${0.03 - i * 0.006})`} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
          <circle cx="39" cy={y - 1} r="2" fill="rgba(94,106,210,0.7)" />
          <line x1="47" y1={y - 1} x2={47 + [110, 92, 76][i]} y2={y - 1} stroke={`rgba(255,255,255,${0.2 - i * 0.05})`} strokeWidth="1.1" />
        </g>
      ))}
    </svg>
  );
}

// MESSAGE — generated client email: lines type themselves in, cursor blinks.
function GhostMessage() {
  return (
    <svg viewBox="0 0 220 172" className="bento-ghost-svg bento-ghost--bubbles">
      <GhostDefs id="gm" />
      <rect x="0" y="0" width="220" height="172" fill="url(#gm-dots)" />
      {/* to-client pill */}
      <rect x="16" y="10" width="96" height="18" rx="9" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
      <circle cx="27" cy="19" r="3" fill="rgba(94,106,210,0.7)" />
      <text x="35" y="22" fontSize="6.5" fontFamily={MONO} letterSpacing="1" fill="rgba(255,255,255,0.45)">TO CLIENT</text>
      {/* email panel */}
      <rect x="16" y="38" width="188" height="94" rx="12" fill="url(#gm-panel)" stroke="rgba(94,106,210,0.3)" strokeWidth="1" />
      <line x1="30" y1="56" x2="176" y2="56" stroke="rgba(255,255,255,0.3)" strokeWidth="1.3" className="bg-type" style={{ transformOrigin: "30px 56px" }} />
      <line x1="30" y1="72" x2="156" y2="72" stroke="rgba(255,255,255,0.16)" strokeWidth="1.2" className="bg-type bg-type-2" style={{ transformOrigin: "30px 72px" }} />
      <line x1="30" y1="88" x2="140" y2="88" stroke="rgba(255,255,255,0.16)" strokeWidth="1.2" className="bg-type bg-type-3" style={{ transformOrigin: "30px 88px" }} />
      {/* signature scribble + cursor */}
      <path d="M30 110 q5 -7 10 0 t10 0 t10 -2" stroke="rgba(94,106,210,0.6)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <rect x="66" y="103" width="1.6" height="10" fill="rgba(197,203,255,0.9)" className="bg-cursor" />
      {/* send pill */}
      <g transform="translate(150, 142)">
        <rect x="0" y="0" width="54" height="20" rx="10" fill="rgba(94,106,210,0.30)" stroke="rgba(94,106,210,0.6)" strokeWidth="1" className="bg-glowpulse" />
        <text x="27" y="13.5" fontSize="7" fontWeight="700" fontFamily={MONO} fill="rgba(255,255,255,0.9)" textAnchor="middle">SEND →</text>
      </g>
    </svg>
  );
}

// SPEED (wide) — five-step timeline with a travelling light pulse.
function GhostTimeline() {
  const steps = [
    { x: 28, label: "PASTE" },
    { x: 102, label: "FRAMING" },
    { x: 176, label: "CONTEXT" },
    { x: 250, label: "DECISION" },
    { x: 324, label: "SIGN" },
  ];
  return (
    <svg viewBox="0 0 380 110" className="bento-ghost-svg bento-ghost--timeline" preserveAspectRatio="xMidYMid meet">
      <GhostDefs id="gl" />
      <rect x="0" y="0" width="380" height="110" fill="url(#gl-dots)" />
      {/* time chip */}
      <rect x="298" y="8" width="66" height="17" rx="8.5" fill="rgba(94,106,210,0.14)" stroke="rgba(94,106,210,0.4)" strokeWidth="0.8" />
      <text x="331" y="19" fontSize="6.8" fontFamily={MONO} letterSpacing="1" fill="rgba(197,203,255,0.9)" textAnchor="middle">&lt; 60 SEC</text>
      <g fill="none">
        <line x1="20" y1="62" x2="360" y2="62" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        <line x1="20" y1="62" x2="332" y2="62" stroke="rgba(94,106,210,0.55)" strokeWidth="1.6" className="bento-ghost-progress" />
        {/* travelling pulse */}
        <circle r="3.4" cy="62" fill="rgba(197,203,255,0.95)" className="bg-comet">
          <animate attributeName="cx" values="20;332;332" keyTimes="0;0.7;1" dur="3.6s" repeatCount="indefinite" calcMode="spline" keySplines="0.16 1 0.3 1;0 0 1 1" />
        </circle>
        <circle r="9" cy="62" fill="url(#gl-glow)">
          <animate attributeName="cx" values="20;332;332" keyTimes="0;0.7;1" dur="3.6s" repeatCount="indefinite" calcMode="spline" keySplines="0.16 1 0.3 1;0 0 1 1" />
        </circle>
        {steps.map((s, i) => (
          <g key={s.label} transform={`translate(${s.x}, 62)`}>
            <circle r={i === 4 ? 6 : 4} fill={i <= 3 ? "rgba(94,106,210,0.65)" : "rgba(255,255,255,0.14)"} stroke={i === 4 ? "rgba(94,106,210,0.7)" : "none"} strokeWidth={i === 4 ? 1.2 : 0} />
            <text y="24" fontSize="7" fontFamily={MONO} fill={i <= 3 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)"} textAnchor="middle" letterSpacing="0.5">{s.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// LOCK — signed approval: signature draws itself, dashed seal slowly rotates.
function GhostSigned() {
  return (
    <svg viewBox="0 0 220 172" className="bento-ghost-svg bento-ghost--signed">
      <GhostDefs id="gd" />
      <rect x="0" y="0" width="220" height="172" fill="url(#gd-dots)" />
      <rect x="20" y="10" width="126" height="148" rx="10" fill="url(#gd-panel)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <text x="34" y="30" fontSize="7" fontFamily={MONO} letterSpacing="1.2" fill="rgba(94,106,210,0.85)">SIGN-OFF · V1</text>
      <line x1="34" y1="40" x2="132" y2="40" stroke="rgba(255,255,255,0.14)" strokeWidth="1.1" />
      <g stroke="rgba(255,255,255,0.09)" strokeWidth="1">
        <line x1="34" y1="56" x2="120" y2="56" />
        <line x1="34" y1="68" x2="128" y2="68" />
        <line x1="34" y1="80" x2="104" y2="80" />
      </g>
      {/* signature draws in */}
      <line x1="34" y1="112" x2="112" y2="112" stroke="rgba(255,255,255,0.18)" />
      <path d="M36 106 q7 -10 14 0 t14 0 t14 -4 t16 4" stroke="rgba(94,106,210,0.75)" strokeWidth="1.5" strokeLinecap="round" fill="none" className="bg-sign" />
      <text x="34" y="126" fontSize="6" fontFamily={MONO} letterSpacing="0.8" fill="rgba(255,255,255,0.35)">SIGNED BY CLIENT</text>
      {/* accepted chip */}
      <rect x="34" y="134" width="62" height="14" rx="7" fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.35)" strokeWidth="0.8" />
      <text x="65" y="143.5" fontSize="6" fontFamily={MONO} letterSpacing="1" fill="rgba(134,239,172,0.9)" textAnchor="middle">ACCEPTED</text>
      {/* seal */}
      <g transform="translate(178, 116)">
        <circle r="26" fill="url(#gd-glow)" opacity="0.7" />
        <circle r="21" fill="rgba(8,9,10,0.5)" stroke="rgba(94,106,210,0.55)" strokeWidth="1" />
        <circle r="15" fill="none" stroke="rgba(94,106,210,0.35)" strokeDasharray="3 3.5" className="bg-slowspin" style={{ transformOrigin: "0px 0px", transformBox: "fill-box" }} />
        <path d="M-7 0 l5 5 l10 -10" stroke="rgba(197,203,255,0.95)" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// ─── SECTION 4b: OUR STORY (timeline — origin → mistakes → now → future) ─
const STORY = [
  {
    chapter: "01 · ORIGIN",
    year: "Aug 2025",
    title: "Bracket started at 3am.",
    body:
      "A messy client brief lands in your inbox. Hours disappear trying to understand the scope, price the work, and write the perfect response. We built Bracket to compress that entire process into minutes — for anyone who works with clients.",
    accent: "#5E6AD2",
  },
  {
    chapter: "02 · MISTAKES",
    year: "Oct → Dec 2025",
    title: "We tried to be another writing tool.",
    body:
      "Version one generated better documents. The problem wasn't writing — it was deciding. We rebuilt Bracket around one question: \u201CWhat would the most experienced person in the room do next?\u201D",
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
    <section className="relative py-28 md:py-36 overflow-x-clip isolate" data-testid="landing-story" id="story">
      {/* Soft signal-blue wash — extended above the section top and below
         the section bottom so it visually bleeds into the neighbouring
         sections. Parallax-drifts on scroll for Awwwards-style depth. */}
      <ParallaxGlow
        distance={40}
        className="absolute inset-x-0 mx-auto h-[900px] w-[900px] blur-[120px] opacity-[0.16] -z-10"
        style={{
          bottom: "-300px",
          background: "radial-gradient(closest-side, #5E6AD2, transparent 70%)",
        }}
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
  // Duplicate the array 4× so the CSS marquee (translateX -50%) loops
  // seamlessly with no blank space even on ultrawide/4K viewports — one
  // half of the track (2 copies) is always wider than the widest screen.
  const track = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="relative py-28 md:py-36 overflow-x-clip isolate" data-testid="landing-testimonials" id="testimonials">
      {/* Opaque backdrop bleeding into neighbours — sits BELOW the blue wash
          (-z-20 vs -z-10) so the glow stays visible on top of it. */}
      <SectionBleed className="-z-20" />
      {/* Signal-blue centre wash — extended vertically so it kisses both
         the story section above and overlaps deep into the pricing amber
         below (soft blue→amber colour blend, no visible seam). Parallax. */}
      <ParallaxGlow
        distance={40}
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[1400px] w-[900px] blur-[120px] opacity-[0.14] -z-10"
        style={{ background: "radial-gradient(closest-side, #5E6AD2, transparent 70%)" }}
      />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10">
        <SectionHeading
          tag="FROM THE FIELD"
          title="Better decisions. Better client projects."
          center
        />
      </div>
      {/* Marquee row — full-bleed, continuous. */}
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
    <section className="relative py-28 md:py-36 overflow-x-clip isolate" data-testid="landing-pricing" id="pricing">
      {/* Opaque backdrop bleeding into neighbours — below the amber wash. */}
      <SectionBleed className="-z-20" />
      {/* Amber wash — pulled UP past the section top so it overlaps the
         testimonials blue for a soft colour transition (no visible seam). */}
      <ParallaxGlow
        distance={45}
        className="absolute inset-x-0 mx-auto h-[1400px] w-[900px] blur-[120px] opacity-[0.22] -z-10"
        style={{
          top: "-400px",
          background: "radial-gradient(closest-side, #FFB84C, transparent 70%)",
        }}
      />
      <FilmGrain opacity={0.05} fadeTop fadeBottom />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 relative">
        <SectionHeading
          tag="PRICING"
          title="Choose the way you work."
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
          Every plan includes unlimited pastes, AI project understanding and secure cloud storage.
        </p>
      </div>
    </section>
  );
}

function PricingCard({ tier, price, symbol, popular }) {
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
        {tier.bestFor && (
          <p
            className="mt-3 inline-flex self-start items-center gap-1.5 px-2 py-1 rounded-full text-[10.5px] tracking-[0.02em] uppercase font-mono"
            style={{
              background: popular ? "rgba(255,184,76,0.10)" : "rgba(94,106,210,0.10)",
              color: popular ? "#FFB84C" : "var(--accent)",
              border: `1px solid ${popular ? "rgba(255,184,76,0.25)" : "rgba(94,106,210,0.25)"}`,
            }}
          >
            {tier.bestFor}
          </p>
        )}
        <div className="mt-6 flex items-baseline gap-2.5">
          {price !== 0 && (
            <span
              className="font-display font-semibold text-[26px] leading-none tracking-[-0.02em] line-through text-[var(--text-3)]"
              data-testid={`pricing-old-price-${tier.id}`}
            >
              {symbol}{price}
            </span>
          )}
          <span className="font-display font-semibold text-[56px] leading-none tracking-[-0.03em]">
            {price === 0 ? "Free" : `${symbol}0`}
          </span>
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
    <section className="relative py-32 md:py-40 overflow-x-clip isolate" data-testid="landing-final-cta">
      {/* Blue-violet radial — parallax-drifts and bleeds into pricing above. */}
      <ParallaxGlow
        distance={35}
        className="absolute inset-x-0 -z-10 opacity-40 mx-auto w-[1200px]"
        style={{
          top: "-300px",
          bottom: "-200px",
          background: "radial-gradient(60% 40% at 50% 45%, rgba(94,106,210,0.18), transparent 70%)",
        }}
      />
      <FilmGrain opacity={0.08} fadeTop />

      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mono-tag text-signal inline-flex items-center gap-2"
        >
          <Zap size={12} /> YOUR NEXT CLIENT STARTS HERE
        </motion.p>

        <h2 className="mt-6 font-display font-semibold italic tracking-[-0.02em] leading-[1.05] text-[36px] sm:text-[48px] md:text-[60px] lg:text-[72px] text-[var(--text)]">
          <WordReveal text="Paste the mess." tag="span" />
          <br />
          <span className="landing-hero-gradient">
            <WordReveal text="We'll handle the rest." tag="span" delayBase={2} />
          </span>
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
          className="mt-10 max-w-[600px] mx-auto text-[15px] sm:text-base text-[var(--text-2)] leading-relaxed"
        >
          Paste one email, WhatsApp chat or meeting note. Bracket turns it into scope,
          deliverables, risks, decisions and client-ready documentation — in under a minute.
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
          FREE DURING EARLY ACCESS · NO CREDIT CARD · UNDER 60 SECONDS
        </p>

        {/* Product Hunt embed — restyled as a Bracket dark card */}
        <ProductHuntCard />
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

  // Acquisition tracking moved to `useAnalyticsTracker` in App.js so it
  // fires on every route, not just the landing page.

  return (
    <>
      <Seo
        title="Bracket — The AI Decision Workspace for Client Projects"
        description="Bracket is the AI decision workspace and decision OS for client projects. Turn messy client conversations into scoped, decisioned, client-ready projects in under a minute."
        path="/"
      />
      {/* Single seamless page background — soft, near-black vertical gradient
          that flows the whole scroll. Per-section backgrounds only add subtle
          radial washes on top of this base, so no more abrupt cuts. */}
      <div className="landing-page-bg" data-testid="landing-page-root">
        <Hero />
        <Showcase />
        <Bento />
        <Story />
        <Testimonials />
        <PricingSection />
        <FinalCTA />
      </div>
    </>
  );
}
