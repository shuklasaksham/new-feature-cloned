import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Loader2, Check, Trash2 } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { api, formatApiError } from "../lib/api";

export default function ClaimProjects() {
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next") || "/app";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  // decisions: id -> "keep" | "delete" | undefined
  const [decisions, setDecisions] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/claimable");
        setItems(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length === 0) {
          navigate(next, { replace: true });
        }
      } catch (e) {
        setErr(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAll = (val) =>
    setDecisions(items.reduce((a, p) => ({ ...a, [p.id]: val }), {}));

  const submit = async () => {
    const keep_ids = items.filter((p) => decisions[p.id] === "keep").map((p) => p.id);
    const delete_ids = items.filter((p) => decisions[p.id] === "delete").map((p) => p.id);
    if (keep_ids.length + delete_ids.length === 0) {
      return setErr("Choose Keep or Delete for each project — or skip them all.");
    }
    setSubmitting(true);
    setErr("");
    try {
      await api.post("/auth/claim", { keep_ids, delete_ids });
      navigate(next, { replace: true });
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => navigate(next, { replace: true });

  return (
    <div className="min-h-screen bg-paper flex flex-col" data-testid="claim-page">
      <header className="border-b border-ink">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 h-16 flex items-center">
          <Link to="/" className="flex items-center" aria-label="Bracket home">
            <BracketMark size={26} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-5 sm:px-6 py-10">
        <div className="w-full max-w-2xl">
          <p className="mono-label">{"{ welcome back }"}</p>
          <h1 className="font-display text-4xl sm:text-5xl uppercase mt-3 leading-[0.95]">
            We found projects under <span className="text-signal">your email.</span>
          </h1>
          <p className="mt-3 text-muted text-sm">
            Keep what's still useful. Delete the rest. We'll never auto-merge anything you didn't pick.
          </p>

          {loading ? (
            <div className="mt-8 flex items-center gap-2 mono-tag text-muted">
              <Loader2 size={14} className="animate-spin" /> LOADING…
            </div>
          ) : (
            <>
              <div className="mt-6 flex items-center justify-between">
                <p className="mono-tag text-muted">{items.length} CANDIDATE{items.length === 1 ? "" : "S"}</p>
                <div className="flex gap-3">
                  <button onClick={() => setAll("keep")} className="mono-tag text-signal" data-testid="claim-all-keep">KEEP ALL</button>
                  <button onClick={() => setAll("delete")} className="mono-tag text-danger" data-testid="claim-all-delete">DELETE ALL</button>
                </div>
              </div>

              <ul className="mt-3 border border-ink divide-y divide-ink">
                {items.map((p) => {
                  const choice = decisions[p.id];
                  return (
                    <li
                      key={p.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${
                        choice === "keep" ? "bg-chalk" : choice === "delete" ? "bg-paper opacity-60" : "bg-paper"
                      }`}
                      data-testid={`claim-row-${p.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-display text-lg ${choice === "delete" ? "line-through" : ""}`}>{p.name}</p>
                        <p className="mono-tag text-muted mt-1">
                          STEP {p.step}/5 · {(p.status || "DRAFT").toUpperCase()}
                          {p.share_status && p.share_status !== "none" && ` · SHARE ${p.share_status.toUpperCase()}`}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setDecisions((c) => ({ ...c, [p.id]: "keep" }))}
                          className={`px-3 py-2 border border-ink mono-tag inline-flex items-center gap-2 ${
                            choice === "keep" ? "bg-signal text-chalk" : "bg-chalk hover:bg-ink hover:text-chalk"
                          }`}
                          data-testid={`claim-keep-${p.id}`}
                          aria-pressed={choice === "keep"}
                        >
                          <Check size={12} /> KEEP
                        </button>
                        <button
                          onClick={() => setDecisions((c) => ({ ...c, [p.id]: "delete" }))}
                          className={`px-3 py-2 border border-ink mono-tag inline-flex items-center gap-2 ${
                            choice === "delete" ? "bg-danger text-chalk" : "bg-chalk hover:bg-ink hover:text-chalk"
                          }`}
                          data-testid={`claim-delete-${p.id}`}
                          aria-pressed={choice === "delete"}
                        >
                          <Trash2 size={12} /> DELETE
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {err && (
                <p className="mt-3 text-sm text-danger" data-testid="claim-error">{err}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="btn-brut flex-1 justify-center"
                  data-testid="claim-submit"
                >
                  {submitting ? "Saving…" : "Apply choices"} <ArrowRight size={14} />
                </button>
                <button onClick={skip} className="btn-ghost flex-1 justify-center" data-testid="claim-skip">
                  Skip for now
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
