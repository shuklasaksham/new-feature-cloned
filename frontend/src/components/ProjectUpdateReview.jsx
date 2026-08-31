import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Check, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { CATEGORY_BY_KEY } from "../lib/memoryCategories";

/**
 * ProjectUpdateReview — one client request = one review.
 * Bracket bundles everything a single request touches into ONE Project Change.
 * The user sees the full impact, can keep or remove individual parts of the
 * proposal, then accepts once — Bracket updates every kept part together.
 */
const CAT_ORDER = ["scope", "deliverable", "requirement", "decision", "deadline", "timeline"];
const keyOfDown = (it) => `${it.category}|${it.title}`;

export default function ProjectUpdateReview({ projectId, open, onClose, onResolved, onViewConversation }) {
  const [loading, setLoading] = useState(false);
  const [update, setUpdate] = useState(null);
  const [none, setNone] = useState(false);
  const [acting, setActing] = useState(null);
  const [removed, setRemoved] = useState({}); // item-key -> true (excluded)
  const [compose, setCompose] = useState(null); // { titles } after accept → prompt to send client
  const [draft, setDraft] = useState("");
  const [gen, setGen] = useState(false);
  const [sending, setSending] = useState(false);

  const genDraft = async (titles) => {
    setGen(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/suggest-reply`, {
        instruction: `Write a short, friendly note to the client confirming we've accommodated these changes: ${titles.join("; ")}. Keep it concise and professional.`,
        history: [],
      });
      setDraft((data.reply || "").trim());
    } catch (e) { /* leave draft empty; user can still write */ }
    finally { setGen(false); }
  };

  const sendUpdate = async () => {
    if (sending || !draft.trim()) return;
    setSending(true);
    try {
      const { data } = await api.get(`/projects/${projectId}/send-targets`);
      const targets = data.targets || [];
      const gmail = targets.filter((t) => t.provider === "gmail").map((t) => ({ to: t.to, thread_id: t.thread_id }));
      const slack = targets.filter((t) => t.provider === "slack");
      if (gmail.length) await api.post(`/projects/${projectId}/send-email`, { targets: gmail, body: draft });
      for (const s of slack) await api.post(`/projects/${projectId}/send-slack`, { channel_id: s.channel_id, body: draft });
      toast.success("Update sent to your client");
      onClose?.();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSending(false); }
  };

  useEffect(() => {
    if (!open || !projectId) return;
    setUpdate(null); setNone(false); setRemoved({}); setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post(`/projects/${projectId}/update/build`);
        if (cancelled) return;
        if (!data.pending) setNone(true); else setUpdate(data.update);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);

  // Build a flat, keyed list of every proposed part (direct + downstream).
  const parts = useMemo(() => {
    const out = [];
    (update?.direct || []).forEach((d) => out.push({ key: `d:${d.id}`, id: d.id, kind: "direct", category: d.category || "requirement", title: d.title }));
    (update?.downstream || []).forEach((d) => out.push({ key: `x:${keyOfDown(d)}`, kind: "down", category: d.category || "requirement", title: d.title, downKey: keyOfDown(d) }));
    return out;
  }, [update]);

  const byCat = useMemo(() => {
    const m = {};
    parts.forEach((p) => { (m[p.category] = m[p.category] || []).push(p); });
    return m;
  }, [parts]);
  const cats = CAT_ORDER.filter((k) => byCat[k]?.length);
  const keptCount = parts.filter((p) => !removed[p.key]).length;
  const subtitle = update?.direct?.[0]?.detail || "";

  const resolve = async (action) => {
    if (!update || acting) return;
    setActing(action);
    try {
      let payload;
      if (action === "approve") {
        payload = {
          exclude_direct: parts.filter((p) => p.kind === "direct" && removed[p.key]).map((p) => p.id),
          exclude_downstream: parts.filter((p) => p.kind === "down" && removed[p.key]).map((p) => p.downKey),
        };
      }
      const { data } = await api.post(`/projects/${projectId}/update/${update.id}/${action}`, payload);
      if (action === "approve") {
        onResolved?.();
        toast.success("Changes applied across your project", {
          duration: 8000,
          action: {
            label: "Undo",
            onClick: async () => {
              try { await api.post(`/projects/${projectId}/update/${data.update_id}/undo`); toast.success("Change reverted"); onResolved?.(); }
              catch (e) { toast.error(formatApiError(e)); }
            },
          },
        });
        const titles = parts.filter((p) => !removed[p.key]).map((p) => p.title);
        setCompose({ titles });
        genDraft(titles);
      } else {
        toast.success("Change dismissed — not part of the project");
        onResolved?.();
        onClose?.();
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setActing(null);
    }
  };

  if (!open) return null;

  if (compose) {
    return (
      <div className="bkt-modal-overlay" style={{ zIndex: 70 }} onClick={onClose} data-testid="project-update-overlay">
        <div className="pu-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(94vw, 620px)" }} data-testid="update-compose">
          <div className="bkt-modal-head">
            <span className="flex items-center gap-2"><Sparkles size={15} style={{ color: "var(--accent)" }} /><span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Send your client an update</span></span>
            <button type="button" className="bkt-modal-x" onClick={onClose} data-testid="update-compose-close"><X size={16} /></button>
          </div>
          <div className="pu-body">
            <p className="text-[13px] mb-3" style={{ color: "var(--text-3)" }}>Changes applied. Let your client know what you accommodated — Bracket drafted this from the update.</p>
            {gen ? (
              <div className="flex items-center gap-2 text-[13px] py-8" style={{ color: "var(--text-3)" }}><Loader2 size={14} className="animate-spin" /> Drafting a message…</div>
            ) : (
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8}
                className="w-full resize-y rounded-xl p-3 text-[13.5px] leading-relaxed outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--hairline-strong)", color: "var(--text)" }} data-testid="update-compose-text" />
            )}
          </div>
          <div className="pu-foot">
            <button type="button" onClick={onClose} className="cta-mono text-[12.5px]" style={{ color: "var(--text-2)" }} data-testid="update-compose-skip">Skip for now</button>
            <button type="button" onClick={sendUpdate} disabled={sending || gen || !draft.trim()}
              className="cta-mono inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-semibold disabled:opacity-40"
              style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }} data-testid="update-compose-send">
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={13} />} Send update
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bkt-modal-overlay" style={{ zIndex: 70 }} onClick={onClose} data-testid="project-update-overlay">
      <div className="pu-modal" onClick={(e) => e.stopPropagation()} data-testid="project-update-drawer">
        <div className="bkt-modal-head">
          <span className="mono-tag text-[10px]" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>PROJECT CHANGE</span>
          <button type="button" className="bkt-modal-x" onClick={onClose} data-testid="project-update-close"><X size={16} /></button>
        </div>

        <div className="pu-body">
          {loading && (
            <div className="flex items-center gap-2 text-[13px] py-8" style={{ color: "var(--text-3)" }}>
              <Loader2 size={14} className="animate-spin" /> Bracket is gathering the full impact…
            </div>
          )}

          {!loading && none && (
            <div className="text-center py-14" data-testid="project-update-empty">
              <Check size={26} style={{ color: "var(--success)", margin: "0 auto" }} />
              <p className="mt-3 text-[15px] font-medium" style={{ color: "var(--text)" }}>You're all caught up</p>
              <p className="mt-1 text-[12.5px]" style={{ color: "var(--text-3)" }}>Nothing is waiting for your review right now.</p>
            </div>
          )}

          {!loading && update && (
            <>
              <p className="text-[20px] font-semibold tracking-[-0.02em] leading-snug" style={{ color: "var(--text)" }} data-testid="project-update-summary">
                {update.summary || "Project change"}
              </p>
              {subtitle && (
                <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--text-3)", maxWidth: 620 }}>{subtitle}</p>
              )}

              <div className="pu-subhead">
                <span className="mono-tag text-[9.5px]" style={{ color: "var(--text-3)", letterSpacing: "0.14em" }}>THIS WOULD CHANGE</span>
                <span className="pu-hint">Uncheck anything that shouldn't be part of this project.</span>
              </div>

              <div className="pu-cats" data-testid="project-update-impact">
                {cats.map((k) => {
                  const c = CATEGORY_BY_KEY[k];
                  const isTime = k === "deadline" || k === "timeline";
                  return (
                    <div key={k} className="pu-cat">
                      <div className="pu-cat-head">
                        <c.icon size={13} style={{ color: "var(--text-2)" }} />
                        <span>{c.label}</span>
                      </div>
                      <div className="pu-items">
                        {byCat[k].map((p) => {
                          const off = !!removed[p.key];
                          return (
                            <button key={p.key} type="button" className={`pu-item ${off ? "pu-item--off" : ""}`}
                              onClick={() => setRemoved((r) => ({ ...r, [p.key]: !r[p.key] }))}
                              data-testid={`pu-item-${p.key}`}>
                              <span className={`pu-check ${off ? "pu-check--off" : ""}`}>{!off && <Check size={11} />}</span>
                              <span className="pu-item-text">{isTime ? "" : "+ "}{p.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {!loading && update && (
          <div className="pu-foot">
            <button type="button" onClick={() => onViewConversation?.()} className="cta-mono text-[12.5px]" style={{ color: "var(--text-2)" }} data-testid="project-update-view-convo">
              View conversation
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => resolve("reject")} disabled={acting !== null}
                className="cta-mono px-4 py-2 rounded-full text-[12.5px] disabled:opacity-40"
                style={{ border: "1px solid var(--hairline-strong)", color: "var(--text-2)" }} data-testid="project-update-reject">
                {acting === "reject" ? <Loader2 size={12} className="animate-spin inline" /> : "Not part of project"}
              </button>
              <button type="button" onClick={() => resolve("approve")} disabled={acting !== null || keptCount === 0}
                className="cta-mono inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-semibold disabled:opacity-40"
                style={{ background: "var(--primary-bg)", color: "var(--primary-fg)" }} data-testid="project-update-approve">
                {acting === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                {keptCount === parts.length ? "Accept changes" : `Accept ${keptCount} change${keptCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
