import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";
import { Button, Input, GoogleG } from "../v2/ui/primitives";
import { Logo } from "../v2/shell/Logo";

function AuthLayout({ title, children }) {
  return (
    <div className="bk flex min-h-[100dvh] flex-col bg-app" data-testid="login-page">
      <Seo title={title} path="/login" noindex />
      <header className="flex h-14 items-center px-5 md:h-16 md:px-8"><Logo /></header>
      <main className="flex flex-1 justify-center px-4 pt-8 pb-12 md:items-center md:pt-0">
        <div className="w-full max-w-[400px] animate-fade-up">{children}</div>
      </main>
      <footer className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-5 pb-6 text-[12px] text-fg-tertiary">
        <Link to="/privacy" className="hover:text-fg">Privacy</Link>
        <Link to="/terms" className="hover:text-fg">Terms</Link>
        <Link to="/security" className="hover:text-fg">Security</Link>
        <a href="mailto:support@use-bracket.com" className="hover:text-fg">support@use-bracket.com</a>
      </footer>
    </div>
  );
}

const Label = ({ htmlFor, children, action }) => (
  <div className="mb-2 flex items-center justify-between">
    <label htmlFor={htmlFor} className="block text-[12px] font-medium text-fg-secondary">{children}</label>
    {action}
  </div>
);

