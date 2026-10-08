import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { ProviderIcon, timeAgo } from "../lib/providersMeta";

/**
 * In-app notifications bell — sits in the dashboard header.
 * Currently surfaces only `scope_creep` alerts (AI-detected scope changes on
 * connected sources). Poll every 45s so the badge stays fresh while the tab is
 * open, and stops polling when the tab is hidden to save quota.
 */
const POLL_MS = 10_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications?limit=30");
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {
      // silent — bell is a peripheral feature
    }
  };

  useEffect(() => {
    load();
    let id = null;
    const tick = () => { if (!document.hidden) load(); };
    id = setInterval(tick, POLL_MS);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const openPanel = async () => {
    setOpen(true);
    if (unread > 0) {
      setLoading(true);
      try {
        await api.post("/notifications/read", {});
        setUnread(0);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch { /* silent */ } finally { setLoading(false); }
    }
  };

  return (
    <div ref={wrapRef} className="relative" data-testid="notification-bell-wrap">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={unread > 0 ? `${unread} unread alerts` : "Alerts"}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors relative"
        style={{ borderColor: "var(--hairline)", background: "var(--surface-1)", color: "var(--text-2)" }}
        data-testid="notification-bell-btn"
      >
        <Bell size={15} strokeWidth={1.75} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center"
            style={{ background: "#EF4444", color: "#FFFFFF", border: "2px solid var(--bg, #08090A)" }}
            data-testid="notification-bell-badge"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] sm:w-[400px] rounded-xl overflow-hidden z-40"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--hairline)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          }}
          data-testid="notification-bell-panel"
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
            <p className="mono-tag text-muted text-[10px] inline-flex items-center gap-1.5">
              <AlertTriangle size={11} /> ALERTS · SCOPE CHANGES
            </p>
            <span className="text-[10.5px] text-[var(--text-3)]">
              {loading ? "Marking…" : `${items.length} total`}
            </span>
          </div>
          <div className="max-h-[400px] overflow-auto">
            {items.length === 0 ? (
              <p className="text-[12px] text-[var(--text-3)] px-4 py-6 leading-relaxed" data-testid="notification-bell-empty">
                No scope-creep alerts yet. When Bracket spots a client request outside a project&apos;s scope, it will land here.
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  to={`/project/${n.project_id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  style={{ borderBottom: "1px solid var(--hairline)" }}
                  data-testid={`notification-item-${n.id}`}
                >
                  <ProviderIcon provider={n.provider} size={13} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="mono-tag text-[9px]" style={{ color: "#FFB84C" }}>SCOPE CREEP</span>
                      <span className="text-[10px] text-[var(--text-3)]">· {n.project_name || "Project"}</span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-[var(--text)] leading-snug">{n.title}</p>
                    {n.detail && (
                      <p className="mt-0.5 text-[11.5px] text-[var(--text-3)] leading-snug line-clamp-2">{n.detail}</p>
                    )}
                    <p className="mt-1 text-[10px] text-[var(--text-3)]">
                      {n.source_label} · {timeAgo(n.created_at)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
