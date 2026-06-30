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
    <div className="min-h-screen bg-paper flex flex-col" data-testid="login-page">
      <header className="border-b border-ink">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center" aria-label="Bracket home">
            <BracketMark size={26} />
          </Link>
          <Link to="/" className="mono-tag text-muted hover:text-ink">{"← BACK TO SITE"}</Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-12 md:py-20">
        <div className="w-full max-w-md">
          <p className="mono-label flex items-center gap-3"><span className="dot-live" /> SIGN IN OR JOIN</p>
          <h1 className="font-display text-4xl sm:text-5xl uppercase mt-4 leading-[0.95]">
            One door.
            <br />
            <span className="text-signal">Email</span>, then in.
          </h1>

          <div className="card-brut p-5 sm:p-6 mt-8" data-testid="login-card">
            {phase === "pick" && (
              <>
                <label className="block">
                  <span className="mono-tag text-muted">EMAIL</span>
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
                    <span className="mono-tag text-muted flex items-center gap-2"><LockIcon size={11}/> PASSWORD</span>
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
                    <span className="mono-tag text-muted">YOUR NAME (NEW USERS)</span>
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
                  className="btn-brut mt-5 w-full justify-center"
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
                  className="mono-tag text-muted hover:text-ink mt-4 w-full text-center"
                  data-testid="login-toggle-password"
                >
                  {usePassword ? "← USE EMAIL CODE INSTEAD" : "I HAVE A PASSWORD →"}
                </button>

                <div className="mt-5 pt-5 border-t border-ink/15">
                  <button
                    type="button"
                    onClick={signInAsGuest}
                    disabled={loading}
                    className="btn-ghost w-full justify-center"
                    data-testid="login-guest-btn"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Try it without an account →
                  </button>
                  <p className="mono-tag text-muted text-center mt-2">
                    JUMP IN NOW · ADD EMAIL LATER
                  </p>
                </div>
              </>
            )}

            {phase === "otp" && (
              <>
                <p className="mono-label">{"{ check your email }"}</p>
                <p className="mt-3 text-sm">
                  We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
                </p>
                <label className="block mt-5">
                  <span className="mono-tag text-muted">CODE</span>
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
                  className="btn-brut mt-5 w-full justify-center"
                  data-testid="login-otp-submit"
                >
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : <>Verify code <ArrowRight size={14} /></>}
                </button>
                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => { setPhase("pick"); setCode(""); setError(""); }}
                    className="mono-tag text-muted hover:text-ink"
                    data-testid="login-otp-back"
                  >
                    ← USE A DIFFERENT EMAIL
                  </button>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={resendIn > 0 || loading}
                    className="mono-tag text-signal disabled:text-muted"
                    data-testid="login-otp-resend"
                  >
                    {resendIn > 0 ? `RESEND IN ${resendIn}S` : "RESEND CODE"}
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="mono-tag text-muted mt-5 text-center">
            BY CONTINUING YOU AGREE WE'LL ONLY EMAIL YOU FOR PROJECT STUFF.
          </p>
        </div>
      </main>
    </div>
  );
}

function ErrorLine({ msg }) {
  return (
    <div className="flex items-start gap-2 mt-4" role="alert" data-testid="login-error">
      <span aria-hidden className="font-mono text-signal text-xs mt-[2px]">{"{!}"}</span>
      <p className="text-sm">{msg}</p>
    </div>
  );
}
