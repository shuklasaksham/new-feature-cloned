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
export const MEMORY_CATEGORIES = [
  { key: "scope",       label: "Scope",         plural: "Scope items",       icon: Target,         color: "#4F46E5" },
  { key: "deliverable", label: "Deliverables",  plural: "Deliverables",      icon: Package,        color: "#8B5CF6" },
  { key: "decision",    label: "Decisions",     plural: "Decisions",         icon: Check,          color: "#16A34A" },
  { key: "requirement", label: "Requirements",  plural: "Requirements",      icon: ListChecks,     color: "#0EA5E9" },
  { key: "timeline",    label: "Timeline",      plural: "Timeline events",   icon: CalendarClock,  color: "#D97706" },
  { key: "deadline",    label: "Deadlines",     plural: "Deadlines",         icon: CalendarClock,  color: "#EA580C" },
  { key: "risk",        label: "Risks",         plural: "Risks",             icon: AlertTriangle,  color: "#DC2626" },
  { key: "assumption",  label: "Assumptions",   plural: "Assumptions",       icon: Compass,        color: "#0891B2" },
  { key: "commercial",  label: "Commercials",   plural: "Commercials",       icon: DollarSign,     color: "#059669" },
  { key: "question",    label: "Open Questions",plural: "Open questions",    icon: HelpCircle,     color: "#7A7F92" },
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
