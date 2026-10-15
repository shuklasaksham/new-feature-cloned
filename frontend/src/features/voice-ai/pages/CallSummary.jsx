// Post-call summary & intelligence (V4.0 generating, V4.1 summary, M8 mobile).
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { voiceApi, formatApiError, isLive } from "../api";
import { useVoice } from "../store";
import Shell from "../components/Shell";
import Icon from "../components/Icon";
import {
  Badge, Banner, Button, Check, Eyebrow, IconButton, RecordingUnavailable, Skeleton, TranscriptLine, Ts, useHighlight,
} from "../components/ui";

const SECTIONS = [
  ["decision", "check-circle", "Decisions"],
  ["requirement", "plus", "New requirements"],
  ["scope_change", "git-branch", "Scope changes"],
  ["action_item", "list-checks", "Action items"],
  ["deadline", "calendar", "Updated deadlines"],
  ["followup", "sparkles", "Follow-up recommended"],
  ["feedback", "messages", "Client feedback"],
];

export default function CallSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useVoice();
  const [call, setCall] = useState(null);
  const [tab, setTab] = useState("summary");
  const [done, setDone] = useState({});
  const [hl, jump] = useHighlight();

  useEffect(() => {
    let alive = true; let timer;
    const load = async () => {
      try {
        const c = await voiceApi.call(id);
        if (!alive) return;
        if (c.status === "prepared") { navigate(`/voice/calls/${id}/prepare`, { replace: true }); return; }
        if (isLive(c) || (c.status !== "completed")) { navigate(`/voice/calls/${id}/live`, { replace: true }); return; }
        setCall(c);
        if (c.summarizing) timer = setTimeout(load, 1500);
      } catch (e) { toast(formatApiError(e), { tone: "danger" }); }
    };
    load();
    return () => { alive = false; clearTimeout(timer); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!call) return <Shell crumb="Call summary"><div className="col g12 page-pad grow"><Skeleton width="40%" /><Skeleton width="60%" /></div></Shell>;

  const s = call.summary;
  const items = (kind) => (s?.items || []).filter((i) => i.kind === kind);
  const jumpTo = (line) => { setTab("transcript"); setTimeout(() => jump(line), 50); };
  const ask = (text) => navigate(`/voice?ask=${encodeURIComponent(text)}`);
  const pending = call.review_status === "pending";

  const transcript = (
    <div className="col g16">
      <div className="row"><Eyebrow>Transcript · {call.transcript.length} turns</Eyebrow></div>
      {call.transcript.map((ln) => <TranscriptLine key={ln.i} line={ln} hl={hl === ln.i} />)}
    </div>
  );

  const renderItem = (it, idx) => {
    if (it.kind === "scope_change" || it.kind === "deadline") {
      return (
        <div key={idx} className="diff">
          <span className="t-body-s c-3 strike">{it.before}</span>
          <div className="row top"><span className="t-body-s grow">{it.after}</span><Ts t={it.t} onClick={() => jumpTo(it.line)} /></div>
        </div>
      );
    }
    if (it.kind === "action_item") {
      const key = `${it.line}-${it.text}`;
      return (
        <div key={idx} className="row top g10">
          <Check on={!!done[key]} label={it.text} onChange={(v) => setDone((d) => ({ ...d, [key]: v }))} />
          <span className="col g2 grow"><span className={`t-body-s ${done[key] ? "c-3 strike" : ""}`}>{it.text}</span><span className="t-caption c-3">{it.owner}</span></span>
          <Ts t={it.t} onClick={() => jumpTo(it.line)} />
        </div>
      );
    }
    if (it.kind === "feedback") {
      return (
        <div key={idx} className="col g6 quote">
          <span className="t-body-s">{it.text}</span>
          <div className="row"><Badge tone="success">{it.sentiment}</Badge><Ts t={it.t} onClick={() => jumpTo(it.line)} /></div>
        </div>
      );
    }
    if (it.kind === "followup") {
      return (
        <div key={idx} className="row g8">
          <span className="t-body-s grow">{it.text}</span>
          <Button size="s" icon={it.action === "draft_email" ? "mail" : "messages"}
            onClick={() => ask(it.action === "draft_email" ? `Draft a follow-up email to ${call.contact.first_name}` : "Draft an email to James about the new launch date")}>Draft</Button>
        </div>
      );
    }
    return (
      <div key={idx} className="row top g8"><span className="t-body-s grow">{it.text}</span><Ts t={it.t} onClick={() => jumpTo(it.line)} /></div>
    );
  };

  const cards = SECTIONS.map(([kind, icon, title]) => {
    const list = items(kind);
    if (!list.length) return null;
    return (
      <div key={kind} className="card col g10" style={{ padding: 16 }}>
        <div className="row"><Icon name={icon} size={14} className="c-2" /><Eyebrow>{title}</Eyebrow><span className="t-caption c-3">{list.length}</span></div>
        {list.map(renderItem)}
      </div>
    );
  }).filter(Boolean);
  const half = Math.ceil(cards.length / 2);

  return (
    <Shell crumb={`Timeline  ›  Call with ${call.contact.name}`} mobileTitle="Call summary" mobileBack="/voice/calls">
      <div className="col grow" style={{ gap: 0, minWidth: 0 }}>
        <div className="review-header">
          <IconButton icon="arrow-left" label="Back" onClick={() => navigate("/voice/calls")} className="hide-m" />
          <div className="col g4 grow">
            <span className="row g8"><Icon name="phone" className="c-2" /><Eyebrow>Call summary</Eyebrow>{call.summarizing ? <Badge tone="info">Summarizing</Badge> : <Badge tone="success">Completed</Badge>}</span>
            <span className="t-title-l">{s ? s.headline : `Call with ${call.contact.name} ended · ${call.duration}`}</span>
            <span className="t-caption c-3">Outgoing AI call with {call.contact.name} · {new Date(call.ended_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })} · {call.duration} · {call.project.name}{call.source === "voice" ? " · requested by voice" : ""}</span>
          </div>
          <div className="row hide-m">
            <Button icon="mail" disabled={!s} onClick={() => ask(`Draft a follow-up email to ${call.contact.first_name}`)}>Draft follow-up</Button>
            {pending && <Button variant="primary" iconRight="arrow-right" onClick={() => navigate(`/voice/calls/${id}/review`)}>Review {call.memory_updates.length} memory updates</Button>}
            {call.review_status === "accepted" && <Badge tone="success">{call.accepted_update_ids.length} updates accepted</Badge>}
          </div>
        </div>
        <div className="only-m" style={{ padding: "8px 16px 0" }}>
          <div className="tabs grow">{[["summary", "Summary"], ["transcript", `Transcript · ${call.transcript.length}`]].map(([k, l]) => (
            <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>))}</div>
        </div>
        <div className="row top stack-m grow" style={{ gap: 0, minHeight: 0, alignItems: "stretch" }}>
          <div className={`col g16 scroll ${tab === "transcript" ? "" : "hide-m"}`} style={{ width: 500, maxWidth: "100%", flex: "none", padding: "20px 32px 28px 40px", borderRight: "1px solid var(--border-subtle)" }}>
            <Eyebrow>Recording</Eyebrow>
            <RecordingUnavailable />
            {transcript}
          </div>
          <div className={`col g16 scroll grow ${tab === "summary" ? "" : "hide-m"}`} style={{ padding: "20px 40px 28px 32px" }}>
            {!s ? (
              <>
                <span className="row g8 t-body-s c-2"><Icon name="loader" spin />Bracket is writing the summary — usually about 20 seconds</span>
                <div className="card col g8" style={{ padding: 16 }}>
                  {[[1, `Transcript finalized · ${call.transcript.length} turns`], [0, "Extracting decisions, deadlines and action items"], [0, "Comparing with what Bracket remembers"]].map(([d, t]) => (
                    <span key={t} className="row g8 t-body-s"><Icon name={d ? "check-circle" : "loader"} size={14} spin={!d} className={d ? "c-success" : "c-3"} /><span className={d ? "c-2" : "c-3"}>{t}</span></span>
                  ))}
                </div>
                <div className="two-col">{[0, 1, 2, 3].map((k) => <div key={k} className="card col g12" style={{ padding: 16 }}><Skeleton /><Skeleton width="80%" /><Skeleton width="60%" /></div>)}</div>
                <span className="t-caption c-3">You can leave this page — you’ll get a notification when it’s ready.</span>
              </>
            ) : (
              <>
                <span className="row g6"><Icon name="sparkles" size={12} className="c-3" /><Eyebrow>AI summary</Eyebrow></span>
                <span className="t-body-m">{s.text}</span>
                {pending && <Banner tone="info" title={`${call.memory_updates.length} memory updates found in this call`}>Nothing changes in the workspace until you review them.</Banner>}
                {call.review_status === "accepted" && <Banner tone="neutral" icon="check-circle" title={`${call.accepted_update_ids.length} memory updates accepted`}>The workspace reflects what was agreed on this call.</Banner>}
                <div className="two-col">
                  <div className="col g16">{cards.slice(0, half)}</div>
                  <div className="col g16">{cards.slice(half)}</div>
                </div>
              </>
            )}
          </div>
        </div>
        {pending && (
          <div className="action-bar only-m">
            <span className="t-caption c-3 grow">{call.memory_updates.length} memory updates found in this call</span>
            <Button variant="primary" icon="check" className="block" onClick={() => navigate(`/voice/calls/${id}/review`)}>Review {call.memory_updates.length} updates</Button>
          </div>
        )}
      </div>
    </Shell>
  );
}
