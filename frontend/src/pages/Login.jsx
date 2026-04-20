import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from || "/app";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      navigate(res.user?.onboarded ? redirectTo : "/onboarding", { replace: true });
    } else {
      setError(res.error || "Could not log in");
    }
  };

  return (
    <div className="min-h-screen bg-paper grid lg:grid-cols-2 blueprint-bg" data-testid="login-page">
      <div className="border-r border-ink p-10 lg:p-16 flex flex-col justify-between">
        <Link to="/"><BracketMark /></Link>
        <div>
          <p className="mono-label">{"{ welcome back }"}</p>
          <h1 className="font-display text-5xl md:text-7xl uppercase mt-6">
            Your decisions<br />
            are <span className="text-signal">waiting.</span>
          </h1>
          <p className="mt-6 text-muted max-w-md">
            Log in to continue where you left off. Projects, locked decisions, templates — all yours.
          </p>
        </div>
        <p className="mono-tag text-muted hidden lg:block">{"{ operating system for designers }"}</p>
      </div>

      <div className="p-10 lg:p-16 flex items-center">
        <form onSubmit={onSubmit} className="w-full max-w-md mx-auto space-y-8" data-testid="login-form">
          <div>
            <p className="mono-label">Step 01 / 01</p>
            <h2 className="font-display text-4xl mt-2">Log in.</h2>
          </div>

          <div>
            <label className="mono-tag text-muted">EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-line mt-2"
              placeholder="you@domain.com"
              data-testid="login-email-input"
            />
          </div>

          <div>
            <label className="mono-tag text-muted">PASSWORD</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-line mt-2"
              placeholder="••••••••"
              data-testid="login-password-input"
            />
          </div>

          {error && (
            <div className="border border-danger bg-chalk p-3" data-testid="login-error">
              <p className="mono-tag text-danger">ERROR</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <button type="submit" className="btn-brut w-full justify-center" disabled={loading} data-testid="login-submit-btn">
            {loading ? "Signing in…" : <>Log in <ArrowRight size={16} /></>}
          </button>

          <p className="text-sm text-muted">
            New here? <Link to="/signup" className="link-u" data-testid="login-signup-link">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