export default function Login({ signup = false }) {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();

  const [mode, setMode] = useState(signup ? "signup" : "signin"); // signin | signup
  const [phase, setPhase] = useState("form"); // form | code
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsCodeFallback, setNeedsCodeFallback] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((val || "").trim());

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const googleSignIn = () => {
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/auth/google/native/start`;
  };

  const requestOtp = async (opts = {}) => {
    if (!validateEmail(email)) { setError("That email doesn't look right."); return; }
    setLoading(true); setError("");
    try {
      await api.post("/auth/otp/request", { email: email.trim().toLowerCase(), name: name.trim() });
      setPhase("code");
      setResendIn(30);
      if (opts.toast) toast.success(opts.toast);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async () => {
    if (!validateEmail(email)) { setError("That email doesn't look right."); return; }
    if (password.length < 6) { setError("Password too short."); return; }
    setLoading(true); setError(""); setNeedsCodeFallback(false);
    try {
      const { data } = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
      setUser(data.user);
      await refresh();
      navigate(data.user?.plan ? "/app" : "/plan");
    } catch (e) {
      const msg = formatApiError(e);
      setError(msg);
      if (/no password set/i.test(msg)) setNeedsCodeFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    if (code.trim().length < 4) { setError("Type the 6-digit code from your email."); return; }
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/auth/otp/verify", {
        email: email.trim().toLowerCase(), code: code.trim(), name: name.trim(),
      });
      setUser(data.user);
      await refresh();
      if (!data.user?.plan) navigate("/plan");
      else if (data.is_new || !data.user?.name || !data.user?.designation) navigate("/onboarding?next=%2Fapp");
      else navigate("/app");
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handlePrimary = () => {
    if (mode === "signup") requestOtp({ toast: "We emailed you a 6-digit code." });
    else submitPassword();
  };

  const isSignup = mode === "signup";

  const ErrorBanner = () => error ? (
    <div className="mb-4 flex gap-3 rounded-md border border-danger/60 bg-danger-bg px-3 py-2.5 text-[12px] text-fg" role="alert" data-testid="login-error">
      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
      <span className="leading-[1.5]">{error}</span>
    </div>
  ) : null;

  // ── Code phase ─────────────────────────────────────────────────────────
  if (phase === "code") {
    return (
      <AuthLayout title="Check your email">
        <h1 className="text-title-l text-fg">Check your email</h1>
        <p className="mt-2 text-[12px] text-fg-secondary">Enter the 6-digit code we sent to <span className="text-fg">{email}</span></p>
        <div className="mt-6">
          <ErrorBanner />
          <Input
            className="text-center text-[22px] tracking-[0.4em] font-mono"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6)); if (error) setError(""); }}
            placeholder="······"
            autoFocus
            inputMode="numeric"
            invalid={!!error}
            data-testid="login-otp-input"
            onKeyDown={(e) => { if (e.key === "Enter") submitOtp(); }}
          />
          <Button variant="primary" size="l" className="mt-5 w-full" onClick={submitOtp} loading={loading} data-testid="login-otp-submit">
            Verify code
          </Button>
          <div className="mt-5 flex items-center justify-between text-[12px]">
            <button type="button" onClick={() => { setPhase("form"); setCode(""); setError(""); }} className="inline-flex items-center gap-1.5 text-fg-secondary hover:text-fg" data-testid="login-otp-back">
              <ArrowLeft size={13} /> Back
            </button>
            <button type="button" onClick={() => requestOtp()} disabled={resendIn > 0 || loading} className="text-fg-secondary hover:text-fg disabled:opacity-50" data-testid="login-otp-resend">
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ── Form phase ─────────────────────────────────────────────────────────
  return (
    <AuthLayout title={isSignup ? "Create your account" : "Sign in"}>
      <h1 className="text-title-l text-fg">{isSignup ? "Create your Bracket account" : "Sign in to Bracket"}</h1>
      <p className="mt-2 text-[12px] text-fg-secondary">{isSignup ? "Free for 14 days. No card required." : "Welcome back"}</p>

      <Button size="l" className="mt-6 w-full" onClick={googleSignIn} data-testid="login-google-btn">
        <GoogleG /> Continue with Google
      </Button>

      <div className="my-4 flex items-center gap-3 text-[12px] text-fg-tertiary">
        <span className="h-px flex-1 bg-line-subtle" />or<span className="h-px flex-1 bg-line-subtle" />
      </div>

      <ErrorBanner />

      {isSignup && (
        <div className="mb-4">
          <Label htmlFor="login-name">Your name</Label>
          <Input id="login-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Cooper" data-testid="login-name-input" />
        </div>
      )}

      <div>
        <Label htmlFor="login-email">Work email</Label>
        <Input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
          placeholder="you@company.com"
          data-testid="login-email-input"
          onKeyDown={(e) => { if (e.key === "Enter" && isSignup) handlePrimary(); }}
        />
      </div>

      {!isSignup && (
        <div className="mt-4">
          <Label
            htmlFor="login-password"
            action={
              <button type="button" onClick={() => requestOtp({ toast: "We emailed you a sign-in code." })} className="text-[12px] text-fg-secondary hover:text-fg" data-testid="login-forgot-password">
                Forgot password?
              </button>
            }
          >
            Password
          </Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
            placeholder="Enter your password"
            invalid={!!error}
            data-testid="login-password-input"
            onKeyDown={(e) => { if (e.key === "Enter") handlePrimary(); }}
          />
        </div>
      )}

      {needsCodeFallback && (
        <button type="button" onClick={() => requestOtp({ toast: "We emailed you a sign-in code." })} className="mt-3 inline-block text-[12px] font-medium text-fg hover:underline" data-testid="login-code-fallback">
          Email me a sign-in code instead →
        </button>
      )}

      <Button
        variant="primary"
        size="l"
        className="mt-5 w-full"
        onClick={handlePrimary}
        loading={loading}
        disabled={isSignup ? (!email || !name) : (!email || !password)}
        data-testid={isSignup ? "login-create-submit" : "login-password-submit"}
      >
        {isSignup ? "Create account" : "Sign in"}
      </Button>

      <p className="mt-4 text-[12px] text-fg-tertiary">
        {isSignup ? "Already have an account? " : "New to Bracket? "}
        <button
          type="button"
          onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(""); setNeedsCodeFallback(false); }}
          className="font-medium text-fg hover:underline"
          data-testid={isSignup ? "login-goto-signin" : "login-create-account"}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </AuthLayout>
  );
}
