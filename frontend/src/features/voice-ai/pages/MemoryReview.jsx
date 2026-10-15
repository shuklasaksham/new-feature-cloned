// Business memory updates from a call — Bracket's consolidated change review (V5.0, M9 mobile).
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { voiceApi, formatApiError } from "../api";
import { useVoice } from "../store";
import Shell from "../components/Shell";
import Icon from "../components/Icon";
import { Badge, Button, Check, Confidence, Eyebrow, IconButton, Skeleton, Ts } from "../components/ui";

const TONE = { Modify: "warning", Add: "info", Conflict: "danger" };

export default function MemoryReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workspace, setWorkspace, toast } = useVoice();
  const [call, setCall] = useState(null);
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    voiceApi.call(id).then((c) => {
      if (c.review_status !== "pending") { navigate(`/voice/calls/${id}`, { replace: true }); return; }
      setCall(c);
      setSelected(Object.fromEntries(c.memory_updates.map((u) => [u.id, true])));
    }).catch((e) => toast(formatApiError(e), { tone: "danger" }));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updates = useMemo(() => call?.memory_updates || [], [call]);
  const chosen = updates.filter((u) => selected[u.id]).map((u) => u.id);
  const conflicts = updates.filter((u) => u.conflict && selected[u.id]).length;
  const tagged = useMemo(() => (call?.transcript || []).filter((l) => l.tags.length || updates.some((u) => u.line === l.i) || updates.some((u) => u.line === l.i + 1)), [call, updates]);
  const before = useMemo(() => {
    const cats = new Set(updates.filter((u) => u.before).map((u) => u.before));
    return (workspace?.memory || []).filter((m) => cats.has(m.statement));
  }, [workspace, updates]);

  if (!call) return <Shell crumb="Review changes"><div className="col g12 page-pad grow"><Skeleton width="40%" /><Skeleton width="60%" /></div></Shell>;

  const accept = async () => {
    setBusy(true);
    try {
      const res = await voiceApi.review(id, chosen);
      setWorkspace(res.workspace);
      toast(`${res.applied.length} memories updated from your call with ${call.contact.first_name}`);
      navigate("/voice/workspace?updated=1");
    } catch (e) { toast(formatApiError(e), { tone: "danger" }); setBusy(false); }
  };
  const dismiss = async () => { await voiceApi.dismissReview(id); toast("Updates dismissed — nothing changed."); navigate(`/voice/calls/${id}`); };
  const all = chosen.length === updates.length;

  return (
    <Shell crumb="Review changes" mobileTitle="Review changes" mobileBack={`/voice/calls/${id}`}>
      <div className="col grow" style={{ gap: 0, minWidth: 0 }}>
        <div className="review-header">
          <IconButton icon="arrow-left" label="Back" onClick={() => navigate(`/voice/calls/${id}`)} className="hide-m" />
          <div className="col g4 grow">
            <span className="row g8 c-warning"><Icon name="phone" /><span className="t-mono">From a call · resolves scope change</span></span>
            <span className="t-title-l">{call.summary?.headline}</span>
            <span className="t-caption c-3">Detected in 1 call ({call.duration}) · {updates.length} proposed updates across {new Set(updates.map((u) => u.category)).size} categories{updates.some((u) => u.conflict) ? " · 1 conflict" : ""}</span>
          </div>
        </div>
        <div className="row top stack-m grow" style={{ gap: 0, minHeight: 0, alignItems: "stretch" }}>
          <div className="col g16 scroll hide-m" style={{ width: 500, flex: "none", padding: "20px 32px 28px 40px", borderRight: "1px solid var(--border-subtle)" }}>
            <Eyebrow>What happened</Eyebrow>
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="row g12 divider-b" style={{ padding: "16px 12px 16px 16px" }}>
                <span className="avatar">{call.contact.initials}</span>
                <span className="col g2 grow"><span className="row g6 t-body-s t-medium">{call.contact.name}<Icon name="phone" size={14} className="c-3" /></span>
                  <span className="t-caption c-3">AI call by Bracket · {call.duration}</span></span>
                <IconButton icon="arrow-right" label="Open full transcript" onClick={() => navigate(`/voice/calls/${id}`)} />
              </div>
              <div className="col g12" style={{ padding: 16 }}>
                {tagged.map((l) => (
                  <div key={l.i} className={`row top g10 ${l.tags.length ? "hl-block" : ""}`}>
                    <span className="t-mono c-3" style={{ width: 40, flex: "none" }}>{l.t}</span>
                    <span className="col g4 grow"><span className="t-caption c-3">{l.who}</span>
                      <span className={`t-body-s ${l.speaker === "bracket" ? "c-2" : ""}`}>{l.text}</span>
                      {l.tags.length > 0 && <span className="t-mono c-warning">→ {updates.filter((u) => u.line === l.i).map((u) => u.category).join(" · ") || l.tags.join(" · ")}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Eyebrow>Compared with what Bracket remembers</Eyebrow>
            <div className="card list-bordered">
              {before.map((m) => (
                <div key={m.id} className="col g8" style={{ padding: "12px 16px" }}>
                  <span className="t-body-s">{m.statement}</span>
                  <span className="chip" style={{ alignSelf: "flex-start" }}><Icon name="file" size={12} />{m.source}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col g12 scroll grow" style={{ padding: "20px 40px 28px 32px" }}>
            <Eyebrow>Bracket’s interpretation</Eyebrow>
            <span className="t-body-m c-1">{call.summary?.text} Nothing changes until you accept.</span>
            <div className="row g12" style={{ paddingTop: 8 }}>
              <Check on={all} label="Select all" onChange={(v) => setSelected(Object.fromEntries(updates.map((u) => [u.id, v])))} />
              <span className="t-body-s t-medium">Proposed updates</span>
              <span className="t-mono c-3">{chosen.length} of {updates.length} selected</span>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              {updates.map((u) => (
                <div key={u.id} className="change">
                  <Check on={!!selected[u.id]} label={`${u.category} update`} onChange={(v) => setSelected((s) => ({ ...s, [u.id]: v }))} />
                  <div className="col g8 grow">
                    <div className="row">
                      <Eyebrow>{u.category}</Eyebrow><Badge tone={TONE[u.type]} dot={false}>{u.type}</Badge><span className="grow" />
                      <span className="hide-m"><Confidence level={u.confidence} /></span>
                    </div>
                    <div className="diff">
                      {u.before && <span className="t-body-s c-3">Was: {u.before}</span>}
                      <span className="t-body-m">{u.after}</span>
                    </div>
                    <div className="row top g8"><span className="t-caption c-3 grow">{u.reason}</span><Ts t={u.t} onClick={() => navigate(`/voice/calls/${id}`)} /></div>
                    {u.conflict && (
                      <div className="row top g8" style={{ padding: "8px 10px", borderRadius: 6, background: "var(--danger-bg)" }}>
                        <Icon name="alert" size={14} className="c-danger" />
                        <span className="t-caption c-2">Conflicts with {u.conflict.by} · {u.conflict.source}: “{u.conflict.quote}” Accepting marks it superseded.</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="action-bar">
          <div className="col g2 grow">
            <span className="t-body-s">{chosen.length} of {updates.length} updates selected{conflicts ? ` · ${conflicts} conflict will be marked superseded` : ""}</span>
            <span className="t-caption c-3 hide-m">Previous versions stay in history and can be restored from the Timeline.</span>
          </div>
          <Button className="hide-m" icon="reply" onClick={() => navigate(`/voice?ask=${encodeURIComponent(`Draft a follow-up email to ${call.contact.first_name}`)}`)}>Draft follow-up to {call.contact.first_name}</Button>
          <Button variant="ghost" className="hide-m" onClick={dismiss}>Dismiss all</Button>
          <Button variant="primary" icon="check" onClick={accept} disabled={busy || chosen.length === 0} style={{ flex: "1 1 auto", maxWidth: 220 }}>
            {busy ? "Updating memory…" : chosen.length ? `Accept ${chosen.length} update${chosen.length > 1 ? "s" : ""}` : "Select an update"}
          </Button>
        </div>
      </div>
    </Shell>
  );
}
