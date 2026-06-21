import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock as LockIcon } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "../components/AppHeader";
import Avatar, { AVATARS } from "../components/Avatar";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function Settings() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [avatar, setAvatar] = useState(user?.avatar || "mono-1");
  const [pwd, setPwd] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setDesignation(user.designation || "");
    setAvatar(user.avatar || "mono-1");
  }, [user]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch("/auth/me", { name: name.trim(), designation: designation.trim(), avatar });
      await refresh();
      toast.success("Saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePwd = async () => {
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters.");
    setSavingPwd(true);
    try {
      await api.post("/auth/password/set", { password: pwd });
      await refresh();
      setPwd("");
      toast.success("Password updated. Next time you can sign in with email + password.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper" data-testid="settings-page">
      <AppHeader />
      <main className="max-w-[820px] mx-auto px-5 sm:px-6 md:px-10 py-8 md:py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mono-tag text-muted hover:text-ink flex items-center gap-2"
        >
          <ArrowLeft size={12} /> BACK
        </button>
        <h1 className="font-display text-4xl sm:text-5xl uppercase mt-4">Account</h1>
        <p className="mono-tag text-muted mt-2">{user?.email}</p>

        <section className="card-brut p-5 sm:p-6 mt-8 space-y-5" data-testid="settings-profile-card">
          <p className="mono-label">{"{ profile }"}</p>
          <label className="block">
            <span className="mono-tag text-muted">NAME</span>
            <input className="input-line mt-2" value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name"/>
          </label>
          <label className="block">
            <span className="mono-tag text-muted">DESIGNATION</span>
            <input className="input-line mt-2" value={designation} onChange={(e) => setDesignation(e.target.value)} data-testid="settings-designation"/>
          </label>
          <div>
            <p className="mono-tag text-muted">AVATAR</p>
            <div className="mt-3 grid grid-cols-6 gap-3" data-testid="settings-avatars">
              {AVATARS.map((a) => {
                const active = avatar === a.id;
                return (
                  <button type="button" key={a.id} onClick={() => setAvatar(a.id)} aria-pressed={active}
                    className={`p-1 ${active ? "ring-2 ring-signal ring-offset-2 ring-offset-paper" : "hover:opacity-80"}`}
                    data-testid={`settings-avatar-${a.id}`}>
                    <Avatar id={a.id} size={40} initial={name || user?.email || "B"} />
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={saveProfile} disabled={savingProfile} className="btn-brut" data-testid="settings-save-profile">
            {savingProfile ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : "Save profile"}
          </button>
        </section>

        <section className="card-brut p-5 sm:p-6 mt-6 space-y-4" data-testid="settings-password-card">
          <p className="mono-label flex items-center gap-2"><LockIcon size={12}/> {"{ password }"}</p>
          <p className="text-sm text-muted">
            {user?.has_password ? "Set a new password." : "Set a password so you don't need OTP each time."}
          </p>
          <input
            type="password"
            className="input-line"
            placeholder="At least 8 characters"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            data-testid="settings-password-input"
          />
          <button onClick={savePwd} disabled={savingPwd || pwd.length < 8} className="btn-brut" data-testid="settings-save-password">
            {savingPwd ? "Saving…" : user?.has_password ? "Update password" : "Set password"}
          </button>
        </section>
      </main>
    </div>
  );
}
