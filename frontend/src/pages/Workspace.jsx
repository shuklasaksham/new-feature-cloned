import React, { useEffect, useState } from "react";
import { Plus, X, Users, Lock } from "lucide-react";
import AppNav from "../components/AppNav";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function Workspace() {
  const { user } = useAuth();
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const isStudio = user?.tier === "studio";

  const load = async () => {
    try {
      const { data } = await api.get("/workspaces/mine");
      setWs(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { data } = await api.post("/workspaces", { name: name.trim() });
      setWs(data);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    if (!ws || !inviteEmail.trim()) return;
    try {
      const { data } = await api.post(`/workspaces/${ws.id}/invite`, { email: inviteEmail.trim() });
      setWs(data);
      setInviteEmail("");
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const removeMember = async (email) => {
    if (!ws) return;
    try {
      const { data } = await api.delete(`/workspaces/${ws.id}/members/${encodeURIComponent(email)}`);
      setWs(data);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <div className="min-h-screen bg-paper" data-testid="workspace-page">
      <AppNav />
      <main className="max-w-[1200px] mx-auto px-6 md:px-10 py-10">
        <p className="mono-label">{"{ workspace · studio tier }"}</p>
        <h1 className="font-display text-5xl uppercase mt-3">
          Decide <span className="text-signal">together.</span>
        </h1>
        <p className="mt-4 text-muted max-w-xl">Invite your team. Share the same decision system. Juniors reason like seniors — consistently.</p>

        {!isStudio && (
          <div className="mt-8 card-brut p-6 bg-ink text-chalk" data-testid="workspace-tier-gate">
            <div className="flex items-center gap-3">
              <Lock size={16} />
              <p className="mono-label text-faint">STUDIO FEATURE</p>
            </div>
            <h3 className="font-display text-3xl mt-3">You're on the FREE tier.</h3>
            <p className="text-faint mt-3">Workspaces are a Studio feature. Below is a preview — you can create a workspace, but multi-seat sync kicks in once you upgrade.</p>
            <a href="/app/billing" className="btn-brut bg-chalk text-ink border-chalk hover:bg-ink hover:text-chalk mt-5 inline-flex">Upgrade →</a>
          </div>
        )}

        {loading ? (
          <p className="mono-label mt-10">LOADING…</p>
        ) : ws ? (
          <div className="mt-10 grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 card-brut p-6">
              <p className="mono-label">{"{ your workspace }"}</p>
              <h2 className="font-display text-3xl mt-3">{ws.name}</h2>
              <p className="mono-tag text-muted mt-2">OWNER · {user?.email}</p>

              <form onSubmit={invite} className="mt-8 space-y-4" data-testid="workspace-invite-form">
                <label className="mono-tag text-muted">INVITE A DESIGNER</label>
                <input className="input-line" type="email" placeholder="designer@studio.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} data-testid="workspace-invite-email-input" />
                <button type="submit" className="btn-brut w-full justify-center" data-testid="workspace-invite-btn">
                  <Plus size={14} /> Invite
                </button>
              </form>
            </div>

            <div className="lg:col-span-7">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-3xl uppercase flex items-center gap-3"><Users size={22} /> Members</h2>
                <span className="mono-tag text-muted">{ws.member_emails.length.toString().padStart(2, "0")}</span>
              </div>
              <div className="mt-4 border border-ink">
                {ws.member_emails.map((email, i) => (
                  <div key={email} className={`p-4 bg-chalk ${i < ws.member_emails.length - 1 ? "border-b border-ink" : ""} flex items-center justify-between`} data-testid={`workspace-member-${email}`}>
                    <div>
                      <p className="font-display text-xl">{email}</p>
                      <p className="mono-tag text-muted mt-1">{i === 0 ? "OWNER" : "MEMBER"}</p>
                    </div>
                    {i !== 0 && (
                      <button onClick={() => removeMember(email)} className="p-2 border border-ink hover:bg-danger hover:text-chalk hover:border-danger" data-testid={`workspace-remove-${email}`}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={create} className="mt-10 card-brut p-8 max-w-xl space-y-5" data-testid="workspace-create-form">
            <p className="mono-label">{"{ create your workspace }"}</p>
            <label className="mono-tag text-muted block">WORKSPACE NAME</label>
            <input className="input-line" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Folk Studio" data-testid="workspace-name-input" />
            {error && <div className="border border-danger p-3"><p className="mono-tag text-danger">ERROR</p><p className="text-sm mt-1">{error}</p></div>}
            <button type="submit" className="btn-brut w-full justify-center" data-testid="workspace-create-btn">
              <Plus size={14} /> Create workspace
            </button>
          </form>
        )}

        {error && ws && (
          <div className="mt-6 border border-danger bg-chalk p-3" data-testid="workspace-error"><p className="mono-tag text-danger">ERROR</p><p className="text-sm mt-1">{error}</p></div>
        )}
      </main>
    </div>
  );
}
