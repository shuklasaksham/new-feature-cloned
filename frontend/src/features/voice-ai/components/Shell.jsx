import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../lib/AuthContext";
import { voiceApi } from "../api";
import { useVoice } from "../store";
import Icon from "./Icon";
import { Avatar, Button, IconButton } from "./ui";

const NAV = [
  { group: "Workspace", items: [
    { to: "/voice/workspace", icon: "grid", label: "Overview" },
    { to: "/voice/calls", icon: "history", label: "Timeline · Calls" },
  ] },
  { group: "Tools", items: [
    { to: "/voice", icon: "ask", label: "Ask Bracket", end: true },
    { to: "/voice/settings", icon: "settings", label: "Voice & calling" },
  ] },
];

const TABS = [
  { to: "/voice/workspace", icon: "grid", label: "Overview" },
  { to: "/voice", icon: "ask", label: "Ask", end: true },
  { to: "/voice/calls", icon: "history", label: "Calls" },
  { to: "/voice/settings", icon: "settings", label: "Settings" },
];

function initialsOf(user) {
  const name = user?.name || user?.email || "You";
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function Updates({ onClose }) {
  const { workspace, refresh } = useVoice();
  const navigate = useNavigate();
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);
  const notes = workspace?.notifications || [];
  const groups = [["attention", "Needs your attention"], ["calls", "From calls"]];
  const markAll = async () => { await voiceApi.markNotificationsRead(); refresh(); };
  return (
    <div ref={ref} className="popover" style={{ right: 12, top: 48, width: 400 }} role="dialog" aria-label="Updates">
      <div className="row divider-b" style={{ padding: "12px 8px 12px 16px" }}>
        <span className="t-title-s grow">Updates</span>
        <Button variant="ghost" size="s" onClick={markAll}>Mark all read</Button>
      </div>
      <div className="scroll" style={{ maxHeight: 460 }}>
        {notes.length === 0 && <div className="t-body-s c-3" style={{ padding: 16 }}>No call updates yet. Outcomes, detected decisions and memory reviews show up here.</div>}
        {groups.map(([g, label]) => {
          const items = notes.filter((n) => n.group === g);
          if (!items.length) return null;
          return (
            <div key={g} style={{ padding: "8px 0 4px" }}>
              <div style={{ padding: "4px 16px" }}><span className="t-eyebrow">{label}</span></div>
              {items.map((n) => (
                <button key={n.id} className="row top g12" style={{ padding: "8px 16px", width: "100%", textAlign: "left" }}
                  onClick={() => { onClose(); navigate(n.href); }}>
                  <Icon name={n.icon} className={n.tone ? `c-${n.tone}` : "c-2"} />
                  <span className="col g2 grow"><span className="t-body-s">{n.title}</span><span className="t-caption c-3">{n.meta}</span></span>
                  <span style={{ width: 6, height: 6, borderRadius: 3, marginTop: 6, background: n.unread ? "var(--info)" : "transparent", flex: "none" }} />
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="divider-t t-caption c-3" style={{ padding: "12px 16px" }}>
        Call outcomes and memory reviews alert you in real time. Everything else arrives in your daily digest.
      </div>
    </div>
  );
}

export function CallChip({ call }) {
  const navigate = useNavigate();
  const line = call.status === "connected" ? `On call · ${call.duration}` : call.status === "ringing" ? "Ringing…" : `Calling ${call.contact.phone}`;
  const end = async (e) => { e.stopPropagation(); await voiceApi.endCall(call.id); };
  return (
    <div className="call-chip" role="button" tabIndex={0} onClick={() => navigate(`/voice/calls/${call.id}/live`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/voice/calls/${call.id}/live`)}>
      <Avatar initials={call.contact.initials} />
      <div className="col g2 grow">
        <span className="t-body-s t-medium">{call.contact.name}</span>
        <span className="row g6 t-caption c-3">
          {call.status === "connected" ? <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--success)" }} /> : <Icon name="loader" size={12} spin />}
          {line}
        </span>
      </div>
      <button className="ctrl danger" onClick={end} aria-label="End call"><span className="knob" style={{ width: 32, height: 32 }}><Icon name="phone-off" size={14} /></span></button>
    </div>
  );
}

export default function Shell({ crumb, children, fullscreenMobile = false, hideCallChip = false, mobileTitle, mobileBack }) {
  const { user } = useAuth();
  const { workspace } = useVoice();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const project = workspace?.project;
  const active = workspace?.active_call;
  return (
    <div className={`bv bv-shell ${fullscreenMobile ? "voice-fullscreen" : ""}`}>
      <aside className="bv-sidebar" aria-label="Voice AI navigation">
        <Link to="/app" className="bv-logo"><span className="bv-logo-mark"><Icon name="layers" size={12} /></span>bracket</Link>
        {NAV.map((g) => (
          <React.Fragment key={g.group}>
            <span className="t-eyebrow bv-navlabel">{g.group}</span>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `bv-navitem ${isActive ? "active" : ""}`}>
                <Icon name={it.icon} />{it.label}
              </NavLink>
            ))}
          </React.Fragment>
        ))}
        <Link to="/app" className="bv-sidefoot"><Icon name="arrow-left" size={14} />Back to Bracket</Link>
      </aside>
      <div className="bv-main">
        <header className="bv-topbar">
          <span className="bv-ws-chip">AF</span>
          <span className="t-body-s c-3">{project?.client || "Acme Finance"}</span>
          <span className="c-dis">/</span>
          <span className="t-body-s t-medium">{project?.name || "Fintech Landing Page Redesign"}</span>
          {crumb && <span className="t-body-s c-3">›&nbsp; {crumb}</span>}
          <span className="grow" />
          <div style={{ position: "relative" }}>
            <IconButton icon="bell" label="Updates" onClick={() => setOpen((o) => !o)} />
            {workspace?.unread > 0 && <span style={{ position: "absolute", top: 5, right: 6, width: 6, height: 6, borderRadius: 3, background: "var(--info)" }} />}
          </div>
          {open && <Updates onClose={() => setOpen(false)} />}
          <Avatar initials={initialsOf(user)} />
        </header>
        <header className="bv-mobile-header">
          {mobileBack ? <IconButton icon="arrow-left" label="Back" onClick={() => navigate(mobileBack)} /> : <span className="bv-ws-chip" style={{ marginLeft: 8 }}>AF</span>}
          <div className="col g2 grow" style={{ alignItems: mobileBack ? "center" : "flex-start", paddingLeft: mobileBack ? 0 : 8 }}>
            <span className="t-title-s">{mobileTitle || project?.name || "Fintech Landing Page Redesign"}</span>
            {!mobileTitle && <span className="t-caption c-3">{project?.client || "Acme Finance"}</span>}
          </div>
          <IconButton icon="bell" label="Updates" onClick={() => navigate("/voice/workspace?updates=1")} />
        </header>
        <main className="bv-body">{children}</main>
        <nav className="bv-tabbar" aria-label="Voice AI">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "active" : "")}><Icon name={t.icon} size={20} />{t.label}</NavLink>
          ))}
        </nav>
      </div>
      {active && !hideCallChip && <CallChip call={active} />}
    </div>
  );
}
