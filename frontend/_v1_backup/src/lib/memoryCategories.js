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
  { key: "deliverable", label: "Deliverables",  plural: "Deliverables",      icon: Package,        color: "#A1A1AA" },
  { key: "scope",       label: "Scope",         plural: "Scope items",       icon: Target,         color: "#A1A1AA" },
  { key: "timeline",    label: "Timeline",      plural: "Timeline events",   icon: CalendarClock,  color: "#A1A1AA" },
  { key: "requirement", label: "Requirements",  plural: "Requirements",      icon: ListChecks,     color: "#A1A1AA" },
  { key: "decision",    label: "Decisions",     plural: "Decisions",         icon: Check,          color: "#A1A1AA" },
  { key: "deadline",    label: "Deadlines",     plural: "Deadlines",         icon: CalendarClock,  color: "#A1A1AA" },
];

export const CATEGORY_BY_KEY = MEMORY_CATEGORIES.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {});

// Status pill styling used across memory rows + drawers.
export const STATUS_META = {
  confirmed:    { label: "CONFIRMED",   color: "#C4C4C8", bg: "rgba(255,255,255,0.06)" },
  detected:     { label: "DETECTED",    color: "#A1A1AA", bg: "rgba(255,255,255,0.06)" },
  review:       { label: "TO REVIEW",   color: "#A1A1AA", bg: "rgba(255,255,255,0.06)" },
  context:      { label: "CONTEXT",     color: "#7A7F92", bg: "rgba(255,255,255,0.04)" },
  not_a_change: { label: "NOT A CHANGE",color: "#7A7F92", bg: "rgba(255,255,255,0.04)" },
  ignored:      { label: "IGNORED",     color: "#7A7F92", bg: "rgba(255,255,255,0.04)" },
};
