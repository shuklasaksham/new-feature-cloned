import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Plus, FileText, Lock, AlertCircle, Check, X as XIcon, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const STATUS_PILL = {
  draft:       { className: "status-pill status-pill--draft",  label: "Draft" },
  in_progress: { className: "status-pill status-pill--active", label: "In progress" },
  locked:      { className: "status-pill status-pill--locked", label: "Locked" },
};

const SHARE_PILL = {
  sent:           { className: "status-pill status-pill--wait",     label: "Awaiting review" },
  accepted:       { className: "status-pill status-pill--success",  label: "Accepted" },
  rejected:       { className: "status-pill status-pill--danger",   label: "Concerns raised" },
  awaiting_reply: { className: "status-pill status-pill--wait",     label: "Reply sent" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingName, setCreatingName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  // Fire-once on mount. `load` is a stable closure over component state
  // and re-creating it every render is intentional — we don't want this
  // effect to re-run. Adding `load` to deps without useCallback would
  // cause an infinite re-render loop.
  useEffect(() => { load(); }, []);

  const create = async () => {
    const name = creatingName.trim();
    if (!name) return toast.error("Give the project a name first.");
    setCreating(true);
    try {
      const { data } = await api.post("/projects", { project_name: name });
      navigate(`/project/${data.id}/flow`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this project? This can't be undone.")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((cur) => cur.filter((p) => p.id !== id));
      toast.success("Deleted.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Inline rename state
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);

  const startRename = (p) => {
    setRenameId(p.id);
    setRenameValue(p.name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };
  const cancelRename = () => {
    setRenameId(null);
    setRenameValue("");
  };
  const saveRename = async () => {
    const newName = renameValue.trim();
    if (!newName) return toast.error("Project name can't be empty.");
    const id = renameId;
    if (!id) return;
    try {
      const { data } = await api.patch(`/projects/${id}`, { name: newName });
      setProjects((cur) => cur.map((p) => (p.id === id ? { ...p, name: data.name, updated_at: data.updated_at } : p)));
      toast.success("Renamed.");
      cancelRename();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="min-h-screen" data-testid="dashboard-page">
      <main className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-10 py-10 md:py-14 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="section-label"><span className="dot" />Workspace</span>
            <h1 className="t-hero mt-4">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-2 text-[14px] text-[var(--text-2)]">What are we deciding today?</p>
          </div>
        </div>

        {/* Quick-create row */}
        <div className="card-brut p-4 sm:p-5 mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center" data-testid="dashboard-new-row">
          <input
            type="text"
            className="input-line flex-1"
            placeholder="Name a new project (e.g. Acme rebrand · landing)"
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            data-testid="dashboard-new-input"
          />
          <button
            onClick={create}
            disabled={creating || !creatingName.trim()}
            className="btn-brut justify-center"
            data-testid="dashboard-new-submit"
          >
            {creating ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14} />}
            New project
          </button>
        </div>

        {/* Projects list */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <p className="mono-label">{projects.length} project{projects.length === 1 ? "" : "s"}</p>
          </div>

          {loading ? (
            <div className="mt-6 mono-tag text-muted flex items-center gap-2">
              <Loader2 size={14} className="animate-spin"/> LOADING…
            </div>
          ) : projects.length === 0 ? (
            <div
              className="mt-6 card-brut p-6 sm:p-8 animate-scale-in"
              data-testid="dashboard-empty"
            >
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                  <p className="mono-label">First project</p>
                  <h3 className="t-display mt-2">
                    Nothing decided yet.
                  </h3>
                  <p className="text-muted mt-3 text-sm max-w-sm">
                    Type a name above. Or pick a starter below — Bracket will fill the first 3 fields for you so you can feel the loop in 60 seconds.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2" data-testid="empty-starter-chips">
                    {[
                      "Acme rebrand · landing",
                      "Logo direction for fintech",
                      "Pricing page audit",
                    ].map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setCreatingName(name);
                          setTimeout(() => {
                            document
                              .querySelector('[data-testid="dashboard-new-input"]')
                              ?.focus();
                          }, 0);
                        }}
                        className="suggest-chip press"
                        data-testid={`empty-starter-${name.split(" ")[0].toLowerCase()}`}
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="hidden md:block">
                  <pre className="empty-frame">{`{
  step_01  →  reframe the brief
  step_02  →  compress context
  step_03  →  pick the call
  step_04  →  draft artifacts
  step_05  →  lock + send
}`}</pre>
                </div>
              </div>
            </div>
          ) : (
            <ul className="mt-6 card-brut overflow-hidden divide-y divide-[var(--hairline)] stagger-in" data-testid="dashboard-projects-list">
              {projects.map((p) => {
                const sp = STATUS_PILL[p.status] || STATUS_PILL.draft;
                const ss = SHARE_PILL[p.share_status];
                return (
                  <li key={p.id} className="project-row" data-testid={`dashboard-row-${p.id}`}>
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {renameId === p.id ? (
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <input
                            ref={renameInputRef}
                            type="text"
                            className="input-line flex-1"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            maxLength={120}
                            data-testid={`dashboard-rename-input-${p.id}`}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveRename}
                              className="btn-brut"
                              data-testid={`dashboard-rename-save-${p.id}`}
                            >
                              <Check size={12} /> Save
                            </button>
                            <button
                              onClick={cancelRename}
                              className="btn-ghost"
                              data-testid={`dashboard-rename-cancel-${p.id}`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <Link to={`/project/${p.id}`} className="flex-1 min-w-0 group">
                          <p className="project-row-title">
                            {p.name}
                          </p>
                          <p className="project-row-meta">
                            Step {p.step}/5 · updated {new Date(p.updated_at).toLocaleDateString()}
                          </p>
                        </Link>
                      )}
                      {renameId !== p.id && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className={sp.className}>{sp.label}</span>
                        {ss && <span className={ss.className}>{ss.label}</span>}
                        {p.status === "locked" && (
                          <Link
                            to={`/project/${p.id}/document`}
                            className="icon-tile inline-flex items-center gap-2 px-3 w-auto"
                            data-testid={`dashboard-doc-${p.id}`}
                            title="Open document"
                          >
                            <FileText size={13} /> <span className="text-xs">Doc</span>
                          </Link>
                        )}
                        <button
                          onClick={() => startRename(p)}
                          className="icon-tile"
                          data-testid={`dashboard-rename-${p.id}`}
                          aria-label="Rename project"
                          title="Rename"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          className="icon-tile is-danger"
                          data-testid={`dashboard-delete-${p.id}`}
                          aria-label="Delete project"
                          title="Delete"
                        >
                          <XIcon size={13} />
                        </button>
                      </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
