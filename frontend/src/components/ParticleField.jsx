import React, { useEffect, useRef } from "react";

/**
 * ParticleField — a living halftone. Particles are seeded from the brightness
 * of a source image so a form (the sculptural skull) emerges, then each one
 * drifts and swirls through a curl-like flow field while a soft spring tugs it
 * back toward its home cell. The result is constant, wind-blown particle motion
 * that never dissolves the underlying shape. Denser/brighter to the right,
 * fading into pure black on the left.
 */
const SOURCE = "/halftone-source.png";
const GRID = 8; // px between seed points

export default function ParticleField({ className = "", style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0,
      H = 0,
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    let parts = [];
    let raf = 0;
    const startT = performance.now();

    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });
    const img = new Image();
    let imgReady = false;

    const rebuild = () => {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (imgReady) seed();
    };

    const seed = () => {
      const cols = Math.ceil(W / GRID);
      const rows = Math.ceil(H / GRID);
      sampler.width = cols;
      sampler.height = rows;
      const ir = img.width / img.height;
      const gr = cols / rows;
      let sw, sh, sx, sy;
      if (ir > gr) {
        sh = img.height;
        sw = sh * gr;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        sw = img.width;
        sh = sw / gr;
        sx = 0;
        sy = (img.height - sh) / 2;
      }
      sctx.clearRect(0, 0, cols, rows);
      sctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
      const data = sctx.getImageData(0, 0, cols, rows).data;

      parts = [];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const i = (gy * cols + gx) * 4;
          const lum =
            (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          if (lum < 0.07) continue;
          const hx = gx * GRID + GRID / 2;
          const hy = gy * GRID + GRID / 2;
          parts.push({
            hx,
            hy,
            x: hx,
            y: hy,
            vx: 0,
            vy: 0,
            l: lum,
            phase: (gx * 0.6 + gy * 0.9) % (Math.PI * 2),
            diamond: lum > 0.6 && ((gx + gy) & 1) === 0,
          });
        }
      }
    };

    // flow-field tuning
    const FLOW = 0.24; // strength of the wind
    const SPRING = 0.032; // pull back toward home (keeps the form readable)
    const DAMP = 0.9;

    const draw = (now) => {
      const t = (now - startT) / 1000;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      for (let k = 0; k < parts.length; k++) {
        const p = parts[k];
        if (!reduce) {
          // curl-like flow angle from layered sines
          const a =
            (Math.sin(p.x * 0.012 + t * 0.5) +
              Math.cos(p.y * 0.014 - t * 0.4) +
              Math.sin((p.x + p.y) * 0.008 + t * 0.3)) *
            1.7;
          p.vx += Math.cos(a) * FLOW + (p.hx - p.x) * SPRING;
          p.vy += Math.sin(a) * FLOW + (p.hy - p.y) * SPRING;
          p.vx *= DAMP;
          p.vy *= DAMP;
          p.x += p.vx;
          p.y += p.vy;
        }

        const shimmer = reduce ? 1 : 0.75 + 0.25 * Math.sin(t * 1.4 + p.phase);
        const size = 0.9 + p.l * 3.0;
        const alpha = Math.min(1, (0.26 + p.l * 0.85) * shimmer);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.l > 0.7 ? "#eef0f4" : "#c7c9d2";

        if (p.diamond) {
          const r = size * 0.72;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x + r, p.y);
          ctx.lineTo(p.x, p.y + r);
          ctx.lineTo(p.x - r, p.y);
          ctx.closePath();
          ctx.fill();
        } else {
          const s = size;
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    img.onload = () => {
      imgReady = true;
      rebuild();
      if (reduce) draw(performance.now());
      else raf = requestAnimationFrame(draw);
    };
    img.src = SOURCE;

    let ro;
    let roRaf = 0;
    let lastW = 0,
      lastH = 0;
    const onResize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(rebuild);
    };
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", onResize);
    }

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(roRaf);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", background: "#000", ...style }}
      aria-hidden="true"
    />
  );
}
