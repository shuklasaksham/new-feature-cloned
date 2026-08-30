import React, { useEffect, useRef } from "react";

/**
 * ParticleField — an animated halftone-style dot field on black, echoing the
 * static right-panel visual. Small diamonds drift and twinkle, denser and
 * brighter toward the right edge, fading into black on the left so it blends
 * into the form column.
 */
export default function ParticleField({ className = "", style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let raf = 0;
    let start = performance.now();

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(1500, Math.max(300, Math.floor((W * H) / 1300)));
      particles = new Array(count).fill(0).map(() => {
        // bias x toward the right so the left third stays dark
        const rx = Math.pow(Math.random(), 0.6);
        const x = W * (0.18 + 0.82 * rx);
        return {
          x,
          y: Math.random() * H,
          s: Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1.4,
          drift: 0.05 + Math.random() * 0.25,
          dx: (Math.random() - 0.5) * 0.08,
          phase: Math.random() * Math.PI * 2,
          tw: 0.6 + Math.random() * 1.6,
          base: 0.12 + Math.random() * 0.55,
        };
      });
    };

    const draw = (now) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reduce) {
          p.y -= p.drift;
          p.x += p.dx;
          if (p.y < -4) { p.y = H + 4; }
          if (p.x < -4) p.x = W + 4;
          if (p.x > W + 4) p.x = -4;
        }
        // left-edge fade + right-edge emphasis
        const edge = Math.min(1, Math.max(0, (p.x / W - 0.12) / 0.5));
        const flicker = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * p.tw + p.phase);
        const a = p.base * edge * flicker;
        if (a <= 0.02) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = "#d7d7e0";
        const s = p.s;
        // draw as a small diamond
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(0.785398);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    build();
    if (reduce) {
      draw(performance.now());
    } else {
      raf = requestAnimationFrame(draw);
    }

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => { build(); });
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", build);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener("resize", build);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ display: "block", width: "100%", height: "100%", ...style }} aria-hidden="true" />;
}
