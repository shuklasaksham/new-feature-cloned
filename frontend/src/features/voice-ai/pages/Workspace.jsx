// Project overview with "Call client" (V3.0), updated memory (V5.1) and mobile updates (M11).
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { voiceApi, formatApiError } from "../api";
import { useVoice } from "../store";
import Shell from "../components/Shell";
import Icon from "../components/Icon";
import { Badge, Button, ContactCard, Eyebrow, IconButton, Skeleton } from "../components/ui";

function CallClient({ onClose }) {
  const { workspace, toast } = useVoice();
  const navigate = useNavigate();
  const ref = useRef(null);
  const contacts = workspace.contacts.filter((c) => c.authorized || !workspace.settings.only_authorized);
  const [pick, setPick] = useState(contacts[0]?.id);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);
  const prepare = async () => {
    setBusy(true);
    try { const c = await voiceApi.prepareCall(pick, "", "workspace"); navigate(`/voice/calls/${c.id}/prepare`); }
    catch (e) { toast(formatApiError(e), { tone: "danger" }); setBusy(false); }
  };
  const shown = contacts.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} className="popover col" style={{ right: 0, top: 40, width: 380 }} role="dialog" aria-label="Call client">
      <div className="col g4" style={{ padding: "14px 16px 12px" }}>
        <div className="row"><Icon name="phone" /><span className="t-title-s grow">Call about this project</span><IconButton icon="x" label="Close" onClick={onClose} /></div>
        <span className="t-caption c-3">Bracket prepares the call from this workspace’s memory. You review before it dials.</span>
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <label className="row g8 field inline"><Icon name="search" size={14} className="c-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${workspace.project.client} contacts`} aria-label="Search contacts" style={{ background: "none", border: 0, outline: "none", width: "100%" }} /></label>
      </div>
      <div className="col g8 scroll" style={{ padding: "0 16px 16px", maxHeight: 360 }}>
        <Eyebrow>{workspace.project.client} · authorized</Eyebrow>
        {shown.map((c) => <ContactCard key={c.id} contact={c} selected={pick === c.id} onClick={() => setPick(c.id)} project={workspace.project.name} />)}
        {shown.length === 0 && <span className="t-body-s c-3">No authorized contacts match.</span>}
      </div>
      <div className="row divider-t" style={{ padding: "12px 16px", background: "var(--bg-surface)" }}>
        <Icon name="lock" size={14} className="c-3" /><span className="t-caption c-3 grow">Only contacts allowed in Voice settings</span>
        <Button variant="primary" size="s" iconRight="arrow-right" onClick={prepare} disabled={!pick || busy}>Prepare call</Button>
      </div>
    </div>
  );
}

