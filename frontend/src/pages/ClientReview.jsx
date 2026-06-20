import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Pen,
} from "lucide-react";
import BracketMark from "../components/BracketMark";
import { api, formatApiError } from "../lib/api";

const SEVERITY_BG = {
  HIGH: "bg-danger text-chalk",
  MEDIUM: "bg-ink text-chalk",
  LOW: "bg-paper text-ink border border-ink",
};

export default function ClientReview() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("read"); // read | accept | reject

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/share/${token}`);
        setDoc(data);
      } catch (e) {
        setError(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="mono-label">LOADING DOCUMENT…</p>
      </div>
    );
  }
  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="border border-danger p-6 bg-chalk max-w-md text-center" data-testid="review-error">
          <p className="mono-tag text-danger">LINK INVALID</p>
          <p className="mt-2 text-sm">{error || "This review link is no longer valid."}</p>
          <Link to="/" className="btn-ghost mt-4">Go to Bracket</Link>
        </div>
      </div>
    );
  }

  const alreadyReviewed = doc.share_status === "accepted" || doc.share_status === "rejected";

  return (
    <div className="min-h-screen bg-paper" data-testid="client-review-page">
      <ReviewHeader doc={doc} />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-6 md:py-10 grid lg:grid-cols-12 gap-6 md:gap-8">
        {/* DOCUMENT */}
        <article className="lg:col-span-8 bg-chalk border border-ink shadow-brut">
          <DocumentBody doc={doc} />
        </article>

        {/* SIDEBAR */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 self-start">
          {alreadyReviewed ? (
            <ReviewedState doc={doc} />
          ) : mode === "read" ? (
            <ChooseAction onAccept={() => setMode("accept")} onReject={() => setMode("reject")} />
          ) : mode === "accept" ? (
            <AcceptForm doc={doc} token={token} onDone={(updated) => setDoc(updated)} onCancel={() => setMode("read")} />
          ) : (
            <RejectFlow doc={doc} token={token} onDone={(updated) => setDoc(updated)} onCancel={() => setMode("read")} />
          )}
        </aside>
      </div>
      <footer className="border-t border-ink bg-paper">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 py-5 flex items-center justify-between">
          <p className="mono-tag text-muted">{"{ document via bracket }"}</p>
          <Link to="/" className="mono-tag link-u">BRACKET.DESIGN →</Link>
        </div>
      </footer>
    </div>
  );
}

function ReviewHeader({ doc }) {
  return (
    <header className="sticky top-0 z-30 bg-paper border-b border-ink">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="shrink-0">
          <BracketMark size={24} />
        </Link>
        <p className="mono-tag text-muted truncate hidden sm:block">
          REVIEW · {doc.name?.toUpperCase()}
        </p>
        <p className="mono-tag text-signal">{(doc.share_status || "PENDING").toUpperCase()}</p>
      </div>
    </header>
  );
}

function DocumentBody({ doc }) {
  return (
    <div className="px-6 md:px-12 py-8 md:py-14">
      <p className="mono-label">{"{ sign-off document }"}</p>
      <h1 className="font-display text-3xl sm:text-5xl md:text-6xl uppercase mt-3 leading-[0.95]">{doc.name}</h1>
      <p className="mono-tag text-muted mt-3">
        PREPARED BY {(doc.creator_name || "the project owner").toUpperCase()}
        {doc.locked_at ? ` · ${doc.locked_at.slice(0, 10)}` : ""}
      </p>
      <Divider />

      <Section num="01" label="THE STANCE">
        <h2 className="font-display text-2xl sm:text-3xl uppercase">{doc.decision?.recommendation?.title}</h2>
        <p className="mt-3 text-base leading-relaxed">{doc.decision?.recommendation?.rationale}</p>
      </Section>

      {doc.framing?.reframed_problem && (
        <Section num="02" label="THE PROBLEM, REFRAMED">
          <p className="text-base leading-relaxed">{doc.framing.reframed_problem}</p>
        </Section>
      )}

      <Section num="03" label="SCOPE">
        <h3 className="font-display text-xl mt-1">{doc.artifacts?.scope_doc?.title}</h3>
        <SimpleList title="IN SCOPE" items={doc.artifacts?.scope_doc?.in_scope} accent="signal" />
        <SimpleList title="OUT OF SCOPE" items={doc.artifacts?.scope_doc?.out_of_scope} accent="muted" strike />
        <SimpleList title="DELIVERABLES" items={doc.artifacts?.scope_doc?.deliverables} accent="ink" />
        {doc.artifacts?.scope_doc?.timeline_note && (
          <div className="mt-5 border-l-2 border-ink pl-4">
            <p className="mono-tag text-muted">TIMELINE NOTE</p>
            <p className="text-sm mt-1">{doc.artifacts.scope_doc.timeline_note}</p>
          </div>
        )}
      </Section>

      {doc.artifacts?.client_message && (
        <Section num="04" label="MESSAGE TO YOU">
          <div className="border-l-2 border-signal pl-5 whitespace-pre-wrap text-base leading-relaxed">
            {doc.artifacts.client_message}
          </div>
        </Section>
      )}

      {doc.artifacts?.assumptions?.length > 0 && (
        <Section num="05" label="ASSUMPTIONS">
          <ul className="space-y-3">
            {doc.artifacts.assumptions.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm sm:text-base">
                <span className="font-mono text-signal mt-1">{String(i + 1).padStart(2, "0")}</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {doc.artifacts?.risk_flags?.length > 0 && (
        <Section num="06" label="RISK FLAGS">
          <ul className="space-y-4">
            {doc.artifacts.risk_flags.map((r, i) => (
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
        </Section>
      )}
    </div>
  );
}

function Divider() { return <div className="my-8 h-px bg-ink/30" />; }

function Section({ num, label, children }) {
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

function SimpleList({ title, items, accent = "ink", strike = false }) {
  if (!items?.length) return null;
  return (
    <div className="mt-5">
      <p className={`mono-tag ${accent === "signal" ? "text-signal" : accent === "muted" ? "text-muted" : "text-ink"}`}>
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((it, i) => (
          <li key={i} className={`flex gap-3 text-sm sm:text-base ${strike ? "line-through text-muted" : ""}`}>
            <span className={`font-mono ${accent === "signal" ? "text-signal" : accent === "muted" ? "text-muted" : "text-ink"}`}>
              {strike ? "×" : "•"}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChooseAction({ onAccept, onReject }) {
  return (
    <div className="card-brut p-5 sm:p-6" data-testid="review-choose-action">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-signal" />
        <p className="mono-label">{"{ your move }"}</p>
      </div>
      <p className="mt-3 text-sm text-muted">
        Read through the document. When you're ready, accept and sign it off, or send the project owner
        your concerns.
      </p>
      <button
        type="button"
        onClick={onAccept}
        className="btn-brut mt-5 w-full justify-center"
        data-testid="review-accept-cta"
      >
        Accept &amp; sign <ArrowRight size={14} />
      </button>
      <button
        type="button"
        onClick={onReject}
        className="btn-ghost mt-3 w-full justify-center"
        data-testid="review-reject-cta"
      >
        I have concerns
      </button>
    </div>
  );
}

// Build the list of items that need to be checked off
function buildAcceptanceItems(doc) {
  const items = [];
  if (doc.artifacts?.client_message) {
    items.push({ key: "client_message", label: "The message to me", group: "Message" });
  }
  (doc.artifacts?.scope_doc?.in_scope || []).forEach((s, i) =>
    items.push({ key: `in_scope_${i}`, label: s, group: "In scope" })
  );
  (doc.artifacts?.scope_doc?.deliverables || []).forEach((s, i) =>
    items.push({ key: `deliverable_${i}`, label: s, group: "Deliverables" })
  );
  (doc.artifacts?.assumptions || []).forEach((s, i) =>
    items.push({ key: `assumption_${i}`, label: s, group: "Assumptions" })
  );
  return items;
}

function AcceptForm({ doc, token, onDone, onCancel }) {
  const items = useMemo(() => buildAcceptanceItems(doc), [doc]);
  const [acceptances, setAcceptances] = useState(() =>
    items.reduce((a, it) => ({ ...a, [it.key]: false }), {})
  );
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const allChecked = items.every((it) => acceptances[it.key]);
  const checkedCount = Object.values(acceptances).filter(Boolean).length;

  const toggle = (key) =>
    setAcceptances((cur) => ({ ...cur, [key]: !cur[key] }));
  const toggleAll = () => {
    const v = !allChecked;
    setAcceptances(items.reduce((a, it) => ({ ...a, [it.key]: v }), {}));
  };

  const submit = async () => {
    if (!allChecked) return setErr("Tick each item before signing — it's the whole point.");
    if (!name.trim()) return setErr("Add your name as signature.");
    setSubmitting(true);
    setErr("");
    try {
      const { data } = await api.post(`/share/${token}/accept`, {
        acceptances,
        signature_name: name.trim(),
        role: role.trim(),
      });
      onDone(data);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-brut p-5 sm:p-6" data-testid="review-accept-form">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mono-label">{"{ sign off }"}</p>
          <p className="text-xs text-muted mt-1">
            {checkedCount} / {items.length} items
          </p>
        </div>
        <button onClick={toggleAll} className="mono-tag" data-testid="review-toggle-all">
          {allChecked ? "UNCHECK ALL" : "ACCEPT ALL"}
        </button>
      </div>

      <div className="mt-4 max-h-64 overflow-y-auto border border-ink divide-y divide-ink">
        {items.map((it) => (
          <label
            key={it.key}
            className={`flex items-start gap-3 p-3 cursor-pointer text-sm ${
              acceptances[it.key] ? "bg-chalk" : "bg-paper hover:bg-chalk"
            }`}
            data-testid={`review-item-${it.key}`}
          >
            <input
              type="checkbox"
              checked={!!acceptances[it.key]}
              onChange={() => toggle(it.key)}
              className="mt-1 accent-signal"
            />
            <div className="min-w-0">
              <p className="mono-tag text-muted">{it.group}</p>
              <p className="mt-1 break-words">{it.label}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-5 border-t border-ink pt-4">
        <label className="block">
          <span className="mono-tag text-muted flex items-center gap-2">
            <Pen size={12} /> YOUR SIGNATURE (TYPED NAME)
          </span>
          <input
            className="input-line mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            data-testid="review-signature-name"
          />
          <span
            className="block mt-2 font-display text-2xl text-ink italic min-h-[36px]"
            data-testid="review-signature-preview"
          >
            {name || "—"}
          </span>
        </label>
        <label className="block mt-3">
          <span className="mono-tag text-muted">ROLE (OPTIONAL)</span>
          <input
            className="input-line mt-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. CEO, Marketing Lead"
            data-testid="review-signature-role"
          />
        </label>
      </div>

      {err && (
        <p className="mt-3 text-sm text-danger" data-testid="review-accept-error">
          {err}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !allChecked || !name.trim()}
        className="btn-brut mt-5 w-full justify-center"
        data-testid="review-accept-submit"
      >
        {submitting ? "Signing…" : "Sign &amp; send"} <ArrowRight size={14} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="btn-ghost mt-2 w-full justify-center"
        data-testid="review-accept-cancel"
      >
        Back
      </button>
    </div>
  );
}

function RejectFlow({ doc, token, onDone, onCancel }) {
  const [phase, setPhase] = useState("write"); // write | suggestions | submitted
  const [concerns, setConcerns] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const getSuggestions = async () => {
    if (concerns.trim().length < 10) return setErr("Give the designer something useful to work with — a sentence or two minimum.");
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.post(`/share/${token}/reject/preview`, { concerns: concerns.trim() });
      setSuggestions(data.ai_suggestions);
      setPhase("suggestions");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!name.trim()) return setErr("Add your name as signature.");
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.post(`/share/${token}/reject/confirm`, {
        concerns: concerns.trim(),
        signature_name: name.trim(),
        role: role.trim(),
        ai_suggestions: suggestions || {},
      });
      onDone(data);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  if (phase === "write") {
    return (
      <div className="card-brut p-5 sm:p-6" data-testid="review-reject-write">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-danger" />
          <p className="mono-label">{"{ raise concerns }"}</p>
        </div>
        <p className="mt-3 text-sm text-muted">
          Tell the designer what isn't working. Bracket will help shape your concern into specific suggestions
          before it's sent.
        </p>
        <textarea
          rows={6}
          maxLength={4000}
          className="textarea-brut mt-4"
          placeholder="What's the worry? Specifics help — scope, timing, deliverables, anything."
          value={concerns}
          onChange={(e) => setConcerns(e.target.value)}
          data-testid="review-concerns"
        />
        {err && <p className="mt-2 text-sm text-danger" data-testid="review-reject-error">{err}</p>}
        <button
          type="button"
          onClick={getSuggestions}
          disabled={loading}
          className="btn-brut mt-4 w-full justify-center"
          data-testid="review-get-suggestions"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </>
          ) : (
            <>
              See Bracket suggestions <ArrowRight size={14} />
            </>
          )}
        </button>
        <button onClick={onCancel} className="btn-ghost mt-2 w-full justify-center" data-testid="review-reject-cancel">
          Back
        </button>
      </div>
    );
  }

  // phase === suggestions
  return (
    <div className="card-brut p-5 sm:p-6 max-h-[78vh] overflow-y-auto" data-testid="review-reject-suggestions">
      <p className="mono-label">{"{ before you send }"}</p>
      {suggestions?.summary && (
        <p className="mt-3 text-sm italic text-muted">{suggestions.summary}</p>
      )}
      <ul className="mt-4 space-y-4">
        {(suggestions?.suggestions || []).map((s, i) => (
          <li key={i} className="border-l-2 border-signal pl-4">
            <p className="font-display text-base">{i + 1}. {s.title}</p>
            <p className="text-xs mt-1">
              <span className="mono-tag">SAY →</span> {s.what_to_say}
            </p>
            <p className="text-xs mt-1">
              <span className="mono-tag">CHANGE →</span> {s.what_to_change}
            </p>
          </li>
        ))}
      </ul>
      {suggestions?.watch_for && (
        <p className="mono-tag text-danger mt-4">WATCH FOR · {suggestions.watch_for}</p>
      )}

      <div className="mt-5 border-t border-ink pt-4">
        <label className="block">
          <span className="mono-tag text-muted flex items-center gap-2">
            <Pen size={12} /> YOUR SIGNATURE (TYPED NAME)
          </span>
          <input
            className="input-line mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            data-testid="review-signature-name"
          />
        </label>
        <label className="block mt-3">
          <span className="mono-tag text-muted">ROLE (OPTIONAL)</span>
          <input
            className="input-line mt-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. CEO, Marketing Lead"
            data-testid="review-signature-role"
          />
        </label>
      </div>

      {err && <p className="mt-2 text-sm text-danger" data-testid="review-reject-confirm-error">{err}</p>}

      <button
        type="button"
        onClick={confirm}
        disabled={loading || !name.trim()}
        className="btn-brut mt-5 w-full justify-center"
        data-testid="review-reject-confirm"
      >
        {loading ? "Sending…" : "Send concerns to designer"} <ArrowRight size={14} />
      </button>
      <button
        type="button"
        onClick={() => setPhase("write")}
        className="btn-ghost mt-2 w-full justify-center"
        data-testid="review-reject-back"
      >
        Edit my concerns
      </button>
    </div>
  );
}

function ReviewedState({ doc }) {
  const isAccept = doc.share_status === "accepted";
  return (
    <div
      className={`card-brut p-5 sm:p-6 ${isAccept ? "!bg-signal text-chalk" : "!bg-ink text-chalk"}`}
      data-testid="review-done-state"
    >
      <div className="flex items-center gap-2">
        {isAccept ? <Check size={16} /> : <AlertTriangle size={16} className="text-danger" />}
        <p className="mono-tag">{isAccept ? "DOCUMENT ACCEPTED" : "CONCERNS DELIVERED"}</p>
      </div>
      <h3 className="font-display text-2xl mt-3 text-chalk">Thanks.</h3>
      <p className="mt-3 text-sm text-chalk">
        {isAccept
          ? "The project owner has been notified you accepted the sign-off. They'll be in touch with next steps."
          : "Your concerns have been delivered. The designer will reply with how they want to proceed."}
      </p>
      <p className="mono-tag mt-5 text-faint">
        SIGNED · {doc.share_review?.signature_name}
      </p>
    </div>
  );
}
