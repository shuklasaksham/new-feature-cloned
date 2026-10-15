// Voice AI primitives — React versions of the Figma components (02 Components → 09 · Voice AI)
// plus the core Bracket pieces they lean on (Button, Badge, Toggle, Banner…).
import React, { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

export function Button({ variant = "secondary", size, icon, iconRight, children, className = "", ...rest }) {
  return (
    <button className={`btn ${variant} ${size === "s" ? "s" : ""} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}

export function IconButton({ icon, label, className = "", ...rest }) {
  return (
    <button className={`iconbtn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

const TONE = { warning: "warning", danger: "danger", success: "success", info: "info" };
export function Badge({ tone, dot = true, children }) {
  return <span className={`badge ${TONE[tone] || "neutral"}`}>{dot && <span className="dot" />}{children}</span>;
}

export const Eyebrow = ({ children, className = "" }) => <span className={`t-eyebrow ${className}`}>{children}</span>;
export const Avatar = ({ initials, size }) => <span className={`avatar ${size || ""}`}>{initials}</span>;

export function Ts({ t, onClick }) {
  return (
    <button className="ts" onClick={onClick} title="Jump to transcript" type="button">
      <Icon name="audio-lines" size={10} />{t}
    </button>
  );
}

const SOURCE_ICON = { gmail: "mail", slack: "messages", notes: "note", call: "phone", meeting: "mic" };
export function SourceMark({ provider }) {
  return <Icon name={SOURCE_ICON[provider] || "file"} size={16} className="c-2" />;
}

export function Toggle({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      className={`toggle ${on ? "on" : ""}`} onClick={() => onChange?.(!on)} />
  );
}

export function Check({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} disabled={disabled}
      className={`check ${on ? "on" : ""}`} onClick={() => onChange?.(!on)}>
      {on && <Icon name="check" size={12} />}
    </button>
  );
}

export function Banner({ tone = "info", title, children, icon }) {
  const ic = icon || (tone === "danger" || tone === "warning" ? "alert" : "info");
  return (
    <div className={`banner ${tone}`} role={tone === "danger" ? "alert" : undefined}>
      <Icon name={ic} className={tone === "neutral" ? "c-2" : `c-${tone}`} />
      <div className="col g2">
        {title && <span className="t-title-s">{title}</span>}
        {children && <span className="t-body-s c-2">{children}</span>}
      </div>
    </div>
  );
}

export function Confidence({ level }) {
  const n = { High: 3, Medium: 2, Low: 1 }[level] || 2;
  return (
    <span className="row g6 t-caption c-3">
      <span className="meter">{[5, 8, 12].map((h, i) => <i key={h} style={{ height: h }} className={i < n ? "" : "off"} />)}</span>
      {level} confidence
    </span>
  );
}

export function Skeleton({ width = "100%" }) {
  return <div className="skeleton" style={{ width }} />;
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="col g8" style={{ alignItems: "center", textAlign: "center", padding: "48px 16px" }}>
      <span className="iconbox l"><Icon name={icon} /></span>
      <span className="t-title-s">{title}</span>
      {children && <span className="t-body-s c-3" style={{ maxWidth: 360 }}>{children}</span>}
      {action}
    </div>
  );
}

export function Modal({ onClose, children, label }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grabber" />
        {children}
      </div>
    </>
  );
}

/* ----------------------------- voice components ----------------------------- */

const STATUS = {
  listening: { dot: "var(--danger)", label: "Listening" },
  thinking: { icon: "loader", label: "Thinking" },
  speaking: { dot: "var(--info)", label: "Speaking" },
  paused: { icon: "pause", label: "Paused" },
  muted: { icon: "mic-off", label: "Muted", cls: "c-warning" },
  connecting: { icon: "loader", label: "Connecting" },
  error: { icon: "alert", label: "Mic unavailable", cls: "c-danger" },
  idle: { dot: "var(--text-dis)", label: "Ready" },
};

export function VoiceStatus({ state }) {
  const s = STATUS[state] || STATUS.idle;
  return (
    <span className="pill" aria-live="polite">
      {s.icon ? <Icon name={s.icon} size={12} className={s.cls || ""} spin={s.icon === "loader"} /> : <span className="dot" style={{ background: s.dot }} />}
      {s.label}
    </span>
  );
}

const N = 29;
const SHAPES = {
  speaking: Array.from({ length: N }, (_, i) => 0.25 + 0.75 * Math.sin((Math.PI * i) / (N - 1)) ** 1.4),
  listening: [6, 10, 16, 24, 14, 30, 20, 36, 26, 18, 32, 40, 28, 22, 34, 16, 26, 38, 30, 20, 12, 24, 32, 18, 28, 14, 10, 8, 4].map((h) => h / 40),
};

/** Animated waveform. `level` (0..1) drives listening bars from the real mic when available. */
export function Waveform({ state = "idle", level, scale = 1 }) {
  const [tick, setTick] = useState(0);
  const animated = state === "listening" || state === "speaking" || state === "thinking";
  useEffect(() => {
    if (!animated) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), 90);
    return () => clearInterval(t);
  }, [animated]);
  const bars = useMemo(() => Array.from({ length: N }, (_, i) => {
    if (state === "idle") return 2;
    if (state === "paused") return 4;
    if (state === "thinking") {
      const center = tick % (N + 6) - 3;
      const d = Math.abs(i - center);
      return d < 3 ? 4 + (3 - d) * 4 : 4;
    }
    const base = SHAPES[state === "speaking" ? "speaking" : "listening"][i];
    const jitter = 0.55 + 0.45 * Math.abs(Math.sin(tick * 0.7 + i * 1.3));
    const amp = state === "listening" && typeof level === "number" ? Math.max(0.12, Math.min(1, level * 1.6)) : 1;
    return Math.max(3, Math.round(40 * base * jitter * amp));
  }), [state, tick, level]);
  const cls = state === "thinking" ? "tertiary" : state === "paused" ? "dim" : state === "idle" ? "idle" : "";
  return (
    <div className={`wave ${cls}`} style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }} aria-hidden="true">
      {bars.map((h, i) => <i key={i} style={{ height: h }} />)}
    </div>
  );
}

