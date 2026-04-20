import React, { useEffect, useState, useRef } from "react";

/*
 * Demo animation slot for the waitlist page.
 *
 * PRIORITY:
 *   1. If `videoUrl` prop (or REACT_APP_DEMO_VIDEO_URL env) is set → render a <video>.
 *   2. If `embedUrl` prop is set (YouTube / Loom / Vimeo) → render an <iframe>.
 *   3. Otherwise → show the default "decision flow" terminal animation.
 */

const STAGES = [
  {
    label: "01 · SITUATION FRAMING",
    input: "Client says: \"Make it pop. More premium. Bolder but cleaner.\"",
    output: "Reframed: The client is asking for confidence. Not a style.",
  },
  {
    label: "02 · CONTEXT COMPRESSION",
    input: "Requirements.pdf, Slack thread, inspo board, 3 competitor sites…",
    output: "Keep: merchandising hierarchy. Discard: everything else.",
  },
  {
    label: "03 · DECISION ENGINE",
    input: "Optimising for: trust. Trade-off: visual polish vs. scannability.",
    output: "Recommendation: lead with clarity. Confidence — 87%.",
  },
  {
    label: "04 · ARTIFACTS",
    input: "Generating: scope doc, client message, assumptions, risk flags…",
    output: "4 documents. Ready to send. In your voice.",
  },
  {
    label: "05 · CONFIDENCE LOCK-IN",
    input: "Locking decision. Tracking future changes.",
    output: "Locked. Now go do the work.",
  },
];

function useTypewriter(text, speed = 18, startDelay = 0) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    let cancelled = false;
    const start = setTimeout(() => {
      const step = () => {
        if (cancelled) return;
        i += 1;
        setOut(text.slice(0, i));
        if (i < text.length) setTimeout(step, speed);
      };
      step();
    }, startDelay);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [text, speed, startDelay]);
  return out;
}

export default function DemoPlayer({ videoUrl, embedUrl, poster }) {
  const envVideo = process.env.REACT_APP_DEMO_VIDEO_URL;
  const resolvedVideo = videoUrl || envVideo;

  if (resolvedVideo) {
    return (
      <div className="border border-ink bg-ink shadow-brut aspect-video overflow-hidden" data-testid="demo-player-video">
        <video
          src={resolvedVideo}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (embedUrl) {
    return (
      <div className="border border-ink bg-ink shadow-brut aspect-video overflow-hidden" data-testid="demo-player-embed">
        <iframe
          src={embedUrl}
          title="Bracket demo"
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return <DecisionFlowAnimation />;
}

function DecisionFlowAnimation() {
  const [stageIdx, setStageIdx] = useState(0);
  const [phase, setPhase] = useState("in"); // in → out
  const stage = STAGES[stageIdx];
  const inputLine = useTypewriter(phase === "in" ? stage.input : stage.input, 14, 200);
  const outputLine = useTypewriter(phase === "out" ? stage.output : "", 12, 200);
  const timerRef = useRef();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (phase === "in") {
      // Wait for input to finish typing, then transform.
      const d = stage.input.length * 14 + 900;
      timerRef.current = setTimeout(() => setPhase("out"), d);
    } else {
      const d = stage.output.length * 12 + 1200;
      timerRef.current = setTimeout(() => {
        setPhase("in");
        setStageIdx((i) => (i + 1) % STAGES.length);
      }, d);
    }
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stageIdx]);

  return (
    <div
      className="relative border border-ink bg-ink text-chalk overflow-hidden shadow-brut"
      style={{ boxShadow: "6px 6px 0 #0033FF" }}
      data-testid="demo-player-animation"
    >
      {/* faux window chrome */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-chalk/10">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-chalk/30" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-chalk/30" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.22em] text-chalk/50">BRACKET · LIVE PREVIEW</span>
        <span className="font-mono text-[10px] tracking-[0.22em] text-signal">● REC</span>
      </div>

      {/* stage progress */}
      <div className="flex border-b border-chalk/10">
        {STAGES.map((s, i) => (
          <div
            key={s.label}
            className={`flex-1 px-3 py-2 text-[9px] font-mono tracking-[0.18em] uppercase text-center border-r border-chalk/10 last:border-r-0 transition-colors ${i === stageIdx ? "bg-signal text-chalk" : i < stageIdx ? "text-chalk/60" : "text-chalk/30"}`}
          >
            {String(i + 1).padStart(2, "0")}
          </div>
        ))}
      </div>

      <div className="p-6 md:p-8 min-h-[260px] md:min-h-[300px] flex flex-col justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-signal">{stage.label}</p>

          <div className="mt-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-chalk/40 uppercase">INPUT</p>
            <p className="mt-2 font-mono text-sm md:text-base text-chalk leading-relaxed break-words" data-testid="demo-input-line">
              {inputLine}
              {phase === "in" && <span className="inline-block w-[10px] h-[1em] align-[-2px] bg-signal animate-[blink_1s_steps(2,start)_infinite] ml-1" />}
            </p>
          </div>

          <div className="mt-6 min-h-[70px]">
            <p className="font-mono text-[10px] tracking-[0.2em] text-chalk/40 uppercase">{phase === "out" ? "OUTPUT" : "…"}</p>
            {phase === "out" && (
              <p className="mt-2 font-display text-xl md:text-2xl leading-tight text-signal" data-testid="demo-output-line">
                {outputLine}
                <span className="inline-block w-[10px] h-[1em] align-[-2px] bg-signal animate-[blink_1s_steps(2,start)_infinite] ml-1" />
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-chalk/10">
          <span className="font-mono text-[10px] tracking-[0.22em] text-chalk/40">
            {"{ decision.run() }"}
          </span>
          <span className="font-mono text-[10px] tracking-[0.22em] text-chalk/60">
            CONFIDENCE · {Math.round(((stageIdx + (phase === "out" ? 1 : 0.5)) / STAGES.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
