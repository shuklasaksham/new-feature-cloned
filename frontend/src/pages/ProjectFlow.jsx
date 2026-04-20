import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Lock, Check, Loader2, RefreshCw, Share2, Download, FileText, History, Bookmark, Zap, Copy, X, Unlock } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { api, formatApiError, API_BASE } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const STEPS = [
  { n: 1, key: "situation", label: "SITUATION FRAMING", glyph: "{ 01 }" },
  { n: 2, key: "context", label: "CONTEXT COMPRESSION", glyph: "{ 02 }" },
  { n: 3, key: "decision", label: "DECISION ENGINE", glyph: "{ 03 }" },
  { n: 4, key: "artifacts", label: "ARTIFACTS", glyph: "{ 04 }" },
  { n: 5, key: "lock", label: "CONFIDENCE LOCK-IN", glyph: "{ 05 }" },
];

export default function ProjectFlow() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/projects/${id}`);
        setProject(data);
        setCurrentStep(data.step || 1);
      } catch (e) {
        setError(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="mono-label">LOADING…</p></div>;
  }
  if (error && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-danger p-6 bg-chalk">
          <p className="mono-tag text-danger">ERROR</p>
          <p className="mt-2">{error}</p>
          <Link to="/app" className="btn-ghost mt-4">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const isLocked = project?.status === "locked";
  const progress = (currentStep / 5) * 100;

  return (
    <div className="min-h-screen bg-paper" data-testid="project-flow-page">
      <header className="sticky top-0 z-30 bg-paper border-b border-ink">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/app"><BracketMark label={false} size={24} /></Link>
            <div className="hidden md:block">
              <p className="font-display text-lg leading-none">{project?.name}</p>
              <p className="mono-tag text-muted">{project?.engine === "gpt" ? "GPT-5.2" : "CLAUDE SONNET 4.5"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLocked && <span className="mono-tag text-signal flex items-center gap-2"><Lock size={12} /> LOCKED</span>}
            <ProjectToolbar project={project} setProject={setProject} />
            <button className="btn-ghost" onClick={async () => { await logout(); navigate("/"); }} data-testid="flow-logout-btn">Exit</button>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 pb-3">
          <div className="step-line"><span style={{ width: `${progress}%` }} /></div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
            {STEPS.map((s) => {
              const done = (project?.step || 1) > s.n || (project?.step === s.n && project?.status === "locked");
              const active = currentStep === s.n;
              return (
                <button
                  key={s.n}
                  onClick={() => setCurrentStep(s.n)}
                  className={`mono-tag flex items-center gap-2 ${active ? "text-ink" : done ? "text-signal" : "text-muted"} hover:text-ink`}
                  data-testid={`step-nav-${s.n}`}
                >
                  <span>{s.glyph}</span>
                  <span>{s.label}</span>
                  {done && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 md:px-10 py-10 animate-fade-up" key={currentStep}>
        {currentStep === 1 && <Step1 project={project} setProject={setProject} onDone={() => setCurrentStep(2)} />}
        {currentStep === 2 && <Step2 project={project} setProject={setProject} onDone={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />}
        {currentStep === 3 && <Step3 project={project} setProject={setProject} onDone={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />}
        {currentStep === 4 && <Step4 project={project} setProject={setProject} onDone={() => setCurrentStep(5)} onBack={() => setCurrentStep(3)} />}
        {currentStep === 5 && <Step5 project={project} setProject={setProject} onBack={() => setCurrentStep(4)} />}
      </main>
    </div>
  );
}

function StepShell({ num, label, title, kicker, children }) {
  return (
    <div>
      <p className="mono-label">{`{ step 0${num} · ${label} }`}</p>
      <h1 className="font-display text-5xl md:text-7xl uppercase mt-4">{title}</h1>
      {kicker && <p className="mt-4 text-muted max-w-2xl">{kicker}</p>}
      <div className="mt-10">{children}</div>
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="border border-danger bg-chalk p-3 mt-4" data-testid="step-error">
      <p className="mono-tag text-danger">SOMETHING BROKE</p>
      <p className="text-sm mt-1">{msg}</p>
    </div>
  );
}

function Step1({ project, setProject, onDone }) {
  const initial = project.situation_input || { what: "", who: "", unclear: "" };
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const framing = project.framing;

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/projects/${project.id}/situation`, form);
      setProject(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepShell
      num={1}
      label="SITUATION FRAMING"
      title="Name what's really happening."
      kicker="Skip the brief. Describe the situation like you'd tell it to a friend over coffee. Bracket will mirror it back clearly."
    >
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6" data-testid="step1-form">
          <Field label="What is the project?" testid="step1-what">
            <textarea className="textarea-brut" rows={3} placeholder="A landing page. Or a whole rebrand. Or something you can't name yet." value={form.what} onChange={(e) => setForm({ ...form, what: e.target.value })} />
          </Field>
          <Field label="Who is it for?" testid="step1-who">
            <textarea className="textarea-brut" rows={3} placeholder="Client / company, and the person you're actually dealing with." value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value })} />
          </Field>
          <Field label="What's unclear or feels off?" testid="step1-unclear">
            <textarea className="textarea-brut" rows={4} placeholder="What's the thing you'd normally not say out loud?" value={form.unclear} onChange={(e) => setForm({ ...form, unclear: e.target.value })} />
          </Field>

          <div className="flex items-center gap-3">
            <button onClick={run} disabled={loading || !form.what.trim()} className="btn-brut" data-testid="step1-submit-btn">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Framing…</> : framing ? <><RefreshCw size={14} /> Reframe again</> : <>Reframe <ArrowRight size={14} /></>}
            </button>
            {framing && (
              <button onClick={onDone} className="btn-ghost" data-testid="step1-continue-btn">
                Continue to context <ArrowRight size={14} />
              </button>
            )}
          </div>
          <ErrorBox msg={error} />
        </div>

        <div>
          {!framing ? (
            <div className="card-brut p-6 bg-paper">
              <p className="mono-label">{"{ output · pending }"}</p>
              <p className="mt-5 text-muted">Bracket hasn't seen it yet. Fill the three fields on the left. It'll name what's happening.</p>
              <div className="mt-10 space-y-3">
                <SkeletonLine />
                <SkeletonLine />
                <SkeletonLine short />
              </div>
            </div>
          ) : (
            <div className="card-brut p-6" data-testid="step1-framing-output">
              <div className="flex items-center justify-between">
                <p className="mono-label">{"{ reframed }"}</p>
                <ClarityPill score={framing.clarity_score} label={framing.clarity_label} />
              </div>
              <h3 className="font-display text-2xl mt-4 leading-tight">{framing.reframed_problem}</h3>
              {framing.what_to_name && (
                <p className="mt-5 border-l-2 border-signal pl-4 italic">{framing.what_to_name}</p>
              )}
              <p className="mono-tag text-muted mt-8">TENSIONS TO WATCH</p>
              <ul className="mt-3 space-y-2">
                {(framing.tensions || []).map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm"><span className="font-mono text-signal">{String(i + 1).padStart(2, "0")}</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}

function Step2({ project, setProject, onDone, onBack }) {
  const initial = project.context_input || { requirements: "", constraints: "", inspirations: "" };
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const compressed = project.context;

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/projects/${project.id}/context`, form);
      setProject(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepShell num={2} label="CONTEXT COMPRESSION" title="Less context. Better judgement." kicker="Dump what you've got. Bracket will strip the noise and surface only what changes the call.">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6" data-testid="step2-form">
          <Field label="Requirements (from client or PM)" testid="step2-req">
            <textarea className="textarea-brut" rows={4} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Paste the brief. Paste the Slack dump. It's fine." />
          </Field>
          <Field label="Constraints" testid="step2-con">
            <textarea className="textarea-brut" rows={3} value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} placeholder="Budget, timeline, brand rules, tech limits." />
          </Field>
          <Field label="Inspirations / references (optional)" testid="step2-insp">
            <textarea className="textarea-brut" rows={2} value={form.inspirations} onChange={(e) => setForm({ ...form, inspirations: e.target.value })} placeholder="Only what you genuinely want to pull from." />
          </Field>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={onBack} className="btn-ghost" data-testid="step2-back-btn"><ArrowLeft size={14} /> Back</button>
            <button onClick={run} disabled={loading} className="btn-brut" data-testid="step2-submit-btn">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Compressing…</> : compressed ? <><RefreshCw size={14} /> Recompress</> : <>Compress <ArrowRight size={14} /></>}
            </button>
            {compressed && <button onClick={onDone} className="btn-ghost" data-testid="step2-continue-btn">Continue to decision <ArrowRight size={14} /></button>}
          </div>
          <ErrorBox msg={error} />
        </div>

        <div>
          {!compressed ? (
            <div className="card-brut p-6 bg-paper">
              <p className="mono-label">{"{ output · pending }"}</p>
              <p className="mt-5 text-muted">Paste as much as you want. Bracket will keep what moves the needle.</p>
              <div className="mt-10 space-y-3"><SkeletonLine /><SkeletonLine /><SkeletonLine short /></div>
            </div>
          ) : (
            <div className="card-brut p-6" data-testid="step2-context-output">
              <p className="mono-label">{"{ what actually matters }"}</p>
              <p className="mt-4 text-lg leading-relaxed">{compressed.what_actually_matters}</p>

              <p className="mono-tag text-muted mt-8">KEY SIGNALS</p>
              <ul className="mt-3 space-y-2">
                {(compressed.key_signals || []).map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm"><span className="font-mono text-signal">→</span><span>{s}</span></li>
                ))}
              </ul>

              <p className="mono-tag text-muted mt-8">NOISE REMOVED</p>
              <ul className="mt-3 space-y-2">
                {(compressed.noise_removed || []).map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm line-through text-muted"><span className="font-mono">×</span><span>{s}</span></li>
                ))}
              </ul>

              {compressed.hidden_assumptions?.length > 0 && (
                <>
                  <p className="mono-tag text-muted mt-8">HIDDEN ASSUMPTIONS</p>
                  <ul className="mt-3 space-y-2">
                    {compressed.hidden_assumptions.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm"><span className="font-mono text-danger">!</span><span>{s}</span></li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}

function Step3({ project, setProject, onDone, onBack }) {
  const initial = project.decision_input || { optimizing_for: "", tradeoffs: "", risks: "" };
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const decision = project.decision;

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/projects/${project.id}/decision`, form);
      setProject(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepShell num={3} label="DECISION ENGINE" title="Take the call." kicker="One line of optimisation. Bracket takes a stance — with alternatives, trade-offs, and honest risks.">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6" data-testid="step3-form">
          <Field label="What are you optimising for?" testid="step3-opt">
            <textarea className="textarea-brut" rows={2} value={form.optimizing_for} onChange={(e) => setForm({ ...form, optimizing_for: e.target.value })} placeholder="e.g. Conversion over aesthetic polish. Or speed to launch over perfection." />
          </Field>
          <Field label="Trade-offs you already feel" testid="step3-tr">
            <textarea className="textarea-brut" rows={2} value={form.tradeoffs} onChange={(e) => setForm({ ...form, tradeoffs: e.target.value })} placeholder="What are you giving up?" />
          </Field>
          <Field label="Risks you suspect" testid="step3-rs">
            <textarea className="textarea-brut" rows={2} value={form.risks} onChange={(e) => setForm({ ...form, risks: e.target.value })} placeholder="Stakeholders, scope, skill gaps, timeline…" />
          </Field>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={onBack} className="btn-ghost" data-testid="step3-back-btn"><ArrowLeft size={14} /> Back</button>
            <button onClick={run} disabled={loading || !form.optimizing_for.trim()} className="btn-brut" data-testid="step3-submit-btn">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Deciding…</> : decision ? <><RefreshCw size={14} /> Re-decide</> : <>Decide <ArrowRight size={14} /></>}
            </button>
            {decision && <button onClick={onDone} className="btn-ghost" data-testid="step3-continue-btn">Generate artifacts <ArrowRight size={14} /></button>}
          </div>
          <ErrorBox msg={error} />
        </div>

        <div>
          {!decision ? (
            <div className="card-brut p-6 bg-paper">
              <p className="mono-label">{"{ the call · pending }"}</p>
              <p className="mt-5 text-muted">A stance, not a menu. Bracket will name the move and the cost of it.</p>
              <div className="mt-10 space-y-3"><SkeletonLine /><SkeletonLine /><SkeletonLine short /></div>
            </div>
          ) : (
            <div className="space-y-6" data-testid="step3-decision-output">
              <div className="card-brut p-6">
                <div className="flex items-center justify-between">
                  <p className="mono-label">{"{ recommendation }"}</p>
                  <span className="mono-tag text-signal">CONF · {decision.recommendation?.confidence ?? 0}%</span>
                </div>
                <h3 className="font-display text-3xl uppercase mt-3 leading-tight">{decision.recommendation?.title}</h3>
                <p className="mt-3 text-muted">{decision.recommendation?.rationale}</p>
              </div>

              {decision.alternatives?.length > 0 && (
                <div className="card-brut p-6">
                  <p className="mono-label">{"{ alternatives }"}</p>
                  <div className="mt-3 space-y-4">
                    {decision.alternatives.map((a, i) => (
                      <div key={i} className="border-t border-ink pt-4 first:border-t-0 first:pt-0">
                        <p className="font-display text-xl">{a.title}</p>
                        <p className="text-sm text-muted mt-1"><span className="mono-tag">WHEN →</span> {a.when_to_choose}</p>
                        <p className="text-sm text-muted mt-1"><span className="mono-tag">COST →</span> {a.cost}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {decision.tradeoffs?.length > 0 && (
                <div className="card-brut p-6">
                  <p className="mono-label">{"{ trade-offs }"}</p>
                  <ul className="mt-3 space-y-2">
                    {decision.tradeoffs.map((t, i) => (
                      <li key={i} className="flex gap-3 text-sm"><span className="font-mono text-signal">→</span><span>{t}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {decision.risks?.length > 0 && (
                <div className="card-brut p-6">
                  <p className="mono-label">{"{ risks }"}</p>
                  <ul className="mt-3 space-y-3">
                    {decision.risks.map((r, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <SeverityPill level={r.severity} />
                        <div>
                          <p>{r.risk}</p>
                          <p className="text-muted mt-1"><span className="mono-tag">DE-RISK →</span> {r.mitigation}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}

function Step4({ project, setProject, onDone, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const artifacts = project.artifacts;

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/projects/${project.id}/artifacts`);
      setProject(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepShell num={4} label="ARTIFACTS" title="Output with intent." kicker="Scope. Message. Assumptions. Risk flags. Drafted from your stance, ready to send.">
      <div className="flex gap-3 items-center flex-wrap">
        <button onClick={onBack} className="btn-ghost" data-testid="step4-back-btn"><ArrowLeft size={14} /> Back</button>
        <button onClick={run} disabled={loading} className="btn-brut" data-testid="step4-generate-btn">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : artifacts ? <><RefreshCw size={14} /> Regenerate</> : <>Generate artifacts <ArrowRight size={14} /></>}
        </button>
        {artifacts && <button onClick={onDone} className="btn-ghost" data-testid="step4-continue-btn">Lock this decision <ArrowRight size={14} /></button>}
      </div>
      <ErrorBox msg={error} />

      {!artifacts ? (
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-brut p-6 bg-paper">
              <p className="mono-label">{"{ pending }"}</p>
              <SkeletonLine /><SkeletonLine /><SkeletonLine short />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 grid md:grid-cols-2 gap-6" data-testid="step4-artifacts-output">
          <ArtifactCard title={artifacts.scope_doc?.title || "Scope"} kind="SCOPE_DOC">
            <BlockList label="IN SCOPE" items={artifacts.scope_doc?.in_scope} />
            <BlockList label="OUT OF SCOPE" items={artifacts.scope_doc?.out_of_scope} muted />
            <BlockList label="DELIVERABLES" items={artifacts.scope_doc?.deliverables} />
            {artifacts.scope_doc?.timeline_note && (
              <div className="mt-4 border-t border-ink pt-4">
                <p className="mono-tag text-muted">TIMELINE</p>
                <p className="mt-1 text-sm">{artifacts.scope_doc.timeline_note}</p>
              </div>
            )}
          </ArtifactCard>

          <ArtifactCard title="Client message" kind="CLIENT_MESSAGE">
            <div className="whitespace-pre-wrap leading-relaxed text-sm">{artifacts.client_message}</div>
            <CopyButton text={artifacts.client_message} />
          </ArtifactCard>

          <ArtifactCard title="Assumptions" kind="ASSUMPTIONS">
            <ul className="space-y-2 text-sm">
              {(artifacts.assumptions || []).map((a, i) => (
                <li key={i} className="flex gap-3"><span className="font-mono text-signal">{String(i + 1).padStart(2, "0")}</span><span>{a}</span></li>
              ))}
            </ul>
          </ArtifactCard>

          <ArtifactCard title="Risk flags" kind="RISK_FLAGS">
            <ul className="space-y-3 text-sm">
              {(artifacts.risk_flags || []).map((r, i) => (
                <li key={i} className="flex gap-3">
                  <SeverityPill level={r.severity} />
                  <div><p className="font-semibold">{r.flag}</p><p className="text-muted">{r.why}</p></div>
                </li>
              ))}
            </ul>
          </ArtifactCard>
        </div>
      )}
    </StepShell>
  );
}

function Step5({ project, setProject, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isLocked = project.status === "locked";

  const lock = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/projects/${project.id}/lock`);
      setProject(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepShell num={5} label="CONFIDENCE LOCK-IN" title={isLocked ? "Locked. Go do the work." : "This is the direction."} kicker="Lock the decision. Future changes get tracked against this version.">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-brut p-6">
            <p className="mono-label">{"{ the stance }"}</p>
            <h3 className="font-display text-3xl uppercase mt-3">{project.decision?.recommendation?.title}</h3>
            <p className="mt-3 text-muted">{project.decision?.recommendation?.rationale}</p>
          </div>

          <div className="card-brut p-6 bg-ink text-chalk">
            <p className="mono-label text-faint">{"{ what to expect }"}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-3"><span className="font-mono text-signal">→</span><span>Client will likely push back on scope items 2 and 3.</span></li>
              <li className="flex gap-3"><span className="font-mono text-signal">→</span><span>The trade-off on timeline will surface at week 2.</span></li>
              <li className="flex gap-3"><span className="font-mono text-signal">→</span><span>If someone asks "can we reduce the price?" — your message is already drafted.</span></li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {isLocked ? (
            <div className="card-brut p-6 bg-signal text-chalk">
              <div className="flex items-center gap-2"><Lock size={16} /> <p className="mono-tag">LOCKED</p></div>
              <h3 className="font-display text-3xl mt-3">Confidence, captured.</h3>
              <p className="mt-3 text-sm">Revisit the project anytime. Future revisions will be tracked against this version.</p>
              <Link to="/app" className="btn-brut bg-chalk text-ink border-chalk hover:bg-ink hover:text-chalk mt-6 w-full justify-center" data-testid="step5-to-dashboard">
                Back to dashboard <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="card-brut p-6">
              <p className="mono-label">{"{ ready? }"}</p>
              <p className="mt-3 text-sm">Locking doesn't freeze you. It just means every next change is tracked — so you always know what you decided, and when you changed your mind.</p>
              <button onClick={onBack} className="btn-ghost mt-5 w-full justify-center" data-testid="step5-back-btn"><ArrowLeft size={14} /> Back</button>
              <button onClick={lock} disabled={loading} className="btn-brut mt-3 w-full justify-center" data-testid="step5-lock-btn">
                {loading ? "Locking…" : <><Lock size={14} /> Lock the decision</>}
              </button>
              <ErrorBox msg={error} />
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}

// ---- helpers ----
function Field({ label, children, testid }) {
  return (
    <label className="block" data-testid={testid}>
      <span className="mono-tag text-muted">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SkeletonLine({ short }) {
  return <div className={`h-3 bg-faint ${short ? "w-1/2" : "w-full"}`} />;
}

function ClarityPill({ score = 0, label = "" }) {
  const color = score >= 75 ? "bg-signal text-chalk" : score >= 40 ? "bg-ink text-chalk" : "bg-danger text-chalk";
  return (
    <span className={`mono-tag px-2 py-1 ${color}`}>{label || "CLARITY"} · {score}</span>
  );
}

function SeverityPill({ level = "LOW" }) {
  const map = { HIGH: "bg-danger text-chalk", MEDIUM: "bg-ink text-chalk", LOW: "bg-paper text-ink border border-ink" };
  return <span className={`mono-tag px-2 py-1 h-fit shrink-0 ${map[level] || map.LOW}`}>{level}</span>;
}

function ArtifactCard({ title, kind, children }) {
  return (
    <div className="card-brut p-6" data-testid={`artifact-${kind}`}>
      <div className="flex items-center justify-between">
        <p className="mono-label">{kind.replace("_", " ")}</p>
        <span className="mono-tag text-signal">DRAFT</span>
      </div>
      <h3 className="font-display text-2xl mt-3">{title}</h3>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function BlockList({ label, items = [], muted }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mono-tag text-muted">{label}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((i, k) => (
          <li key={k} className={`flex gap-3 ${muted ? "line-through text-muted" : ""}`}><span className="font-mono text-signal">•</span><span>{i}</span></li>
        ))}
      </ul>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="btn-ghost mt-4"
      data-testid="copy-message-btn"
    >
      {copied ? "Copied." : "Copy to clipboard"}
    </button>
  );
}

// ------- ProjectToolbar + drawers -------
function ProjectToolbar({ project, setProject }) {
  const [open, setOpen] = useState(null); // 'share' | 'simulate' | 'revisions' | 'save-template'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [revisions, setRevisions] = useState([]);
  const [tplName, setTplName] = useState("");

  const publicBase = typeof window !== "undefined" ? window.location.origin : "";

  const openShare = async () => {
    setOpen("share");
    setError("");
    try {
      let token = project.share_token;
      if (!token) {
        setLoading(true);
        const { data } = await api.post(`/projects/${project.id}/share`);
        setProject(data);
        token = data.share_token;
      }
      setShareLink(`${publicBase}/share/${token}`);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async () => {
    setLoading(true);
    try {
      await api.delete(`/projects/${project.id}/share`);
      const { data } = await api.get(`/projects/${project.id}`);
      setProject(data);
      setShareLink("");
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const runSimulate = async () => {
    setOpen("simulate");
    setError("");
    try {
      setLoading(true);
      const { data } = await api.post(`/projects/${project.id}/simulate`);
      setProject(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const openRevisions = async () => {
    setOpen("revisions");
    setError("");
    try {
      const { data } = await api.get(`/projects/${project.id}/revisions`);
      setRevisions(data);
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  const unlockAndEdit = async () => {
    if (!window.confirm("Unlock and create a new revision? The current version will be saved to history.")) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${project.id}/edit-after-lock`, { note: "" });
      setProject(data);
      setOpen(null);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    if (!tplName.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/templates", { name: tplName.trim(), from_project_id: project.id });
      setTplName("");
      setOpen(null);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const exportUrl = `${API_BASE}/projects/${project.id}/export.md`;
  const downloadMd = async () => {
    const token = localStorage.getItem("bracket_token");
    const res = await fetch(exportUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
    const text = await res.text();
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const hasArtifacts = !!project.artifacts;
  const hasDecision = !!project.decision;

  return (
    <>
      <div className="hidden md:flex items-center gap-2" data-testid="project-toolbar">
        <ToolbarBtn onClick={openShare} disabled={!hasArtifacts} icon={<Share2 size={12} />} label="Share" testid="toolbar-share" />
        <ToolbarBtn onClick={downloadMd} disabled={!hasArtifacts} icon={<Download size={12} />} label="Export" testid="toolbar-export" />
        <ToolbarBtn onClick={runSimulate} disabled={!hasDecision} icon={<Zap size={12} />} label="Simulate" testid="toolbar-simulate" />
        <ToolbarBtn onClick={() => setOpen("save-template")} disabled={!hasDecision} icon={<Bookmark size={12} />} label="Template" testid="toolbar-template" />
        <ToolbarBtn onClick={openRevisions} icon={<History size={12} />} label="Revisions" testid="toolbar-revisions" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-end md:items-center md:justify-end" onClick={() => setOpen(null)} data-testid="project-drawer">
          <div className="w-full md:w-[520px] md:h-full bg-paper border-l border-ink overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-ink px-6 h-16 flex items-center justify-between sticky top-0 bg-paper">
              <p className="mono-label">{`{ ${open} }`}</p>
              <button onClick={() => setOpen(null)} className="p-2 border border-ink hover:bg-ink hover:text-chalk" data-testid="drawer-close-btn"><X size={14} /></button>
            </div>
            <div className="p-6">
              {error && <div className="border border-danger p-3 mb-4" data-testid="drawer-error"><p className="mono-tag text-danger">ERROR</p><p className="text-sm mt-1">{error}</p></div>}

              {open === "share" && (
                <ShareDrawer
                  loading={loading}
                  link={shareLink}
                  token={project.share_token}
                  onRevoke={revokeShare}
                />
              )}

              {open === "simulate" && (
                <SimulateDrawer
                  loading={loading}
                  simulation={project.simulation}
                  onRun={runSimulate}
                />
              )}

              {open === "revisions" && (
                <RevisionsDrawer
                  revisions={revisions}
                  project={project}
                  onUnlock={unlockAndEdit}
                  loading={loading}
                />
              )}

              {open === "save-template" && (
                <form onSubmit={saveTemplate} className="space-y-5" data-testid="save-template-form">
                  <h3 className="font-display text-2xl">Save this project as a template.</h3>
                  <p className="text-muted text-sm">Your situation, context, and decision inputs will be saved. Outputs will be regenerated fresh every time.</p>
                  <label className="mono-tag text-muted block">TEMPLATE NAME</label>
                  <input className="input-line" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="e.g. Landing page intake" data-testid="save-template-name-input" autoFocus />
                  <button type="submit" disabled={loading || !tplName.trim()} className="btn-brut w-full justify-center" data-testid="save-template-submit-btn">
                    {loading ? "Saving…" : "Save template"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ToolbarBtn({ onClick, icon, label, disabled, testid }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 border border-ink font-mono text-[11px] tracking-widest uppercase flex items-center gap-2 ${disabled ? "opacity-40 cursor-not-allowed bg-paper" : "bg-paper hover:bg-ink hover:text-chalk"}`}
      data-testid={testid}
    >
      {icon} {label}
    </button>
  );
}

function ShareDrawer({ link, token, loading, onRevoke }) {
  const [copied, setCopied] = useState(false);
  if (loading) return <p className="mono-label">GENERATING LINK…</p>;
  if (!token || !link) return <p className="mono-label">NO LINK YET</p>;
  return (
    <div data-testid="share-drawer">
      <h3 className="font-display text-2xl">Public, read-only link.</h3>
      <p className="text-muted text-sm mt-2">Anyone with this URL can view the artifacts. They can't edit. You can revoke any time.</p>

      <div className="mt-6 border border-ink p-3 bg-chalk flex items-center gap-2">
        <input className="flex-1 bg-transparent outline-none font-mono text-xs" value={link} readOnly data-testid="share-link-input" />
        <button
          onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="p-2 border border-ink hover:bg-ink hover:text-chalk"
          data-testid="share-copy-btn"
        >
          <Copy size={12} />
        </button>
      </div>
      {copied && <p className="mono-tag text-signal mt-2">COPIED</p>}

      <div className="mt-6 flex gap-3">
        <a href={link} target="_blank" rel="noreferrer" className="btn-ghost flex-1 justify-center" data-testid="share-open-btn">Open preview →</a>
        <button onClick={onRevoke} className="btn-ghost flex-1 justify-center text-danger border-danger hover:bg-danger hover:text-chalk" data-testid="share-revoke-btn">Revoke</button>
      </div>
    </div>
  );
}

function SimulateDrawer({ simulation, loading, onRun }) {
  if (loading && !simulation) {
    return (
      <div className="flex items-center gap-3" data-testid="simulate-loading">
        <Loader2 className="animate-spin text-signal" size={18} />
        <p className="mono-label">SIMULATING PUSHBACK…</p>
      </div>
    );
  }
  return (
    <div data-testid="simulate-drawer">
      <h3 className="font-display text-2xl">Pushback simulator.</h3>
      <p className="text-muted text-sm mt-2">What will the client say? Bracket plays client, so you can rehearse the answer before it's asked.</p>
      <button onClick={onRun} disabled={loading} className="btn-brut mt-5 w-full justify-center" data-testid="simulate-run-btn">
        {loading ? "Re-running…" : simulation ? <><RefreshCw size={12} /> Re-run simulation</> : "Run simulation"}
      </button>

      {simulation?.scenarios?.length > 0 && (
        <div className="mt-6 space-y-4" data-testid="simulate-output">
          {simulation.scenarios.map((s, i) => (
            <div key={i} className="card-brut p-5">
              <p className="mono-tag text-danger">SCENARIO {String(i + 1).padStart(2, "0")}</p>
              <p className="font-display text-xl mt-2">"{s.trigger}"</p>
              <p className="text-muted text-sm mt-2"><span className="mono-tag">WHY →</span> {s.why}</p>
              <p className="text-sm mt-4"><span className="mono-tag text-signal">BEST MOVE →</span> {s.best_move}</p>
              {s.response_draft && (
                <div className="mt-4 border-l-2 border-signal pl-3 text-sm whitespace-pre-wrap">{s.response_draft}</div>
              )}
              {s.what_not_to_do && (
                <p className="text-sm mt-3 text-muted"><span className="mono-tag text-danger">DON'T →</span> {s.what_not_to_do}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RevisionsDrawer({ revisions, project, onUnlock, loading }) {
  return (
    <div data-testid="revisions-drawer">
      <h3 className="font-display text-2xl">Revision history.</h3>
      <p className="text-muted text-sm mt-2">Every time a locked decision changes, it gets snapshotted here. So you always know what you decided — and when you changed your mind.</p>

      {project.status === "locked" && (
        <button onClick={onUnlock} disabled={loading} className="btn-brut w-full justify-center mt-6" data-testid="revisions-unlock-btn">
          <Unlock size={12} /> {loading ? "Unlocking…" : "Unlock & create new revision"}
        </button>
      )}

      <div className="mt-6 space-y-3">
        {revisions.length === 0 ? (
          <p className="mono-tag text-muted">NO REVISIONS YET. LOCK THIS PROJECT, THEN EDIT TO SNAPSHOT.</p>
        ) : (
          revisions.map((r) => (
            <div key={r.id} className="border border-ink p-4 bg-chalk" data-testid={`revision-${r.version}`}>
              <div className="flex items-center justify-between">
                <p className="mono-label">V{String(r.version).padStart(2, "0")}</p>
                <span className="mono-tag text-muted">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="font-display text-lg mt-2 truncate">
                {r.snapshot?.decision?.recommendation?.title || "(previous version)"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

