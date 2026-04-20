import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { useAuth } from "../lib/AuthContext";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const res = await signup(email, password, name);
    setLoading(false);
    if (res.ok) {
      navigate("/onboarding", { replace: true });
    } else {
      setError(res.error || "Could not create account");
    }
  };

  return (
    <div className="min-h-screen bg-paper grid lg:grid-cols-2 blueprint-bg" data-testid="signup-page">
      <div className="border-r border-ink p-10 lg:p-16 flex flex-col justify-between">
        <Link to="/"><BracketMark /></Link>
        <div>
          <p className="mono-label">{"{ get started }"}</p>
          <h1 className="font-display text-5xl md:text-7xl uppercase mt-6">
            Designers don't<br />
            need more tools.<br />
            <span className="text-signal">They need</span><br />
            <span className="text-signal">better decisions.</span>
          </h1>
          <p className="mt-6 text-muted max-w-md">
            90 seconds to create your account. Then we drop you into a real decision — not another empty dashboard.
          </p>
        </div>
        <p className="mono-tag text-muted hidden lg:block">{"{ 3 projects free · no card · cancel anything, anytime }"}</p>
      </div>

      <div className="p-10 lg:p-16 flex items-center">
        <form onSubmit={onSubmit} className="w-full max-w-md mx-auto space-y-8" data-testid="signup-form">
          <div>
            <p className="mono-label">Step 01 / 02</p>
            <h2 className="font-display text-4xl mt-2">Create account.</h2>
          </div>

          <div>
            <label className="mono-tag text-muted">NAME (OPTIONAL)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-line mt-2"
              placeholder="What should Bracket call you?"
              data-testid="signup-name-input"
            />
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
              data-testid="signup-email-input"
            />
          </div>

          <div>
            <label className="mono-tag text-muted">PASSWORD · MIN 6 CHARS</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-line mt-2"
              placeholder="••••••••"
              data-testid="signup-password-input"
            />
          </div>

          {error && (
            <div className="border border-danger bg-chalk p-3" data-testid="signup-error">
              <p className="mono-tag text-danger">ERROR</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <button type="submit" className="btn-brut w-full justify-center" disabled={loading} data-testid="signup-submit-btn">
            {loading ? "Creating…" : <>Create account <ArrowRight size={16} /></>}
          </button>

          <p className="text-sm text-muted">
            Already have an account? <Link to="/login" className="link-u" data-testid="signup-login-link">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
