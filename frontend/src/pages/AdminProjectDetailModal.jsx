import React, { useEffect, useState } from "react";
import { Loader2, X as XIcon, ExternalLink } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Section, LabeledBlock, isEmpty } from "./adminDetailBits";

export default function AdminProjectDetailModal({ projectId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: d } = await api.get(`/admin/projects/${projectId}`);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const p = data?.project;
  const owner = data?.owner;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center px-4 py-6 overflow-y-auto"
      onClick={onClose}
      data-testid="admin-project-detail-modal"
    >
      <div
        className="card-brut w-full max-w-4xl my-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ color: "var(--text)" }}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-[var(--hairline)] rounded-t-[12px]" style={{ background: "rgba(14, 15, 18, 0.95)", backdropFilter: "blur(8px)" }}>
          <div className="min-w-0 flex-1">
            <span className="section-label"><span className="dot" />Project detail</span>
            <h2 className="font-display text-xl sm:text-2xl truncate mt-2" style={{ letterSpacing: "-0.02em" }}>
              {p?.name || (loading ? "…" : "Untitled")}
            </h2>
            {p && (
              <p className="text-[12px] mt-1 truncate" style={{ color: "var(--text-3)" }}>
                <span style={{ color: p.status === "locked" ? "var(--accent)" : "var(--text-2)" }}>
                  {(p.status || "").toUpperCase()}
                </span>
                {" · STEP "}{p.step ?? 0}{"/5"}
                {p.locked_at && ` · LOCKED ${p.locked_at.slice(0, 10)}`}
                {owner?.email && ` · OWNER ${owner.email}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {p?.status === "locked" && (
              <a
                href={`/project/${p.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost hidden sm:inline-flex items-center gap-1 text-[11px]"
                data-testid="admin-project-open-link"
              >
                <ExternalLink size={11} /> Open
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-[var(--surface-2)]"
              style={{ color: "var(--text-3)" }}
              aria-label="Close"
              data-testid="admin-project-detail-close"
            >
              <XIcon size={18} />
            </button>
          </div>
        </header>

        <div className="px-5 sm:px-7 py-6 space-y-5" data-testid="admin-project-detail-body">
          {loading && (
            <div className="flex items-center gap-2 mono-tag text-chalk/60">
              <Loader2 size={13} className="animate-spin" /> Loading project…
            </div>
          )}
          {error && !loading && (
            <p className="mono-tag text-danger" data-testid="admin-project-detail-error">
              {error}
            </p>
          )}

          {p && !loading && (
            <>
              <Section title="Meta" subtitle="Identifiers, timestamps, ownership">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LabeledBlock label="Project ID" value={p.id} />
                  <LabeledBlock label="Engine" value={p.engine} />
                  <LabeledBlock label="Created" value={p.created_at} />
                  <LabeledBlock label="Updated" value={p.updated_at} />
                  <LabeledBlock label="Locked at" value={p.locked_at} />
                  <LabeledBlock label="Owner user id" value={p.owner_user_id} />
                  <LabeledBlock label="Owner email" value={owner?.email || p.creator_email} />
                  <LabeledBlock label="Owner name" value={owner?.name || p.creator_name} />
                  <LabeledBlock label="Share status" value={p.share_status} />
                </div>
              </Section>

              {(!isEmpty(p.situation_input) || !isEmpty(p.framing)) && (
                <Section title="Step 1 · Situation" subtitle="Reframe the problem">
                  <LabeledBlock label="INPUT" value={p.situation_input} />
                  <LabeledBlock label="AI OUTPUT" value={p.framing} />
                </Section>
              )}
              {(!isEmpty(p.context_input) || !isEmpty(p.context)) && (
                <Section title="Step 2 · Context" subtitle="Compress signals from noise">
                  <LabeledBlock label="INPUT" value={p.context_input} />
                  <LabeledBlock label="AI OUTPUT" value={p.context} />
                </Section>
              )}
              {(!isEmpty(p.decision_input) || !isEmpty(p.decision)) && (
                <Section title="Step 3 · Decision" subtitle="Make the call">
                  <LabeledBlock label="INPUT" value={p.decision_input} />
                  <LabeledBlock label="AI OUTPUT" value={p.decision} />
                </Section>
              )}
              {!isEmpty(p.artifacts) && (
                <Section title="Step 4 · Artifacts" subtitle="Scope + client message + risks">
                  <LabeledBlock label="AI OUTPUT" value={p.artifacts} />
                </Section>
              )}

              {(!isEmpty(p.share_review) || !isEmpty(p.owner_replies)) && (
                <Section title="Step 5 · Client review" subtitle="Share outcome + owner replies">
                  <LabeledBlock label="Share review" value={p.share_review} />
                  <LabeledBlock label="Owner replies" value={p.owner_replies} />
                </Section>
              )}

              {!isEmpty(p.feedback) && (
                <Section title="Feedback" subtitle="Post-lock thumbs / comments">
                  <LabeledBlock label="Feedback" value={p.feedback} />
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
