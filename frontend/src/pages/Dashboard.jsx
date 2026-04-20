import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Trash2, Lock, Zap, Bookmark, Users } from "lucide-react";
import AppNav from "../components/AppNav";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [engine, setEngine] = useState("claude");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = useMemo(() => projects.filter((p) => p.status === "in_progress"), [projects]);
  const drafts = useMemo(() => projects.filter((p) => p.status === "draft"), [projects]);
  const locked = useMemo(() => projects.filter((p) => p.status === "locked"), [projects]);

  const create = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/projects", { name: newName.trim(), engine });
      navigate(`/app/projects/${data.id}`);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  return (
    <div className="min-h-screen bg-paper" data-testid="dashboard-page">
      <AppNav />

      <main className="max-w-[1400px] mx-auto px-6 md:px-10 py-10">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <p className="mono-label">{"{ dashboard }"}</p>
            <h1 className="font-display text-5xl md:text-6xl uppercase mt-3">
              Welcome back,<br />
              <span className="text-signal">{user?.name || "designer"}.</span>
            </h1>
            <p className="mt-4 text-muted max-w-md">What will you decide today?</p>

            <form onSubmit={create} className="mt-10 card-brut p-6" data-testid="new-project-form">
              <p className="mono-label">{"{ new project }"}</p>
              <label className="mono-tag text-muted mt-5 block">NAME</label>
              <input
                className="input-line mt-2"
                placeholder="e.g. Tello landing page redesign"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="new-project-name-input"
              />
              <label className="mono-tag text-muted mt-6 block">AI ENGINE</label>
              <div className="mt-2 inline-flex border border-ink">
                {[
                  { id: "claude", label: "CLAUDE 4.5" },
                  { id: "gpt", label: "GPT-5.2" },
                ].map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEngine(e.id)}
                    className={`px-4 py-2 mono-tag ${engine === e.id ? "bg-ink text-chalk" : "bg-paper"}`}
                    data-testid={`engine-toggle-${e.id}`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={creating} className="btn-brut w-full justify-center mt-6" data-testid="new-project-submit-btn">
                {creating ? "Creating…" : <>Start deciding <ArrowRight size={16} /></>}
              </button>
            </form>

            <div className="mt-6 grid grid-cols-3 gap-0 border border-ink" data-testid="dashboard-quicknav">
              <Link to="/app/moments" className="p-4 bg-chalk hover:bg-ink hover:text-chalk border-r border-ink transition" data-testid="dashboard-moments-tile">
                <Zap size={16} />
                <p className="mono-tag mt-3">MOMENTS</p>
                <p className="text-xs text-muted mt-1">Client message advisor</p>
              </Link>
              <Link to="/app/templates" className="p-4 bg-chalk hover:bg-ink hover:text-chalk border-r border-ink transition" data-testid="dashboard-templates-tile">
                <Bookmark size={16} />
                <p className="mono-tag mt-3">TEMPLATES</p>
                <p className="text-xs text-muted mt-1">Reusable starters</p>
              </Link>
              <Link to="/app/workspace" className="p-4 bg-chalk hover:bg-ink hover:text-chalk transition" data-testid="dashboard-workspace-tile">
                <Users size={16} />
                <p className="mono-tag mt-3">TEAM</p>
                <p className="text-xs text-muted mt-1">Studio collaboration</p>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-10">
            {error && (
              <div className="border border-danger bg-chalk p-3" data-testid="dashboard-error">
                <p className="mono-tag text-danger">ERROR</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            <ProjectsSection title="Decisions in progress" items={active} emptyCopy="Nothing on the bench. Good sign — or start something new." variant="progress" onDelete={remove} />
            <ProjectsSection title="Drafts" items={drafts} emptyCopy="No drafts. Every idea got moved forward or killed." variant="draft" onDelete={remove} />
            <ProjectsSection title="Locked decisions" items={locked} emptyCopy="Nothing locked yet. Lock-in is where confidence lives." variant="locked" onDelete={remove} />

            {loading && <p className="mono-label">Loading…</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProjectsSection({ title, items, emptyCopy, variant, onDelete }) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl uppercase">{title}</h2>
        <span className="mono-tag text-muted">{items.length.toString().padStart(2, "0")} TOTAL</span>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 border border-ink border-dashed p-6 bg-chalk">
          <p className="mono-tag text-muted">{emptyCopy}</p>
        </div>
      ) : (
        <div className="mt-4 border border-ink">
          {items.map((p, i) => (
            <div key={p.id} className={`p-5 flex flex-col md:flex-row md:items-center gap-4 bg-chalk ${i < items.length - 1 ? "border-b border-ink" : ""}`} data-testid={`project-row-${p.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="mono-tag text-signal">{p.status.replace("_", " ").toUpperCase()}</span>
                  <span className="mono-tag text-muted">STEP {p.step}/5</span>
                  <span className="mono-tag text-muted hidden md:inline">· {p.engine === "gpt" ? "GPT-5.2" : "CLAUDE 4.5"}</span>
                </div>
                <p className="font-display text-2xl mt-1 truncate">{p.name}</p>
              </div>
              <div className="flex gap-3 items-center">
                <Link to={`/app/projects/${p.id}`} className="btn-ghost" data-testid={`open-project-${p.id}`}>
                  {variant === "locked" ? <><Lock size={14} /> View</> : <>Continue <ArrowRight size={14} /></>}
                </Link>
                <button
                  onClick={() => onDelete(p.id)}
                  className="p-3 border border-ink hover:bg-danger hover:text-chalk hover:border-danger transition"
                  aria-label="Delete project"
                  data-testid={`delete-project-${p.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
