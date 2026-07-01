import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Lock,
  Check,
  Loader2,
  RefreshCw,
  Download,
  FileText,
  Layers,
  FolderOpen,
  Copy,
  Pencil,
} from "lucide-react";
import BracketMark from "../components/BracketMark";
import { api, formatApiError, API_BASE } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { toast } from "sonner";

const STEPS = [
  { n: 1, key: "situation", label: "Situation framing", glyph: "{ 01 }" },
  { n: 2, key: "context", label: "Context compression", glyph: "{ 02 }" },
  { n: 3, key: "decision", label: "Decision engine", glyph: "{ 03 }" },
  { n: 4, key: "artifacts", label: "Artifacts", glyph: "{ 04 }" },
  { n: 5, key: "lock", label: "Confidence lock-in", glyph: "{ 05 }" },
];

export default function ProjectFlow() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const dirtyRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/projects/${id}`);
        setProject(data);
        // Allow ?step=N to jump directly into a step (from the overview's Edit
        // button). Clamp between 1 and the project's reached step.
        const requested = parseInt(searchParams.get("step") || "", 10);
        const reached = data.step || 1;
        if (requested >= 1 && requested <= 5) {
          setCurrentStep(Math.min(requested, Math.max(reached, requested)));
        } else {
          setCurrentStep(reached);
        }
      } catch (e) {
        setError(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="mono-label">LOADING…</p>
      </div>
    );
  }
  if (error && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-danger p-6 bg-chalk" data-testid="flow-load-error">
          <p className="mono-tag text-danger">ERROR</p>
          <p className="mt-2">{error}</p>
          <Link to="/app" className="btn-ghost mt-4">
            Start a new project
          </Link>
        </div>
      </div>
    );
  }

  const isLocked = project?.status === "locked";
  const progress = (currentStep / 5) * 100;

  const downloadPdf = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/${project.id}/export.pdf`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      // Use alert as a last-resort; toast isn't imported here.
      window.alert(`Couldn't download PDF — ${e.message || e}`);
    }
  };

  // Logo click: take user to dashboard, but warn if they have unsaved input
  // in the current step. We track this via the `dirty` ref each step writes to.
  const handleLogoClick = (e) => {
    e.preventDefault();
    if (dirtyRef.current) {
      const ok = window.confirm(
        "You may have unsaved input in this step. Generate the AI output before leaving, or it'll be lost. Leave anyway?",
      );
      if (!ok) return;
    }
    navigate("/app");
  };

  return (
    <div className="min-h-screen" data-testid="project-flow-page">
      <header className="sticky top-0 z-30 glass">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <a href="/app" onClick={handleLogoClick} className="shrink-0 cursor-pointer" data-testid="flow-logo-link">
              <BracketMark label={false} size={22} variant="chalk" />
            </a>
            <div className="min-w-0 flex-1">
              <p
                className="font-semibold text-[15px] tracking-[-0.012em] leading-none truncate"
                data-testid="flow-project-name"
              >
                {project?.name}
              </p>
              <p className="text-[11px] text-[var(--text-3)] hidden sm:block truncate mt-1.5">
                {project?.engine === "gpt" ? "GPT-5.2" : "Claude Sonnet 4.5"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isLocked && (
              <span className="status-pill status-pill--active hidden sm:inline-flex">
                <Lock size={11} className="-ml-0.5" /> Locked
              </span>
            )}
            {project?.artifacts && (
              <Link
                to={`/project/${project.id}/document`}
                className="btn-secondary btn-sm"
                data-testid="flow-document-link"
                title="Document"
                aria-label="Document"
              >
                <FileText size={12} /> <span className="hidden sm:inline">Document</span>
              </Link>
            )}
            <Link
              to={`/project/${id}`}
              className="btn-secondary btn-sm"
              data-testid="flow-overview-link"
              title="Overview"
              aria-label="Overview"
            >
              <Layers size={12} /> <span className="hidden sm:inline">Overview</span>
            </Link>
            <Link
              to="/app"
              className="btn-secondary btn-sm"
              data-testid="flow-new-project-btn"
              title="All projects"
              aria-label="All projects"
            >
              <FolderOpen size={12} /> <span className="hidden sm:inline">All projects</span>
            </Link>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 pb-4 pt-1 border-b border-[var(--hairline)]">
          <div className="step-pipeline">
            {STEPS.map((s, i) => {
              const done =
                (project?.step || 1) > s.n ||
                (project?.step === s.n && project?.status === "locked");
              const active = currentStep === s.n;
              return (
                <React.Fragment key={s.n}>
                  <button
                    onClick={() => setCurrentStep(s.n)}
                    className={`step-node press ${active ? "is-active" : done ? "is-done" : ""}`}
                    data-testid={`step-nav-${s.n}`}
                    aria-current={active ? "step" : undefined}
                  >
                    <span className="step-num">{done && !active ? <Check size={11} strokeWidth={2.5} /> : s.n}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span
                      className={`step-connector ${done ? "is-done" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      <main
        className="max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 py-8 md:py-10 animate-fade-up"
        key={currentStep}
      >
        {currentStep === 1 && (
          <Step1 project={project} setProject={setProject} dirtyRef={dirtyRef} onDone={() => setCurrentStep(2)} />
        )}
        {currentStep === 2 && (
          <Step2
            project={project}
            setProject={setProject}
            dirtyRef={dirtyRef}
            onDone={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <Step3
            project={project}
            setProject={setProject}
            dirtyRef={dirtyRef}
            onDone={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 4 && (
          <Step4
            project={project}
            setProject={setProject}
            dirtyRef={dirtyRef}
            onDone={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
          />
        )}
        {currentStep === 5 && (
          <Step5
            project={project}
            setProject={setProject}
            onBack={() => setCurrentStep(4)}
            onExport={downloadPdf}
            projectId={project.id}
          />
        )}
      </main>
    </div>
  );
}

function StepShell({ num, label, title, kicker, previously, nextHint, children }) {
  return (
    <div className="page-enter">
      <div className="story-divider" data-testid={`step${num}-divider`}>
        <span className="counter">{`{ 0${num} / 05 }`}</span>
        <span className="t-tag">{label}</span>
      </div>
      {previously && (
        <div className="mb-4 flex" data-testid={`step${num}-previously`}>
          <div className="story-rail">
            <span className="label">↩ previously</span>
            <span>{previously}</span>
          </div>
        </div>
      )}
      <h1 className="t-hero mt-2">{title}</h1>
      {kicker && <p className="mt-4 text-muted max-w-2xl text-sm md:text-base">{kicker}</p>}
      <div className="mt-8 md:mt-10">{children}</div>
      {nextHint && (
        <div className="mt-10 flex" data-testid={`step${num}-next-hint`}>
          <div className="story-rail is-next">
            <span className="label">next ↪</span>
            <span>{nextHint}</span>
          </div>
        </div>
      )}
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

function Step1({ project, setProject, dirtyRef, onDone }) {
  const initial = project.situation_input || { what: "", who: "", unclear: "" };
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const framing = project.framing;

  // Track unsaved input so the logo-click handler can warn
  useEffect(() => {
    if (!dirtyRef) return;
    dirtyRef.current = !!(form.what || form.who || form.unclear) && !framing;
    return () => { if (dirtyRef) dirtyRef.current = false; };
  }, [form, framing, dirtyRef]);

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

  const pick = (field) => (s, v) => setForm({ ...form, [field]: mergeSuggestion(v, s) });

  return (
    <StepShell
      num={1}
      label="SITUATION FRAMING"
      title="Name what's really happening."
      kicker="Skip the brief. Describe the situation like you'd tell it to a friend over coffee. Bracket will mirror it back clearly."
      nextHint={framing ? "compress this into what actually matters" : "we name it before we decide it"}
    >
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-6" data-testid="step1-form">
          <Field label="What is the project?" testid="step1-what">
            <textarea
              className="textarea-brut"
              rows={3}
              placeholder="A landing page. Or a whole rebrand. Or something you can't name yet."
              value={form.what}
              onChange={(e) => setForm({ ...form, what: e.target.value })}
            />
            <AISuggestions
              testid="step1-what-suggest"
              step={1}
              field="what"
              value={form.what}
              context={{ who: form.who, unclear: form.unclear }}
              onPick={pick("what")}
            />
          </Field>
          <Field label="Who is it for?" testid="step1-who">
            <textarea
              className="textarea-brut"
              rows={3}
              placeholder="Client / company, and the person you're actually dealing with."
              value={form.who}
              onChange={(e) => setForm({ ...form, who: e.target.value })}
            />
            <AISuggestions
              testid="step1-who-suggest"
              step={1}
              field="who"
              value={form.who}
              context={{ what: form.what, unclear: form.unclear }}
              onPick={pick("who")}
            />
          </Field>
          <Field label="What's unclear or feels off?" testid="step1-unclear">
            <textarea
              className="textarea-brut"
              rows={4}
              placeholder="What's the thing you'd normally not say out loud?"
              value={form.unclear}
              onChange={(e) => setForm({ ...form, unclear: e.target.value })}
            />
            <AISuggestions
              testid="step1-unclear-suggest"
              step={1}
              field="unclear"
              value={form.unclear}
              context={{ what: form.what, who: form.who }}
              onPick={pick("unclear")}
            />
          </Field>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading || !form.what.trim()}
              className="clay-signal px-5 py-3 t-tag press inline-flex items-center justify-center gap-2 whitespace-nowrap"
              data-testid="step1-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Framing…
                </>
              ) : framing ? (
                <>
                  <RefreshCw size={14} /> Reframe again
                </>
              ) : (
                <>
                  Reframe <ArrowRight size={14} />
                </>
              )}
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
          {!framing || loading ? (
            <OutputPending
              title={loading ? "{ output · generating }" : "{ output · pending }"}
              blurb="Bracket hasn't seen it yet. Fill the three fields on the left. It'll name what's happening."
              loading={loading}
            />
          ) : (
            <OutputCard
              testid="step1-framing-output"
              label={"{ 01 · reframed }"}
              badge={<ClarityPill score={framing.clarity_score} label={framing.clarity_label} />}
              title={framing.reframed_problem}
              blockquote={framing.what_to_name}
              copyText={[framing.reframed_problem, framing.what_to_name, ...(framing.tensions || []).map((t, i) => `${i + 1}. ${t}`)].filter(Boolean).join("\n\n")}
              onRegenerate={run}
              reasoning={
                <>
                  <p>
                    Bracket re-read what you wrote and looked for the gap between <em>what you said</em> and <em>what the project actually is</em>. The reframed problem is the version of the brief your future self would have written if they&apos;d started with all the context.
                  </p>
                  {framing.clarity_label && (
                    <p className="mt-2 t-helper">
                      <span className="t-tag">clarity ·</span> {framing.clarity_label.toLowerCase()} ({framing.clarity_score}/100). Higher means the situation is well-defined; lower means there are still unknowns to surface.
                    </p>
                  )}
                </>
              }
              source={
                <ul className="space-y-1.5 text-sm">
                  <li><span className="t-tag text-muted">what · </span>{form.what || project.situation_input?.what}</li>
                  <li><span className="t-tag text-muted">who · </span>{form.who || project.situation_input?.who || "—"}</li>
                  <li><span className="t-tag text-muted">unclear · </span>{form.unclear || project.situation_input?.unclear || "—"}</li>
                </ul>
              }
            >
              <OutputSection label="TENSIONS TO WATCH">
                <OutputList items={framing.tensions || []} variant="numbered" />
              </OutputSection>
            </OutputCard>
          )}
        </div>
      </div>
    </StepShell>
  );
}

function Step2({ project, setProject, dirtyRef, onDone, onBack }) {
  const initial = project.context_input || { requirements: "", constraints: "", inspirations: "" };
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const compressed = project.context;

  useEffect(() => {
    if (!dirtyRef) return;
    dirtyRef.current = !!(form.requirements || form.constraints || form.inspirations) && !compressed;
    return () => { if (dirtyRef) dirtyRef.current = false; };
  }, [form, compressed, dirtyRef]);

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

  const pick = (field) => (s, v) => setForm({ ...form, [field]: mergeSuggestion(v, s) });

  return (
    <StepShell
      num={2}
      label="CONTEXT COMPRESSION"
      title="You named the problem. Now strip it to bone."
      kicker="Dump what you've got. Bracket will pull the signal out and tell you the few things that actually move the call."
      previously={project?.framing?.reframed_problem}
      nextHint={compressed ? "pick the call · and own it" : "after this, we make a recommendation"}
    >
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-6" data-testid="step2-form">
          <Field label="Requirements (from client or PM)" testid="step2-req">
            <textarea
              className="textarea-brut"
              rows={4}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              placeholder="Paste the brief. Paste the Slack dump. It's fine."
            />
            <AISuggestions
              testid="step2-req-suggest"
              step={2}
              field="requirements"
              value={form.requirements}
              context={{ constraints: form.constraints, inspirations: form.inspirations, framing: project.framing?.reframed_problem }}
              onPick={pick("requirements")}
            />
          </Field>
          <Field label="Constraints" testid="step2-con">
            <textarea
              className="textarea-brut"
              rows={3}
              value={form.constraints}
              onChange={(e) => setForm({ ...form, constraints: e.target.value })}
              placeholder="Budget, timeline, brand rules, tech limits."
            />
            <AISuggestions
              testid="step2-con-suggest"
              step={2}
              field="constraints"
              value={form.constraints}
              context={{ requirements: form.requirements, inspirations: form.inspirations, framing: project.framing?.reframed_problem }}
              onPick={pick("constraints")}
            />
          </Field>
          <Field label="Inspirations / references (optional)" testid="step2-insp">
            <textarea
              className="textarea-brut"
              rows={2}
              value={form.inspirations}
              onChange={(e) => setForm({ ...form, inspirations: e.target.value })}
              placeholder="Only what you genuinely want to pull from."
            />
            <AISuggestions
              testid="step2-insp-suggest"
              step={2}
              field="inspirations"
              value={form.inspirations}
              context={{ requirements: form.requirements, constraints: form.constraints, framing: project.framing?.reframed_problem }}
              onPick={pick("inspirations")}
            />
          </Field>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={onBack} className="btn-ghost" data-testid="step2-back-btn">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={run}
              disabled={loading || !form.requirements.trim()}
              className="clay-signal px-5 py-3 t-tag press inline-flex items-center justify-center gap-2 whitespace-nowrap"
              data-testid="step2-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Compressing…
                </>
              ) : compressed ? (
                <>
                  <RefreshCw size={14} /> Recompress
                </>
              ) : (
                <>
                  Compress <ArrowRight size={14} />
                </>
              )}
            </button>
            {compressed && (
              <button onClick={onDone} className="btn-ghost" data-testid="step2-continue-btn">
                Continue to decision <ArrowRight size={14} />
              </button>
            )}
          </div>
          <ErrorBox msg={error} />
        </div>

        <div>
          {!compressed || loading ? (
            <OutputPending
              title={loading ? "{ output · generating }" : "{ output · pending }"}
              blurb="Paste as much as you want. Bracket will keep what moves the needle."
              loading={loading}
            />
          ) : (
            <OutputCard
              testid="step2-context-output"
              label={"{ 02 · what actually matters }"}
              title={compressed.what_actually_matters}
              copyText={[
                compressed.what_actually_matters,
                (compressed.key_signals || []).length ? `KEY SIGNALS\n${(compressed.key_signals || []).map((s) => `→ ${s}`).join("\n")}` : "",
                (compressed.noise_removed || []).length ? `NOISE REMOVED\n${(compressed.noise_removed || []).map((s) => `× ${s}`).join("\n")}` : "",
                (compressed.hidden_assumptions || []).length ? `HIDDEN ASSUMPTIONS\n${(compressed.hidden_assumptions || []).map((s) => `! ${s}`).join("\n")}` : "",
              ].filter(Boolean).join("\n\n")}
              onRegenerate={run}
              reasoning={
                <>
                  <p>
                    Bracket compared your inputs against the reframe from Step 01. Anything that didn&apos;t <em>change the call</em> was moved to &quot;noise removed&quot;. The signals listed are the few inputs that should actually steer Step 03.
                  </p>
                  <p className="mt-2 t-helper">
                    Hidden assumptions are the things nobody asked aloud but everyone is acting on — usually where projects quietly go wrong.
                  </p>
                </>
              }
              source={
                <ul className="space-y-1.5 text-sm">
                  <li><span className="t-tag text-muted">requirements · </span>{(form.requirements || project.context_input?.requirements || "—").slice(0, 220)}{(form.requirements || "").length > 220 ? "…" : ""}</li>
                  <li><span className="t-tag text-muted">constraints · </span>{form.constraints || project.context_input?.constraints || "—"}</li>
                  <li><span className="t-tag text-muted">inspirations · </span>{form.inspirations || project.context_input?.inspirations || "—"}</li>
                </ul>
              }
            >
              <OutputSection label="KEY SIGNALS">
                <OutputList items={compressed.key_signals || []} variant="arrow" />
              </OutputSection>
              <OutputSection label="NOISE REMOVED">
                <OutputList items={compressed.noise_removed || []} variant="strike" />
              </OutputSection>
              {compressed.hidden_assumptions?.length > 0 && (
                <OutputSection label="HIDDEN ASSUMPTIONS">
                  <OutputList items={compressed.hidden_assumptions} variant="danger" />
                </OutputSection>
              )}
            </OutputCard>
          )}
        </div>
      </div>
    </StepShell>
  );
}

function Step3({ project, setProject, dirtyRef, onDone, onBack }) {
  const initial = project.decision_input || { optimizing_for: "", tradeoffs: "", risks: "" };
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const decision = project.decision;

  useEffect(() => {
    if (!dirtyRef) return;
    dirtyRef.current = !!(form.optimizing_for || form.tradeoffs || form.risks) && !decision;
    return () => { if (dirtyRef) dirtyRef.current = false; };
  }, [form, decision, dirtyRef]);

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

  const pick = (field) => (s, v) => setForm({ ...form, [field]: mergeSuggestion(v, s) });

  return (
    <StepShell
      num={3}
      label="DECISION ENGINE"
      title="We know what it is. Now call the shot."
      kicker="One line of what matters most. Bracket picks a side, names the trade-offs, and tells you what could go wrong — so you can decide with eyes open."
      previously={project?.context?.what_actually_matters}
      nextHint={decision ? "give it a paper trail" : "next: artifacts the client can sign"}
    >
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-6" data-testid="step3-form">
          <Field label="What are you optimising for?" testid="step3-opt">
            <textarea
              className="textarea-brut"
              rows={2}
              value={form.optimizing_for}
              onChange={(e) => setForm({ ...form, optimizing_for: e.target.value })}
              placeholder="e.g. Conversion over aesthetic polish. Or speed to launch over perfection."
            />
            <AISuggestions
              testid="step3-opt-suggest"
              step={3}
              field="optimizing_for"
              value={form.optimizing_for}
              context={{ tradeoffs: form.tradeoffs, risks: form.risks, framing: project.framing?.reframed_problem }}
              onPick={pick("optimizing_for")}
            />
          </Field>
          <Field label="Trade-offs you already feel" testid="step3-tr">
            <textarea
              className="textarea-brut"
              rows={2}
              value={form.tradeoffs}
              onChange={(e) => setForm({ ...form, tradeoffs: e.target.value })}
              placeholder="What are you giving up?"
            />
            <AISuggestions
              testid="step3-tr-suggest"
              step={3}
              field="tradeoffs"
              value={form.tradeoffs}
              context={{ optimizing_for: form.optimizing_for, risks: form.risks, framing: project.framing?.reframed_problem }}
              onPick={pick("tradeoffs")}
            />
          </Field>
          <Field label="Risks you suspect" testid="step3-rs">
            <textarea
              className="textarea-brut"
              rows={2}
              value={form.risks}
              onChange={(e) => setForm({ ...form, risks: e.target.value })}
              placeholder="Stakeholders, scope, skill gaps, timeline…"
            />
            <AISuggestions
              testid="step3-rs-suggest"
              step={3}
              field="risks"
              value={form.risks}
              context={{ optimizing_for: form.optimizing_for, tradeoffs: form.tradeoffs, framing: project.framing?.reframed_problem }}
              onPick={pick("risks")}
            />
          </Field>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={onBack} className="btn-ghost" data-testid="step3-back-btn">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={run}
              disabled={loading || !form.optimizing_for.trim()}
              className="clay-signal px-5 py-3 t-tag press inline-flex items-center justify-center gap-2 whitespace-nowrap"
              data-testid="step3-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Deciding…
                </>
              ) : decision ? (
                <>
                  <RefreshCw size={14} /> Re-decide
                </>
              ) : (
                <>
                  Decide <ArrowRight size={14} />
                </>
              )}
            </button>
            {decision && (
              <button onClick={onDone} className="btn-ghost" data-testid="step3-continue-btn">
                Generate artifacts <ArrowRight size={14} />
              </button>
            )}
          </div>
          <ErrorBox msg={error} />
        </div>

        <div>
          {!decision || loading ? (
            <OutputPending
              title={loading ? "{ the call · generating }" : "{ the call · pending }"}
              blurb="A stance, not a menu. Bracket will name the move and the cost of it."
              loading={loading}
            />
          ) : (
            <div className="space-y-6" data-testid="step3-decision-output">
              <OutputCard
                testid="step3-recommendation-output"
                label={"{ 03 · recommendation }"}
                confidence={decision.recommendation?.confidence}
                title={decision.recommendation?.title}
                blockquote={decision.recommendation?.rationale}
                copyText={`THE CALL\n${decision.recommendation?.title || ""}\n\n${decision.recommendation?.rationale || ""}\n\nConfidence: ${decision.recommendation?.confidence ?? 0}%`}
                onRegenerate={run}
                reasoning={
                  <>
                    <p>
                      Given your optimisation target — <em>{form.optimizing_for || project.decision_input?.optimizing_for || "—"}</em> — Bracket scored each plausible direction against your signals from Step 02, then picked the one with the cleanest path to the target.
                    </p>
                    <p className="mt-2 t-helper">
                      Confidence is shown above. Anything below ~70% means the inputs are still ambiguous — go back to Step 01 / 02 and tighten them before locking in.
                    </p>
                  </>
                }
                source={
                  <ul className="space-y-1.5 text-sm">
                    <li><span className="t-tag text-muted">optimising for · </span>{form.optimizing_for || project.decision_input?.optimizing_for || "—"}</li>
                    <li><span className="t-tag text-muted">don&apos;t break · </span>{form.dont_break || project.decision_input?.dont_break || "—"}</li>
                    <li><span className="t-tag text-muted">key signals · </span>{(project.context?.key_signals || []).join(", ") || "—"}</li>
                  </ul>
                }
              />

              {decision.alternatives?.length > 0 && (
                <OutputCard label={"{ 03 · alternatives }"}>
                  <div className="space-y-4">
                    {decision.alternatives.map((a, i) => (
                      <div
                        key={i}
                        className="border-t border-ink pt-4 first:border-t-0 first:pt-0"
                      >
                        <p className="t-h3">{a.title}</p>
                        <p className="text-sm text-muted mt-1">
                          <span className="mono-tag">WHEN →</span> {a.when_to_choose}
                        </p>
                        <p className="text-sm text-muted mt-1">
                          <span className="mono-tag">COST →</span> {a.cost}
                        </p>
                      </div>
                    ))}
                  </div>
                </OutputCard>
              )}

              {decision.tradeoffs?.length > 0 && (
                <OutputCard label={"{ 03 · trade-offs }"}>
                  <OutputList items={decision.tradeoffs} variant="arrow" />
                </OutputCard>
              )}

              {decision.risks?.length > 0 && (
                <OutputCard label={"{ 03 · risks }"}>
                  <OutputList items={decision.risks} variant="severity" />
                </OutputCard>
              )}
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}

function Step4({ project, setProject, dirtyRef, onDone, onBack }) {
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

  // Auto-start generation on mount IF artifacts don't yet exist for the
  // current decision. Run only once per mount; user can still re-trigger via
  // the "Regenerate" button below.
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current) return;
    autoRanRef.current = true;
    if (!artifacts && !loading) {
      run();
    }
  }, []);

  // No editable inputs on this step, so dirty state is always false.
  useEffect(() => {
    if (dirtyRef) dirtyRef.current = false;
  }, [dirtyRef]);

  return (
    <StepShell
      num={4}
      label="ARTIFACTS"
      title="The call is made. Give it a paper trail."
      kicker="Scope, message to the client, assumptions, and risk flags — drafted from your stance, ready to send."
      previously={project?.decision?.recommendation?.title}
      nextHint={artifacts ? "lock it in · so it survives the 3am rethink" : "next: confidence lock-in"}
    >
      <div className="flex gap-3 items-center flex-wrap">
        <button onClick={onBack} className="btn-ghost" data-testid="step4-back-btn">
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={run}
          disabled={loading || !project?.decision?.recommendation?.title}
          className="clay-signal px-5 py-3 t-tag press inline-flex items-center justify-center gap-2 whitespace-nowrap"
          data-testid="step4-generate-btn"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Generating…
            </>
          ) : artifacts ? (
            <>
              <RefreshCw size={14} /> Regenerate
            </>
          ) : (
            <>
              Generate artifacts <ArrowRight size={14} />
            </>
          )}
        </button>
        {artifacts && (
          <button onClick={onDone} className="btn-ghost" data-testid="step4-continue-btn">
            Lock this decision <ArrowRight size={14} />
          </button>
        )}
      </div>
      <ErrorBox msg={error} />

      {!artifacts || loading ? (
        <div className="mt-10">
          <OutputPending
            title={loading ? "{ artifacts · generating }" : "{ artifacts · pending }"}
            blurb="Bracket is drafting scope, message, assumptions and risk flags from your stance."
            loading={loading}
          />
        </div>
      ) : (
        <div className="mt-10 grid md:grid-cols-2 gap-6" data-testid="step4-artifacts-output">
          <OutputCard
            testid="artifact-SCOPE_DOC"
            label={"{ 04 · scope }"}
            badge={<span className="mono-tag text-signal">DRAFT</span>}
            title={artifacts.scope_doc?.title || "Scope"}
          >
            <BlockList label="IN SCOPE" items={artifacts.scope_doc?.in_scope} />
            <BlockList label="OUT OF SCOPE" items={artifacts.scope_doc?.out_of_scope} muted />
            <BlockList label="DELIVERABLES" items={artifacts.scope_doc?.deliverables} />
            {artifacts.scope_doc?.timeline_note && (
              <div className="mt-4 border-t border-ink pt-4">
                <p className="mono-tag text-muted">TIMELINE</p>
                <p className="mt-1 text-sm">{artifacts.scope_doc.timeline_note}</p>
              </div>
            )}
          </OutputCard>

          <OutputCard
            testid="artifact-CLIENT_MESSAGE"
            label={"{ 04 · client message }"}
            badge={<span className="mono-tag text-signal">DRAFT</span>}
            title="Client message"
          >
            <div className="whitespace-pre-wrap leading-relaxed text-sm">
              {artifacts.client_message}
            </div>
            <CopyButton text={artifacts.client_message} />
          </OutputCard>

          <OutputCard
            testid="artifact-ASSUMPTIONS"
            label={"{ 04 · assumptions }"}
            badge={<span className="mono-tag text-signal">DRAFT</span>}
            title="Assumptions"
          >
            <OutputList items={artifacts.assumptions || []} variant="numbered" />
          </OutputCard>

          <OutputCard
            testid="artifact-RISK_FLAGS"
            label={"{ 04 · risk flags }"}
            badge={<span className="mono-tag text-signal">DRAFT</span>}
            title="Risk flags"
          >
            <OutputList
              items={(artifacts.risk_flags || []).map((r) => ({
                severity: r.severity,
                flag: r.flag,
                why: r.why,
              }))}
              variant="severity"
            />
          </OutputCard>
        </div>
      )}
    </StepShell>
  );
}

function GuestUpgradeBanner() {
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);

  if (!user?.is_guest || dismissed || done) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("That email doesn't look right.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/me/email", { email: email.trim().toLowerCase(), name: name.trim() });
      await refresh();
      setDone(true);
      toast.success("Saved. You'll find this project next time you sign in.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="card-brut p-5 sm:p-6 !bg-signal text-chalk mt-6"
      data-testid="guest-upgrade-banner"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="mono-label">{"{ save it for later }"}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-chalk/70 hover:text-chalk mono-tag"
          data-testid="guest-upgrade-dismiss"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <h3 className="t-h2 mt-3">
        Want to come back to this?
      </h3>
      <p className="text-sm mt-2 opacity-90">
        You signed in as a guest. Drop your email + name so this project lives in your
        dashboard the next time you sign in.
      </p>
      <form onSubmit={submit} className="mt-5 grid sm:grid-cols-2 gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studio.com"
          className="bg-transparent border-b-2 border-chalk/40 focus:border-chalk outline-none py-2 font-mono text-sm placeholder-chalk/40"
          data-testid="guest-upgrade-email"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="bg-transparent border-b-2 border-chalk/40 focus:border-chalk outline-none py-2 font-mono text-sm placeholder-chalk/40"
          data-testid="guest-upgrade-name"
        />
        <div className="sm:col-span-2 flex gap-2 items-center mt-2">
          <button
            type="submit"
            disabled={saving || !email}
            className="px-3 py-2 bg-chalk text-signal font-mono text-xs tracking-widest uppercase disabled:opacity-40 inline-flex items-center gap-2"
            data-testid="guest-upgrade-submit"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            {saving ? "SAVING…" : "SAVE FOR LATER"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            disabled={saving}
            className="mono-tag text-chalk/70 hover:text-chalk"
            data-testid="guest-upgrade-skip"
          >
            SKIP — I&apos;M GOOD
          </button>
        </div>
      </form>
    </div>
  );
}

function Step5({ project, setProject, onBack, onExport, projectId }) {
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
    <StepShell
      num={5}
      label="CONFIDENCE LOCK-IN"
      title={isLocked ? "Locked. The decision survives the room." : "Lock the call. Before someone changes the brief."}
      kicker="Lock the decision, then open the polished document — download the PDF or send your client a review link straight from there."
      previously={project?.decision?.recommendation?.title}
      nextHint={isLocked ? "open the document · send the review link" : "after this: download · sign · ship"}
    >
      <GuestUpgradeBanner />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <OutputCard
            label={"{ 05 · the stance }"}
            title={project.decision?.recommendation?.title}
            blockquote={project.decision?.recommendation?.rationale}
            copyText={`THE STANCE\n${project.decision?.recommendation?.title || ""}\n\n${project.decision?.recommendation?.rationale || ""}`}
          />

          <div className="card-brut p-5 sm:p-6 !bg-ink text-chalk">
            <p className="mono-label text-faint">{"{ what to expect }"}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-3">
                <span className="font-mono text-signal">→</span>
                <span className="text-chalk">Client will likely push back on scope items 2 and 3.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-signal">→</span>
                <span className="text-chalk">The trade-off on timeline will surface at week 2.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-signal">→</span>
                <span className="text-chalk">
                  If someone asks &quot;can we reduce the price?&quot; — your message is already drafted.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {isLocked ? (
            <div className="card-brut p-5 sm:p-6 !bg-signal text-chalk" data-testid="step5-locked">
              <div className="flex items-center gap-2">
                <Lock size={16} /> <p className="mono-tag">LOCKED</p>
              </div>
              <h3 className="t-h1 mt-3">Confidence, captured.</h3>
              <p className="mt-3 text-sm">
                Open the document in Bracket — download the PDF or share a review link from there.
                Your project is also saved to your email; come back anytime with the same address.
              </p>
              <Link
                to={`/project/${projectId}/document`}
                className="btn-brut bg-chalk text-ink border-chalk hover:bg-ink hover:text-chalk mt-6 w-full justify-center"
                data-testid="step5-open-document-btn"
              >
                <FileText size={14} /> Open document
              </Link>
              <button
                onClick={onExport}
                className="btn-ghost text-chalk border-chalk hover:bg-chalk hover:text-ink mt-3 w-full justify-center"
                data-testid="step5-export-btn"
              >
                <Download size={14} /> Quick PDF download
              </button>
              <Link
                to="/app"
                className="btn-ghost text-chalk border-chalk hover:bg-chalk hover:text-ink mt-3 w-full justify-center"
                data-testid="step5-new-project-btn"
              >
                Start another project <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="card-brut p-5 sm:p-6">
              <p className="mono-label">{"{ ready? }"}</p>
              <p className="mt-3 text-sm">
                Lock the decision to mark it final. The polished document opens inside Bracket — share it
                with your client or download a PDF from there.
              </p>
              <button
                onClick={onBack}
                className="btn-ghost mt-5 w-full justify-center"
                data-testid="step5-back-btn"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={lock}
                disabled={loading}
                className="btn-brut mt-3 w-full justify-center"
                data-testid="step5-lock-btn"
              >
                {loading ? (
                  "Locking…"
                ) : (
                  <>
                    <Lock size={14} /> Lock the decision
                  </>
                )}
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
  const color =
    score >= 75 ? "bg-signal text-chalk" : score >= 40 ? "bg-ink text-chalk" : "bg-danger text-chalk";
  return (
    <span className={`mono-tag px-2 py-1 ${color}`}>
      {label || "CLARITY"} · {score}
    </span>
  );
}

function SeverityPill({ level = "LOW" }) {
  const map = {
    HIGH: "bg-danger text-chalk",
    MEDIUM: "bg-ink text-chalk",
    LOW: "bg-paper text-ink border border-ink",
  };
  return (
    <span className={`mono-tag px-2 py-1 h-fit shrink-0 ${map[level] || map.LOW}`}>{level}</span>
  );
}

function ArtifactCard({ title, kind, children }) {
  return (
    <div className="card-brut p-5 sm:p-6" data-testid={`artifact-${kind}`}>
      <div className="flex items-center justify-between">
        <p className="mono-label">{kind.replace("_", " ")}</p>
        <span className="mono-tag text-signal">DRAFT</span>
      </div>
      <h3 className="t-h2 mt-3">{title}</h3>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

// ---- Unified output primitives ----
// Used by every step so the AI-generated output looks identical in card style,
// header layout, title size, section labels, and list item formatting.

function OutputCard({
  label,
  badge,
  title,
  blockquote,
  children,
  testid,
  copyText,
  onRegenerate,
  onEdit,
  reasoning,
  source,
  confidence,
}) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText || `${title || ""}\n\n${blockquote || ""}`.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard can fail on insecure origins / sandboxed iframes; silent
    }
  };
  const hasActions = Boolean(copyText || onRegenerate || onEdit);
  return (
    <div
      className="output-card-wrap liquid-glass p-5 sm:p-6 animate-scale-in"
      data-testid={testid}
    >
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <p className="t-tag text-muted">{label}</p>
          {confidence !== undefined && confidence !== null && (
            <span className="conf-ribbon" data-testid={testid ? `${testid}-confidence` : undefined}>
              CONF <span className="num">{confidence}%</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          {hasActions && (
            <div className="output-actions" data-testid={testid ? `${testid}-actions` : undefined}>
              {copyText !== undefined && (
                <button
                  type="button"
                  onClick={doCopy}
                  className={`output-action-btn ${copied ? "is-success" : ""}`}
                  data-testid={testid ? `${testid}-copy` : "output-copy"}
                  title="Copy output"
                  aria-label="Copy output"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="output-action-btn"
                  data-testid={testid ? `${testid}-edit` : "output-edit"}
                  title="Edit input"
                  aria-label="Edit input"
                >
                  <Pencil size={11} /> Edit
                </button>
              )}
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="output-action-btn"
                  data-testid={testid ? `${testid}-regenerate` : "output-regenerate"}
                  title="Regenerate"
                  aria-label="Regenerate"
                >
                  <RefreshCw size={11} /> Redo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {title && (
        <h3 className="t-h2 mt-3 relative z-10">{title}</h3>
      )}
      {blockquote && (
        <p className="mt-4 border-l-2 border-[var(--accent)] pl-4 italic text-[14px] leading-[1.65] relative z-10 text-[var(--text)]">
          {blockquote}
        </p>
      )}
      {children && <div className="mt-2 relative z-10">{children}</div>}
      {(reasoning || source) && (
        <div className="relative z-10">
          {reasoning && (
            <details className="disc" data-testid={testid ? `${testid}-reasoning` : undefined}>
              <summary>
                <span className="chev">›</span> Reasoning
              </summary>
              <div className="disc-body">{reasoning}</div>
            </details>
          )}
          {source && (
            <details className="disc" data-testid={testid ? `${testid}-source` : undefined}>
              <summary>
                <span className="chev">›</span> What this is based on
              </summary>
              <div className="disc-body">{source}</div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function OutputSection({ label, children }) {
  return (
    <div className="mt-8">
      <p className="mono-tag text-muted">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function OutputList({ items = [], variant = "numbered", testid }) {
  if (!items.length) return null;

  if (variant === "severity") {
    return (
      <ul className="space-y-3 text-sm" data-testid={testid}>
        {items.map((r, i) => (
          <li key={i} className="flex gap-3">
            <SeverityPill level={r.severity} />
            <div>
              <p className="font-semibold">{r.risk || r.flag}</p>
              <p className="text-muted mt-1">{r.mitigation || r.why}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2 text-sm" data-testid={testid}>
      {items.map((t, i) => {
        if (variant === "strike") {
          return (
            <li key={i} className="flex gap-3 line-through text-muted">
              <span className="font-mono">×</span>
              <span>{t}</span>
            </li>
          );
        }
        if (variant === "arrow") {
          return (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-signal">→</span>
              <span>{t}</span>
            </li>
          );
        }
        if (variant === "danger") {
          return (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-danger">!</span>
              <span>{t}</span>
            </li>
          );
        }
        // default: numbered
        return (
          <li key={i} className="flex gap-3">
            <span className="font-mono text-signal w-6 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{t}</span>
          </li>
        );
      })}
    </ul>
  );
}

function BlockList({ label, items = [], muted }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mono-tag text-muted">{label}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((i, k) => (
          <li key={k} className={`flex gap-3 ${muted ? "line-through text-muted" : ""}`}>
            <span className="font-mono text-signal">•</span>
            <span>{i}</span>
          </li>
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

// Consistent pending/loading output card used by every step. While loading,
// the animated { } bracket loader takes over the card so the user clearly
// sees that the AI is working — not just the CTA spinner.
function OutputPending({ title, blurb, loading }) {
  return (
    <div className="card-brut p-5 sm:p-6 bg-paper min-h-[280px]" data-testid="step-output-pending">
      <p className="mono-label">{title}</p>
      {loading ? (
        <div className="mt-10 flex flex-col items-center justify-center gap-5 py-6">
          <div className="bracket-loader" aria-label="Loading">
            <span>{"{"}</span>
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <span>{"}"}</span>
          </div>
          <p className="mono-tag text-signal">BRACKET IS THINKING…</p>
        </div>
      ) : (
        <>
          <p className="mt-5 text-muted">{blurb}</p>
          <div className="mt-10 space-y-3">
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine short />
          </div>
        </>
      )}
    </div>
  );
}

// Tiny pickable keyword chips shown below required fields. Clicking a chip
// appends (or replaces, if empty) the suggestion into the input.
//
// AISuggestions calls /api/suggest as the user types (220ms debounce after
// the last keystroke — fast enough to feel "live"). Results are cached per
// (step,field,partial,contextHash) so re-typing the same prefix is instant.
const _suggestCache = new Map(); // simple LRU-ish: at most 200 entries

function _cacheKey(step, field, partial, context) {
  return `${step}:${field}:${(partial || "").trim().toLowerCase()}:${JSON.stringify(context || {})}`;
}

function AISuggestions({ step, field, value, context, onPick, testid }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const text = (value || "").trim();
    if (text.length < 2) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    // Cache hit — show instantly, skip the network roundtrip + debounce
    const key = _cacheKey(step, field, text, context);
    const cached = _suggestCache.get(key);
    if (cached) {
      setItems(cached);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    // Only show the "thinking…" indicator if the request is still running
    // after 180ms — for Haiku (typically ~250-400ms) it appears briefly
    // then flips to results, keeping the UI feeling live.
    const loadingTimer = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 180);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post("/suggest", {
          step,
          field,
          partial: text,
          context: context || {},
        });
        const next = Array.isArray(data.suggestions) ? data.suggestions : [];
        if (!cancelled) {
          setItems(next);
          // Stash in cache. Bound size to avoid leaks.
          if (_suggestCache.size > 200) {
            const firstKey = _suggestCache.keys().next().value;
            _suggestCache.delete(firstKey);
          }
          _suggestCache.set(key, next);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        clearTimeout(loadingTimer);
        if (!cancelled) setLoading(false);
      }
    }, 40);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(loadingTimer);
    };
  }, [value, field, step, JSON.stringify(context || {})]);

  if (!loading && items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 stagger-in" data-testid={testid}>
      <span className="mono-tag text-muted self-center pr-1">
        {loading ? "BRACKET ↘" : "TRY ↘"}
      </span>
      {loading && (
        <span className="mono-tag text-signal self-center animate-pulse">thinking…</span>
      )}
      {items.map((s, i) => (
        <button
          key={`${s}-${i}`}
          type="button"
          onClick={() => onPick(s, value)}
          className="suggest-chip press"
          data-testid={testid ? `${testid}-${i}` : undefined}
        >
          + {s}
        </button>
      ))}
    </div>
  );
}

// Helper to merge a suggestion into the current field value, preserving
// what the user has already typed.
function mergeSuggestion(current, suggestion) {
  const c = (current || "").trim();
  if (!c) return suggestion;
  // Avoid duplicates
  if (c.toLowerCase().includes(suggestion.toLowerCase())) return c;
  // Append on a new line if the existing content looks like a list, else inline
  if (c.endsWith(".") || c.endsWith(",")) return `${c} ${suggestion}`;
  return `${c}, ${suggestion}`;
}
