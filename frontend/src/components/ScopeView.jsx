import React, { useState } from "react";
import { Target, Bell, MoreHorizontal, Plus, GripVertical, HelpCircle, ChevronRight, ArrowUp, ArrowDown, History, Info } from "lucide-react";

/* Exact scope content from the product spec (SaaS Dashboard Redesign). */
const ITEMS = [
  { title: "Redesign the main dashboard", desc: "Update the dashboard UI with the new visual direction and component library.", status: "in" },
  { title: "Implement new analytics cards", desc: "Create revenue, users, and conversion analytics cards as shown in Figma.", status: "in" },
  { title: "Dark mode support", desc: "Add full dark mode support across all pages and components.", status: "in" },
  { title: "User role based access", desc: "Restrict dashboard data based on user roles (Admin, Member, Viewer).", status: "clarify" },
  { title: "Custom date range for reports", desc: "Allow users to select custom date ranges for analytics.", status: "in" },
  { title: "Export dashboard data", desc: "Enable export of dashboard data in CSV and PDF formats.", status: "out" },
];

const STATUS = {
  in: { label: "In scope", cls: "sc-tag--in" },
  clarify: { label: "Needs clarification", cls: "sc-tag--clarify" },
  out: { label: "Out of scope", cls: "sc-tag--out" },
};

const ATTENTION = [
  { title: "User role based access", desc: "Role hierarchy and permissions need clarification.", ago: "2h ago" },
  { title: "Real time notifications", desc: "Not enough context on when and where to show.", ago: "5h ago" },
];

const ACTIVITY = [
  { kind: "add", label: "Added", item: "Custom date range for reports", by: "Bracket", ago: "12m ago" },
  { kind: "out", label: "Marked out of scope", item: "Export dashboard data", by: "Saksham", ago: "1h ago" },
  { kind: "clarify", label: "Marked needs clarification", item: "User role based access", by: "Bracket", ago: "2h ago" },
];

const TABS = ["All", "In scope", "Needs clarification", "Out of scope"];

export default function ScopeView({ project }) {
  const [tab, setTab] = useState("All");
  const shown = tab === "All" ? ITEMS : ITEMS.filter((i) => STATUS[i.status].label === tab);

  return (
    <div className="sc-page" data-testid="scope-view">
      <div className="sc-head">
        <div className="ov-head-actions">
          <span className="ov-source-pill"><span className="ov-dot" style={{ background: "var(--success)" }} />Gmail connected</span>
          <button type="button" className="ov-icon-btn" aria-label="Notifications" style={{ position: "relative" }}><Bell size={16} /><span className="sc-bell-dot" /></button>
          <button type="button" className="ov-icon-btn" aria-label="More"><MoreHorizontal size={16} /></button>
        </div>
        <p className="mono-tag text-[10px]" style={{ color: "var(--text-3)" }}>PROJECT</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.03em]" style={{ color: "var(--text)" }}>{project?.name || "SaaS Dashboard Redesign"}</h1>
      </div>

      <div className="sc-grid">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mt-2">
            <Target size={22} style={{ color: "var(--text)" }} />
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>Scope</h2>
          </div>
          <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--text-3)" }}>All confirmed scope items extracted from your project conversations.</p>

          <div className="sc-stats">
            <div className="sc-stat"><span className="sc-stat-label">Total scope items</span><span className="sc-stat-val">12</span></div>
            <div className="sc-stat"><span className="sc-stat-label">In scope</span><span className="sc-stat-val">9</span></div>
            <div className="sc-stat"><span className="sc-stat-label">Needs clarification</span><span className="sc-stat-val" style={{ color: "var(--warning)" }}>2</span></div>
            <div className="sc-stat"><span className="sc-stat-label">Out of scope</span><span className="sc-stat-val">1</span></div>
          </div>

          <div className="sc-toolbar">
            <div className="sc-tabs">
              {TABS.map((t) => (
                <button key={t} type="button" className="sc-tab" data-active={tab === t ? "true" : "false"} onClick={() => setTab(t)} data-testid={`scope-tab-${t}`}>{t}</button>
              ))}
            </div>
            <button type="button" className="sc-add" data-testid="scope-add-item"><Plus size={14} /> Add scope item</button>
          </div>

          <div className="sc-col-head"><span>SCOPE ITEM</span><span>STATUS</span></div>
          <ul className="sc-list">
            {shown.map((it, i) => (
              <li key={i} className="sc-row" data-testid={`scope-item-${i}`}>
                <GripVertical size={15} className="sc-grip" />
                <span className="min-w-0 flex-1">
                  <span className="sc-item-title">{it.title}</span>
                  <span className="sc-item-desc">{it.desc}</span>
                </span>
                <span className={`sc-tag ${STATUS[it.status].cls}`}>{STATUS[it.status].label}</span>
                <button type="button" className="sc-row-menu" aria-label="More"><MoreHorizontal size={16} /></button>
              </li>
            ))}
          </ul>
          <button type="button" className="sc-showmore" data-testid="scope-show-more">Show 6 of 12 items <ChevronRight size={14} style={{ transform: "rotate(90deg)" }} /></button>
        </div>

        {/* Right rail */}
        <aside className="sc-rail">
          <div className="sc-panel">
            <p className="sc-panel-title">Scope insights</p>
            <div className="flex items-center gap-4 mt-3">
              <Donut pct={75} />
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Clear scope</p>
                <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-3)" }}>9 of 12 items are clear and in scope.</p>
              </div>
            </div>
          </div>

          <div className="sc-panel">
            <p className="sc-panel-title">Needs your attention</p>
            <ul className="mt-2 flex flex-col">
              {ATTENTION.map((a, i) => (
                <li key={i} className="sc-attn" data-testid={`scope-attention-${i}`}>
                  <span className="sc-attn-ico"><HelpCircle size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="sc-attn-title">{a.title}</span>
                    <span className="sc-attn-desc">{a.desc}</span>
                    <span className="sc-attn-ago">{a.ago}</span>
                  </span>
                  <ChevronRight size={15} style={{ color: "var(--text-3)" }} />
                </li>
              ))}
            </ul>
          </div>

          <div className="sc-panel">
            <p className="sc-panel-title">Recent scope activity</p>
            <ul className="mt-2 flex flex-col gap-3">
              {ACTIVITY.map((a, i) => (
                <li key={i} className="sc-act" data-testid={`scope-activity-${i}`}>
                  <span className={`sc-act-ico sc-act-ico--${a.kind}`}>
                    {a.kind === "add" ? <ArrowUp size={13} /> : a.kind === "out" ? <ArrowDown size={13} /> : <HelpCircle size={13} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="sc-act-label">{a.label}</span>
                    <span className="sc-act-item">{a.item}</span>
                    <span className="sc-act-by">by {a.by}</span>
                  </span>
                  <span className="sc-act-ago">{a.ago}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="sc-history" data-testid="scope-history"><History size={13} /> View scope history</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Donut({ pct }) {
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#242424" strokeWidth="7" />
        <circle cx="34" cy="34" r={r} fill="none" stroke="#A78BFA" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 34 34)" />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{pct}%</span>
    </div>
  );
}
