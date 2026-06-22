import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Search,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  KeyRound,
  LogOut,
  X as XIcon,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const STATUS_COLOR = {
  draft: "text-chalk/60",
  in_progress: "text-chalk",
  locked: "text-signal",
};

export default function AdminDashboard() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [openProjects, setOpenProjects] = useState({});
  const [loadingProjects, setLoadingProjects] = useState({});
  const [resetTarget, setResetTarget] = useState(null); // user obj
  const [resetPw, setResetPw] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users || []);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        (u.email || "").toLowerCase().includes(s) ||
        (u.name || "").toLowerCase().includes(s) ||
        (u.designation || "").toLowerCase().includes(s),
    );
  }, [users, q]);

  const toggle = async (u) => {
    if (openId === u.user_id) {
      setOpenId(null);
      return;
    }
    setOpenId(u.user_id);
    if (!openProjects[u.user_id]) {
      setLoadingProjects((m) => ({ ...m, [u.user_id]: true }));
      try {
        const { data } = await api.get(`/admin/users/${u.user_id}/projects`);
        setOpenProjects((m) => ({ ...m, [u.user_id]: data.projects || [] }));
      } catch (e) {
        toast.error(formatApiError(e));
      } finally {
        setLoadingProjects((m) => ({ ...m, [u.user_id]: false }));
      }
    }
  };

  const doReset = async (e) => {
    e?.preventDefault?.();
    if (!resetTarget) return;
    if (resetPw.length < 8) {
      toast.error("Min 8 characters.");
      return;
    }
    setResetting(true);
    try {
      await api.post(`/admin/users/${resetTarget.user_id}/reset-password`, {
        new_password: resetPw,
      });
      toast.success(`Password reset for ${resetTarget.email}`);
      setResetTarget(null);
      setResetPw("");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setResetting(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch { /* ignore */ }
    await refresh();
    navigate("/admin/login", { replace: true });
  };

  // Self-serve set/change own password
  const [showSetPw, setShowSetPw] = useState(false);
  const [myPw, setMyPw] = useState("");
  const [settingPw, setSettingPw] = useState(false);
  const setMyPassword = async (e) => {
    e?.preventDefault?.();
    if (myPw.length < 8) {
      toast.error("Min 8 characters.");
      return;
    }
    setSettingPw(true);
    try {
      await api.post("/auth/password/set", { password: myPw });
      await refresh();
      toast.success("Password updated. Use it next time.");
      setShowSetPw(false);
      setMyPw("");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSettingPw(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-chalk" data-testid="admin-dashboard-page">
      <header className="border-b border-chalk/15">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-signal">
            <ShieldAlert size={14} />
            <span className="mono-tag">BRACKET · ADMIN CONSOLE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="mono-tag text-chalk/60 hidden sm:inline" data-testid="admin-current">
              {user?.email}
            </span>
            <button
              onClick={() => setShowSetPw(true)}
              className="px-3 py-2 border border-chalk/30 mono-tag hover:bg-chalk hover:text-ink inline-flex items-center gap-2"
              data-testid="admin-set-my-pw"
              title={user?.has_password ? "Change your password" : "Set a password"}
            >
              <KeyRound size={12} /> {user?.has_password ? "CHANGE PW" : "SET PW"}
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 border border-chalk/30 mono-tag hover:bg-chalk hover:text-ink inline-flex items-center gap-2"
              data-testid="admin-logout"
            >
              <LogOut size={12} /> SIGN OUT
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 sm:px-8 py-8">
        <h1 className="font-display text-4xl sm:text-5xl uppercase leading-[0.95]">
          All users <span className="text-signal">— {users.length}</span>
        </h1>
        <p className="mono-tag text-chalk/60 mt-2">
          Total projects: {users.reduce((acc, u) => acc + (u.project_count || 0), 0)}
        </p>

        {/* Search */}
        <div className="mt-6 flex items-center gap-2 border-b border-chalk/30 focus-within:border-signal max-w-md">
          <Search size={14} className="text-chalk/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email / name / designation"
            className="flex-1 bg-transparent outline-none py-2 font-mono text-sm placeholder-chalk/30"
            data-testid="admin-search-input"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-chalk/40 hover:text-chalk" data-testid="admin-search-clear">
              <XIcon size={14} />
            </button>
          )}
        </div>

        {loading && (
          <div className="mt-10 flex items-center gap-2 text-chalk/60">
            <Loader2 size={14} className="animate-spin" /> Loading users…
          </div>
        )}

        {error && !loading && (
          <p className="mt-8 mono-tag text-danger" data-testid="admin-error">{error}</p>
        )}

        {!loading && !error && (
          <ul className="mt-6 border border-chalk/20 divide-y divide-chalk/15" data-testid="admin-user-list">
            {filtered.map((u) => {
              const isOpen = openId === u.user_id;
              const projects = openProjects[u.user_id];
              return (
                <li key={u.user_id} data-testid={`admin-user-row-${u.user_id}`}>
                  <div
                    className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-chalk/5 cursor-pointer"
                    onClick={() => toggle(u)}
                  >
                    <button
                      className="shrink-0 text-chalk/50"
                      aria-label={isOpen ? "Collapse" : "Expand"}
                      data-testid={`admin-user-toggle-${u.user_id}`}
                    >
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">
                        {u.email}
                        {u.is_admin && (
                          <span className="ml-2 mono-tag text-signal">ADMIN</span>
                        )}
                      </p>
                      <p className="mono-tag text-chalk/50 mt-1 truncate">
                        {u.name || "—"}
                        {u.designation ? ` · ${u.designation}` : ""}
                        {u.created_at ? ` · joined ${u.created_at.slice(0, 10)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="mono-tag text-chalk/60">
                        {u.project_count} project{u.project_count === 1 ? "" : "s"}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setResetTarget(u); }}
                        className="px-3 py-1.5 border border-chalk/30 mono-tag hover:bg-signal hover:border-signal hover:text-chalk inline-flex items-center gap-2"
                        data-testid={`admin-reset-pw-${u.user_id}`}
                      >
                        <KeyRound size={11} /> RESET PW
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 sm:px-12 pb-4 bg-chalk/[0.03]" data-testid={`admin-user-projects-${u.user_id}`}>
                      {loadingProjects[u.user_id] ? (
                        <p className="mono-tag text-chalk/40 py-3">Loading projects…</p>
                      ) : !projects || projects.length === 0 ? (
                        <p className="mono-tag text-chalk/40 py-3">No projects.</p>
                      ) : (
                        <ul className="divide-y divide-chalk/10">
                          {projects.map((p) => (
                            <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-sm truncate">{p.name}</p>
                                <p className="mono-tag text-chalk/40 mt-0.5">
                                  STEP {p.step}/5 · UPDATED {(p.updated_at || "").slice(0, 10)}
                                  {p.share_status && p.share_status !== "none" ? ` · CLIENT ${p.share_status.toUpperCase()}` : ""}
                                </p>
                              </div>
                              <span className={`mono-tag ${STATUS_COLOR[p.status] || "text-chalk/60"}`}>
                                {(p.status || "").toUpperCase()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-5 py-8 mono-tag text-chalk/40">No users match "{q}".</li>
            )}
          </ul>
        )}
      </main>

      {/* Reset password modal */}
      {resetTarget && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-5 z-50"
          onClick={() => !resetting && setResetTarget(null)}
          data-testid="admin-reset-modal"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={doReset}
            className="w-full max-w-md bg-ink text-chalk border border-chalk/30 p-6 sm:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="mono-tag text-signal">{"{ reset password }"}</span>
              <button type="button" onClick={() => setResetTarget(null)} className="text-chalk/50 hover:text-chalk" data-testid="admin-reset-close">
                <XIcon size={16} />
              </button>
            </div>
            <p className="font-mono text-sm mt-4 break-all">{resetTarget.email}</p>
            <p className="mono-tag text-chalk/50 mt-1">
              Setting a new password will sign the user out of all sessions.
            </p>

            <label className="block mt-5">
              <span className="mono-tag text-chalk/70">NEW PASSWORD (min 8)</span>
              <input
                type="text"
                autoFocus
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                minLength={8}
                maxLength={128}
                className="mt-2 w-full bg-transparent border-b-2 border-chalk/40 focus:border-signal outline-none py-2 font-mono text-sm"
                data-testid="admin-reset-pw-input"
              />
            </label>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={resetting}
                className="px-3 py-2 border border-chalk/30 mono-tag hover:bg-chalk hover:text-ink"
                data-testid="admin-reset-cancel"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={resetting || resetPw.length < 8}
                className="px-3 py-2 bg-signal border border-signal mono-tag disabled:opacity-40 inline-flex items-center gap-2"
                data-testid="admin-reset-confirm"
              >
                {resetting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                {resetting ? "RESETTING…" : "RESET PASSWORD"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Set/change MY password modal */}
      {showSetPw && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-5 z-50"
          onClick={() => !settingPw && setShowSetPw(false)}
          data-testid="admin-self-pw-modal"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={setMyPassword}
            className="w-full max-w-md bg-ink text-chalk border border-chalk/30 p-6 sm:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="mono-tag text-signal">
                {user?.has_password ? "{ change your password }" : "{ set a password }"}
              </span>
              <button type="button" onClick={() => setShowSetPw(false)} className="text-chalk/50 hover:text-chalk" data-testid="admin-self-pw-close">
                <XIcon size={16} />
              </button>
            </div>
            <p className="font-mono text-sm mt-4 break-all">{user?.email}</p>
            <p className="mono-tag text-chalk/50 mt-1">
              {user?.has_password
                ? "Replaces your current password. You stay signed in."
                : "Enables password sign-in at /admin/login (otherwise you can only enter via OTP)."}
            </p>
            <label className="block mt-5">
              <span className="mono-tag text-chalk/70">NEW PASSWORD (min 8)</span>
              <input
                type="text"
                autoFocus
                value={myPw}
                onChange={(e) => setMyPw(e.target.value)}
                minLength={8}
                maxLength={128}
                className="mt-2 w-full bg-transparent border-b-2 border-chalk/40 focus:border-signal outline-none py-2 font-mono text-sm"
                data-testid="admin-self-pw-input"
              />
            </label>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSetPw(false)}
                disabled={settingPw}
                className="px-3 py-2 border border-chalk/30 mono-tag hover:bg-chalk hover:text-ink"
                data-testid="admin-self-pw-cancel"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={settingPw || myPw.length < 8}
                className="px-3 py-2 bg-signal border border-signal mono-tag disabled:opacity-40 inline-flex items-center gap-2"
                data-testid="admin-self-pw-confirm"
              >
                {settingPw ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                {settingPw ? "SAVING…" : "SAVE PASSWORD"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
