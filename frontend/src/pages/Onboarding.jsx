import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import BracketMark from "../components/BracketMark";
import Avatar from "../components/Avatar";
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
      <header className="marketing-header">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 h-full flex items-center">
          <Link to="/" className="flex items-center gap-2" aria-label="Bracket home">
            <BracketMark size={26} label={true} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-12 relative">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="w-full max-w-[520px] relative page-enter">
          <div className="text-center">
            <span className="section-label"><span className="dot" />Set yourself up</span>
            <h1 className="t-hero mt-6">
              Tell us <span className="text-[var(--text-2)]">who&apos;s deciding</span>.
            </h1>
            <p className="mt-3 text-[14px] text-[var(--text-2)]">Two minutes. Your docs will go out under your name.</p>
          </div>

          <div className="card-linear p-6 mt-8 space-y-5">
            <label className="block">
              <span className="t-meta">Your name</span>
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
              <span className="t-meta">What you do</span>
              <input
                className="input-line mt-2"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Freelance designer · Founder · Indie dev"
                data-testid="onboarding-designation"
              />
            </label>

            <div>
              <p className="t-meta">Your mark</p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar size={44} initial={name || user?.email || "B"} />
                <span className="text-[13px] text-[var(--text-3)]">Auto-generated from your name.</span>
              </div>
            </div>

            <div className="border-t border-[var(--hairline)] pt-4">
              <label className="flex items-center gap-2.5 text-[13px] text-[var(--text-2)] cursor-pointer" data-testid="onboarding-set-pwd-toggle">
                <input
                  type="checkbox"
                  checked={setPwdToggle}
                  onChange={(e) => setSetPwdToggle(e.target.checked)}
                  className="accent-[var(--accent)] w-3.5 h-3.5"
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
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-md border border-[rgba(255,92,92,0.30)] bg-[rgba(255,92,92,0.06)]" role="alert" data-testid="onboarding-error">
                <span className="font-mono text-[var(--danger)] text-xs mt-[2px]">!</span>
                <p className="text-[13px] text-[var(--text)] leading-[1.5]">{err}</p>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="btn-primary btn-lg w-full"
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
