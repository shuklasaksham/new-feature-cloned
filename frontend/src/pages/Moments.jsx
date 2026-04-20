import React, { useEffect, useState } from "react";
import { ArrowRight, Loader2, Trash2, Copy } from "lucide-react";
import AppNav from "../components/AppNav";
import { api, formatApiError } from "../lib/api";

export default function Moments() {
  const [moment, setMoment] = useState("");
  const [ctx, setCtx] = useState("");
  const [engine, setEngine] = useState("claude");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/moments");
      setItems(data);
      if (data.length && !active) setActive(data[0]);
    } catch (e) {
      setError(formatApiError(e));
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!moment.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/moments", { moment, context: ctx, engine });
      setItems([data, ...items]);
      setActive(data);
      setMoment("");
      setCtx("");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this moment?")) return;
    await api.delete(`/moments/${id}`);
    const next = items.filter((m) => m.id !== id);
    setItems(next);
    if (active?.id === id) setActive(next[0] || null);
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text || "");
  };

  return (
    <div className="min-h-screen bg-paper" data-testid="moments-page">
      <AppNav />
      <main className="max-w-[1400px] mx-auto px-6 md:px-10 py-10 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-8">
          <div>
            <p className="mono-label">{"{ moment advisor }"}</p>
            <h1 className="font-display text-5xl uppercase mt-3">
              Paste the <span className="text-signal">moment.</span>
            </h1>
            <p className="mt-4 text-muted">A client message. A tension. A Slack dump. Bracket reads it like a senior designer and tells you what to do next.</p>
          </div>

          <form onSubmit={submit} className="card-brut p-6 space-y-5" data-testid="moment-form">
            <div>
              <label className="mono-tag text-muted">THE MOMENT</label>
              <textarea className="textarea-brut mt-2" rows={5} value={moment} onChange={(e) => setMoment(e.target.value)} placeholder="Paste what the client said, or describe what's happening." data-testid="moment-input" />
            </div>
            <div>
              <label className="mono-tag text-muted">CONTEXT (OPTIONAL)</label>
              <textarea className="textarea-brut mt-2" rows={3} value={ctx} onChange={(e) => setCtx(e.target.value)} placeholder="What's the history? What's the stake? What would a senior designer need to know?" data-testid="moment-context-input" />
            </div>
            <div>
              <label className="mono-tag text-muted">ENGINE</label>
              <div className="mt-2 inline-flex border border-ink">
                {[{ id: "claude", l: "CLAUDE 4.5" }, { id: "gpt", l: "GPT-5.2" }].map((e) => (
                  <button key={e.id} type="button" onClick={() => setEngine(e.id)} className={`px-4 py-2 mono-tag ${engine === e.id ? "bg-ink text-chalk" : "bg-paper"}`} data-testid={`moment-engine-${e.id}`}>{e.l}</button>
                ))}
              </div>
            </div>
            {error && <div className="border border-danger p-3"><p className="mono-tag text-danger">ERROR</p><p className="text-sm mt-1">{error}</p></div>}
            <button type="submit" disabled={loading || !moment.trim()} className="btn-brut w-full justify-center" data-testid="moment-submit-btn">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Reading…</> : <>Advise me <ArrowRight size={14} /></>}
            </button>
          </form>

          {items.length > 0 && (
            <div>
              <p className="mono-label">{"{ history }"}</p>
              <div className="mt-3 border border-ink">
                {items.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => setActive(m)}
                    className={`w-full text-left p-3 flex justify-between gap-3 ${active?.id === m.id ? "bg-ink text-chalk" : "bg-chalk hover:bg-paper"} ${i < items.length - 1 ? "border-b border-ink" : ""}`}
                    data-testid={`moment-history-${m.id}`}
                  >
                    <span className="truncate text-sm">{m.moment}</span>
                    <span className="mono-tag opacity-60 shrink-0">{new Date(m.created_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          {!active ? (
            <div className="card-brut p-8 bg-paper">
              <p className="mono-label">{"{ output · pending }"}</p>
              <p className="mt-4 text-muted">Paste a moment. Bracket will read it, take a stance, and hand you a draft.</p>
            </div>
          ) : (
            <MomentOutput m={active} onDelete={() => remove(active.id)} onCopy={copy} />
          )}
        </div>
      </main>
    </div>
  );
}

function Pill({ label, value }) {
  const color = { NOW: "bg-signal text-chalk", LATER: "bg-ink text-chalk", CLARIFY: "bg-ink text-chalk", PUSH_BACK: "bg-danger text-chalk", HOLD: "bg-paper text-ink border border-ink", SOFTEN: "bg-paper text-ink border border-ink", FIRM_UP: "bg-ink text-chalk", KEEP: "bg-paper text-ink border border-ink" }[value] || "bg-paper text-ink border border-ink";
  return (
    <div>
      <p className="mono-tag text-muted">{label}</p>
      <span className={`mono-tag px-3 py-1 inline-block mt-2 ${color}`}>{value}</span>
    </div>
  );
}

function MomentOutput({ m, onDelete, onCopy }) {
  const o = m.output || {};
  return (
    <div className="space-y-5" data-testid="moment-output">
      <div className="card-brut p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mono-label">{"{ what's really happening }"}</p>
            <p className="mt-3 font-display text-2xl leading-tight">{o.read}</p>
          </div>
          <button onClick={onDelete} className="p-2 border border-ink hover:bg-danger hover:text-chalk hover:border-danger" data-testid="moment-delete-btn"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-0 border border-ink">
        <div className="p-5 border-r border-ink bg-chalk">
          <Pill label="TIMING" value={o.timing} />
          <p className="mt-3 text-xs text-muted">{o.timing_why}</p>
        </div>
        <div className="p-5 border-r border-ink bg-chalk">
          <Pill label="POSTURE" value={o.posture} />
          <p className="mt-3 text-xs text-muted">{o.posture_why}</p>
        </div>
        <div className="p-5 bg-chalk">
          <Pill label="TONE" value={o.tone} />
          <p className="mt-3 text-xs text-muted">{o.tone_why}</p>
        </div>
      </div>

      {o.response_draft && (
        <div className="card-brut p-6">
          <div className="flex items-center justify-between">
            <p className="mono-label">{"{ your response }"}</p>
            <button onClick={() => onCopy(o.response_draft)} className="btn-ghost" data-testid="moment-copy-btn"><Copy size={12} /> Copy</button>
          </div>
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-sm">{o.response_draft}</p>
        </div>
      )}

      {o.what_not_to_do?.length > 0 && (
        <div className="card-brut p-6 bg-ink text-chalk">
          <p className="mono-label text-faint">{"{ don't do this }"}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {o.what_not_to_do.map((x, i) => (
              <li key={i} className="flex gap-3"><span className="font-mono text-danger">×</span><span>{x}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
