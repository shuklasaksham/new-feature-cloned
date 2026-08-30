import React, { useState } from "react";
import { Search, Star, MoreHorizontal, Smile, Paperclip, Zap, Send, Copy, RotateCcw, Pencil, Sparkles, Info, Bell } from "lucide-react";
import { toast } from "sonner";
import { GmailIcon } from "./BrandGlyphs";

/* Exact Conversations content (SaaS Dashboard Redesign). */
const THREADS = [
  { id: "sarah", name: "Sarah Johnson", subject: "Homepage revisions", time: "10:24 AM" },
  { id: "alex", name: "Alex Miller", subject: "Project updates", time: "Yesterday" },
  { id: "tom", name: "Tom Clark", subject: "Content & copy update", time: "May 8" },
  { id: "ben", name: "Ben Walker", subject: "Design system questions", time: "May 5" },
];

const MESSAGES = [
  { from: "Sarah Johnson", me: false, time: "10:24 AM", text: "Hey Saksham, could we add a mobile landing page for the SaaS Dashboard? It'll help with our launch campaign next month." },
  { from: "Saksham Shukla", me: true, time: "10:43 AM", text: "Sure, happy to help. We can add a dedicated mobile landing page. I'll review scope impact and update the timeline." },
  { from: "Sarah Johnson", me: false, time: "11:02 AM", text: "Great, please confirm if this affects the current timeline and share the plan." },
  { from: "Saksham Shukla", me: true, time: "11:15 AM", text: "Will do. I'll review with the team and share an updated timeline by tomorrow." },
];

const DRAFT = `Hi Sarah,

Thanks for the update. We'll review the scope impact of adding the mobile landing page and share an updated timeline by tomorrow.

If you have any specific requirements or priorities, please let me know.

Best,
Saksham`;

