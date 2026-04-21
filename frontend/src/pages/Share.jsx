import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Lock, Check, Download } from "lucide-react";
import axios from "axios";
import BracketMark from "../components/BracketMark";

const ENV_BACKEND = process.env.REACT_APP_BACKEND_URL;
const BACKEND =
  typeof window !== "undefined" && window.location && window.location.origin
    ? window.location.origin
    : ENV_BACKEND;

export default function Share() {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/api/public/projects/${token}`);
        setProject(data);
      } catch (e) {
        setError("This link is expired or was revoked.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="mono-label">LOADING…</p></div>;
  if (error || !project) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
        <BracketMark />
        <p className="mono-label mt-10 text-danger">LINK NOT AVAILABLE</p>
        <p className="mt-4 font-display text-2xl text-center">{error}</p>
        <Link to="/" className="btn-ghost mt-8">See Bracket</Link>
      </div>
    );
  }

  const { framing, decision, artifacts } = project;

  return (
    <div className="min-h-screen bg-paper" data-testid="share-page">
      <header className="border-b border-ink bg-paper">
        <div className="max-w-[1100px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/"><BracketMark /></Link>
          <div className="flex items-center gap-4">
            <span className="mono-tag text-muted">PUBLIC · READ-ONLY</span>
            <a
              href={`${BACKEND}/api/public/projects/${token}/export.md`}
              className="btn-ghost"
              download
              data-testid="share-export-md"
            >
              <Download size={14} /> Markdown
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 md:px-10 py-14">
        <p className="mono-label">{"{ bracket · shared artifact }"}</p>
        <h1 className="font-display text-5xl md:text-7xl uppercase mt-4">{project.name}</h1>
        {project.status === "locked" && (
          <p className="mono-tag text-signal mt-4 flex items-center gap-2"><Lock size={12} /> LOCKED DECISION</p>
        )}

        {framing && (
          <section className="mt-14">
            <p className="mono-label">{"{ reframed problem }"}</p>
            <p className="font-display text-3xl md:text-4xl mt-4 leading-tight">{framing.reframed_problem}</p>
          </section>
        )}

        {decision?.recommendation && (
          <section className="mt-14 card-brut p-8">
            <p className="mono-label">{"{ the call }"}</p>
            <h2 className="font-display text-3xl md:text-4xl uppercase mt-3">{decision.recommendation.title}</h2>
            <p className="mt-3 text-muted">{decision.recommendation.rationale}</p>
          </section>
        )}

        {artifacts?.scope_doc && (
          <section className="mt-10 card-brut p-8">
            <p className="mono-label">{"{ scope }"}</p>
            <h3 className="font-display text-2xl mt-3">{artifacts.scope_doc.title}</h3>
            <div className="mt-5 grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="mono-tag text-muted">IN SCOPE</p>
                <ul className="mt-2 space-y-1">
                  {(artifacts.scope_doc.in_scope || []).map((s, i) => (
                    <li key={i} className="flex gap-2"><Check size={14} className="mt-1 text-signal" /><span>{s}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mono-tag text-muted">OUT OF SCOPE</p>
                <ul className="mt-2 space-y-1 text-muted">
                  {(artifacts.scope_doc.out_of_scope || []).map((s, i) => (
                    <li key={i} className="flex gap-2 line-through"><span>×</span><span>{s}</span></li>
                  ))}
                </ul>
              </div>
            </div>
            {artifacts.scope_doc.timeline_note && (
              <p className="mt-6 border-t border-ink pt-4 text-sm"><span className="mono-tag text-muted">TIMELINE · </span>{artifacts.scope_doc.timeline_note}</p>
            )}
          </section>
        )}

        {artifacts?.client_message && (
          <section className="mt-10 card-brut p-8">
            <p className="mono-label">{"{ client message }"}</p>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed">{artifacts.client_message}</p>
          </section>
        )}

        {artifacts?.assumptions?.length > 0 && (
          <section className="mt-10 card-brut p-8">
            <p className="mono-label">{"{ assumptions }"}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {artifacts.assumptions.map((a, i) => (
                <li key={i} className="flex gap-3"><span className="font-mono text-signal">{String(i + 1).padStart(2, "0")}</span><span>{a}</span></li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="border-t border-ink bg-paper mt-20">
        <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-8 flex justify-between items-center flex-wrap gap-3">
          <p className="mono-tag text-muted">Decisions documented with <Link to="/" className="link-u">Bracket</Link></p>
          <Link to="/signup" className="btn-brut" data-testid="share-cta-signup">Build your own → </Link>
        </div>
      </footer>
    </div>
  );
}
