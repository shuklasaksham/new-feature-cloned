// Settings → Voice & calling (V7.0 enabled, V7.1 turned off).
import React, { useEffect, useState } from "react";
import { voiceApi, formatApiError } from "../api";
import { useVoice } from "../store";
import Shell from "../components/Shell";
import Icon from "../components/Icon";
import { Avatar, Badge, Banner, Eyebrow, Toggle } from "../components/ui";
import { langCode, ttsSupported } from "../lib/speech";

function Row({ title, desc, children, disabled }) {
  return (
    <div className="row g12" style={{ padding: "12px 16px", opacity: disabled ? 0.5 : 1 }}>
      <span className="col g2 grow"><span className="t-body-s t-medium">{title}</span>{desc && <span className="t-caption c-3">{desc}</span>}</span>
      {children}
    </div>
  );
}

function Group({ title, children, right }) {
  return (
    <div className="col g8">
      <div className="row"><Eyebrow>{title}</Eyebrow><span className="grow" />{right}</div>
      <div className="card list-bordered" style={{ overflow: "hidden" }}>{children}</div>
    </div>
  );
}

export default function VoiceSettings() {
  const { workspace, setWorkspace, toast } = useVoice();
  const [s, setS] = useState(null);
  useEffect(() => { if (workspace && !s) setS(workspace.settings); }, [workspace, s]);
  if (!workspace || !s) return <Shell crumb="Settings  ›  Voice & calling"><div className="page-pad t-body-s c-3">Loading…</div></Shell>;

  const save = async (patch) => {
    const prev = s;
    setS({ ...s, ...patch });
    try {
      const next = await voiceApi.updateSettings(patch);
      setS(next);
      setWorkspace({ ...workspace, settings: next });
    } catch (e) { setS(prev); toast(formatApiError(e), { tone: "danger" }); }
  };
  const authorize = async (c, on) => {
    try {
      const updated = await voiceApi.setContactAuthorized(c.id, on);
      setWorkspace({ ...workspace, contacts: workspace.contacts.map((x) => (x.id === c.id ? updated : x)) });
    } catch (e) { toast(formatApiError(e), { tone: "danger" }); }
  };
  const preview = (voice) => {
    if (!ttsSupported) { toast("Voice preview isn’t supported in this browser.", { tone: "danger" }); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(s.opening_line.replace("{first_name}", "Sarah"));
    u.lang = langCode(s.language);
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.startsWith(u.lang.slice(0, 2)));
    u.voice = voices[{ aria: 0, kai: 1, noor: 2 }[voice]] || voices[0] || null;
    window.speechSynthesis.speak(u);
  };
  const off = !s.voice_enabled;
  const text = (key, label, help) => (
    <label className="col g6">
      <span className="t-caption c-2">{label}</span>
      <input className="field t-body-s" defaultValue={s[key]} aria-label={label} disabled={off}
        onBlur={(e) => e.target.value !== s[key] && save({ [key]: e.target.value })} />
      {help && <span className="t-caption c-3">{help}</span>}
    </label>
  );
  const select = (key, options, label) => (
    <select className="select" value={s[key]} aria-label={label} disabled={off}
      onChange={(e) => save({ [key]: typeof s[key] === "number" ? Number(e.target.value) : e.target.value })}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <Shell crumb="Settings  ›  Voice & calling" mobileTitle="Voice & calling">
      <section className="col g24 page-pad scroll grow" aria-label="Voice & calling settings">
        <div className="col g4">
          <span className="t-title-l">Voice &amp; calling</span>
          <span className="t-body-s c-3">Talk to Bracket, and let it call authorized clients for you. Every call needs your confirmation.</span>
        </div>
        {off && <Banner tone="neutral" title="Voice features are off for this workspace">The mic in Ask Bracket and “Call client” are hidden. Past calls and transcripts stay in Timeline.</Banner>}
        <div className="two-col" style={{ gap: 24 }}>
          <div className="col g20">
            <Group title="Features">
              <Row title="Voice mode in Ask Bracket" desc="Mic in the composer, spoken answers with captions"><Toggle label="Voice mode" on={s.voice_enabled} onChange={(v) => save({ voice_enabled: v })} /></Row>
              <Row title="AI client calling" desc="Bracket can call authorized contacts for you"><Toggle label="AI client calling" on={s.calling_enabled} onChange={(v) => save({ calling_enabled: v })} disabled={off} /></Row>
              <Row title="Live captions" desc="Show captions while Bracket speaks"><Toggle label="Live captions" on={s.captions} onChange={(v) => save({ captions: v })} disabled={off} /></Row>
            </Group>
            <div className="col g8" style={{ opacity: off ? 0.4 : 1 }}>
              <Eyebrow>Assistant voice</Eyebrow>
              {workspace.voices.map((v) => (
                <div key={v.id} className="card row g12" role="radio" aria-checked={s.voice === v.id} tabIndex={0}
                  onClick={() => !off && save({ voice: v.id })} onKeyDown={(e) => e.key === "Enter" && !off && save({ voice: v.id })}
                  style={{ padding: "12px 16px", cursor: off ? "default" : "pointer", borderColor: s.voice === v.id ? "var(--text-1)" : undefined }}>
                  <span style={{ width: 16, height: 16, borderRadius: 8, border: "1px solid var(--border-control)", display: "grid", placeItems: "center" }}>
                    {s.voice === v.id && <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--text-1)" }} />}
                  </span>
                  <span className="col g2 grow"><span className="t-body-s t-medium">{v.name}</span><span className="t-caption c-3">{v.description}</span></span>
                  <button className="btn ghost s" onClick={(e) => { e.stopPropagation(); preview(v.id); }} disabled={off}><Icon name="play" size={12} />Preview</button>
                </div>
              ))}
            </div>
            <div className="row g16 stack-m" style={{ opacity: off ? 0.4 : 1 }}>
              <label className="col g6 grow"><Eyebrow>Preferred language</Eyebrow>{select("language", [["English (US)", "English (US)"], ["English (UK)", "English (UK)"], ["Spanish", "Spanish"], ["French", "French"], ["Hindi", "Hindi"]], "Preferred language")}</label>
              <label className="col g6 grow"><Eyebrow>Also understands</Eyebrow>{select("also_understands", [["Spanish, French", "Spanish, French"], ["Spanish", "Spanish"], ["None", "None"]], "Also understands")}</label>
            </div>
            <div className="col g12" style={{ opacity: off ? 0.4 : 1 }}>
              <Eyebrow>Introduction &amp; business identity</Eyebrow>
              {text("opening_line", "Opening line", "Bracket always says it’s an AI and who it calls for. {first_name} is filled in per call.")}
              {text("on_behalf_of", "Calls on behalf of")}
              {text("caller_id", "Caller ID", "Shown to clients. Verified once a calling provider is connected.")}
            </div>
          </div>
          <div className="col g20" style={{ opacity: off ? 0.4 : 1 }}>
            <Group title="Calling permissions">
              <Row title="Confirm before every call" desc="Always on — Bracket never dials without your OK"><Toggle label="Confirm before every call" on disabled /></Row>
              <Row title="Only call authorized contacts" desc="Contacts listed below"><Toggle label="Only authorized" on={s.only_authorized} onChange={(v) => save({ only_authorized: v })} disabled={off} /></Row>
              <Row title="Leave a voicemail if no answer" desc="Short message asking them to call back"><Toggle label="Voicemail" on={s.voicemail} onChange={(v) => save({ voicemail: v })} disabled={off} /></Row>
              <Row title="Agree to dates or pricing" desc="Off: Bracket defers to you by email"><Toggle label="Agree to dates or pricing" on={s.agree_dates_pricing} onChange={(v) => save({ agree_dates_pricing: v })} disabled={off} /></Row>
              <Row title="Calling hours" desc={s.calling_hours}><Icon name="clock" className="c-3" /></Row>
            </Group>
            <Group title="Call recording">
              <Row title="Record calls" desc="Announced at the start · transcript always kept"><Toggle label="Record calls" on={s.record_calls} onChange={(v) => save({ record_calls: v })} disabled={off} /></Row>
              <Row title="Keep recordings" desc="Then transcript only">{select("retention_days", [[30, "30 days"], [90, "90 days"], [365, "1 year"]], "Keep recordings")}</Row>
            </Group>
            <Group title={`Authorized contacts · ${workspace.contacts.filter((c) => c.authorized).length}`}>
              {workspace.contacts.map((c) => (
                <div key={c.id} className="row g10" style={{ padding: "10px 12px" }}>
                  <Avatar initials={c.initials} size="s" />
                  <span className="col g2 grow"><span className="t-body-s t-medium">{c.name}</span><span className="t-caption c-3">{c.company} · {c.phone}</span></span>
                  {c.authorized ? <Badge tone="success">Can call</Badge> : <Badge>Not allowed</Badge>}
                  <Toggle label={`Allow calls to ${c.name}`} on={c.authorized} onChange={(v) => authorize(c, v)} disabled={off} />
                </div>
              ))}
            </Group>
            <div className="card row g12" style={{ padding: "12px 16px" }}>
              <span className="col g2 grow"><span className="t-body-s t-medium">Maximum call length</span><span className="t-caption c-3">Bracket wraps up politely a minute before</span></span>
              {select("max_minutes", [[5, "5 minutes"], [10, "10 minutes"], [15, "15 minutes"]], "Maximum call length")}
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