const initials = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function ConversationsView() {
  const [selected, setSelected] = useState("sarah");
  const [q, setQ] = useState("");
  const [sendTo, setSendTo] = useState({ sarah: true, alex: true });
  const cur = THREADS.find((t) => t.id === selected) || THREADS[0];
  const filtered = q ? THREADS.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.subject.toLowerCase().includes(q.toLowerCase())) : THREADS;
  const sendCount = Object.values(sendTo).filter(Boolean).length;

  return (
    <div className="cv-wrap" data-testid="project-conversations">
      <div className="cv-head">
        <div className="ov-head-actions">
          <span className="ov-source-pill"><GmailIcon size={14} /><span style={{ marginLeft: 2 }}>Gmail</span><span className="ov-dot" style={{ background: "var(--success)", marginLeft: 2 }} />Connected</span>
          <button type="button" className="ov-icon-btn" aria-label="Notifications"><Bell size={16} /></button>
          <button type="button" className="ov-icon-btn" aria-label="More"><MoreHorizontal size={16} /></button>
        </div>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.03em]" style={{ color: "var(--text)" }}>Conversations</h1>
        <p className="mt-1 text-[13.5px]" style={{ color: "var(--text-3)" }}>Ask Bracket what to send, then send it to one or multiple linked emails.</p>
      </div>

      <div className="cv-grid">
        {/* Left — linked emails */}
        <div className="cv-col cv-left">
          <p className="cv-col-title">Linked emails</p>
          <div className="cv-search"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails" data-testid="cv-search" /></div>
          <ul className="cv-thread-list">
            {filtered.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setSelected(t.id)} className="cv-thread" data-active={selected === t.id ? "true" : "false"} data-testid={`cv-thread-${t.id}`}>
                  <span className="cv-avatar">{initials(t.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="cv-thread-name">{t.name}</span>
                    <span className="cv-thread-sub">{t.subject}</span>
                  </span>
                  <span className="cv-thread-meta"><span className="cv-thread-time">{t.time}</span><GmailIcon size={14} /></span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Middle — thread */}
        <div className="cv-col cv-mid">
          <div className="cv-mid-head">
            <span className="min-w-0 flex items-center gap-2"><span className="cv-mid-title">{cur.subject}</span><GmailIcon size={14} /><span className="cv-mid-sub">{cur.name}</span></span>
            <span className="flex items-center gap-1">
              <button type="button" className="ov-icon-btn ov-icon-btn--sm" aria-label="Star"><Star size={14} /></button>
              <button type="button" className="ov-icon-btn ov-icon-btn--sm" aria-label="More"><MoreHorizontal size={14} /></button>
            </span>
          </div>
          <div className="cv-mid-body">
            {MESSAGES.map((m, i) => (
              <div key={i} className={`cv-msg ${m.me ? "cv-msg--me" : ""}`} data-testid={`cv-msg-${i}`}>
                {!m.me && <span className="cv-msg-avatar">{initials(m.from)}</span>}
                <div className="min-w-0">
                  <div className="cv-msg-head"><span className="cv-msg-from">{m.from}</span><span className="cv-msg-time">{m.time}</span></div>
                  <div className="cv-bubble">{m.text}</div>
                </div>
                {m.me && <span className="cv-msg-avatar">{initials(m.from)}</span>}
              </div>
            ))}
          </div>
          <div className="cv-reply">
            <input placeholder={`Reply to ${cur.name}...`} data-testid="cv-reply-input" />
            <button type="button" className="cv-reply-ico" aria-label="Emoji"><Smile size={16} /></button>
            <button type="button" className="cv-reply-ico" aria-label="Attach"><Paperclip size={16} /></button>
            <button type="button" className="cv-reply-ico" aria-label="Quick"><Zap size={16} /></button>
            <button type="button" className="cv-reply-send" data-testid="cv-reply-send" aria-label="Send"><Send size={15} /></button>
          </div>
        </div>

        {/* Right — Ask Bracket */}
        <div className="cv-col cv-right">
          <div className="cv-ask-head"><span className="flex items-center gap-2"><Sparkles size={15} style={{ color: "#A78BFA" }} /><span className="cv-ask-title">Ask Bracket</span></span><Info size={15} style={{ color: "var(--text-3)" }} /></div>
          <div className="cv-ask-prompt">Draft a reply that confirms we'll review scope impact and share timeline by tomorrow.</div>
          <p className="cv-ask-label">Bracket's draft</p>
          <div className="cv-ask-draft">{DRAFT}</div>
          <div className="cv-ask-tools">
            <button type="button" onClick={() => { navigator.clipboard?.writeText(DRAFT); toast.success("Draft copied."); }} data-testid="cv-draft-copy"><Copy size={15} /></button>
            <button type="button" onClick={() => toast.info("Regenerating…")} data-testid="cv-draft-regen"><RotateCcw size={15} /></button>
            <button type="button" onClick={() => toast.info("Edit draft")} data-testid="cv-draft-edit"><Pencil size={15} /></button>
          </div>
          <p className="cv-ask-label mt-4">Send to</p>
          <div className="cv-sendto">
            {[{ id: "sarah", name: "Sarah Johnson", sub: "Homepage revisions" }, { id: "alex", name: "Alex Miller", sub: "Project updates" }].map((r) => (
              <div key={r.id} className="cv-sendto-row" data-testid={`cv-sendto-${r.id}`}>
                <button type="button" className="cv-check" data-on={sendTo[r.id] ? "true" : "false"} onClick={() => setSendTo((s) => ({ ...s, [r.id]: !s[r.id] }))} aria-label={r.name}>
                  {sendTo[r.id] && <span className="cv-check-tick" />}
                </button>
                <span className="cv-sendto-name">{r.name}</span>
                <span className="cv-sendto-sub">— {r.sub}</span>
                <button type="button" className="cv-sendto-x" onClick={() => setSendTo((s) => ({ ...s, [r.id]: false }))} aria-label="Remove">×</button>
              </div>
            ))}
          </div>
          <button type="button" className="cv-send-all" onClick={() => toast.success(`Sent to ${sendCount} linked email${sendCount === 1 ? "" : "s"}.`)} data-testid="cv-send-all">
            Send to {sendCount} linked email{sendCount === 1 ? "" : "s"} <span style={{ fontSize: 15 }}>→</span>
          </button>
          <button type="button" className="cv-send-only" onClick={() => toast.success("Sent only to Sarah.")} data-testid="cv-send-only">Send only to Sarah</button>
        </div>
      </div>
    </div>
  );
}
