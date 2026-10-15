// Live AI call (V3.4 dialing, V3.5 connected, V3.6 end states, M7 mobile).
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { voiceApi, formatApiError, isEnded } from "../api";
import { useVoice } from "../store";
import Shell from "../components/Shell";
import Icon from "../components/Icon";
import { Badge, Button, Control, Eyebrow, Skeleton, TranscriptLine, Waveform } from "../components/ui";
import { useSpeaker } from "../lib/speech";

const OUTCOME = {
  completed: { icon: "check-circle", tone: "success", title: (c) => `Call completed · ${c.duration}`, body: () => "Writing the summary and checking for memory updates…" },
  no_answer: { icon: "phone-missed", tone: "warning", title: (c) => `${c.contact.first_name} didn’t pick up`, body: () => "Rang for 15s. No voicemail was left (not allowed in Voice settings)." },
  busy: { icon: "phone-off", tone: "warning", title: () => "Line was busy", body: (c) => `${c.contact.first_name} was on another call. You can try again.` },
  failed: { icon: "alert", tone: "danger", title: () => "Call couldn’t connect", body: (c) => `The number ${c.contact.phone} was unreachable. It may be outdated.` },
  canceled: { icon: "x", tone: "neutral", title: () => "Call canceled", body: () => "You ended the call before it connected. Nothing was recorded." },
};

