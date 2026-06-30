import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import BracketMark from "../components/BracketMark";
import Avatar, { AVATARS } from "../components/Avatar";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refresh } = useAuth();
  const next = new URLSearchParams(location.search).get("next") || "/app";

  const [name, setName] = useState(user?.name || "");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [avatar, setAvatar] = useState(user?.avatar || "mono-1");
  const [password, setPassword] = useState("");
  const [setPwdToggle, setSetPwdToggle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) {
      if (!name) setName(user.name || "");
      if (!designation) setDesignation(user.designation || "");
      if (!user.avatar && !avatar) setAvatar("mono-1");
    }
  }, [user]);

  const submit = async () => {
    if (!name.trim()) return setErr("Add your name so the document can say who built it.");
    setLoading(true);
    setErr("");
    try {
      await api.patch("/auth/me", { name: name.trim(), designation: designation.trim(), avatar });
      if (setPwdToggle && password.length >= 8) {
        await api.post("/auth/password/set", { password });
      }
      await refresh();
      // After onboarding, check if there are anonymous projects to claim.
      const { data: claimable } = await api.get("/auth/claimable");
      if (Array.isArray(claimable) && claimable.length > 0) {
        navigate(`/claim?next=${encodeURIComponent(next)}`, { replace: true });
      } else {
        navigate(next, { replace: true });
      }
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" data-testid="onboarding-page">
      <header className="glass sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 h-16 flex items-center">
          <Link to="/" className="flex items-center" aria-label="Bracket home">
            <BracketMark size={26} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-10">
        <div className="w-full max-w-xl">
          <p className="mono-label">{"{ set yourself up }"}</p>
          <h1 className="font-display text-4xl sm:text-5xl uppercase mt-3 leading-[0.95]">
            Tell us <span className="text-signal">who&apos;s deciding.</span>
          </h1>
          <p className="mt-3 text-muted text-sm">Two minutes. Your docs will go out under your name.</p>

          <div className="card-brut p-5 sm:p-6 mt-6 space-y-5">
            <label className="block">
              <span className="mono-tag text-muted">YOUR NAME</span>
              <input
                className="input-line mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ada Lovelace"
                autoFocus
                data-testid="onboarding-name"
              />
            </label>
            <label className="block">
              <span className="mono-tag text-muted">WHAT YOU DO</span>
              <input
                className="input-line mt-2"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Freelance designer · Copywriter · Founder · Indie dev"
                data-testid="onboarding-designation"
              />
            </label>

            <div>
              <p className="mono-tag text-muted">PICK YOUR MARK</p>
              <div className="mt-3 grid grid-cols-6 sm:grid-cols-6 gap-3" data-testid="onboarding-avatars">
                {AVATARS.map((a) => {
                  const active = avatar === a.id;
                  return (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => setAvatar(a.id)}
                      aria-pressed={active}
                      className={`p-1 transition ${active ? "ring-2 ring-signal ring-offset-2 ring-offset-paper" : "hover:opacity-80"}`}
                      data-testid={`onboarding-avatar-${a.id}`}
                    >
                      <Avatar id={a.id} size={44} initial={name || user?.email || "B"} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-ink pt-4">
              <label className="flex items-center gap-3 text-sm cursor-pointer" data-testid="onboarding-set-pwd-toggle">
                <input
                  type="checkbox"
                  checked={setPwdToggle}
                  onChange={(e) => setSetPwdToggle(e.target.checked)}
                  className="accent-signal w-4 h-4"
                />
                <span>Set a password so I don&apos;t need to use OTP next time.</span>
              </label>
              {setPwdToggle && (
                <input
                  type="password"
                  className="input-line mt-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password (min 8 chars)"
                  data-testid="onboarding-password"
                />
              )}
            </div>

            {err && (
              <div className="flex items-start gap-2" role="alert" data-testid="onboarding-error">
                <span className="font-mono text-signal text-xs mt-[2px]">{"{!}"}</span>
                <p className="text-sm">{err}</p>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="btn-brut w-full justify-center"
              data-testid="onboarding-submit"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : (
                <>Continue <ArrowRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
