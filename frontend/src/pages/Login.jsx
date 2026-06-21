import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Loader2, Mail, Lock as LockIcon } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function googleSignInUrl() {
  const redirect = window.location.origin + "/auth/callback";
  return `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
}

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
            <span className="text-signal">Two ways</span> through it.
          </h1>

          <div className="card-brut p-5 sm:p-6 mt-8" data-testid="login-card">
            {phase === "pick" && (
              <>
                <a
                  href={googleSignInUrl()}
                  className="btn-brut w-full justify-center"
                  data-testid="login-google-btn"
                >
                  <GoogleGlyph /> Continue with Google
                </a>

                <div className="my-5 flex items-center gap-3">
                  <span className="flex-1 h-px bg-ink/30" />
                  <span className="mono-tag text-muted">OR EMAIL</span>
                  <span className="flex-1 h-px bg-ink/30" />
                </div>

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

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden>
      <path fill="#FFFFFF" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.63z"/>
      <path fill="#FFFFFF" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.58-5.05-3.71H.92v2.33C2.42 16.06 5.46 18 9 18z" opacity=".95"/>
      <path fill="#FFFFFF" d="M3.95 10.71A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.71V4.96H.92A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.99-2.33z" opacity=".75"/>
      <path fill="#FFFFFF" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.46 0 2.42 1.94.92 4.96l3.03 2.33C4.66 5.16 6.65 3.58 9 3.58z" opacity=".55"/>
    </svg>
  );
}
