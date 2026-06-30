/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        // Bracket × Linear dark tokens (semantic, not literal)
        // The legacy class names (bg-paper, text-ink, border-ink, etc.) are
        // remapped to dark surfaces so every existing className adopts the
        // new theme without JSX changes.
        ink:    "#F3F4F6",  // legacy "text-ink" / "bg-ink" → now primary text / elevated surface
        paper:  "#09090B",  // legacy page background → near-black
        chalk:  "#16181D",  // legacy "white" surface → secondary surface
        muted:  "#9CA3AF",  // secondary text
        faint:  "#6B7280",  // muted text
        signal: "#7C5CFF",  // accent (violet, replaces blue)
        signalHover: "#6B4AE6",
        danger: "#EF4444",
        safe:   "#22C55E",
        background: "#09090B",
        foreground: "#F3F4F6",
        border:     "#262A36",
        input:      "#16181D",
        ring:       "#7C5CFF",
        primary:     { DEFAULT: "#F3F4F6", foreground: "#09090B" },
        secondary:   { DEFAULT: "#16181D", foreground: "#F3F4F6" },
        destructive: { DEFAULT: "#EF4444", foreground: "#F3F4F6" },
        accent:      { DEFAULT: "#7C5CFF", foreground: "#F3F4F6" },
        popover:     { DEFAULT: "#1B1D23", foreground: "#F3F4F6" },
        card:        { DEFAULT: "#111113", foreground: "#F3F4F6" },
        muted_:      { DEFAULT: "#1B1D23", foreground: "#9CA3AF" },
        // Linear-style surface scale (use in any new code instead of legacy names)
        surface:   "#111113",
        surface2:  "#16181D",
        surface3:  "#1B1D23",
        hairline:  "#262A36",
      },
      fontFamily: {
        display: ["'Inter Variable'", "'Inter'", "sans-serif"],
        body:    ["'Inter Variable'", "'Inter'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: { none: "0", DEFAULT: "6px", sm: "4px", md: "8px", lg: "10px", xl: "14px", "2xl": "18px" },
      boxShadow: {
        // Replace all hard brutalist shadows with the new soft Linear stack
        brut:       "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)",
        brutLg:     "0 2px 4px rgba(0,0,0,0.45), 0 18px 40px -16px rgba(0,0,0,0.7)",
        brutBlue:   "0 1px 2px rgba(0,0,0,0.4), 0 10px 28px -12px rgba(124,92,255,0.35)",
        brutDanger: "0 1px 2px rgba(0,0,0,0.4), 0 10px 28px -12px rgba(239,68,68,0.35)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both",
        marquee: "marquee 38s linear infinite",
        blink: "blink 1s steps(2, start) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
