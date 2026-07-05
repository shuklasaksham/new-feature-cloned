import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Lock,
  FileText,
  Pencil,
  Loader2,
  Unlock,
  AlertCircle,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";

const STEPS = [
  {
    n: 1,
    key: "situation",
    label: "SITUATION FRAMING",
    desc: "Name what's actually happening.",
    inputKey: "situation_input",
    outputKey: "framing",
  },
  {
    n: 2,
    key: "context",
    label: "CONTEXT COMPRESSION",
    desc: "Strip out the noise. Keep what moves the call.",
    inputKey: "context_input",
    outputKey: "context",
  },
  {
    n: 3,
    key: "decision",
    label: "DECISION ENGINE",
    desc: "Pick the path. Confidence + alternatives + risks.",
    inputKey: "decision_input",
    outputKey: "decision",
  },
  {
    n: 4,
    key: "artifacts",
    label: "ARTIFACTS",
    desc: "Scope doc, client message, assumptions, risks.",
    inputKey: null,
    outputKey: "artifacts",
  },
  {
    n: 5,
    key: "lock",
    label: "CONFIDENCE LOCK-IN",
    desc: "Sign the call. Generate the document.",
    inputKey: null,
    outputKey: null, // status === locked indicates done
  },
];

// Inline-style pill palette — Tailwind color classes get overridden by the
// hardcoded `color: var(--text-3)` inside `.mono-tag`, so we use inline
// styles (highest specificity) with proper white text on saturated backgrounds.
const STATUS_STYLE = {
  draft:       { backgroundColor: "transparent", color: "var(--text-2)", border: "1px solid var(--hairline)" },
  in_progress: { backgroundColor: "var(--surface-2)", color: "var(--text)",  border: "1px solid var(--hairline)" },
  locked:      { backgroundColor: "#2E5BFF", color: "#FFFFFF", border: "1px solid #2E5BFF" },
};
const STATUS_LABEL = { draft: "DRAFT", in_progress: "IN PROGRESS", locked: "LOCKED" };

const SHARE_STYLE = {
  sent:           { backgroundColor: "var(--surface-2)", color: "var(--text)",  border: "1px solid var(--hairline)" },
  accepted:       { backgroundColor: "#22C55E", color: "#0A0A0C", border: "1px solid #22C55E" },
  rejected:       { backgroundColor: "#EF4444", color: "#FFFFFF", border: "1px solid #EF4444" },
  awaiting_reply: { backgroundColor: "var(--surface-2)", color: "var(--text)",  border: "1px solid var(--hairline)" },
};
const SHARE_LABEL = {
  sent: "AWAITING CLIENT REVIEW",
  accepted: "ACCEPTED BY CLIENT",
  rejected: "CLIENT RAISED CONCERNS",
  awaiting_reply: "REPLY SENT — AWAITING CLIENT",
};

