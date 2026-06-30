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

const SEVERITY_BG = {
  HIGH: "bg-danger text-chalk",
  MEDIUM: "bg-ink text-chalk",
  LOW: "bg-paper text-ink border border-ink",
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
    <div className="min-h-screen bg-paper" data-testid="project-document-page">
      <DocHeader project={project} />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-6 md:py-8 grid lg:grid-cols-12 gap-6 md:gap-8">
        {/* DOCUMENT BODY */}
        <article className="lg:col-span-8 bg-chalk border border-ink shadow-brut">
          <div className="px-6 md:px-12 py-8 md:py-14">
            <p className="mono-label">{"{ sign-off document }"}</p>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl uppercase mt-3 leading-[0.95]">
              {project.name}
            </h1>
            <p className="mono-tag text-muted mt-3">
              PREPARED BY {(project.creator_name || "the project owner").toUpperCase()}
              {project.locked_at ? ` · LOCKED ${project.locked_at.slice(0, 10)}` : ""}
            </p>

            <DocDivider />

            <DocSection num="01" label="THE STANCE">
              <h2 className="font-display text-2xl sm:text-3xl uppercase">
                {project.decision?.recommendation?.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed">
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
                <p className="text-base leading-relaxed">{project.framing.reframed_problem}</p>
              </DocSection>
            )}

            <DocSection num="03" label="SCOPE">
              <h3 className="font-display text-xl mt-1">
                {project.artifacts.scope_doc?.title}
              </h3>
              <DocList title="IN SCOPE" items={project.artifacts.scope_doc?.in_scope} accent="signal" />
              <DocList
                title="OUT OF SCOPE"
                items={project.artifacts.scope_doc?.out_of_scope}
                accent="muted"
                strike
              />
              <DocList title="DELIVERABLES" items={project.artifacts.scope_doc?.deliverables} accent="ink" />
              {project.artifacts.scope_doc?.timeline_note && (
                <div className="mt-5 border-l-2 border-ink pl-4">
                  <p className="mono-tag text-muted">TIMELINE NOTE</p>
                  <p className="text-sm mt-1">{project.artifacts.scope_doc.timeline_note}</p>
                </div>
              )}
            </DocSection>

            {project.artifacts.client_message && (
              <DocSection num="04" label="MESSAGE TO THE CLIENT">
                <div className="border-l-2 border-signal pl-5 whitespace-pre-wrap text-base leading-relaxed">
                  {project.artifacts.client_message}
                </div>
              </DocSection>
            )}

            {project.artifacts.assumptions?.length > 0 && (
              <DocSection num="05" label="ASSUMPTIONS">
                <ul className="space-y-3">
                  {project.artifacts.assumptions.map((a, i) => (
                    <li key={i} className="flex gap-3 text-sm sm:text-base">
                      <span className="font-mono text-signal mt-1">{String(i + 1).padStart(2, "0")}</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </DocSection>
            )}

            {project.artifacts.risk_flags?.length > 0 && (
              <DocSection num="06" label="RISK FLAGS">
                <ul className="space-y-4">
                  {project.artifacts.risk_flags.map((r, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <span className={`mono-tag px-2 py-1 shrink-0 ${SEVERITY_BG[r.severity] || SEVERITY_BG.LOW}`}>
                        {r.severity}
                      </span>
                      <div>
                        <p className="font-semibold text-sm sm:text-base">{r.flag}</p>
                        <p className="text-sm text-muted mt-1">{r.why}</p>
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

        {/* SIDEBAR */}
        <aside className="lg:col-span-4 space-y-4">
          <Link
            to={`/project/${project.id}`}
            className="btn-ghost w-full justify-center"
            data-testid="doc-back-to-flow"
          >
            <ArrowLeft size={14} /> Back to the flow
          </Link>

          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="btn-brut w-full justify-center"
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

          <div className="card-brut p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-signal" />
              <p className="mono-label">{"{ client review }"}</p>
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
                <p className="mt-3 text-sm text-muted">
                  Send a clean, branded link to your client. They'll check off each scope item and sign,
                  or send back concerns with AI-assisted suggestions.
                </p>
                <button
                  onClick={mintShare}
                  className="btn-brut mt-5 w-full justify-center"
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

          <div className="card-brut p-5 sm:p-6 bg-paper">
            <p className="mono-label">{"{ status }"}</p>
            <div className="mt-3 space-y-2 text-sm">
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
  );
}

// ---- Layout helpers ----
function DocHeader({ project }) {
  return (
    <header className="sticky top-0 z-30 bg-paper border-b border-ink">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 h-16 flex items-center justify-between gap-3">
        <Link to="/app" className="shrink-0" data-testid="doc-logo-link">
          <BracketMark size={24} />
        </Link>
        <p className="mono-tag text-muted truncate hidden sm:block max-w-[40%]">
          DOCUMENT · {project.name?.toUpperCase()}
        </p>
        <Link
          to={`/project/${project.id}`}
          className="px-3 py-2 border border-ink font-mono text-[11px] tracking-widest uppercase bg-paper hover:bg-ink hover:text-chalk"
          data-testid="doc-header-flow-link"
        >
          ← Flow
        </Link>
      </div>
    </header>
  );
}

function DocDivider() {
  return <div className="my-8 h-px bg-ink/30" />;
}

function DocSection({ num, label, children }) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="flex items-center gap-3 mb-4">
        <span className="mono-tag bg-ink text-chalk px-2 py-1">{num}</span>
        <p className="mono-tag text-muted">{label}</p>
      </div>
      {children}
    </section>
  );
}

function DocList({ title, items, accent = "ink", strike = false }) {
  if (!items?.length) return null;
  return (
    <div className="mt-5">
      <p
        className={`mono-tag ${
          accent === "signal" ? "text-signal" : accent === "muted" ? "text-muted" : "text-ink"
        }`}
      >
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((it, i) => (
          <li key={i} className={`flex gap-3 text-sm sm:text-base ${strike ? "line-through text-muted" : ""}`}>
            <span
              className={`font-mono ${
                accent === "signal" ? "text-signal" : accent === "muted" ? "text-muted" : "text-ink"
              }`}
            >
              {strike ? "×" : "•"}
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
  const subject = encodeURIComponent("Review the project document");
  const body = encodeURIComponent(
    `Hi,\n\nReview the project sign-off here:\n${url}\n\nClick through to accept each item and sign, or send back concerns.\n\nThanks.`
  );
  return (
    <div className="mt-3">
      <p className="mono-tag text-signal">REVIEW LINK READY</p>
      <div className="mt-2 border border-ink bg-paper px-3 py-2 flex items-center gap-2">
        <p className="font-mono text-xs truncate" data-testid="doc-share-url">{url}</p>
        <button
          onClick={copy}
          className="shrink-0 ml-auto px-2 py-1 border border-ink mono-tag bg-chalk hover:bg-ink hover:text-chalk"
          data-testid="doc-share-copy-btn"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <a
        href={`mailto:?subject=${subject}&body=${body}`}
        className="btn-brut mt-3 w-full justify-center"
        data-testid="doc-share-email-btn"
      >
        <Send size={14} /> Send via email
      </a>
      <p className="mono-tag text-muted mt-3">
        ANYONE WITH THE LINK CAN REVIEW. THEY DON'T NEED AN ACCOUNT.
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
          className={`flex-1 py-2 border border-ink flex items-center justify-center gap-2 transition ${
            sentiment === "up" ? "bg-signal text-chalk" : "bg-chalk hover:bg-ink hover:text-chalk"
          }`}
          data-testid="feedback-up-btn"
          aria-pressed={sentiment === "up"}
        >
          <span className="mono-tag">USEFUL</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSentiment("down");
            setOpen(true);
          }}
          className={`flex-1 py-2 border border-ink flex items-center justify-center gap-2 transition ${
            sentiment === "down" ? "bg-danger text-chalk" : "bg-chalk hover:bg-ink hover:text-chalk"
          }`}
          data-testid="feedback-down-btn"
          aria-pressed={sentiment === "down"}
        >
          <span className="mono-tag">NOT YET</span>
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
