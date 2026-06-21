// Brutalist mono avatars rendered as SVG. 12 presets with brand-aligned colors.
// Render with <Avatar id="mono-3" size={32} initial="A" />.

export const AVATARS = [
  { id: "mono-1", bg: "#0A0A0A", fg: "#F4F4F0", label: "Ink" },
  { id: "mono-2", bg: "#F4F4F0", fg: "#0A0A0A", label: "Paper", border: true },
  { id: "mono-3", bg: "#0033FF", fg: "#F4F4F0", label: "Signal" },
  { id: "mono-4", bg: "#D02620", fg: "#F4F4F0", label: "Danger" },
  { id: "mono-5", bg: "#0A0A0A", fg: "#0033FF", label: "Ink/Signal" },
  { id: "mono-6", bg: "#0033FF", fg: "#0A0A0A", label: "Signal/Ink" },
  { id: "mono-7", bg: "#F4F4F0", fg: "#0033FF", label: "Paper/Signal", border: true },
  { id: "mono-8", bg: "#D02620", fg: "#0A0A0A", label: "Danger/Ink" },
  { id: "mono-9", bg: "#0A0A0A", fg: "#D02620", label: "Ink/Danger" },
  { id: "mono-10", bg: "#525252", fg: "#F4F4F0", label: "Stone" },
  { id: "mono-11", bg: "#F4F4F0", fg: "#525252", label: "Paper/Stone", border: true },
  { id: "mono-12", bg: "#0033FF", fg: "#F4F4F0", label: "Signal · stripe", stripe: true },
];

export function getAvatar(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}

export default function Avatar({ id = "mono-1", size = 32, initial = "B", className = "" }) {
  const a = getAvatar(id);
  const letter = (initial || "B").trim().charAt(0).toUpperCase() || "B";
  return (
    <span
      className={`inline-flex items-center justify-center font-display select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: a.bg,
        color: a.fg,
        border: a.border ? "1px solid #0A0A0A" : "1px solid transparent",
        fontSize: Math.round(size * 0.46),
        lineHeight: 1,
        position: "relative",
        overflow: "hidden",
      }}
      aria-label={`Avatar ${a.label}`}
      data-testid={`avatar-${id}`}
    >
      {a.stripe && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,0.18) 4px 6px)",
            pointerEvents: "none",
          }}
        />
      )}
      <span style={{ position: "relative", fontWeight: 900, letterSpacing: "-0.04em" }}>
        {letter}
      </span>
    </span>
  );
}
