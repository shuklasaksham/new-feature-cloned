import React, { useState } from "react";
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

// Real brand logos via the simple-icons CDN (official brand marks + colors).
// `cdnColor` overrides the default brand color where it would be invisible
// on Bracket's dark surface (GitHub/Notion default to near-black).
export const PROVIDER_META = {
  gmail:    { label: "Gmail",           icon: Mail,          color: "#EA4335", slug: "gmail" },
  slack:    { label: "Slack",           icon: Slack,         color: "#E01E5A", slug: "slack" },
  whatsapp: { label: "WhatsApp",        icon: MessageCircle, color: "#25D366", slug: "whatsapp" },
  teams:    { label: "Microsoft Teams", icon: Users,         color: "#6264A7", slug: null },
  figma:    { label: "Figma",           icon: Figma,         color: "#A259FF", slug: "figma" },
  adobe:    { label: "Adobe",           icon: Palette,       color: "#FF3B30", slug: "adobe" },
  gdrive:   { label: "Google Drive",    icon: HardDrive,     color: "#4285F4", slug: "googledrive" },
  notion:   { label: "Notion",          icon: NotebookText,  color: "#E8E7E4", slug: "notion", cdnColor: "FFFFFF" },
  dropbox:  { label: "Dropbox",         icon: Package,       color: "#0061FF", slug: "dropbox" },
  github:   { label: "GitHub",          icon: Github,        color: "#E6EDF3", slug: "github", cdnColor: "E6EDF3" },
  linear:   { label: "Linear",          icon: Layers,        color: "#5E6AD2", slug: "linear" },
};

export function ProviderIcon({ provider, size = 16 }) {
  const meta = PROVIDER_META[provider] || {};
  const [failed, setFailed] = useState(false);
  const Icon = meta.icon || Layers;
  const src = meta.slug
    ? `https://cdn.simpleicons.org/${meta.slug}${meta.cdnColor ? `/${meta.cdnColor}` : ""}`
    : null;
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
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          style={{ display: "block", width: size, height: size, objectFit: "contain" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon size={size} strokeWidth={1.75} />
      )}
    </span>
  );
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