export default function LiveCall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, refresh } = useVoice();
  const [call, setCall] = useState(null);
  const [listenIn, setListenIn] = useState(false);
  const spokenRef = useRef(0);
  const bracketVoice = useSpeaker({ voiceId: "aria" });
  const clientVoice = useSpeaker({ voiceId: "noor" });

  useEffect(() => {
    let alive = true;
    let timer;
    const tick = async () => {
      try {
        const c = await voiceApi.call(id);
        if (!alive) return;
        setCall(c);
        if (c.status === "prepared") { navigate(`/voice/calls/${id}/prepare`, { replace: true }); return; }
        if (!isEnded(c)) timer = setTimeout(tick, 1000);
        else refresh();
      } catch (e) { toast(formatApiError(e), { tone: "danger" }); }
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listening in reads new transcript lines aloud as they arrive.
  useEffect(() => {
    if (!call) return;
    if (!listenIn) { spokenRef.current = call.transcript.length; return; }
    const next = call.transcript[spokenRef.current];
    if (next && !bracketVoice.speaking && !clientVoice.speaking) {
      spokenRef.current += 1;
      (next.speaker === "bracket" ? bracketVoice : clientVoice).speak(next.text);
    }
  }, [call, listenIn, bracketVoice, clientVoice]);

  useEffect(() => {
    if (call?.status === "completed") {
      const t = setTimeout(() => navigate(`/voice/calls/${id}`), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [call?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!call) return <Shell crumb="Call" hideCallChip><div className="col g12 page-pad grow"><Skeleton width="30%" /><Skeleton width="50%" /></div></Shell>;

  const ended = isEnded(call);
  const connected = call.status === "connected";
  const pill = connected ? ["Connected", "var(--success)"] : call.status === "ringing" ? ["Ringing", null] : call.status === "dialing" ? ["Calling", null] : null;
  const line = connected ? `${call.contact.first_name} is ${call.transcript.at(-1)?.speaker === "client" ? "speaking" : "listening"}`
    : call.status === "ringing" ? "Ringing…" : call.status === "dialing" ? `Calling ${call.contact.phone}…` : "";
  const end = async () => { try { setCall(await voiceApi.endCall(id)); bracketVoice.cancel(); clientVoice.cancel(); } catch (e) { toast(formatApiError(e), { tone: "danger" }); } };
  const retry = async () => { const c = await voiceApi.retryCall(id); navigate(`/voice/calls/${c.id}/prepare`); };
  const o = OUTCOME[call.status];

  return (
    <Shell crumb={`Call with ${call.contact.name}`} hideCallChip mobileTitle={`Call with ${call.contact.name}`} mobileBack="/voice/calls">
      <section className="col g20 page-pad grow scroll" aria-label="Call">
        <div className="row g10">
          <span className="iconbox hide-m"><Icon name="phone-outgoing" size={14} /></span>
          <Eyebrow className="hide-m">AI call · outgoing</Eyebrow>
          {pill && <span className="pill">{pill[1] ? <span className="dot" style={{ background: pill[1] }} /> : <Icon name="loader" size={12} spin />}{pill[0]}</span>}
          {ended && <Badge tone={o?.tone}>{{ completed: "Completed", no_answer: "No answer", busy: "Busy", failed: "Failed", canceled: "Canceled" }[call.status]}</Badge>}
          <span className="grow" />
          {connected && call.plan.recording && <span className="row g6 t-mono c-danger"><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--danger)" }} />REC</span>}
          <span className="t-mono c-2">{call.duration}</span>
        </div>

        <div className="col g10" style={{ alignItems: "center", padding: "16px 0" }}>
          <div className={`ring ${call.status === "ringing" || call.status === "dialing" ? "ringing" : ""} ${connected ? "connected" : ""}`}>
            <span className="r3" /><span className="r2" /><span className="r1" /><span className="who">{call.contact.initials}</span>
          </div>
          <span className="t-title-l">{call.contact.name}</span>
          <span className="t-body-s c-3">{call.contact.role.split(" · ")[0]} · {call.contact.company} · <span className="t-mono">{call.contact.phone}</span></span>
          {!ended && <span className="t-body-s c-2">{line}</span>}
          {!ended && <Waveform state={connected ? (call.transcript.at(-1)?.speaker === "client" ? "speaking" : "listening") : "idle"} />}
        </div>

        {ended && o ? (
          <div className="card col g12" style={{ padding: 20, maxWidth: 560, alignSelf: "center", width: "100%" }}>
            <div className="row g12">
              <span className="avatar l" style={{ border: 0, background: `var(--${o.tone === "neutral" ? "bg-selected" : `${o.tone}-bg`})` }}><Icon name={o.icon} className={o.tone === "neutral" ? "c-2" : `c-${o.tone}`} /></span>
              <span className="col g2 grow"><span className="t-title-m">{o.title(call)}</span><span className="t-body-s c-2">{o.body(call)}</span></span>
            </div>
            <div className="row wrap">
              {call.status === "completed" && <Button variant="primary" iconRight="arrow-right" onClick={() => navigate(`/voice/calls/${id}`)}>View summary</Button>}
              {call.status !== "completed" && <Button variant="primary" icon="refresh" onClick={retry}>Try again</Button>}
              {call.status === "no_answer" && <Button icon="mail" onClick={() => navigate(`/voice?ask=${encodeURIComponent(`Draft a follow-up email to ${call.contact.first_name}`)}`)}>Send email instead</Button>}
              {call.status === "failed" && <Button icon="pencil" onClick={() => navigate("/voice/settings")}>Check number</Button>}
            </div>
          </div>
        ) : (
          <div className="card col g8" style={{ padding: 16 }}>
            <div className="row"><Eyebrow>Plan progress</Eyebrow><span className="grow" /><span className="t-caption c-3">{call.progress.filter((p) => p.state === "done").length} of {call.progress.length}</span></div>
            {call.progress.map((p) => (
              <div key={p.text} className="row g10">
                <Icon name={p.state === "done" ? "check-circle" : p.state === "now" ? "audio-lines" : "clock"} size={14} className={p.state === "done" ? "c-success" : p.state === "now" ? "c-1" : "c-dis"} />
                <span className={`t-body-s ${p.state === "todo" ? "c-3" : ""}`}>{p.text}</span>
              </div>
            ))}
          </div>
        )}

        {call.detected.length > 0 && !ended && (
          <div className="row wrap">
            <span className="row g6"><Icon name="sparkles" size={12} className="c-3" /><Eyebrow>Detected live</Eyebrow></span>
            {call.detected.filter((d) => ["Decision", "Deadline", "Requirement"].includes(d.tag)).map((d) => (
              <Badge key={d.tag + d.t} tone={{ Decision: "success", Deadline: "warning", Requirement: "info" }[d.tag]}>{d.tag} · {d.t}</Badge>
            ))}
          </div>
        )}

        {connected && call.transcript.length > 0 && (
          <div className="only-m card col g4" style={{ padding: "10px 12px" }}>
            <span className="t-caption c-2">{call.transcript.at(-1).who} · {call.transcript.at(-1).t}</span>
            <span className="t-body-s">“{call.transcript.at(-1).text}”</span>
          </div>
        )}

        {!ended && (
          <div className="row" style={{ justifyContent: "center", marginTop: "auto" }}>
            <div className="ctrl-bar">
              <Control icon="volume" label={listenIn ? "Listening in" : "Listen in"} variant={listenIn ? "active" : ""} onClick={() => { if (listenIn) { bracketVoice.cancel(); clientVoice.cancel(); } setListenIn((v) => !v); }} />
              <Control icon="keyboard" label="Note" disabled title="Available once a live calling provider is connected" />
              <Control icon="phone" label="Take over" disabled title="Available once a live calling provider is connected" />
              <Control icon="phone-off" label="End call" variant="danger" onClick={end} />
            </div>
          </div>
        )}
      </section>

      <aside className="ctx-panel panel" style={{ width: 400 }} aria-label="Live transcript">
        <div className="row"><Icon name="audio-lines" size={14} /><Eyebrow>{ended ? "Transcript" : "Live transcript"}</Eyebrow><span className="grow" />{!ended && <span className="t-caption c-3">Auto-scroll</span>}</div>
        {call.transcript.length === 0 ? (
          <div className="col g8" style={{ alignItems: "center", textAlign: "center", padding: "64px 16px" }}>
            <Icon name={ended ? "phone-off" : "loader"} size={20} className="c-3" spin={!ended} />
            <span className="t-body-s t-medium c-2">{ended ? "Nothing was said on this call" : `Waiting for ${call.contact.first_name} to answer`}</span>
            {!ended && <span className="t-caption c-3">The transcript appears here as soon as the call connects.</span>}
          </div>
        ) : (
          <div className="col g16">
            {call.transcript.map((ln) => <TranscriptLine key={ln.i} line={ln} />)}
            {connected && <div className="row g8 t-caption c-3" style={{ padding: "8px 10px", border: "1px solid var(--border-subtle)", borderRadius: 6 }}><Icon name="audio-lines" size={14} />Call in progress…</div>}
          </div>
        )}
      </aside>
    </Shell>
  );
}
