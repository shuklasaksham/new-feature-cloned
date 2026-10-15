// Call preparation (V3.2) + confirm call (V3.3 desktop modal / M6 mobile sheet).
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { voiceApi, formatApiError, isLive } from "../api";
import { useVoice } from "../store";
import Shell from "../components/Shell";
import Icon from "../components/Icon";
import { Badge, Button, Check, ContactCard, Eyebrow, IconButton, Modal, Skeleton, SourceMark } from "../components/ui";
import { useRecognition, speechSupported } from "../lib/speech";

const YES = /\b(yes|yeah|yep|call (her|him|them)|go ahead|do it|confirm)\b/i;

function ConfirmCall({ call, onClose, onCalled }) {
  const { toast } = useVoice();
  const [notify, setNotify] = useState(true);
  const [simulate, setSimulate] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      const c = await voiceApi.confirmCall(call.id, { notify, simulate: simulate || undefined });
      onCalled(c);
    } catch (e) { toast(formatApiError(e), { tone: "danger" }); setBusy(false); }
  };
  const rec = useRecognition({ onFinal: (t) => { if (YES.test(t)) { rec.stop(); confirm(); } } });
  useEffect(() => () => rec.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = [
    ["To", `${call.contact.name} · ${call.contact.role.split(" · ")[0]}, ${call.contact.company}`],
    ["Number", call.contact.phone, true],
    ["About", call.project.name],
    ["Objective", call.plan.objective],
    ["Introduces as", call.plan.introduces_as],
    ["Recording", call.plan.recording ? "On — announced at the start of the call" : "Off"],
    ["Limits", `Max ${call.plan.max_minutes} min · can’t agree to dates or pricing`],
  ];
  return (
    <Modal onClose={onClose} label={`Call ${call.contact.name} now?`}>
      <div className="row g12">
        <span className="iconbox l"><Icon name="phone-outgoing" /></span>
        <span className="t-title-m grow">Call {call.contact.name} now?</span>
        <IconButton icon="x" label="Close" onClick={onClose} />
      </div>
      <span className="t-body-s c-2">Bracket will place the call on your behalf and follow the plan you approved. You can listen in at any time.</span>
      <div className="card list-bordered" style={{ overflow: "hidden" }}>
        {rows.map(([k, v, mono]) => (
          <div key={k} className="row top g12" style={{ padding: "9px 14px" }}>
            <span className="t-caption c-3" style={{ width: 96, flex: "none" }}>{k}</span>
            <span className={mono ? "t-mono" : "t-body-s"}>{v}</span>
          </div>
        ))}
      </div>
      <label className="row g10"><Check on={notify} onChange={setNotify} label="Notify me" /><span className="t-body-s c-2">Notify me when the call ends and the summary is ready</span></label>
      <label className="row g10 t-caption c-3">
        <Icon name="info" size={14} />Calls are simulated until a calling provider is connected. Outcome:
        <select className="select" value={simulate} onChange={(e) => setSimulate(e.target.value)} aria-label="Simulated outcome">
          <option value="">Default</option><option value="completed">Completed</option><option value="no_answer">No answer</option>
          <option value="busy">Busy</option><option value="failed">Failed</option>
        </select>
      </label>
      <div className="row" style={{ paddingTop: 4 }}>
        {speechSupported && (
          <button className={`suggest ${rec.listening ? "primary" : ""}`} onClick={() => (rec.listening ? rec.stop() : rec.start())}>
            <Icon name="mic" size={12} />{rec.listening ? "Listening for “yes, call her”…" : "Or say “yes, call her”"}
          </button>
        )}
        <span className="grow" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon="phone" onClick={confirm} disabled={busy}>{busy ? "Calling…" : "Call now"}</Button>
      </div>
    </Modal>
  );
}