function StepStatus({ done, current }) {
  if (done) {
    return (
      <span
        className="mono-tag px-2 py-1 inline-flex items-center gap-1.5 rounded"
        style={{ backgroundColor: "#2E5BFF", color: "#FFFFFF", border: "1px solid #2E5BFF" }}
      >
        <Check size={11} /> <span style={{ color: "inherit" }}>DONE</span>
      </span>
    );
  }
  if (current) {
    return (
      <span
        className="mono-tag px-2 py-1 rounded"
        style={{ backgroundColor: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--hairline)" }}
      >
        IN PROGRESS
      </span>
    );
  }
  return (
    <span
      className="mono-tag px-2 py-1 rounded"
      style={{ backgroundColor: "transparent", color: "var(--text-3)", border: "1px solid var(--hairline)" }}
    >
      TODO
    </span>
  );
}

function StepSummary({ step, project }) {
  // Step 1: situation -> framing.reframed_problem
  if (step.n === 1 && project.framing) {
    return (
      <div className="mt-3 text-sm space-y-2">
        {project.situation_input?.what && (
          <p className="text-muted">
            <span className="mono-tag text-muted">WHAT:</span> {project.situation_input.what}
          </p>
        )}
        {project.framing.reframed_problem && (
          <p className="border-l-2 border-signal pl-3 italic">
            &quot;{project.framing.reframed_problem}&quot;
          </p>
        )}
      </div>
    );
  }
  // Step 2: context.what_actually_matters
  if (step.n === 2 && project.context) {
    return (
      <div className="mt-3 text-sm space-y-2">
        {project.context.what_actually_matters && (
          <p className="border-l-2 border-signal pl-3 italic">
            &quot;{project.context.what_actually_matters}&quot;
          </p>
        )}
        {project.context.key_signals?.length > 0 && (
          <p className="mono-tag text-muted">
            {project.context.key_signals.length} KEY SIGNAL{project.context.key_signals.length === 1 ? "" : "S"}
            {project.context.noise_removed?.length ? ` · ${project.context.noise_removed.length} NOISE STRIPPED` : ""}
          </p>
        )}
      </div>
    );
  }
  // Step 3: decision.recommendation.title + confidence
  if (step.n === 3 && project.decision) {
    const rec = project.decision.recommendation || {};
    return (
      <div className="mt-3 text-sm space-y-2">
        {rec.title && (
          <p className="font-display text-xl">
            {rec.title}
            <span className="mono-tag text-signal ml-2">{rec.confidence || 0}%</span>
          </p>
        )}
        {rec.rationale && <p className="text-muted line-clamp-2">{rec.rationale}</p>}
      </div>
    );
  }
  // Step 4: artifacts summary
  if (step.n === 4 && project.artifacts) {
    const a = project.artifacts;
    const scope = a.scope_doc || {};
    return (
      <div className="mt-3 text-sm space-y-1">
        {scope.title && <p className="font-display text-lg">{scope.title}</p>}
        <p className="mono-tag text-muted">
          {(scope.in_scope?.length || 0)} IN · {(scope.out_of_scope?.length || 0)} OUT
          {scope.deliverables?.length ? ` · ${scope.deliverables.length} DELIVERABLES` : ""}
          {a.risk_flags?.length ? ` · ${a.risk_flags.length} RISK${a.risk_flags.length === 1 ? "" : "S"}` : ""}
        </p>
      </div>
    );
  }
  // Step 5: locked
  if (step.n === 5 && project.status === "locked") {
    const when = (project.locked_at || "").slice(0, 10);
    return (
      <div className="mt-3 text-sm">
        <p className="mono-tag text-signal inline-flex items-center gap-2">
          <Lock size={11} /> LOCKED {when && `· ${when}`}
        </p>
      </div>
    );
  }
  return null;
}

export default function ProjectOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      setRenameValue(data.name || "");
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const isLocked = project?.status === "locked";

  const editStep = (stepN) => {
    // If locked, prompt unlock first; otherwise go straight to the step
    if (isLocked) {
      if (!window.confirm("This project is locked. Unlock to edit?")) return;
      unlockAndGo(stepN);
      return;
    }
    navigate(`/project/${id}/flow?step=${stepN}`);
  };

  const unlockAndGo = async (stepN) => {
    setUnlocking(true);
    try {
      await api.post(`/projects/${id}/unlock`);
      navigate(`/project/${id}/flow?step=${stepN}`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUnlocking(false);
    }
  };

  const saveRename = async () => {
    const next = renameValue.trim();
    if (!next) return toast.error("Project name can't be empty.");
    if (next === project.name) {
      setRenaming(false);
      return;
    }
    setSavingRename(true);
    try {
      const { data } = await api.patch(`/projects/${id}`, { name: next });
      setProject((cur) => ({ ...cur, name: data.name, updated_at: data.updated_at }));
      toast.success("Renamed.");
      setRenaming(false);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingRename(false);
    }
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (text.length < 4) return toast.error("Write a bit more.");
    setSendingReply(true);
    try {
      const { data } = await api.post(`/projects/${id}/reply`, { text });
      setProject(data);
      setReply("");
      toast.success("Reply sent. Client can re-review.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="mono-label">LOADING…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen">
        <main className="max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 py-12">
          <div className="card-brut border-danger p-6" data-testid="overview-error">
            <p className="mono-tag text-danger">CAN&apos;T LOAD PROJECT</p>
            <p className="mt-2">{error || "Not found."}</p>
            <Link to="/app" className="btn-ghost mt-4">Back to dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  const spStyle = STATUS_STYLE[project.status] || STATUS_STYLE.draft;
  const spLabel = STATUS_LABEL[project.status] || STATUS_LABEL.draft;
  const ssStyle = project.share_status && SHARE_STYLE[project.share_status];
  const ssLabel = project.share_status && SHARE_LABEL[project.share_status];
  const currentStep = project.step || 1;

  return (
    <div className="min-h-screen" data-testid="overview-page">
      <main className="max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 py-8 md:py-12 page-enter">
        {/* Top breadcrumb */}
        <Link to="/app" className="mono-tag text-muted hover:text-ink inline-flex items-center gap-2" data-testid="overview-back">
          ← BACK TO DASHBOARD
        </Link>

        {/* Title + status */}
        <div className="mt-4 flex flex-col gap-3">
          <p className="mono-label">{"{ project · overview }"}</p>
          {renaming ? (
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <input
                className="input-line flex-1 font-display text-3xl sm:text-4xl uppercase"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") { setRenaming(false); setRenameValue(project.name); }
                }}
                maxLength={120}
                data-testid="overview-rename-input"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveRename}
                  disabled={savingRename}
                  className="btn-brut"
                  data-testid="overview-rename-save"
                >
                  {savingRename ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} SAVE
                </button>
                <button
                  onClick={() => { setRenaming(false); setRenameValue(project.name); }}
                  className="btn-ghost"
                  data-testid="overview-rename-cancel"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <h1
                className="font-display text-4xl sm:text-5xl md:text-6xl uppercase leading-[0.95] flex-1 min-w-0 break-words"
                data-testid="overview-project-name"
              >
                {project.name}
              </h1>
              <button
                onClick={() => setRenaming(true)}
                className="btn-ghost shrink-0 mono-tag"
                data-testid="overview-rename"
                aria-label="Rename project"
              >
                <Pencil size={12} /> RENAME
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="mono-tag px-2 py-1 rounded" style={spStyle} data-testid="overview-status-pill">{spLabel}</span>
            {ssStyle && <span className="mono-tag px-2 py-1 rounded" style={ssStyle} data-testid="overview-share-pill">{ssLabel}</span>}
            <span className="mono-tag px-2 py-1 rounded" style={{ backgroundColor: "transparent", color: "var(--text-3)", border: "1px solid var(--hairline)" }}>
              {project.engine === "gpt" ? "GPT-5.2" : "CLAUDE SONNET 4.5"}
            </span>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mt-2">
            {!isLocked && (
              <button
                onClick={() => navigate(`/project/${id}/flow?step=${currentStep}`)}
                className="btn-brut"
                data-testid="overview-resume"
              >
                {currentStep > 1 ? "Resume" : "Start step 1"} <ArrowRight size={14}/>
              </button>
            )}
            {project.artifacts && (
              <Link
                to={`/project/${id}/document`}
                className="btn-ghost mono-tag"
                data-testid="overview-document-link"
              >
                <FileText size={12} /> OPEN DOCUMENT
              </Link>
            )}
            {isLocked && (
              <button
                onClick={() => unlockAndGo(currentStep)}
                disabled={unlocking}
                className="btn-ghost mono-tag"
                data-testid="overview-unlock"
              >
                {unlocking ? <Loader2 size={12} className="animate-spin"/> : <Unlock size={12}/>} UNLOCK TO EDIT
              </button>
            )}
          </div>
        </div>

        {/* Client review summary — only if shared */}
        {project.share_status && project.share_status !== "none" && (
          <section
            className="mt-10 card-brut p-5 sm:p-6"
            data-testid="overview-client-review"
          >
            <p className="mono-label">{"{ client review }"}</p>
            <h2 className="font-display text-2xl sm:text-3xl uppercase mt-3">
              {project.share_status === "accepted" && <>Client <span className="text-signal">accepted</span> the call.</>}
              {project.share_status === "rejected" && <>Client <span className="text-danger">raised concerns</span>.</>}
              {project.share_status === "awaiting_reply" && <>You replied. <span className="text-signal">Awaiting client.</span></>}
              {project.share_status === "sent" && <>Sent to client. <span className="text-muted">Awaiting review.</span></>}
            </h2>

            {project.share_review?.type === "reject" && (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="mono-tag text-muted">CONCERNS RAISED</p>
                  <p className="mt-2 whitespace-pre-wrap">{project.share_review.concerns}</p>
                  {project.share_review.signature_name && (
                    <p className="mono-tag text-muted mt-2">
                      — {project.share_review.signature_name}
                      {project.share_review.role ? `, ${project.share_review.role}` : ""}
                    </p>
                  )}
                </div>
                {project.share_review.ai_suggestions?.suggestions?.length > 0 && (
                  <div>
                    <p className="mono-tag text-signal">BRACKET SUGGESTS</p>
                    <ul className="mt-2 space-y-2">
                      {project.share_review.ai_suggestions.suggestions.map((s, i) => (
                        <li key={i} className="border-l-2 border-signal pl-3">
                          <p className="font-display text-base">{s.title || s.suggestion}</p>
                          {s.detail && <p className="text-sm text-muted mt-1">{s.detail}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Owner reply thread */}
                {project.owner_replies?.length > 0 && (
                  <div>
                    <p className="mono-tag text-muted">YOUR REPLIES</p>
                    <ul className="mt-2 space-y-3">
                      {project.owner_replies.map((r, i) => (
                        <li key={i} className="card-brut p-3">
                          <p className="mono-tag text-muted">
                            {r.from_name} · {(r.sent_at || "").slice(0, 10)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{r.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reply composer — only if not yet awaiting reply */}
                {project.share_status === "rejected" && (
                  <div className="border-t border-ink/20 pt-4">
                    <p className="mono-tag text-muted flex items-center gap-2">
                      <MessageSquare size={11}/> REPLY TO THE CLIENT
                    </p>
                    <textarea
                      className="textarea-brut mt-2"
                      rows={4}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Acknowledge the concern. Pick a suggestion (or counter). Tell them what's next."
                      data-testid="overview-reply-input"
                    />
                    <button
                      onClick={sendReply}
                      disabled={sendingReply || reply.trim().length < 4}
                      className="btn-brut mt-3"
                      data-testid="overview-reply-submit"
                    >
                      {sendingReply ? <><Loader2 size={12} className="animate-spin"/> Sending…</> : <><Send size={12}/> Send reply</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {project.share_review?.type === "accept" && (
              <div className="mt-5">
                <p className="text-sm">
                  Accepted by{" "}
                  <span className="font-display">{project.share_review.signature_name}</span>
                  {project.share_review.role ? `, ${project.share_review.role}` : ""}
                  {" · "}
                  <span className="mono-tag text-signal">
                    {project.share_review.accepted_count}/{project.share_review.total_items} SECTIONS SIGNED
                  </span>
                </p>
              </div>
            )}
          </section>
        )}

        {/* Step grid */}
        <section className="mt-10" data-testid="overview-steps">
          <p className="mono-label">{"{ five steps · status + edit }"}</p>
          <ul className="mt-4 card-brut overflow-hidden divide-y divide-ink/10">
            {STEPS.map((step) => {
              const done =
                (step.outputKey && !!project[step.outputKey]) ||
                (step.n === 5 && project.status === "locked");
              const current = !done && currentStep === step.n;
              return (
                <li
                  key={step.n}
                  className="p-5 sm:p-6 hover:bg-[var(--surface-2)] transition-colors duration-150 flex flex-col sm:flex-row sm:items-start gap-4"
                  data-testid={`overview-step-${step.n}`}
                >
                  <div className="shrink-0 w-16 text-signal font-display text-3xl">
                    {String(step.n).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl sm:text-2xl uppercase">{step.label}</p>
                      <StepStatus done={done} current={current} />
                    </div>
                    <p className="mono-tag text-muted mt-1">{step.desc}</p>
                    <StepSummary step={step} project={project} />
                  </div>
                  <div className="shrink-0 self-stretch sm:self-center">
                    <button
                      onClick={() => editStep(step.n)}
                      className="btn-ghost"
                      data-testid={`overview-edit-${step.n}`}
                    >
                      <Pencil size={12}/> {done ? "EDIT" : current ? "CONTINUE" : "START"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Hint when locked */}
        {isLocked && (
          <div className="mt-6 flex items-start gap-3 text-sm text-muted">
            <AlertCircle size={14} className="mt-0.5 shrink-0"/>
            <p>
              This project is locked. Editing any step will unlock it (the client review status stays intact).
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
