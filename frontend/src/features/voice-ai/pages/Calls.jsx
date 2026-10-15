// Voice activity & call history inside Timeline (V6.0, M10 mobile).
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { voiceApi, formatApiError, isLive } from "../api";
import { useVoice } from "../store";
import Shell from "../components/Shell";
import Icon from "../components/Icon";
import { Badge, Button, CallStatusBadge, EmptyState, Eyebrow, IconButton, RecordingUnavailable, Skeleton } from "../components/ui";

const DIR_ICON = (c) => (c.status === "no_answer" ? ["phone-missed", "c-danger"] : c.direction === "incoming" ? ["phone-incoming", "c-2"] : ["phone-outgoing", "c-2"]);
const dayLabel = (iso) => {
  const d = new Date(iso); const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const label = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  return same ? `TODAY · ${label}` : label;
};
const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const outcomeLine = (c) => c.summary?.headline || {
  no_answer: "No answer — try again or send an email", busy: "Line busy — retry when free", failed: "Number unreachable — check the number",
  canceled: "Canceled before it connected", connected: "In progress", ringing: "Ringing…", dialing: "Calling…",
}[c.status] || (c.summarizing ? "Writing summary…" : c.plan.title);

function Detail({ call, onClose }) {
  const navigate = useNavigate();
  const counts = ["decision", "deadline", "requirement", "action_item"].map((k) => [k, (call.summary?.items || []).filter((i) => i.kind === k).length]).filter(([, n]) => n);
  const names = { decision: "decision", deadline: "deadline", requirement: "requirement", action_item: "action item" };
  const again = async () => { const c = await voiceApi.retryCall(call.id); navigate(`/voice/calls/${c.id}/prepare`); };
  return (
    <aside className="ctx-panel panel" style={{ width: 400 }} aria-label="Call detail">
      <div className="row"><Icon name="phone" className="c-2" /><Eyebrow>Call</Eyebrow><span className="grow" /><IconButton icon="x" label="Close" onClick={onClose} /></div>
      <span className="t-title-l">Call with {call.contact.name}</span>
      <div className="col g8">
        {[["When", new Date(call.created_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })],
          ["Direction", "Outgoing · AI call"], ["Duration", call.duration, true], ["Number", call.contact.phone, true], ["Project", call.project.name],
          ["Requested", call.source === "voice" ? "By voice in Ask Bracket" : "From the project workspace"]].map(([k, v, mono]) => (
          <div key={k} className="row top"><span className="t-body-s c-3" style={{ width: 110, flex: "none" }}>{k}</span><span className={mono ? "t-mono" : "t-body-s"}>{v}</span></div>
        ))}
      </div>
      <div className="row"><CallStatusBadge status={call.status} />{call.plan.recording && call.status === "completed" && <Badge>Recorded</Badge>}</div>
      {call.status === "completed" && <RecordingUnavailable />}
      {call.summary && (<><Eyebrow>Summary</Eyebrow><span className="t-body-s c-2">{call.summary.text}</span></>)}
      {counts.length > 0 && <div className="row wrap">{counts.map(([k, n]) => <Badge key={k} dot={false}>{n} {names[k]}{n > 1 ? "s" : ""}</Badge>)}</div>}
      {call.review_status === "pending" && (
        <button className="card row g8" style={{ padding: "10px 12px", textAlign: "left" }} onClick={() => navigate(`/voice/calls/${call.id}/review`)}>
          <Icon name="git-branch" size={14} className="c-warning" /><span className="t-body-s grow">{call.memory_updates.length} memory updates waiting for review</span><Icon name="arrow-right" size={14} />
        </button>
      )}
      {call.review_status === "accepted" && (
        <div className="card row g8" style={{ padding: "10px 12px" }}><Icon name="check-circle" size={14} className="c-success" /><span className="t-body-s c-2">{call.accepted_update_ids.length} memory updates accepted by you</span></div>
      )}
      <span className="grow" />
      <div className="row">
        <Button className="grow" icon="audio-lines" onClick={() => navigate(isLive(call) ? `/voice/calls/${call.id}/live` : `/voice/calls/${call.id}`)}>{isLive(call) ? "Open live call" : "Transcript"}</Button>
        {call.status === "completed" && <Button variant="primary" className="grow" iconRight="arrow-right" onClick={() => navigate(`/voice/calls/${call.id}`)}>Full summary</Button>}
      </div>
      <Button variant="ghost" icon="phone" onClick={again}>Call {call.contact.first_name} again</Button>
    </aside>
  );
}