export default function CallPrep() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { workspace, toast, refresh } = useVoice();
  const [call, setCall] = useState(null);
  const [plan, setPlan] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(params.get("confirm") === "1");
  const [pickContact, setPickContact] = useState(false);
  const dragFrom = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    voiceApi.call(id).then((c) => {
      if (c.status !== "prepared") { navigate(isLive(c) ? `/voice/calls/${id}/live` : `/voice/calls/${id}`, { replace: true }); return; }
      setCall(c); setPlan(c.plan);
    }).catch((e) => toast(formatApiError(e), { tone: "danger" }));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (next) => {
    setPlan(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const c = await voiceApi.editPlan(id, { objective: next.objective, instructions: next.instructions, talking_points: next.talking_points, questions: next.questions });
        setCall(c);
      } catch (e) { toast(formatApiError(e), { tone: "danger" }); }
    }, 500);
  };
  const setPoints = (pts) => save({ ...plan, talking_points: pts });

  const changeContact = async (contactId) => {
    setPickContact(false);
    const c = await voiceApi.editPlan(id, { contact_id: contactId });
    setCall(c); setPlan(c.plan);
  };

  if (!call || !plan) {
    return <Shell crumb="Call preparation"><div className="col g12 page-pad grow"><Skeleton width="40%" /><Skeleton width="70%" /><Skeleton width="60%" /></div></Shell>;
  }

  const ws = workspace;
  const section = (title, right, children) => (
    <div className="col g10">
      <div className="row"><Eyebrow>{title}</Eyebrow><span className="grow" />{right}</div>
      {children}
    </div>
  );
  const aiTag = (t) => <span className="row g4 t-caption c-3"><Icon name="sparkles" size={12} />{t}</span>;

  return (
    <Shell crumb="Call preparation" mobileTitle="Call preparation" mobileBack="/voice">
      <div className="col grow" style={{ minWidth: 0, gap: 0 }}>
        <div className="review-header">
          <IconButton icon="arrow-left" label="Back" onClick={() => navigate(-1)} className="hide-m" />
          <div className="col g4 grow">
            <span className="row g6">{aiTag("")}<Eyebrow>Call plan · drafted by Bracket{call.source === "voice" ? " from your voice request" : ""}</Eyebrow></span>
            <span className="t-title-l">{plan.title}</span>
            {call.request_text && <span className="t-caption c-3">“{call.request_text}” · {call.project.name}</span>}
          </div>
          <Badge tone="info">Ready to review</Badge>
          <Button variant="ghost" icon="mic" className="hide-m" onClick={() => navigate("/voice?voice=1")}>Edit by voice</Button>
        </div>
        <div className="row top stack-m grow" style={{ gap: 0, minHeight: 0, alignItems: "stretch" }}>
          <div className="col g24 page-pad scroll grow">
            {section("Calling", <div style={{ position: "relative" }}>
              <Button variant="ghost" size="s" onClick={() => setPickContact((v) => !v)}>Change contact</Button>
              {pickContact && (
                <div className="popover col g8" style={{ right: 0, top: 32, width: 340, padding: 12 }}>
                  {ws?.contacts.filter((c) => c.authorized).map((c) => (
                    <ContactCard key={c.id} contact={c} selected={c.id === call.contact.id} onClick={() => changeContact(c.id)} />
                  ))}
                </div>
              )}
            </div>, (
              <div className="row top g12 stack-m">
                <div className="grow"><ContactCard contact={call.contact} /></div>
                <div className="card col g6 grow" style={{ padding: "12px 16px" }}>
                  {[["Best time", call.contact.best_time], ["Last contact", call.contact.last_contact], ["Language", ws?.settings?.language || "English"]].map(([k, v]) => (
                    <div key={k} className="row top"><span className="t-caption c-3" style={{ width: 84, flex: "none" }}>{k}</span><span className="t-caption c-2">{v}</span></div>
                  ))}
                </div>
              </div>
            ))}
            {section("Objective", aiTag("AI-generated · editable"), (
              <textarea className="field t-body-m" rows={2} value={plan.objective} aria-label="Objective" onChange={(e) => save({ ...plan, objective: e.target.value })} />
            ))}
            {section(`Talking points · ${plan.talking_points.length}`, <Button variant="ghost" size="s" icon="plus"
              onClick={() => { const pts = [...plan.talking_points, { id: `tp${Date.now()}`, text: "New talking point" }]; setPoints(pts); setEditing(pts.length - 1); }}>Add point</Button>, (
              <div className="col g2">
                {plan.talking_points.map((p, i) => (
                  <div key={p.id} className="row g8" draggable onDragStart={() => { dragFrom.current = i; }} onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { const from = dragFrom.current; if (from == null || from === i) return; const pts = [...plan.talking_points]; const [m] = pts.splice(from, 1); pts.splice(i, 0, m); setPoints(pts); }}
                    style={{ padding: 8, borderRadius: 6, background: editing === i ? "var(--bg-surface)" : undefined, border: editing === i ? "1px solid var(--border-strong)" : "1px solid transparent" }}>
                    <Icon name="grip" className="c-3" style={{ cursor: "grab" }} />
                    <span className="cite" style={{ background: "var(--bg-selected)", color: "var(--text-2)" }}>{i + 1}</span>
                    {editing === i ? (
                      <input autoFocus className="field inline t-body-s grow" value={p.text} aria-label={`Talking point ${i + 1}`}
                        onChange={(e) => setPoints(plan.talking_points.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                        onBlur={() => setEditing(null)} onKeyDown={(e) => e.key === "Enter" && setEditing(null)} />
                    ) : <span className="t-body-s grow">{p.text}</span>}
                    {editing === i ? <span className="t-caption c-3">↵ Save</span> : (
                      <>
                        <IconButton icon="pencil" label="Edit point" onClick={() => setEditing(i)} />
                        <IconButton icon="trash" label="Remove point" onClick={() => setPoints(plan.talking_points.filter((_, j) => j !== i))} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {section("Call instructions", null, (
              <div className="col g10">
                <textarea className="field t-body-s" rows={3} value={plan.instructions} aria-label="Call instructions" onChange={(e) => save({ ...plan, instructions: e.target.value })} />
                <div className="row wrap"><Badge dot={false}>Tone · Friendly</Badge><Badge dot={false}>Max {plan.max_minutes} min</Badge><Badge dot={false}>{plan.recording ? "Recording on · announced" : "Not recorded"}</Badge></div>
              </div>
            ))}
            {section("Questions Bracket will ask", aiTag("From pending decisions"), (
              <div className="col g2">
                {plan.questions.map((q, i) => (
                  <label key={q.id} className="row g10" style={{ padding: "6px 8px" }}>
                    <Check on={q.selected} label={q.text} onChange={(v) => save({ ...plan, questions: plan.questions.map((x, j) => (j === i ? { ...x, selected: v } : x)) })} />
                    <span className={`t-body-s ${q.selected ? "c-1" : "c-3"}`}>{q.text}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <aside className="panel col g20 scroll" style={{ width: 420, maxWidth: "100%", flex: "none", padding: 24 }}>
            <div className="row"><Eyebrow>Context Bracket will use</Eyebrow><span className="grow" /><span className="t-caption c-3">From memory</span></div>
            <div className="card col g8" style={{ padding: 16 }}>
              <div className="row"><Icon name="layers" /><span className="t-body-s t-medium grow">{ws?.project.name}</span>
                <Badge tone={ws?.project.launch_status === "at_risk" ? "danger" : "success"}>{ws?.project.launch_status === "at_risk" ? "At risk" : "On track"}</Badge></div>
              {[["Launch", ws?.project.launch_date], ["Scope", ws?.memory.find((m) => m.id === "scope")?.statement], ["Direction", "Editorial homepage · approved Oct 6"]].map(([k, v]) => (
                <div key={k} className="row top"><span className="t-caption c-3" style={{ width: 72, flex: "none" }}>{k}</span><span className="t-caption c-2">{v}</span></div>
              ))}
            </div>
            {[["Recent conversations", ws?.conversations.map((c) => ({ src: c.provider, title: c.title, meta: c.meta }))],
              ["Pending decisions & approvals", ws?.approvals.filter((a) => a.status !== "done").map((a) => ({ title: a.title, meta: a.meta, badge: a.status === "pending" ? ["Pending", "warning"] : ["Open", null] }))],
              ["Outstanding deliverables", ws?.deliverables.map((d) => ({ title: d.title, meta: d.meta, badge: [d.badge, d.tone] }))]].map(([title, rows]) => (
              <div key={title} className="col g6">
                <Eyebrow>{title} · {rows?.length || 0}</Eyebrow>
                {(rows || []).map((r) => (
                  <div key={r.title} className="row g10" style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
                    {r.src ? <SourceMark provider={r.src} /> : <Icon name="clock" size={14} className="c-3" />}
                    <span className="col g2 grow"><span className="t-body-s">{r.title}</span><span className="t-caption c-3">{r.meta}</span></span>
                    {r.badge && <Badge tone={r.badge[1]}>{r.badge[0]}</Badge>}
                  </div>
                ))}
              </div>
            ))}
          </aside>
        </div>
        <div className="action-bar">
          <Icon name="shield-check" className="c-3 hide-m" />
          <div className="col g2 grow hide-m">
            <span className="t-body-s c-2">Bracket introduces itself as “{plan.introduces_as}”</span>
            <span className="t-caption c-3">Calls from {plan.caller_id} · {plan.recording ? "Recording on, announced at start" : "Not recorded"} · Can’t agree to dates or pricing</span>
          </div>
          <Button variant="ghost" onClick={async () => { await voiceApi.cancelCall(id); refresh(); navigate("/voice"); }}>Cancel</Button>
          <span className="t-caption c-3 hide-m">Edits save automatically</span>
          <Button variant="primary" icon="phone" onClick={() => setConfirmOpen(true)} style={{ flex: "1 1 auto", maxWidth: 200 }}>Confirm &amp; call</Button>
        </div>
      </div>
      {confirmOpen && <ConfirmCall call={{ ...call, plan }} onClose={() => setConfirmOpen(false)} onCalled={(c) => { refresh(); navigate(`/voice/calls/${c.id}/live`); }} />}
    </Shell>
  );
}
