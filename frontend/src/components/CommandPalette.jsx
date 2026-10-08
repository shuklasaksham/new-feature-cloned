import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, LayoutGrid, Activity, Settings as SettingsIcon, Plug, FolderOpen } from "lucide-react";
import { api } from "../lib/api";

const NAV = [
  { id: "nav-home", label: "Home", hint: "Latest project", to: "/app", icon: LayoutGrid },
  { id: "nav-connect", label: "Connect a source", to: "/app/connect", icon: Plug },
  { id: "nav-activity", label: "Activity", to: "/app/activity", icon: Activity },
  { id: "nav-settings", label: "Settings", to: "/settings", icon: SettingsIcon },
];

// Global ⌘K / Ctrl+K command palette. Searches projects + navigation.
export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) { setQ(""); setActive(0); return; }
    api.get("/projects").then(({ data }) => setProjects(Array.isArray(data) ? data : [])).catch(() => setProjects([]));
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const items = useMemo(() => {
    const projItems = projects.map((p) => ({
      id: `proj-${p.id}`, label: p.name || "Untitled project",
      hint: p.is_demo ? "Demo" : "Project", to: `/project/${p.id}`, icon: p.is_demo ? FolderOpen : FolderOpen,
    }));
    const all = [...NAV, ...projItems];
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((i) => i.label.toLowerCase().includes(term) || (i.hint || "").toLowerCase().includes(term));
  }, [projects, q]);

  useEffect(() => { setActive(0); }, [q]);

  const go = useCallback((item) => {
    if (!item) return;
    setOpen(false);
    navigate(item.to);
  }, [navigate]);

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(items[active]); }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div
      className="bk fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh]"
      style={{ background: "var(--bg-overlay)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}
      data-testid="command-palette"
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-line-strong bg-raised shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-fg-tertiary" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search projects and actions…"
            className="h-12 w-full bg-transparent text-body-m text-fg placeholder:text-fg-disabled outline-none"
            data-testid="command-palette-input"
          />
          <kbd className="shrink-0 rounded-[4px] border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg-tertiary">esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto scroll-pane py-2">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-body-s text-fg-tertiary">No matches</p>
          ) : (
            items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? "bg-selected" : "hover:bg-hover"}`}
                  data-testid={`command-item-${item.id}`}
                >
                  <Icon size={16} className="shrink-0 text-fg-secondary" strokeWidth={1.75} />
                  <span className="flex-1 truncate text-body-m text-fg">{item.label}</span>
                  {item.hint && <span className="shrink-0 text-body-s text-fg-tertiary">{item.hint}</span>}
                  {i === active && <CornerDownLeft size={14} className="shrink-0 text-fg-tertiary" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