export default function Calls() {
  const navigate = useNavigate();
  const { toast } = useVoice();
  const [tab, setTab] = useState("calls");
  const [calls, setCalls] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      voiceApi.calls({ q: q || undefined, status: status || undefined })
        .then((list) => { setCalls(list); setSelected((s) => (s && list.some((c) => c.id === s) ? s : list[0]?.id || null)); })
        .catch((e) => toast(formatApiError(e), { tone: "danger" }));
    }, 200);
    return () => clearTimeout(t);
  }, [q, status, toast]);
  useEffect(() => { voiceApi.sessions().then(setSessions).catch(() => {}); }, []);

  const groups = useMemo(() => {
    const out = [];
    for (const c of calls || []) {
      const label = dayLabel(c.created_at);
      const g = out.find((x) => x.label === label) || (out.push({ label, items: [] }), out[out.length - 1]);
      g.items.push(c);
    }
    return out;
  }, [calls]);
  const current = calls?.find((c) => c.id === selected);
  const open = (c) => {
    if (window.matchMedia("(max-width: 767px)").matches) navigate(isLive(c) || c.status !== "completed" ? `/voice/calls/${c.id}/live` : `/voice/calls/${c.id}`);
    else setSelected(c.id);
  };

  return (
    <Shell crumb="Timeline  ›  Calls">
      <section className="col g20 page-pad scroll grow" aria-label="Calls">
        <div className="col g4">
          <span className="t-title-l">Timeline</span>
          <span className="t-body-s c-3 hide-m">Everything Bracket saw and did in this workspace — including every call it made for you.</span>
        </div>
        <div className="tabs">
          <button className={`tab ${tab === "calls" ? "active" : ""}`} onClick={() => setTab("calls")}>Calls <span className="c-3">{calls?.length ?? ""}</span></button>
          <button className={`tab ${tab === "voice" ? "active" : ""}`} onClick={() => setTab("voice")}>Voice sessions <span className="c-3">{sessions.length}</span></button>
        </div>
        {tab === "calls" ? (
          <>
            <div className="row wrap">
              <label className="row g8 select" style={{ width: 220 }}><Icon name="search" size={14} className="c-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search calls and transcripts" aria-label="Search calls"
                  style={{ background: "none", border: 0, outline: "none", width: "100%", fontSize: 12 }} /></label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option><option value="completed">Completed</option><option value="no_answer">No answer</option>
                <option value="busy">Busy</option><option value="failed">Failed</option><option value="canceled">Canceled</option>
              </select>
              <select className="select" disabled aria-label="Direction" title="Incoming calls arrive with a live calling provider"><option>Outgoing</option></select>
            </div>
            {calls === null ? <div className="col g12"><Skeleton /><Skeleton width="80%" /><Skeleton width="60%" /></div> : calls.length === 0 ? (
              <EmptyState icon="phone" title={q || status ? "No calls match" : "No calls yet"}
                action={!q && !status && <Button variant="primary" icon="phone" onClick={() => navigate("/voice/workspace")}>Call a client</Button>}>
                {q || status ? "Try a different search or filter." : "Ask Bracket to call a client, or use Call client in the project overview."}
              </EmptyState>
            ) : groups.map((g) => (
              <div key={g.label} className="col g2">
                <div style={{ paddingBottom: 8 }}><Eyebrow>{g.label}</Eyebrow></div>
                {g.items.map((c) => {
                  const [ic, cls] = DIR_ICON(c);
                  return (
                    <button key={c.id} className="row g12" onClick={() => open(c)}
                      style={{ padding: "10px 12px", borderRadius: 6, textAlign: "left", background: selected === c.id ? "var(--bg-selected)" : undefined }}>
                      <span className="iconbox l" style={{ background: "var(--bg-raised)", border: "1px solid var(--border-subtle)" }}><Icon name={ic} size={14} className={cls} /></span>
                      <span className="col g2" style={{ width: 180, flex: "none" }}><span className="t-body-s t-medium">{c.contact.name}</span><span className="t-caption c-3 hide-m">{c.project.name}</span></span>
                      <span className="t-body-s c-2 grow">{outcomeLine(c)}</span>
                      <span className="t-mono c-3 hide-m" style={{ width: 52 }}>{timeOf(c.created_at)}</span>
                      <span className="t-mono c-3 hide-m" style={{ width: 44 }}>{c.duration}</span>
                      <CallStatusBadge status={c.status} />
                      <Icon name="chevron-right" className="c-3 hide-m" />
                    </button>
                  );
                })}
              </div>
            ))}
          </>
        ) : (
          sessions.length === 0 ? <EmptyState icon="audio-lines" title="No voice sessions yet">Press the mic in Ask Bracket or ⌘⇧V and ask anything about this workspace.</EmptyState> : (
            <div className="col g2">
              {sessions.map((s) => (
                <button key={s.id} className="row g12" style={{ padding: "10px 12px", borderRadius: 6, textAlign: "left" }} onClick={() => navigate("/voice")}>
                  <span className="t-mono c-3" style={{ width: 52 }}>{timeOf(s.created_at)}</span>
                  <span className="col g2 grow"><span className="t-body-s">{s.title}</span><span className="t-caption c-3">{s.turns.length} turns</span></span>
                  <Icon name={s.turns?.[0]?.mode === "voice" ? "audio-lines" : "ask"} className="c-3" />
                </button>
              ))}
            </div>
          )
        )}
      </section>
      {tab === "calls" && current && <Detail call={current} onClose={() => setSelected(null)} />}
    </Shell>
  );
}