export default function Workspace() {
  const { workspace, refresh } = useVoice();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [calling, setCalling] = useState(false);
  const [calls, setCalls] = useState([]);
  useEffect(() => { voiceApi.calls().then(setCalls).catch(() => {}); }, [workspace?.unread]);
  useEffect(() => { if (params.get("updated")) refresh(); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!workspace) return <Shell crumb="Overview"><div className="col g12 page-pad grow"><Skeleton width="40%" /><Skeleton width="70%" /></div></Shell>;
  const p = workspace.project;
  const reviews = calls.filter((c) => c.review_status === "pending");
  const blockers = workspace.blockers.filter((b) => !b.resolved);
  const attention = reviews.length + blockers.length;
  const showUpdates = params.get("updates") === "1";
  const canCall = workspace.settings.voice_enabled && workspace.settings.calling_enabled;

  return (
    <Shell crumb={null}>
      <section className="col g24 page-pad scroll grow" aria-label="Project overview">
        <div className="col g8">
          <div className="row wrap">
            <span className="t-title-l">{p.name}</span>
            {p.updated_from_call && <span className="pill" style={{ background: "var(--success-bg)", borderColor: "transparent", color: "var(--success)" }}><Icon name="check-circle" size={12} />Updated from call</span>}
            <span className="grow" />
            {canCall && (
              <div style={{ position: "relative" }}>
                <Button icon="phone" onClick={() => setCalling((v) => !v)}>Call client</Button>
                {calling && <CallClient onClose={() => setCalling(false)} />}
              </div>
            )}
          </div>
          <span className="t-body-m c-2" style={{ maxWidth: 760 }}>{p.summary}</span>
        </div>

        {showUpdates && (
          <div className="card col only-m" style={{ padding: 0 }}>
            <div className="row divider-b" style={{ padding: "12px 16px" }}><span className="t-title-s grow">Updates</span>
              <Button variant="ghost" size="s" onClick={async () => { await voiceApi.markNotificationsRead(); refresh(); }}>Mark all read</Button></div>
            {(workspace.notifications || []).map((n) => (
              <button key={n.id} className="row top g12" style={{ padding: "10px 16px", textAlign: "left" }} onClick={() => navigate(n.href)}>
                <Icon name={n.icon} className={n.tone ? `c-${n.tone}` : "c-2"} /><span className="col g2 grow"><span className="t-body-s">{n.title}</span><span className="t-caption c-3">{n.meta}</span></span>
              </button>
            ))}
            {!workspace.notifications?.length && <span className="t-body-s c-3" style={{ padding: 16 }}>No updates yet.</span>}
          </div>
        )}

        <div className="row top g24 stack-m">
          <div className="col g24 grow">
            <div className="col g12">
              <div className="row"><span className="t-title-s">Needs your attention</span><span className="t-caption c-3">{attention}</span></div>
              <div className="card list-bordered" style={{ overflow: "hidden" }}>
                {reviews.map((c) => (
                  <div key={c.id} className="row top g12" style={{ padding: 16 }}>
                    <Icon name="git-branch" className="c-warning" />
                    <span className="col g4 grow">
                      <span className="t-caption c-warning">Memory review · from a call</span>
                      <span className="t-title-s">{c.summary?.headline}</span>
                      <span className="t-body-s c-3">{c.memory_updates.length} proposed updates from your call with {c.contact.name}.</span>
                    </span>
                    <Button size="s" onClick={() => navigate(`/voice/calls/${c.id}/review`)}>Review {c.memory_updates.length} changes</Button>
                  </div>
                ))}
                {blockers.map((b) => (
                  <div key={b.id} className="row top g12" style={{ padding: 16 }}>
                    <Icon name={b.tone === "danger" ? "clock" : "alert"} className={b.tone === "danger" ? "c-3" : "c-warning"} />
                    <span className="col g4 grow"><span className="t-title-s">{b.title}</span><span className="t-body-s c-3">{b.meta}</span></span>
                    <Badge tone={b.tone}>{b.badge}</Badge>
                  </div>
                ))}
                {attention === 0 && <span className="t-body-s c-3" style={{ padding: 16 }}>Nothing needs you right now.</span>}
              </div>
            </div>
            <div className="col g12">
              <div className="row"><span className="t-title-s">Coming up</span><span className="t-caption c-3">{workspace.commitments.length}</span></div>
              <div className="card list-bordered" style={{ overflow: "hidden" }}>
                {workspace.commitments.map((c) => (
                  <div key={c.id} className="row g12" style={{ padding: "12px 16px" }}>
                    <span className="t-mono c-2" style={{ width: 84, flex: "none" }}>{c.date}</span>
                    <span className="t-body-s t-medium">{c.title}</span>
                    <span className="t-caption c-3 grow hide-m">{c.note}</span>
                    {c.badge && <Badge tone={c.tone}>{c.badge}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col g24" style={{ width: 380, maxWidth: "100%", flex: "none" }}>
            <div className="col g12">
              <div className="row"><span className="t-title-s">Memory</span><span className="t-caption c-3">{p.memory_count}</span></div>
              <div className="card list-bordered" style={{ overflow: "hidden" }}>
                {workspace.memory.slice(-6).reverse().map((m) => (
                  <div key={m.id} className="col g2" style={{ padding: "10px 16px" }}><span className="t-caption c-3">{m.category}</span><span className="t-body-s">{m.statement}</span></div>
                ))}
              </div>
            </div>
            <div className="col g12">
              <div className="row"><span className="t-title-s grow">Recent calls</span><Button variant="ghost" size="s" iconRight="arrow-right" onClick={() => navigate("/voice/calls")}>Timeline</Button></div>
              <div className="card list-bordered" style={{ overflow: "hidden" }}>
                {calls.slice(0, 4).map((c) => (
                  <button key={c.id} className="row g10" style={{ padding: "10px 16px", textAlign: "left", width: "100%" }}
                    onClick={() => navigate(c.status === "completed" ? `/voice/calls/${c.id}` : `/voice/calls/${c.id}/live`)}>
                    <Icon name="phone" size={14} className="c-3" /><span className="t-body-s grow">Call with {c.contact.name}</span><span className="t-mono c-3">{c.duration}</span>
                  </button>
                ))}
                {calls.length === 0 && <span className="t-body-s c-3" style={{ padding: 16, display: "block" }}>No calls yet — use Call client or ask Bracket to call someone.</span>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
