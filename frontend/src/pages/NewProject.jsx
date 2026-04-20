import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function NewProject() {
  const [name, setName] = useState("");
  const [engine, setEngine] = useState("claude");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/projects", { name: name.trim(), engine });
      navigate(`/app/projects/${data.id}`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper blueprint-bg" data-testid="new-project-page">
      <header className="border-b border-ink bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/app"><BracketMark /></Link>
          <button className="btn-ghost" onClick={async () => { await logout(); navigate("/"); }} data-testid="newproject-logout-btn">Exit</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-10 py-14">
        <p className="mono-label">{`{ welcome, ${user?.name || "designer"}. let's decide something. }`}</p>
        <h1 className="font-display text-5xl md:text-7xl uppercase mt-4">
          Name the <span className="text-signal">project.</span>
        </h1>
        <p className="mt-5 text-muted max-w-xl">Don't overthink this. A rough label is fine. You're about to reframe it anyway.</p>

        <form onSubmit={submit} className="mt-12 card-brut p-8" data-testid="firstproject-form">
          <label className="mono-tag text-muted block">PROJECT NAME</label>
          <input
            className="input-line mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tello landing page redesign"
            data-testid="firstproject-name-input"
            autoFocus
          />

          <label className="mono-tag text-muted block mt-8">AI ENGINE</label>
          <div className="mt-3 grid sm:grid-cols-2 gap-0 border border-ink">
            {[
              { id: "claude", title: "CLAUDE SONNET 4.5", copy: "Warm, senior-designer voice. Long-form reasoning. Recommended." },
              { id: "gpt", title: "GPT-5.2", copy: "Faster. Sharper. Good when you want a blunt call." },
            ].map((e, i) => (
              <button
                type="button"
                key={e.id}
                onClick={() => setEngine(e.id)}
                className={`p-5 text-left ${i === 0 ? "border-b sm:border-b-0 sm:border-r" : ""} border-ink ${engine === e.id ? "bg-ink text-chalk" : "bg-paper hover:bg-chalk"}`}
                data-testid={`firstproject-engine-${e.id}`}
              >
                <p className="mono-tag">{e.title}</p>
                <p className={`mt-2 text-sm ${engine === e.id ? "text-faint" : "text-muted"}`}>{e.copy}</p>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-6 border border-danger bg-chalk p-3" data-testid="firstproject-error">
              <p className="mono-tag text-danger">ERROR</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading || !name.trim()} className="btn-brut w-full justify-center mt-8" data-testid="firstproject-submit-btn">
            {loading ? "Opening…" : <>Start deciding <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between">
          <Link to="/app" className="link-u text-sm" data-testid="firstproject-dashboard-link">← Or skip to dashboard</Link>
          <p className="mono-tag text-muted">{"{ 5 steps · ~8 minutes }"}</p>
        </div>
      </main>
    </div>
  );
}
