import React from "react";

// Stylised "Bracket" mark — a black rounded square containing { B }
export default function BracketMark({ size = 28, label = true, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} data-testid="bracket-logo">
      <span
        aria-hidden
        className="inline-flex items-center justify-center bg-ink text-chalk font-mono font-bold"
        style={{ width: size, height: size, fontSize: size * 0.6 }}
      >
        {"{"}
        <span className="font-display" style={{ fontSize: size * 0.6, lineHeight: 1 }}>
          B
        </span>
        {"}"}
      </span>
      {label && (
        <span className="font-display text-[20px] tracking-tight text-ink" style={{ lineHeight: 1 }}>
          Bracket
        </span>
      )}
    </span>
  );
}
