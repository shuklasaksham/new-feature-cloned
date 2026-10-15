// Browser voice I/O for Ask Bracket voice mode: speech-to-text (Web Speech API),
// text-to-speech with word-by-word captions, and a live microphone level for the waveform.
import { useCallback, useEffect, useRef, useState } from "react";

const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const speechSupported = Boolean(Recognition);
export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

const LANGS = { "English (US)": "en-US", "English (UK)": "en-GB", Spanish: "es-ES", French: "fr-FR", Hindi: "hi-IN" };
export const langCode = (label) => LANGS[label] || "en-US";

/**
 * Continuous recognition. `onFinal(text)` fires once per finished utterance;
 * `interim` holds the words still being recognised (for the live transcript).
 * error: null | "unsupported" | "not-allowed" | "network" | "audio-capture"
 */
export function useRecognition({ lang = "en-US", onFinal }) {
  const recRef = useRef(null);
  const wantRef = useRef(false);
  const finalRef = useRef(onFinal);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);
  finalRef.current = onFinal;

  const stop = useCallback(() => {
    wantRef.current = false;
    setInterim("");
    try { recRef.current?.abort(); } catch { /* already stopped */ }
  }, []);

  const start = useCallback(() => {
    if (!Recognition) { setError("unsupported"); return false; }
    setError(null);
    wantRef.current = true;
    if (recRef.current) { try { recRef.current.start(); } catch { /* already running */ } return true; }
    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          setInterim("");
          if (text) finalRef.current?.(text);
        } else {
          live += r[0].transcript;
        }
      }
      if (live) setInterim(live.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { wantRef.current = false; setError("not-allowed"); }
      else setError(e.error);
    };
    rec.onend = () => {
      setListening(false);
      // Chrome ends sessions after silence; keep listening while voice mode wants it.
      if (wantRef.current) setTimeout(() => { if (wantRef.current) { try { rec.start(); } catch { /* racing a start */ } } }, 150);
    };
    recRef.current = rec;
    try { rec.start(); } catch { /* ignore */ }
    return true;
  }, [lang]);

  useEffect(() => () => { wantRef.current = false; try { recRef.current?.abort(); } catch { /* noop */ } }, []);
  return { start, stop, listening, interim, error, setError };
}

const VOICE_HINTS = { aria: ["Samantha", "Jenny", "Aria", "Google US English", "Female"], kai: ["Daniel", "Guy", "Alex", "Male"], noor: ["Karen", "Moira", "Google UK English Female", "Libby"] };

function pickVoice(voiceId, lang) {
  if (!ttsSupported) return null;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.startsWith(lang.slice(0, 2)));
  for (const hint of VOICE_HINTS[voiceId] || []) {
    const v = voices.find((x) => x.name.includes(hint));
    if (v) return v;
  }
  return voices[{ aria: 0, kai: 1, noor: 2 }[voiceId] ?? 0] || voices[0] || null;
}

/** Speaks text and exposes the words spoken so far as a caption. */
export function useSpeaker({ voiceId = "aria", lang = "en-US" } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const timerRef = useRef(null);
  const doneRef = useRef(null);

  const finish = useCallback(() => {
    clearInterval(timerRef.current);
    setSpeaking(false);
    const cb = doneRef.current; doneRef.current = null;
    cb?.();
  }, []);

  const cancel = useCallback(() => {
    doneRef.current = null;
    clearInterval(timerRef.current);
    if (ttsSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text, onDone) => {
    cancel();
    doneRef.current = onDone;
    setSpeaking(true);
    setCaption("");
    const words = text.split(/\s+/);
    let shown = 0;
    // Timer-driven caption (≈170 wpm) — boundary events are unreliable across browsers.
    timerRef.current = setInterval(() => {
      shown = Math.min(words.length, shown + 1);
      setCaption(words.slice(0, shown).join(" "));
      if (!ttsSupported && shown >= words.length) finish();
    }, 350);
    if (!ttsSupported) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = pickVoice(voiceId, lang);
    if (v) u.voice = v;
    u.rate = 1.03;
    u.onend = () => { setCaption(text); finish(); };
    u.onerror = () => { setCaption(text); finish(); };
    window.speechSynthesis.speak(u);
  }, [cancel, finish, lang, voiceId]);

  useEffect(() => () => cancel(), [cancel]);
  return { speak, cancel, speaking, caption };
}

/** Microphone input level 0..1 (for the listening waveform). */
export function useMicLevel(active) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!active || !navigator.mediaDevices?.getUserMedia) return undefined;
    let raf; let stream; let ctx; let cancelled = false;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
      if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const b of buf) sum += ((b - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        raf = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => setLevel(0));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
      setLevel(0);
    };
  }, [active]);
  return level;
}
