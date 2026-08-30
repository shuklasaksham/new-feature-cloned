import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";

const HALFTONE_IMG =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/hvro4m6p_right-img.png";
const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";

const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };

export default function Login() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();

  const [mode, setMode] = useState("signin"); // signin | signup
  const [phase, setPhase] = useState("form"); // form | code
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsCodeFallback, setNeedsCodeFallback] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((val || "").trim());

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const googleSignIn = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const appleSignIn = () => {
    toast("Apple sign-in is coming soon", { description: "Use Google or your email for now." });
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

  const isSignup = mode === "signin" ? false : true;

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#000" }} data-testid="login-page">
      <Seo title="Sign in" path="/login" noindex />

      {/* LEFT — form */}
      <div className="relative flex flex-col w-full lg:w-[46%] xl:w-[42%] px-7 sm:px-14 lg:px-16 xl:px-20 py-10">
        <Link to="/" aria-label="Bracket home" className="inline-flex">
          <img src={BRACKET_LOGO} alt="Bracket" width={46} height={46} style={{ display: "block" }} />
        </Link>

        <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full py-10">
          <h1 className="font-display font-semibold tracking-[-0.02em] text-[40px] leading-none" style={{ color: "#fff" }}>
            {phase === "code" ? "Check your email" : isSignup ? "Create Account" : "Sign In"}
          </h1>
          <p className="mt-3 text-[13px]" style={{ ...MONO, color: "#7a7a7a" }}>
            {phase === "code"
              ? `Enter the 6-digit code we sent to ${email}`
              : isSignup ? "Start your first project" : "Continue to your projects"}
          </p>

          {phase === "form" ? (
            <div className="mt-8">
              {/* Social */}
              <button type="button" onClick={googleSignIn} className="social-pill" data-testid="login-google-btn">
                <GoogleIcon />
                <span>{isSignup ? "Sign up" : "Sign in"} with Google</span>
              </button>
              <button type="button" onClick={appleSignIn} className="social-pill mt-3" data-testid="login-apple-btn">
                <AppleIcon />
                <span>{isSignup ? "Sign up" : "Sign in"} with Apple</span>
              </button>

              {/* OR */}
              <div className="flex items-center gap-4 my-6">
                <span className="flex-1 h-px" style={{ background: "#242424" }} />
                <span className="text-[11px]" style={{ ...MONO, color: "#6b6b6b" }}>OR</span>
                <span className="flex-1 h-px" style={{ background: "#242424" }} />
              </div>

              {isSignup && (
                <div className="mb-5">
                  <label className="login-label" style={MONO}>Name</label>
                  <input
                    className="login-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    data-testid="login-name-input"
                  />
                </div>
              )}

              <div>
                <label className="login-label" style={MONO}>Email</label>
                <input
                  className="login-input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                  placeholder="Enter your email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  data-testid="login-email-input"
                  onKeyDown={(e) => { if (e.key === "Enter" && isSignup) handlePrimary(); }}
                />
              </div>

              {!isSignup && (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <label className="login-label" style={MONO}>Password</label>
                    <button type="button" onClick={() => requestOtp({ toast: "We emailed you a sign-in code." })} className="login-link text-[12px]" style={MONO} data-testid="login-forgot-password">
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      className="login-input"
                      style={{ paddingRight: 48 }}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                      placeholder="Enter your password"
                      data-testid="login-password-input"
                      onKeyDown={(e) => { if (e.key === "Enter") handlePrimary(); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 -translate-y-1/2 right-4 inline-flex items-center justify-center"
                      style={{ color: "#8a8a8a" }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      data-testid="login-password-toggle"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 px-4 py-2.5 rounded-2xl" style={{ border: "1px solid rgba(255,92,92,0.30)", background: "rgba(255,92,92,0.06)" }} role="alert" data-testid="login-error">
                  <span aria-hidden style={{ ...MONO, color: "#ff5c5c" }} className="text-xs mt-[2px]">!</span>
                  <p className="text-[12.5px] leading-[1.5]" style={{ color: "#e6e6e6" }}>{error}</p>
                </div>
              )}

              {needsCodeFallback && (
                <button type="button" onClick={() => requestOtp({ toast: "We emailed you a sign-in code." })} className="login-link text-[12.5px] mt-3 inline-block" style={MONO} data-testid="login-code-fallback">
                  Email me a sign-in code instead →
                </button>
              )}

              <button type="button" onClick={handlePrimary} disabled={loading} className="login-submit mt-6" data-testid={isSignup ? "login-create-submit" : "login-password-submit"}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : (isSignup ? "Create Account" : "Sign In")}
              </button>

              <p className="text-center mt-6 text-[12.5px]" style={{ ...MONO, color: "#6b6b6b" }}>
                {isSignup ? "Already have an account?" : "Don't have an account?"}
              </p>
              <div className="text-center mt-1.5">
                <button
                  type="button"
                  onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(""); setNeedsCodeFallback(false); }}
                  className="login-link text-[13px]"
                  style={MONO}
                  data-testid={isSignup ? "login-goto-signin" : "login-create-account"}
                >
                  {isSignup ? "Sign In" : "Create an Account"}
                </button>
              </div>
            </div>
          ) : (
            /* CODE phase */
            <div className="mt-8">
              <input
                className="login-input text-center text-xl tracking-[0.5em]"
                style={{ ...MONO }}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6)); if (error) setError(""); }}
                placeholder="······"
                autoFocus
                inputMode="numeric"
                data-testid="login-otp-input"
                onKeyDown={(e) => { if (e.key === "Enter") submitOtp(); }}
              />
              {error && (
                <div className="mt-4 flex items-start gap-2 px-4 py-2.5 rounded-2xl" style={{ border: "1px solid rgba(255,92,92,0.30)", background: "rgba(255,92,92,0.06)" }} role="alert" data-testid="login-error">
                  <span aria-hidden style={{ ...MONO, color: "#ff5c5c" }} className="text-xs mt-[2px]">!</span>
                  <p className="text-[12.5px] leading-[1.5]" style={{ color: "#e6e6e6" }}>{error}</p>
                </div>
              )}
              <button type="button" onClick={submitOtp} disabled={loading} className="login-submit mt-6" data-testid="login-otp-submit">
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify code"}
              </button>
              <div className="flex items-center justify-between mt-5">
                <button type="button" onClick={() => { setPhase("form"); setCode(""); setError(""); }} className="login-link text-[12px]" style={MONO} data-testid="login-otp-back">
                  ← Back
                </button>
                <button type="button" onClick={() => requestOtp()} disabled={resendIn > 0 || loading} className="text-[12px] disabled:opacity-50" style={{ ...MONO, color: "#9a9a9a" }} data-testid="login-otp-resend">
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — halftone visual */}
      <div className="hidden lg:block relative flex-1 overflow-hidden" style={{ background: "#000" }} aria-hidden="true" data-testid="login-visual">
        <img src={HALFTONE_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-y-0 left-0 w-1/4" style={{ background: "linear-gradient(to right, #000 0%, transparent 100%)" }} />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 512" fill="#f5f5f5" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
    </svg>
  );
}
