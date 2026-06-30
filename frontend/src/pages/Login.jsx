import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Loader2, Mail, Lock as LockIcon } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, refresh } = useAuth();
  const nextPath = new URLSearchParams(location.search).get("next") || "/app";

  // 3 phases: pick (chooser) → otp (input code) → done
  const [phase, setPhase] = useState("pick");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((val || "").trim());

  const requestOtp = async () => {
    if (!validateEmail(email)) return setError("That email doesn't look right.");
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/otp/request", { email: email.trim().toLowerCase(), name: name.trim() });
      setPhase("otp");
      setResendIn(30);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  // Guest sign-in — no email, no password. Jumps straight to /app/new so
  // the user can start a project immediately. We'll re-prompt for their
  // email at the end of the flow (Step 5).
  const signInAsGuest = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/guest");
      setUser(data.user);
      await refresh();
      navigate("/app", { replace: true });
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    if (code.trim().length < 4) return setError("Type the 6-digit code from your email.");
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/otp/verify", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        name: name.trim(),
      });
      setUser(data.user);
      await refresh();
      if (data.is_new || !data.user?.name || !data.user?.designation) {
        navigate(`/onboarding?next=${encodeURIComponent(nextPath)}`);
      } else {
        navigate(nextPath);
      }
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async () => {
    if (!validateEmail(email)) return setError("That email doesn't look right.");
    if (password.length < 6) return setError("Password too short.");
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      setUser(data.user);
      await refresh();
      navigate(nextPath);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" data-testid="login-page">
      <header className="marketing-header">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-8 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Bracket home">
            <BracketMark size={22} label={false} variant="chalk" />
            <span className="font-semibold text-[14px] tracking-[-0.012em]">Bracket</span>
          </Link>
          <Link to="/" className="marketing-nav-link">← Back to site</Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-12 md:py-20 relative">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="w-full max-w-[420px] relative page-enter">
          <div className="text-center">
            <span className="section-label"><span className="dot" />Sign in or join</span>
            <h1 className="t-hero mt-6">
              One door.<br />
              <span className="text-[var(--text-2)]">Email</span>, then in.
            </h1>
            <p className="mt-3 text-[14px] text-[var(--text-2)]">Six-digit code · No passwords required</p>
          </div>

          <div className="card-linear p-6 mt-8" data-testid="login-card">
            {phase === "pick" && (
              <>
                <label className="block">
                  <span className="t-meta">Email</span>
                  <input
                    className="input-line mt-2"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                    placeholder="you@studio.com"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    data-testid="login-email-input"
                  />
                </label>

                {usePassword ? (
                  <label className="block mt-4">
                    <span className="t-meta flex items-center gap-1.5"><LockIcon size={11}/> Password</span>
                    <input
                      className="input-line mt-2"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                      placeholder="••••••••"
                      data-testid="login-password-input"
                    />
                  </label>
                ) : (
                  <label className="block mt-4">
                    <span className="t-meta">Your name (new users)</span>
                    <input
                      className="input-line mt-2"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Skip if you've signed in before"
                      data-testid="login-name-input"
                    />
                  </label>
                )}

                {error && <ErrorLine msg={error} />}

                <button
                  onClick={usePassword ? submitPassword : requestOtp}
                  disabled={loading}
                  className="btn-primary btn-lg mt-5 w-full"
                  data-testid={usePassword ? "login-password-submit" : "login-otp-request"}
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> {usePassword ? "Signing in…" : "Sending code…"}</>
                  ) : usePassword ? (
                    <>Sign in <ArrowRight size={14}/></>
                  ) : (
                    <><Mail size={14} /> Email me a code</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setUsePassword(!usePassword); setError(""); }}
                  className="text-[12px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors mt-4 w-full text-center"
                  data-testid="login-toggle-password"
                >
                  {usePassword ? "← Use email code instead" : "I have a password →"}
                </button>

                <div className="mt-5 pt-5 border-t border-[var(--hairline)]">
                  <button
                    type="button"
                    onClick={signInAsGuest}
                    disabled={loading}
                    className="btn-ghost btn-lg w-full"
                    data-testid="login-guest-btn"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Try it without an account →
                  </button>
                  <p className="text-[12px] text-[var(--text-3)] text-center mt-2.5">
                    Jump in now · add email later
                  </p>
                </div>
              </>
            )}

            {phase === "otp" && (
              <>
                <span className="section-label"><span className="dot" />Check your email</span>
                <p className="mt-4 text-[14px] text-[var(--text-2)]">
                  We sent a 6-digit code to <strong className="text-[var(--text)]">{email}</strong>. It expires in 10 minutes.
                </p>
                <label className="block mt-5">
                  <span className="t-meta">Code</span>
                  <input
                    className="input-line mt-2 tracking-[0.4em] font-mono text-xl text-center"
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6)); if (error) setError(""); }}
                    placeholder="······"
                    autoFocus
                    inputMode="numeric"
                    data-testid="login-otp-input"
                  />
                </label>

                {error && <ErrorLine msg={error} />}

                <button
                  onClick={submitOtp}
                  disabled={loading}
                  className="btn-primary btn-lg mt-5 w-full"
                  data-testid="login-otp-submit"
                >
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : <>Verify code <ArrowRight size={14} /></>}
                </button>
                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => { setPhase("pick"); setCode(""); setError(""); }}
                    className="text-[12px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
                    data-testid="login-otp-back"
                  >
                    ← Use a different email
                  </button>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={resendIn > 0 || loading}
                    className="text-[12px] text-[var(--text-2)] disabled:text-[var(--text-3)] transition-colors"
                    data-testid="login-otp-resend"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-[11px] text-[var(--text-3)] mt-6 text-center">
            By continuing you agree we&apos;ll only email you for project stuff.
          </p>
        </div>
      </main>
    </div>
  );
}

function ErrorLine({ msg }) {
  return (
    <div className="flex items-start gap-2 mt-4 px-3 py-2.5 rounded-md border border-[rgba(255,92,92,0.30)] bg-[rgba(255,92,92,0.06)]" role="alert" data-testid="login-error">
      <span aria-hidden className="font-mono text-[var(--danger)] text-xs mt-[2px]">!</span>
      <p className="text-[13px] text-[var(--text)] leading-[1.5]">{msg}</p>
    </div>
  );
}