export function Control({ icon, label, variant, onClick, disabled, title }) {
  return (
    <button type="button" className={`ctrl ${variant || ""}`} onClick={onClick} disabled={disabled} title={title} aria-label={label}>
      <span className="knob"><Icon name={icon} /></span>
      {label}
    </button>
  );
}

/** Voice controls bar — mute, interrupt / pause, type, end. */
export function VoiceControls({ state, muted, onMute, onPause, onResume, onInterrupt, onType, onEnd }) {
  return (
    <div className="ctrl-bar" role="toolbar" aria-label="Voice controls">
      <Control icon={muted ? "mic-off" : "mic"} label={muted ? "Unmute" : "Mute"} variant={muted ? "active" : ""} onClick={onMute} disabled={state === "paused"} />
      {state === "speaking"
        ? <Control icon="hand" label="Interrupt" variant="active" onClick={onInterrupt} />
        : state === "paused"
          ? <Control icon="play" label="Resume" variant="active" onClick={onResume} />
          : <Control icon="pause" label="Pause" onClick={onPause} />}
      <Control icon="keyboard" label="Type" onClick={onType} />
      <Control icon="x" label="End" variant="danger" onClick={onEnd} />
    </div>
  );
}

export function BracketMark({ size = 28, icon = "audio-lines" }) {
  return <span className="mark" style={{ width: size, height: size }}><Icon name={icon} size={14} /></span>;
}

/** One line of the voice conversation (live transcription or caption). */
export function Utterance({ speaker, text, meta, live, initials = "MR", large }) {
  const you = speaker === "you";
  return (
    <div className="utt">
      {you ? <Avatar initials={initials} /> : <BracketMark />}
      <div className="col g4 grow">
        <span className="row g8"><span className="t-body-s t-medium c-2">{you ? "You" : "Bracket"}</span>{meta && <span className="t-caption c-3">{meta}</span>}</span>
        <span className={`${you ? "t-title-m" : large === false ? "t-body-m" : "t-body-l"} ${live && you ? "c-2" : "c-1"}`}>
          {text}{live && <span className="caret" />}
        </span>
      </div>
    </div>
  );
}

const ACTION_ICON = { draft_email: "mail", project_update: "sparkles", action_item: "list-checks", accept_updates: "git-branch" };
const ACTION_STATE = {
  pending: ["Needs your OK", "warning"], running: ["Working", "info"], done: ["Done", "success"], canceled: ["Canceled", "neutral"],
};

