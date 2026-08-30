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
        ink:    "#F4F4F5",  // legacy "text-ink" / "bg-ink" → now primary text / elevated surface
        paper:  "#111111",  // legacy page background → near-black
        chalk:  "#181818",  // legacy "white" surface → secondary surface
        muted:  "#A1A1AA",  // secondary text
        faint:  "#71717A",  // muted text
        signal: "#8184C4",  // accent (muted violet — matches CSS var --accent)
        signalHover: "#989BE0",
        danger: "#D95757",
        safe:   "#52A874",
        background: "#111111",
        foreground: "#F4F4F5",
        border:     "rgba(255,255,255,0.08)",
        input:      "#222222",
        ring:       "#8184C4",
        primary:     { DEFAULT: "#F4F4F5", foreground: "#111111" },
        secondary:   { DEFAULT: "#181818", foreground: "#F4F4F5" },
        destructive: { DEFAULT: "#D95757", foreground: "#F4F4F5" },
        accent:      { DEFAULT: "#8184C4", foreground: "#111111" },
        popover:     { DEFAULT: "#181818", foreground: "#F4F4F5" },
        card:        { DEFAULT: "#181818", foreground: "#F4F4F5" },
        muted_:      { DEFAULT: "#222222", foreground: "#A1A1AA" },
        // Linear-style surface scale (use in any new code instead of legacy names)
        surface:   "#111111",
        surface2:  "#181818",
        surface3:  "#222222",
        hairline:  "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["'Geist'", "sans-serif"],
        body:    ["'Geist'", "sans-serif"],
        mono:    ["'Geist Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: { none: "0", DEFAULT: "6px", sm: "4px", md: "6px", lg: "6px", xl: "6px", "2xl": "6px", "3xl": "6px", full: "9999px" },
      boxShadow: {
        // Flat Linear system — no elevation, depth via hairline borders only
        sm: "none", DEFAULT: "none", md: "none", lg: "none", xl: "none", "2xl": "none", inner: "none", none: "none",
        brut:       "none",
        brutLg:     "none",
        brutBlue:   "none",
        brutDanger: "none",
      },
      dropShadow: {
        sm: "0 0 #0000", DEFAULT: "0 0 #0000", md: "0 0 #0000", lg: "0 0 #0000", xl: "0 0 #0000", "2xl": "0 0 #0000", none: "0 0 #0000",
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
