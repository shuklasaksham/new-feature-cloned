// Ask Bracket — voice mode (V1.0–V1.5, V2.0, V3.1 in Figma).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../lib/AuthContext";
import { voiceApi, formatApiError } from "../api";
import { useVoice } from "../store";
import Shell from "../components/Shell";
import Icon from "../components/Icon";
import {
  ActionCard, Badge, Banner, BracketMark, Button, ContactCard, Eyebrow, Skeleton, SourceMark, Utterance,
  VoiceControls, VoiceStatus, Waveform,
} from "../components/ui";
import { langCode, speechSupported, useMicLevel, useRecognition, useSpeaker } from "../lib/speech";

const TRY = [
  ["ask", "What’s blocking the Acme launch?"],
  ["phone", "Call Sarah and ask for an update."],
  ["mail", "Draft a follow-up to Sarah."],
  ["check-circle", "What needs my approval?"],
  ["sparkles", "Write this week’s project update."],
];

const elapsed = (from, to) => {
  const s = Math.max(0, Math.round((new Date(to) - new Date(from)) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Cards({ reply, actions, onAction, busyAction, navigate }) {
  return (reply.cards || []).map((card, idx) => {
    if (card.type === "blockers") {
      return (
        <div key={idx} className="card" style={{ overflow: "hidden" }}>
          <div className="row" style={{ padding: "10px 16px" }}>
            <Icon name="alert" size={14} className="c-warning" />
            <span className="t-body-s t-medium grow">{card.title}</span>
            <span className="t-caption c-3 hide-m">{card.items.length} open</span>
          </div>
          {card.items.map((b, i) => (
            <div key={b.id} className="row g12 divider-t" style={{ padding: "10px 16px" }}>
              <span className="cite hide-m">{i + 1}</span>
              <span className="col g2 grow"><span className="t-body-s">{b.title}</span><span className="t-caption c-3">{b.meta}</span></span>
              <Badge tone={b.tone}>{b.badge}</Badge>
            </div>
          ))}
        </div>
      );
    }
    if (card.type === "status") {
      return (
        <div key={idx} className="card col g8" style={{ padding: 12 }}>
          {card.rows.map(([k, v, tone]) => (
            <div key={k} className="row"><span className="t-caption c-3" style={{ width: 80 }}>{k}</span>{tone ? <Badge tone={tone}>{v}</Badge> : <span className="t-body-s">{v}</span>}</div>
          ))}
        </div>
      );
    }
    if (card.type === "list") {
      return (
        <div key={idx} className="card col g8" style={{ padding: 12 }}>
          <span className="t-body-s t-medium">{card.title}</span>
          {card.items.map((t) => <span key={t} className="row g8 t-body-s"><span style={{ width: 4, height: 4, borderRadius: 2, background: "var(--text-3)" }} />{t}</span>)}
        </div>
      );
    }
    if (card.type === "answer") {
      return (
        <div key={idx} className="card col g6" style={{ padding: 12 }}>
          <span className="t-caption c-3">{card.category}</span>
          <span className="t-body-s">{card.statement}</span>
          {card.source && <span className="chip" style={{ alignSelf: "flex-start" }}><Icon name="file" size={12} />{card.source}</span>}
        </div>
      );
    }
    if (card.type === "action") {
      // Replies keep a snapshot; the session's action list has the current status.
      const action = actions?.[card.action.id] || card.action;
      return (
        <ActionCard key={idx} action={action} busy={busyAction === card.action.id}
          onConfirm={() => onAction(card.action, "confirm")} onCancel={() => onAction(card.action, "cancel")} />
      );
    }
    if (card.type === "call_prepared") {
      const c = card.call;
      return (
        <div key={idx} className="card col g12" style={{ padding: 16 }}>
          <div className="row">
            <span className="iconbox"><Icon name="phone" size={14} /></span><Eyebrow>AI client call</Eyebrow><span className="grow" /><Badge tone="info">Ready to review</Badge>
          </div>
          <span className="t-title-s">{c.plan.title}</span>
          {[`Found ${c.contact.name} · ${c.contact.role.split(" · ")[0]} · ${c.contact.phone}`, "Read 3 recent conversations (Gmail, Slack, kickoff notes)",
            "Found 1 pending approval and 2 outstanding deliverables", "Drafted objective, talking points and questions"].map((t) => (
            <span key={t} className="row g8 t-body-s c-2"><Icon name="check-circle" size={14} className="c-success" />{t}</span>
          ))}
          <div className="row"><Button variant="primary" size="s" iconRight="arrow-right" onClick={() => navigate(`/voice/calls/${c.id}/prepare`)}>Review call plan</Button>
            <span className="t-caption c-3">Nothing is dialed until you confirm.</span></div>
        </div>
      );
    }
    return null;
  });
}

export default function AskVoice() {
  const { user } = useAuth();
  const { workspace, refresh, toast } = useVoice();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const settings = workspace?.settings;
  const voiceOff = settings && !settings.voice_enabled;

  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState("text"); // text | voice
  const [vstate, setVstate] = useState("idle"); // idle | listening | thinking | speaking | paused | error
  const [muted, setMuted] = useState(false);
  const [draft, setDraft] = useState("");
  const [busyAction, setBusyAction] = useState(null);
  const [errorKind, setErrorKind] = useState(null);
  const threadEnd = useRef(null);
  const composerRef = useRef(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  const vstateRef = useRef(vstate); vstateRef.current = vstate;
  const mutedRef = useRef(muted); mutedRef.current = muted;

  const speaker = useSpeaker({ voiceId: settings?.voice, lang: langCode(settings?.language) });
  const submitRef = useRef(null);
  const rec = useRecognition({
    lang: langCode(settings?.language),
    onFinal: (text) => {
      if (modeRef.current !== "voice" || vstateRef.current !== "listening" || mutedRef.current) return;
      rec.stop();
      submitRef.current?.(text, "voice");
    },
  });
  const level = useMicLevel(mode === "voice" && vstate === "listening" && !muted);

  useEffect(() => { voiceApi.sessions().then(setSessions).catch(() => {}); }, []);
  useEffect(() => { threadEnd.current?.scrollIntoView({ block: "end" }); }, [session?.turns?.length, rec.interim, vstate]);
  useEffect(() => {
    if (rec.error) { setErrorKind(rec.error); setVstate("error"); speaker.cancel(); }
  }, [rec.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureSession = useCallback(async () => {
    if (session) return session;
    const s = await voiceApi.createSession();
    setSession(s);
    return s;
  }, [session]);

  const listen = useCallback(() => {
    setVstate("listening");
    if (!mutedRef.current) rec.start();
  }, [rec]);

  const submit = useCallback(async (text, how = modeRef.current) => {
    const clean = text.trim();
    if (!clean) return;
    let s;
    try { s = await ensureSession(); } catch (e) { toast(formatApiError(e), { tone: "danger" }); return; }
    setSession((cur) => ({ ...(cur || s), turns: [...((cur || s).turns || []), { role: "you", text: clean, at: new Date().toISOString(), mode: how }] }));
    setVstate("thinking");
    let res;
    try {
      res = await voiceApi.say(s.id, clean, how);
    } catch (e) {
      toast(formatApiError(e), { tone: "danger" });
      if (modeRef.current === "voice") listen(); else setVstate("idle");
      return;
    }
    setSession(res.session);
    setSessions((list) => [res.session, ...list.filter((x) => x.id !== res.session.id)]);
    const reply = res.reply;
    if (reply.intent === "confirm" || reply.cards?.some((c) => c.type === "action")) refresh();
    const after = () => {
      if (reply.navigate) {
        const { call_id: id, step } = reply.navigate;
        setTimeout(() => navigate(`/voice/calls/${id}/${step === "confirm" ? "prepare?confirm=1" : "prepare"}`), 1400);
        return;
      }
      if (modeRef.current === "voice" && vstateRef.current !== "paused") listen(); else if (modeRef.current !== "voice") setVstate("idle");
    };
    if (how === "voice" && modeRef.current === "voice") {
      setVstate("speaking");
      speaker.speak(reply.text, after);
    } else {
      setVstate("idle");
      after();
    }
  }, [ensureSession, listen, navigate, refresh, speaker, toast]);
  submitRef.current = submit;

  const startVoice = useCallback(async () => {
    if (voiceOff) return;
    if (!speechSupported) { setMode("voice"); setErrorKind("unsupported"); setVstate("error"); return; }
    try { await ensureSession(); } catch (e) { toast(formatApiError(e), { tone: "danger" }); return; }
    setErrorKind(null);
    setMode("voice");
    setMuted(false);
    listen();
  }, [ensureSession, listen, toast, voiceOff]);

  const endVoice = useCallback(() => {
    rec.stop(); speaker.cancel(); setMode("text"); setVstate("idle"); setMuted(false);
  }, [rec, speaker]);

  const controls = {
    onMute: () => { if (muted) { setMuted(false); if (vstate === "listening") rec.start(); } else { setMuted(true); rec.stop(); } },
    onPause: () => { rec.stop(); speaker.cancel(); setVstate("paused"); },
    onResume: () => listen(),
    onInterrupt: () => { speaker.cancel(); listen(); },
    onType: () => { endVoice(); setTimeout(() => composerRef.current?.focus(), 50); },
    onEnd: endVoice,
  };

  // Keyboard: ⌘/Ctrl+Shift+V voice · Space interrupt · M mute · Esc end
  useEffect(() => {
    const onKey = (e) => {
      const typing = ["TEXTAREA", "INPUT"].includes(e.target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") { e.preventDefault(); mode === "voice" ? endVoice() : startVoice(); return; }
      if (mode !== "voice" || typing) return;
      if (e.key === " " && vstate === "speaking") { e.preventDefault(); controls.onInterrupt(); }
      if (e.key.toLowerCase() === "m") controls.onMute();
      if (e.key === "Escape") endVoice();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ?ask=… (from call summary follow-ups) · ?voice=1 — handled once per navigation.
  const handledRef = useRef(null);
  const ready = Boolean(workspace);
  useEffect(() => {
    const key = params.toString();
    if (!ready || !key || handledRef.current === key) return;
    handledRef.current = key;
    const ask = params.get("ask");
    const voice = params.get("voice") === "1";
    setParams({}, { replace: true });
    if (ask) submit(ask, "text");
    else if (voice) startVoice();
  }, [params, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAction = async (action, decision) => {
    setBusyAction(action.id);
    try {
      const res = await voiceApi.decide(session.id, action.id, decision);
      const s = await voiceApi.session(session.id);
      setSession(s);
      toast(res.result, decision === "confirm" ? { action: action.kind === "accept_updates" ? { label: "View", onClick: () => navigate("/voice/workspace") } : undefined } : {});
      refresh();
    } catch (e) {
      toast(formatApiError(e), { tone: "danger" });
    } finally { setBusyAction(null); }
  };

  const turns = useMemo(() => session?.turns || [], [session]);
  const lastReply = useMemo(() => [...turns].reverse().find((t) => t.role === "bracket")?.reply, [turns]);
  const actionsById = useMemo(() => Object.fromEntries((session?.actions || []).map((a) => [a.id, a])), [session]);
  const lastBracketIdx = turns.map((t) => t.role).lastIndexOf("bracket");
  const started = turns.length > 0 || mode === "voice";
  const statusState = vstate === "error" ? "error" : muted ? "muted" : vstate === "idle" ? "idle" : vstate;
  const initials = (user?.name || user?.email || "You").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  const hint = {
    listening: muted ? "You’re muted — Bracket can’t hear you." : "Speak naturally — Bracket answers when you pause.",
    thinking: "Thinking — checking memory and sources.",
    speaking: "Bracket is speaking — say “stop”, press Space or tap Interrupt.",
    paused: "Resume to keep talking, or tap Type.",
  }[vstate] || "";

  const history = (
    <aside className="ask-history" aria-label="Question history">
      <Button className="block" icon="plus" onClick={() => { endVoice(); setSession(null); }}>New question</Button>
      <div style={{ padding: "16px 8px 8px" }}><Eyebrow>Recent</Eyebrow></div>
      <div className="col g2 scroll">
        {sessions.length === 0 && <span className="t-body-s c-3" style={{ padding: 8 }}>Your voice and typed questions appear here.</span>}
        {sessions.map((s) => (
          <button key={s.id} className={`hist-item ${session?.id === s.id ? "active" : ""}`}
            onClick={async () => { endVoice(); setSession(await voiceApi.session(s.id)); }}>
            {s.turns?.[0]?.mode === "voice" && <Icon name="audio-lines" size={14} />}
            <span>{s.title}</span>
          </button>
        ))}
      </div>
    </aside>
  );

  const composer = (
    <div className="composer">
      <textarea ref={composerRef} rows={1} value={draft} placeholder={started ? "Ask a follow-up…" : "Ask about this workspace…"} aria-label="Ask Bracket"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(draft, "text"); setDraft(""); } }} />
      <div className="row">
        <span className="chip"><Icon name="layers" size={14} />{workspace?.project?.name || "Fintech Landing Page Redesign"}</span>
        <span className="grow" />
        <button className={`mic-btn tooltip`} data-tip={voiceOff ? "Voice is off for this workspace" : "Talk to Bracket  ⌘⇧V"} aria-label="Talk to Bracket"
          onClick={startVoice} disabled={voiceOff} style={voiceOff ? { color: "var(--text-dis)" } : undefined}><Icon name="mic" /></button>
        <button className="submit-btn" aria-label="Send" disabled={!draft.trim() || vstate === "thinking"} onClick={() => { submit(draft, "text"); setDraft(""); }}><Icon name="arrow-up" /></button>
      </div>
    </div>
  );

  // ---------------- Entry (V1.0) ----------------
  if (!started) {
    return (
      <Shell crumb="Ask Bracket">
        {history}
        <div className="scroll grow" style={{ display: "flex", justifyContent: "center" }}>
          <div className="col g16" style={{ width: "min(680px, 100%)", padding: "72px 16px 32px" }}>
            <span className="t-title-l">Ask about {workspace?.project?.name || "this workspace"}</span>
            <span className="t-body-m c-2">Answers come only from this workspace’s memory and connected sources — with citations.</span>
            {composer}
            {!voiceOff && (
              <div className="card row g12" style={{ padding: "10px 12px", borderColor: "var(--border-subtle)" }}>
                <span className="iconbox"><Icon name="audio-lines" size={14} /></span>
                <span className="col g2 grow"><span className="t-body-s t-medium">New · Talk to Bracket</span>
                  <span className="t-caption c-3">Ask out loud, hear answers with captions, and have Bracket call clients for you — always with your OK first.</span></span>
                <Button size="s" icon="mic" onClick={startVoice}>Start</Button>
              </div>
            )}
            {voiceOff && <Banner tone="neutral" title="Voice is off for this workspace">Turn it on in Settings → Voice &amp; calling.</Banner>}
            <Eyebrow className="hide-m">Try asking</Eyebrow>
            <div className="col g8">
              {TRY.map(([ic, q]) => (
                <button key={q} className="card row g12" style={{ padding: "12px 16px", textAlign: "left" }} onClick={() => submit(q, "text")}>
                  <Icon name={ic} className="c-3" /><span className="t-body-s grow">{q}</span><Icon name="arrow-right" className="c-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------------- Conversation ----------------
  const errorCopy = errorKind === "unsupported"
    ? ["Voice isn’t supported in this browser", "Voice mode needs Chrome, Edge or Safari. You can keep typing your questions."]
    : errorKind === "not-allowed"
      ? ["Bracket can’t hear you", "Microphone access is blocked. Allow it in your browser’s site settings, then try again."]
      : ["Connection dropped", "Voice recognition stopped unexpectedly. Your last question is kept."];

  return (
    <Shell crumb={mode === "voice" ? "Ask Bracket  ›  Voice" : "Ask Bracket"} fullscreenMobile={mode === "voice"} mobileTitle={mode === "voice" ? "Voice · Ask Bracket" : undefined} mobileBack={mode === "voice" ? "/voice/workspace" : undefined}>
      {history}
      <section className="thread" aria-label="Conversation">
        <div className="row">
          <Eyebrow>{mode === "voice" ? "Voice mode" : "Ask Bracket"}</Eyebrow>
          {mode === "voice" && <VoiceStatus state={statusState} />}
          <span className="grow" />
          <span className="chip hide-m"><Icon name="layers" size={14} />{workspace?.project?.name}</span>
        </div>
        <div className="col g20 scroll grow" style={{ paddingRight: 4 }}>
          {vstate === "error" && mode === "voice" ? (
            <div className="col g8" style={{ alignItems: "center", textAlign: "center", padding: "48px 0" }}>
              <span className="avatar l" style={{ background: "var(--danger-bg)", border: 0 }}><Icon name="mic-off" className="c-danger" /></span>
              <span className="t-title-m">{errorCopy[0]}</span>
              <span className="t-body-s c-3" style={{ maxWidth: 380 }}>{errorCopy[1]}</span>
            </div>
          ) : null}
          {turns.map((t, i) => {
            const isLast = i === lastBracketIdx;
            if (t.role === "you") return <Utterance key={i} speaker="you" initials={initials} text={t.text} meta={elapsed(session.created_at, t.at)} />;
            const live = isLast && vstate === "speaking";
            return (
              <div key={i} className="col g16" style={{ opacity: i < lastBracketIdx - 2 ? 0.6 : 1 }}>
                <Utterance speaker="bracket" text={live ? speaker.caption || "…" : t.text} live={live}
                  meta={live ? "Speaking…" : t.reply?.sources ? `from ${workspace?.project?.memory_count || 39} memories and ${t.reply.sources.length} sources` : elapsed(session.created_at, t.at)} />
                {t.reply && <Cards reply={t.reply} actions={actionsById} onAction={onAction} busyAction={busyAction} navigate={navigate} />}
                {isLast && t.reply?.suggestions?.length > 0 && vstate !== "speaking" && (
                  <div className="col g8">
                    <Eyebrow>Say or tap next</Eyebrow>
                    <div className="row wrap g8">
                      {t.reply.suggestions.map((sg) => (
                        <button key={sg.label} className={`suggest ${sg.primary ? "primary" : ""}`} onClick={() => submit(sg.utterance, mode)}>
                          <Icon name={sg.icon} size={14} />{sg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {mode === "voice" && vstate === "listening" && rec.interim && <Utterance speaker="you" initials={initials} text={rec.interim} meta="Listening…" live />}
          {vstate === "thinking" && (
            <div className="row top g12">
              <BracketMark icon="loader" />
              <div className="col g10 grow"><span className="t-body-s c-2">Checking commitments, approvals and sources…</span><Skeleton width="80%" /><Skeleton width="60%" /></div>
            </div>
          )}
          <div ref={threadEnd} />
        </div>
        {mode === "voice" ? (
          <div className="dock">
            {vstate === "paused" && <span className="pill"><Icon name="pause" size={12} />Paused — Bracket isn’t listening</span>}
            <Waveform state={vstate === "error" ? "idle" : muted ? "paused" : vstate} level={level} />
            <span className="t-caption c-3" style={{ textAlign: "center" }}>{vstate === "error" ? "No audio detected" : hint}</span>
            {vstate === "error" ? (
              <div className="row">
                {errorKind !== "unsupported" && <Button icon="refresh" onClick={startVoice}>Try again</Button>}
                <Button variant="primary" icon="keyboard" onClick={controls.onType}>Switch to typing</Button>
              </div>
            ) : <VoiceControls state={vstate} muted={muted} {...controls} />}
          </div>
        ) : composer}
        <span className="t-caption c-3 hide-m">Answers only use this workspace’s memory and connected sources. Voice is transcribed in your browser, never stored as audio.</span>
      </section>
      <aside className="ctx-panel panel" aria-label="Context">
        {vstate === "error" && mode === "voice" ? (
          <>
            <Eyebrow>Checklist</Eyebrow>
            {["Allow microphone access for this site", "Close other apps using the mic (Zoom, Meet)", "Check your input device in system settings", "Voice works in Chrome, Edge and Safari"].map((t) => (
              <span key={t} className="row top g8 t-body-s c-2"><Icon name="check" size={14} className="c-3" />{t}</span>
            ))}
          </>
        ) : lastReply?.cards?.some((c) => c.type === "call_prepared") ? (
          (() => { const c = lastReply.cards.find((x) => x.type === "call_prepared").call; return (
            <>
              <Eyebrow>Contact</Eyebrow>
              <ContactCard contact={c.contact} />
              <Eyebrow>Why this call</Eyebrow>
              <span className="t-body-s c-2">{c.plan.why}</span>
            </>
          ); })()
        ) : lastReply?.sources ? (
          <>
            <Eyebrow>Sources · {lastReply.sources.length}</Eyebrow>
            {lastReply.sources.map((s) => (
              <div key={s.n} className="row" style={{ padding: "8px 12px", border: "1px solid var(--border-default)", borderRadius: 6 }}>
                <span className="cite">{s.n}</span><SourceMark provider={s.provider} /><span className="t-body-s grow">{s.title}</span><span className="t-caption c-3">{s.date}</span>
              </div>
            ))}
            {lastReply.memory_from && (
              <>
                <Eyebrow>Memory this came from</Eyebrow>
                {lastReply.memory_from.map((m) => (
                  <div key={m.category + m.statement} className="col g2 quote"><span className="t-caption c-3">{m.category}</span><span className="t-body-s">{m.statement}</span></div>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <Eyebrow>{mode === "voice" ? "Listening in" : "Workspace"}</Eyebrow>
            <div className="card col g8" style={{ padding: 16 }}>
              <span className="row g8"><Icon name="layers" /><span className="t-body-s t-medium">{workspace?.project?.name}</span></span>
              <span className="t-caption c-3">{workspace?.project?.client} · {workspace?.project?.memory_count} memories · Gmail, Slack, Notes</span>
            </div>
            <Eyebrow>You can say</Eyebrow>
            {TRY.map(([ic, q]) => (
              <button key={q} className="row g8 hist-item" onClick={() => submit(q, mode)}><Icon name={ic} size={14} className="c-3" />“{q.replace(/\.$/, "")}”</button>
            ))}
          </>
        )}
        <span className="grow" />
        <span className="row top g8 t-caption c-3"><Icon name="shield-check" size={14} />Bracket never sends, calls or changes memory without asking you first.</span>
      </aside>
    </Shell>
  );
}