/** Approval-gated action (send email, create item, accept updates…). */
export function ActionCard({ action, busy, onConfirm, onCancel, onEdit }) {
  const [label, tone] = ACTION_STATE[action.status] || ACTION_STATE.pending;
  const doneLabel = action.kind === "draft_email" || action.kind === "project_update" ? "Sent" : action.kind === "action_item" ? "Added" : "Accepted";
  return (
    <div className="card col g12" style={{ padding: 16 }}>
      <div className="row">
        <span className="iconbox"><Icon name={ACTION_ICON[action.kind] || "sparkles"} size={14} /></span>
        <Eyebrow>{action.eyebrow}</Eyebrow>
        <span className="grow" />
        <Badge tone={tone}>{action.status === "done" ? doneLabel : label}</Badge>
      </div>
      <span className="t-title-s">{action.title}</span>
      {(action.body || action.due) && (
        <div className="col g6" style={{ padding: 12, borderRadius: 6, background: "var(--bg-sidebar)", border: "1px solid var(--border-subtle)", opacity: action.status === "canceled" ? 0.5 : 1 }}>
          {action.to && <span className="t-caption c-3">To {action.to}</span>}
          {action.body && <span className="t-body-s c-2">{action.body}</span>}
          {action.due && <span className="t-caption c-3">{action.owner} · {action.due}</span>}
        </div>
      )}
      <div className="row">
        {action.status === "pending" && (
          <>
            <Button variant="primary" size="s" icon="check" onClick={onConfirm} disabled={busy}>{action.confirm_label || "Approve"}</Button>
            {onEdit && <Button size="s" icon="pencil" onClick={onEdit} disabled={busy}>Edit</Button>}
            <Button variant="ghost" size="s" onClick={onCancel} disabled={busy}>Cancel</Button>
            <span className="grow" />
            <span className="t-caption c-3 hide-m">Or say “yes” / “cancel”</span>
          </>
        )}
        {action.status === "done" && (<><Icon name="check-circle" size={14} className="c-success" /><span className="t-caption c-2">{action.result}</span></>)}
        {action.status === "canceled" && <span className="t-caption c-3">Nothing was sent.</span>}
      </div>
    </div>
  );
}

export function ContactCard({ contact, selected, onClick, project = "Fintech Landing Page Redesign" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className="card row top g12"
      style={{ padding: "12px 16px", textAlign: "left", width: "100%", background: selected ? "var(--bg-selected)" : undefined, borderColor: selected ? "var(--border-strong)" : undefined }}>
      <Avatar initials={contact.initials} />
      <div className="col g4 grow">
        <span className="t-title-s">{contact.name}</span>
        <span className="t-caption c-3">{contact.role} · {contact.company}</span>
        <span className="row g8"><Icon name="phone" size={12} className="c-3" /><span className="t-mono c-2">{contact.phone}</span></span>
        <span className="row g8"><Icon name="layers" size={12} className="c-3" /><span className="t-caption c-2">{project}</span></span>
      </div>
      {selected && <Icon name="check-circle" />}
    </Tag>
  );
}

const CALL_STATUS = {
  prepared: ["Draft", "neutral"], dialing: ["Calling", "info"], ringing: ["Ringing", "info"], connected: ["On call", "success"],
  completed: ["Completed", "success"], no_answer: ["No answer", "warning"], busy: ["Busy", "warning"], failed: ["Failed", "danger"], canceled: ["Canceled", "neutral"],
};
export function CallStatusBadge({ status }) {
  const [label, tone] = CALL_STATUS[status] || CALL_STATUS.prepared;
  return <Badge tone={tone}>{label}</Badge>;
}

export function RecordingUnavailable() {
  return (
    <div className="card row g12" style={{ padding: "10px 16px 10px 10px" }}>
      <span className="avatar l" style={{ border: 0 }}><Icon name="record" className="c-dis" /></span>
      <div className="col g2 grow">
        <span className="t-body-s t-medium c-2">Recording not available</span>
        <span className="t-caption c-3">Recordings arrive once a live calling provider is connected. The transcript is below.</span>
      </div>
    </div>
  );
}

/** Scrolls to and briefly highlights a transcript line by index. */
export function useHighlight() {
  const [hl, setHl] = useState(null);
  const timer = useRef(null);
  const jump = (i) => {
    setHl(i);
    document.getElementById(`tline-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHl(null), 2000);
  };
  return [hl, jump];
}

export function TranscriptLine({ line, hl }) {
  const tagged = line.tags?.length > 0;
  return (
    <div id={`tline-${line.i}`} className={`tline ${tagged ? "tagged" : ""} ${hl ? "hl" : ""}`}>
      <span className="time t-mono c-3">{line.t}</span>
      <div className="col g2 grow">
        <span className="row g6 t-caption">
          <span className={line.speaker === "bracket" ? "c-3" : "c-2"}>{line.who}</span>
          {tagged && <span className="c-info">→ {line.tags.join(" · ")}</span>}
        </span>
        <span className={`t-body-s ${line.speaker === "bracket" ? "c-2" : "c-1"}`}>{line.text}</span>
      </div>
    </div>
  );
}
