import {
  Target, Package, Check, ListChecks, CalendarClock,
  AlertTriangle, Compass, DollarSign, HelpCircle,
} from "lucide-react";

/**
 * The 9 canonical Project Memory categories — one entry per category with its
 * label, icon, and the accent colour used everywhere the category appears
 * (badges, drill-down headers, timeline dots, drawer highlights).
 *
 * Keep this file the single source of truth for category display — DO NOT
 * inline colours or labels in feature components.
 */
// UI exposes only the six primary categories requested for v1 — Risks,
// Assumptions, Commercials and Open Questions still live in the data model
// (backend still writes them from the extractor) and can be surfaced later.
export const MEMORY_CATEGORIES = [
  { key: "deliverable", label: "Deliverables",  plural: "Deliverables",      icon: Package,        color: "#8B5CF6" },
  { key: "scope",       label: "Scope",         plural: "Scope items",       icon: Target,         color: "#3B82F6" },
  { key: "timeline",    label: "Timeline",      plural: "Timeline events",   icon: CalendarClock,  color: "#F59E0B" },
  { key: "requirement", label: "Requirements",  plural: "Requirements",      icon: ListChecks,     color: "#22D3EE" },
  { key: "decision",    label: "Decisions",     plural: "Decisions",         icon: Check,          color: "#4ADE80" },
  { key: "deadline",    label: "Deadlines",     plural: "Deadlines",         icon: CalendarClock,  color: "#F87171" },
];

export const CATEGORY_BY_KEY = MEMORY_CATEGORIES.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {});

// Status pill styling used across memory rows + drawers.
export const STATUS_META = {
  confirmed:    { label: "CONFIRMED",   color: "#16A34A", bg: "rgba(22,163,74,0.10)" },
  detected:     { label: "DETECTED",    color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  review:       { label: "TO REVIEW",   color: "#4F46E5", bg: "rgba(79,70,229,0.10)" },
  context:      { label: "CONTEXT",     color: "#7A7F92", bg: "rgba(122,127,146,0.10)" },
  not_a_change: { label: "NOT A CHANGE",color: "#7A7F92", bg: "rgba(122,127,146,0.10)" },
  ignored:      { label: "IGNORED",     color: "#7A7F92", bg: "rgba(122,127,146,0.10)" },
};
