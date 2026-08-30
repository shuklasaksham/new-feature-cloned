import React, { useEffect, useRef } from "react";

/**
 * ParticleField — a halftone dot-matrix that traces the brightness of a source
 * image into a grid of tiny glyphs (dots, diamonds and the occasional "x").
 * A form emerges from the dots: dense/bright toward the right, dissolving into
 * pure black on the left. The whole field breathes very slowly and each glyph
 * shimmers subtly, so it feels alive without ever pulling focus.
 */
const SOURCE = "/halftone-source.png";
const GRID = 7; // px between glyph centers (device-independent)

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
    let cells = []; // sampled halftone cells
    let raf = 0;
    const startT = performance.now();

    // offscreen buffer holding the downsampled source brightness
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
      if (imgReady) sample();
    };

    const sample = () => {
      const cols = Math.ceil(W / GRID);
      const rows = Math.ceil(H / GRID);
      // draw the image into the sampler at grid resolution using "cover" fit
      sampler.width = cols;
      sampler.height = rows;
      const ir = img.width / img.height;
      const gr = cols / rows;
      let sw, sh, sx, sy;
      if (ir > gr) {
        // image wider than grid -> crop sides, keep full height
        sh = img.height;
        sw = sh * gr;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        // image taller than grid -> crop top/bottom, keep full width
        sw = img.width;
        sh = sw / gr;
        sx = 0;
        sy = (img.height - sh) / 2;
      }
      sctx.clearRect(0, 0, cols, rows);
      sctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
      const data = sctx.getImageData(0, 0, cols, rows).data;

      cells = [];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const i = (gy * cols + gx) * 4;
          // perceived luminance of the source pixel
          const lum =
            (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          if (lum < 0.06) continue; // skip near-black cells (keeps left column empty)
          // slight positional jitter so the grid doesn't read as a rigid lattice
          const jx = (Math.sin((gx * 12.9898 + gy * 78.233)) * 43758.5453) % 1;
          const jy = (Math.sin((gx * 39.346 + gy * 11.135)) * 24634.6345) % 1;
          const glyphSeed = Math.abs(Math.sin(gx * 7.17 + gy * 3.53));
          cells.push({
            x: gx * GRID + GRID / 2 + (jx - 0.5) * 1.6,
            y: gy * GRID + GRID / 2 + (jy - 0.5) * 1.6,
            l: lum,
            phase: (gx * 0.6 + gy * 0.9) % (Math.PI * 2),
            glyph: glyphSeed > 0.93 ? "x" : lum > 0.55 ? "diamond" : "dot",
          });
        }
      }
    };

    const draw = (now) => {
      const t = (now - startT) / 1000;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      // global slow breathing of the whole field
      const breathe = reduce ? 1 : 1 + 0.12 * Math.sin(t * 0.35);

      for (let k = 0; k < cells.length; k++) {
        const c = cells[k];
        const shimmer = reduce ? 1 : 0.78 + 0.22 * Math.sin(t * 1.1 + c.phase);
        // dot size driven by source brightness (halftone), gently breathing
        const size = Math.min(GRID * 0.95, (0.9 + c.l * 3.1) * breathe);
        if (size < 0.4) continue;
        const alpha = Math.min(1, (0.28 + c.l * 0.85) * shimmer);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = c.l > 0.7 ? "#eef0f4" : "#c7c9d2";
        ctx.strokeStyle = "#c7c9d2";

        if (c.glyph === "x") {
          const r = size * 0.7;
          ctx.lineWidth = Math.max(0.6, size * 0.28);
          ctx.beginPath();
          ctx.moveTo(c.x - r, c.y - r);
          ctx.lineTo(c.x + r, c.y + r);
          ctx.moveTo(c.x + r, c.y - r);
          ctx.lineTo(c.x - r, c.y + r);
          ctx.stroke();
        } else if (c.glyph === "diamond") {
          const r = size * 0.72;
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-r / 2, -r / 2, r, r);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(c.x, c.y, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
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
      if (w === lastW && h === lastH) return; // avoid RO feedback loop
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
