import {
  Mail,
  Slack,
  MessageCircle,
  Users,
  Figma,
  Palette,
  HardDrive,
  NotebookText,
  Package,
  Github,
  Layers,
} from "lucide-react";

export const PROVIDER_META = {
  gmail:    { label: "Gmail",           icon: Mail,          color: "#EA4335" },
  slack:    { label: "Slack",           icon: Slack,         color: "#E01E5A" },
  whatsapp: { label: "WhatsApp",        icon: MessageCircle, color: "#25D366" },
  teams:    { label: "Microsoft Teams", icon: Users,         color: "#6264A7" },
  figma:    { label: "Figma",           icon: Figma,         color: "#A259FF" },
  adobe:    { label: "Adobe",           icon: Palette,       color: "#FF3B30" },
  gdrive:   { label: "Google Drive",    icon: HardDrive,     color: "#4285F4" },
  notion:   { label: "Notion",          icon: NotebookText,  color: "#E8E7E4" },
  dropbox:  { label: "Dropbox",         icon: Package,       color: "#0061FF" },
  github:   { label: "GitHub",          icon: Github,        color: "#E6EDF3" },
  linear:   { label: "Linear",          icon: Layers,        color: "#5E6AD2" },
};

export function ProviderIcon({ provider, size = 16 }) {
  const meta = PROVIDER_META[provider] || {};
  const Icon = meta.icon || Layers;
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg shrink-0"
      style={{
        width: size + 14, height: size + 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--hairline)",
        color: meta.color || "var(--text-2)",
      }}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={1.75} />
    </span>
  );
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
