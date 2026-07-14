import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Link as LinkIcon,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import BracketMark from "../components/BracketMark";
import { api, API_BASE, formatApiError } from "../lib/api";

// Inline-style severity palette (Tailwind text classes get overridden by
// `.mono-tag`'s hardcoded color, so use inline styles for guaranteed contrast).
const SEVERITY_STYLE = {
  HIGH:   { backgroundColor: "#EF4444", color: "#FFFFFF", border: "1px solid #EF4444" },
  MEDIUM: { backgroundColor: "#F97316", color: "#FFFFFF", border: "1px solid #F97316" },
  LOW:    { backgroundColor: "transparent", color: "var(--text-3)", border: "1px solid var(--hairline)" },
};

export default function ProjectDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/projects/${id}`);
        setProject(data);
      } catch (e) {
        setError(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const shareUrl = useMemo(() => {
    if (!project?.share_token) return "";
    return `${window.location.origin}/r/${project.share_token}`;
  }, [project?.share_token]);

  const downloadPdf = async () => {
    setDownloading(true);
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
      toast.success("PDF saved.");
    } catch (e) {
      toast.error(`Couldn't download PDF — ${e.message || e}`);
    } finally {
      setDownloading(false);
    }
  };

  const mintShare = async () => {
    try {
      const { data } = await api.post(`/projects/${project.id}/share`);
      setProject(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="mono-label">LOADING DOCUMENT…</p>
      </div>
    );
  }
  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-danger p-6 bg-chalk">
          <p className="mono-tag text-danger">ERROR</p>
          <p className="mt-2">{error || "Project not found"}</p>
          <Link to="/app" className="btn-ghost mt-4">Start a new project</Link>
        </div>
      </div>
    );
  }

  if (!project.artifacts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-ink p-6 bg-chalk max-w-md text-center">
          <p className="mono-tag text-muted">NOT READY</p>
          <h1 className="font-display text-2xl mt-2">No document yet</h1>
          <p className="mt-3 text-sm">Finish the five-step flow first — the document is built from the artifacts.</p>
          <Link to={`/project/${project.id}`} className="btn-brut mt-5 justify-center">
            <ArrowLeft size={14} /> Back to the flow
          </Link>
        </div>
      </div>
    );
  }

  const isReviewed = project.share_status === "accepted" || project.share_status === "rejected";

  return (
    <div className="dashboard-root relative min-h-screen" data-testid="project-document-page">
      {/* Same cinematic backdrop as Dashboard/Overview — one visual universe. */}
      <div aria-hidden="true" className="hero-ambient hero-ambient--dashboard" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #08090A 0%, #06070A 55%, #050506 100%)" }}
      />

      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-6 md:py-8">
        {/* Inline page header — replaces the sticky top nav so the left sidebar
            is the only chrome on screen. */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6 md:mb-8">
          <div className="min-w-0 flex-1">
            <p className="mono-tag text-muted text-[10px]">DOCUMENT</p>
            <h1
              className="mt-1 font-display font-semibold tracking-[-0.02em] leading-[1.15] text-[22px] sm:text-[26px] text-[var(--text)] truncate"
              data-testid="doc-project-name"
            >
              {project.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/project/${project.id}`}
              className="flow-header-action"
              data-testid="doc-header-flow-link"
              title="Back to flow"
              aria-label="Back to flow"
            >
              <ArrowLeft size={12} /> <span className="hidden sm:inline">Back to flow</span>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 md:gap-8">
        {/* DOCUMENT BODY — glass card matching dashboard/steps cards. */}
        <article className="lg:col-span-8 doc-card">
          <div className="doc-container">
            <p className="mono-label">{"{ sign-off document }"}</p>
            <h1 className="doc-h1 font-display uppercase mt-3">
              {project.name}
            </h1>
            <p className="mono-tag text-muted mt-3">
              PREPARED BY {(project.creator_name || "the project owner").toUpperCase()}
              {project.locked_at ? ` · LOCKED ${project.locked_at.slice(0, 10)}` : ""}
            </p>

            <DocDivider />

            <DocSection num="01" label="THE STANCE">
              <h2 className="font-display text-xl sm:text-2xl uppercase">
                {project.decision?.recommendation?.title}
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed">
                {project.decision?.recommendation?.rationale}
              </p>
              {project.decision?.recommendation?.confidence != null && (
                <p className="mono-tag text-signal mt-3">
                  CONFIDENCE · {project.decision.recommendation.confidence}%
                </p>
              )}
            </DocSection>

            {project.framing?.reframed_problem && (
              <DocSection num="02" label="THE PROBLEM, REFRAMED">
                <p className="text-[13.5px] leading-relaxed">{project.framing.reframed_problem}</p>
              </DocSection>
            )}

            <DocSection num="03" label="SCOPE">
              <h3 className="font-display text-lg mt-1">
                {project.artifacts.scope_doc?.title}
              </h3>
              {/* Multi-column scope — In / Out / Deliverables side-by-side
                  so the whole scope is legible without vertical scrolling. */}
              <div className="doc-scope-grid mt-4">
                <DocList title="IN SCOPE" items={project.artifacts.scope_doc?.in_scope} accent="signal" />
                <DocList title="OUT OF SCOPE" items={project.artifacts.scope_doc?.out_of_scope} accent="muted" strike />
                <DocList title="DELIVERABLES" items={project.artifacts.scope_doc?.deliverables} accent="ink" />
              </div>
              {project.artifacts.scope_doc?.timeline_note && (
                <div className="mt-4 border-l-2 border-ink pl-4">
                  <p className="mono-tag text-muted">TIMELINE NOTE</p>
                  <p className="text-[13px] mt-1">{project.artifacts.scope_doc.timeline_note}</p>
                </div>
              )}
            </DocSection>

            {project.artifacts.client_message && (
              <DocSection num="04" label="MESSAGE TO THE CLIENT">
                <div className="border-l-2 border-signal pl-4 whitespace-pre-wrap text-[13.5px] leading-relaxed">
                  {project.artifacts.client_message}
                </div>
              </DocSection>
            )}

            {project.artifacts.assumptions?.length > 0 && (
              <DocSection num="05" label="ASSUMPTIONS">
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  {project.artifacts.assumptions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-[13px]">
                      <span className="font-mono text-signal mt-0.5 text-[12px]">{String(i + 1).padStart(2, "0")}</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </DocSection>
            )}

            {project.artifacts.risk_flags?.length > 0 && (
              <DocSection num="06" label="RISK FLAGS">
                <ul className="grid sm:grid-cols-2 gap-3">
                  {project.artifacts.risk_flags.map((r, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span
                        className="mono-tag px-1.5 py-0.5 shrink-0 rounded text-[10px]"
                        style={SEVERITY_STYLE[r.severity] || SEVERITY_STYLE.LOW}
                      >
                        {r.severity}
                      </span>
                      <div>
                        <p className="font-semibold text-[13px]">{r.flag}</p>
                        <p className="text-[12px] text-muted mt-0.5">{r.why}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </DocSection>
            )}

            <DocDivider />
            <p className="mono-tag text-muted">
              {"{ "} GENERATED BY BRACKET — DECISIONS FOR CREATIVE PROS {" }"}
            </p>
          </div>
        </article>

        {/* SIDEBAR — sticky so actions stay visible while user scans doc. */}
        <aside className="lg:col-span-4 space-y-3 doc-sidebar">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="clay-signal px-4 py-2.5 t-tag press inline-flex items-center justify-center gap-2 w-full disabled:opacity-40"
            data-testid="doc-download-pdf-btn"
          >
            {downloading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Preparing PDF…
              </>
            ) : (
              <>
                <Download size={14} /> Download PDF
              </>
            )}
          </button>

          <div className="doc-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-signal" />
              <p className="mono-tag text-muted text-[10px]">CLIENT REVIEW</p>
            </div>

            {project.share_status === "accepted" && (
              <AcceptedBadge review={project.share_review} />
            )}
            {project.share_status === "rejected" && (
              <RejectedBadge
                review={project.share_review}
                project={project}
                setProject={setProject}
              />
            )}
            {project.share_status === "awaiting_reply" && (
              <RejectedBadge
                review={project.share_review}
                project={project}
                setProject={setProject}
              />
            )}

            {!isReviewed && !project.share_token && (
              <>
                <p className="mt-3 text-[12.5px] text-[var(--text-3)] leading-relaxed">
                  Send a clean, branded link to your client. They&apos;ll check off each scope item and sign,
                  or send back concerns with AI-assisted suggestions.
                </p>
                <button
                  onClick={mintShare}
                  className="clay-signal px-4 py-2 t-tag press inline-flex items-center justify-center gap-2 w-full mt-4"
                  data-testid="doc-share-create-btn"
                >
                  <LinkIcon size={14} /> Create review link
                </button>
              </>
            )}

            {!isReviewed && project.share_token && (
              <ShareLinkPanel url={shareUrl} />
            )}
          </div>

          {/* Subtle feedback nudge — only AFTER the client has responded
              (true end of the Bracket flow). Dismissible. Shown once per project. */}
          {isReviewed && !project.feedback && !feedbackDismissed && (
            <FeedbackInline
              project={project}
              setProject={setProject}
              onDismiss={() => setFeedbackDismissed(true)}
            />
          )}

          <div className="doc-card p-5 sm:p-6">
            <p className="mono-tag text-muted text-[10px]">STATUS</p>
            <div className="mt-3 space-y-2 text-[13px]">
              <Row label="Project" value={project.status?.toUpperCase()} />
              <Row label="Review" value={(project.share_status || "none").toUpperCase()} />
              {project.share_status === "accepted" && (
                <Row
                  label="Signed by"
                  value={project.share_review?.signature_name || "—"}
                />
              )}
            </div>
          </div>
        </aside>
        </div>
      </div>
    </div>
  );
}

// ---- Layout helpers ----
function DocDivider() {
  return <div className="my-6 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />;
}

function DocSection({ num, label, children }) {
  return (
    <section className="mt-8 first:mt-0">
      <div className="flex items-center gap-3 mb-3">
        <span
          className="font-mono px-2 py-0.5 text-[10px] rounded"
          style={{ background: "rgba(94, 106, 210, 0.16)", color: "var(--accent)" }}
        >
          {num}
        </span>
        <p className="mono-tag text-muted text-[10px]">{label}</p>
      </div>
      {children}
    </section>
  );
}

function DocList({ title, items, accent = "ink", strike = false }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <p
        className={`mono-tag text-[10px] ${
          accent === "signal" ? "text-signal" : accent === "muted" ? "text-muted" : "text-[var(--text-2)]"
        }`}
      >
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className={`flex gap-2.5 text-[13px] leading-relaxed ${
              strike ? "line-through opacity-60" : ""
            } text-[var(--text-2)]`}
          >
            <span
              className={`font-mono mt-0.5 text-[11px] ${
                accent === "signal" ? "text-signal" : accent === "muted" ? "text-muted" : "text-[var(--text-3)]"
              }`}
            >
              {strike ? "×" : "·"}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="mono-tag text-muted">{label}</span>
      <span className="mono-tag">{value}</span>
    </div>
  );
}

function AcceptedBadge({ review }) {
  return (
    <div className="mt-4 border-l-4 border-signal pl-4 py-1" data-testid="doc-accepted-badge">
      <p className="mono-tag text-signal">ACCEPTED</p>
      <p className="mt-2 text-sm">
        Signed by <strong>{review?.signature_name}</strong>
        {review?.role ? `, ${review.role}` : ""}
      </p>
      <p className="text-xs text-muted mt-1">
        {review?.accepted_count}/{review?.total_items} items confirmed ·{" "}
        {review?.submitted_at ? new Date(review.submitted_at).toLocaleString() : ""}
      </p>
    </div>
  );
}

function RejectedBadge({ review, project, setProject }) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const replies = project?.owner_replies || [];
  const awaitingReply = project?.share_status === "awaiting_reply";
  const usableSuggestions = review?.ai_suggestions?.suggestions || [];

  const applySuggestion = (s) => {
    const draft = (s.what_to_say || s.what_to_change || "").trim();
    if (draft) setReplyText(draft);
  };

  const send = async () => {
    if (replyText.trim().length < 4) {
      toast.error("Write a reply first — even one line is fine.");
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post(`/projects/${project.id}/reply`, { text: replyText.trim() });
      setProject(data);
      setReplyText("");
      toast.success("Reply sent. Your client can re-review the same link.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 border-l-4 border-danger pl-4 py-1" data-testid="doc-rejected-badge">
      <p className="mono-tag text-danger">CONCERNS RAISED</p>
      <p className="mt-2 text-sm whitespace-pre-wrap">{review?.concerns}</p>
      {usableSuggestions.length > 0 && (
        <div className="mt-4 border border-ink p-3 bg-paper">
          <p className="mono-tag text-signal">BRACKET SUGGESTIONS</p>
          {review.ai_suggestions.summary && (
            <p className="text-xs text-muted mt-2 italic">{review.ai_suggestions.summary}</p>
          )}
          <ul className="mt-3 space-y-3">
            {usableSuggestions.map((s, i) => (
              <li key={i} data-testid={`doc-suggestion-${i}`}>
                <p className="font-semibold text-sm">{i + 1}. {s.title}</p>
                <p className="text-xs mt-1"><span className="mono-tag">SAY →</span> {s.what_to_say}</p>
                <p className="text-xs mt-1"><span className="mono-tag">CHANGE →</span> {s.what_to_change}</p>
                <button
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="mt-2 mono-tag text-signal hover:text-ink"
                  data-testid={`doc-use-suggestion-${i}`}
                >
                  USE THIS DRAFT →
                </button>
              </li>
            ))}
          </ul>
          {review.ai_suggestions.watch_for && (
            <p className="mono-tag text-danger mt-3">WATCH FOR · {review.ai_suggestions.watch_for}</p>
          )}
        </div>
      )}
      <p className="text-xs text-muted mt-3">
        Signed by {review?.signature_name}
        {review?.submitted_at ? ` · ${new Date(review.submitted_at).toLocaleString()}` : ""}
      </p>

      {/* Thread of replies the owner has already sent. */}
      {replies.length > 0 && (
        <div className="mt-5 border-t border-ink pt-4 space-y-3" data-testid="doc-owner-replies">
          <p className="mono-tag text-signal">YOUR REPLIES</p>
          {replies.map((r, i) => (
            <div key={i} className="border-l-2 border-signal pl-3">
              <p className="text-xs text-muted">
                {r.from_name} · {new Date(r.sent_at).toLocaleString()}
              </p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Compose box — only when not yet replied OR when we want to send another. */}
      {!awaitingReply && (
        <div className="mt-5 border-t border-ink pt-4" data-testid="doc-owner-reply-form">
          <p className="mono-label">{"{ reply to your client }"}</p>
          <textarea
            rows={4}
            className="textarea-brut mt-3"
            placeholder="Write your reply (or click 'use this draft' above)."
            value={replyText}
            onChange={(ev) => setReplyText(ev.target.value)}
            maxLength={4000}
            data-testid="doc-owner-reply-text"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || replyText.trim().length < 4}
            className="btn-brut mt-3 w-full justify-center"
            data-testid="doc-owner-reply-submit"
          >
            {sending ? "Sending…" : "Send reply to client"} <ArrowRight size={14} />
          </button>
          <p className="mono-tag text-muted mt-3">
            THE SAME REVIEW LINK BOUNCES BACK TO YOUR CLIENT FOR ANOTHER LOOK.
          </p>
        </div>
      )}

      {awaitingReply && (
        <div className="mt-5 border-t border-ink pt-4">
          <p className="mono-tag text-signal" data-testid="doc-awaiting-reply">REPLY SENT · AWAITING CLIENT</p>
          <p className="text-sm text-muted mt-2">
            Client can now reopen the same link and respond to your reply.
          </p>
        </div>
      )}
    </div>
  );
}

function ShareLinkPanel({ url }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-3">
      <p className="mono-tag text-signal">REVIEW LINK READY</p>
      <div className="mt-2 border border-[var(--hairline)] bg-[var(--surface-2)] rounded-md px-3 py-2 flex items-center gap-2">
        <p className="font-mono text-xs truncate" data-testid="doc-share-url">{url}</p>
        <button
          onClick={copy}
          className="btn-ghost shrink-0 ml-auto mono-tag"
          data-testid="doc-share-copy-btn"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <p className="mono-tag text-muted mt-3">
        ANYONE WITH THE LINK CAN REVIEW. THEY DON&apos;T NEED AN ACCOUNT.
      </p>
    </div>
  );
}

function FeedbackInline({ project, setProject, onDismiss }) {
  const [sentiment, setSentiment] = useState(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!sentiment) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/projects/${project.id}/feedback`, {
        sentiment,
        text: text.trim(),
      });
      setProject(data);
      toast.success("Thanks — we read every one.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="border border-ink bg-paper p-4"
      data-testid="feedback-inline"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="mono-tag text-muted">{"{ 30s · how was that flow? }"}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mono-tag text-muted hover:text-ink"
          data-testid="feedback-dismiss-btn"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setSentiment("up");
            setOpen(true);
          }}
          className="flex-1 py-2 border rounded flex items-center justify-center gap-2 transition-colors"
          style={
            sentiment === "up"
              ? { backgroundColor: "#5E6AD2", color: "#FFFFFF", borderColor: "#5E6AD2" }
              : { backgroundColor: "var(--surface-2)", color: "var(--text-2)", borderColor: "var(--hairline)" }
          }
          data-testid="feedback-up-btn"
          aria-pressed={sentiment === "up"}
        >
          <span className="mono-tag" style={{ color: "inherit" }}>USEFUL</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSentiment("down");
            setOpen(true);
          }}
          className="flex-1 py-2 border rounded flex items-center justify-center gap-2 transition-colors"
          style={
            sentiment === "down"
              ? { backgroundColor: "#EF4444", color: "#FFFFFF", borderColor: "#EF4444" }
              : { backgroundColor: "var(--surface-2)", color: "var(--text-2)", borderColor: "var(--hairline)" }
          }
          data-testid="feedback-down-btn"
          aria-pressed={sentiment === "down"}
        >
          <span className="mono-tag" style={{ color: "inherit" }}>NOT YET</span>
        </button>
      </div>
      {open && (
        <>
          <textarea
            rows={2}
            className="textarea-brut mt-3 text-sm"
            placeholder="Optional: one line on what worked or didn't."
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            data-testid="feedback-text"
            maxLength={1000}
          />
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !sentiment}
            className="btn-brut mt-3 w-full justify-center text-[11px] !py-2"
            data-testid="feedback-submit-btn"
          >
            {submitting ? "Sending…" : "Send feedback"} <ArrowRight size={12} />
          </button>
        </>
      )}
    </div>
  );
}
