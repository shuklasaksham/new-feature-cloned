import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock as LockIcon, ShieldAlert } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

/**
 * Hidden admin login. Same JWT cookie auth as the rest of the app, just a
 * stricter UI surface — no Google, no OTP, no marketing chrome, no link from
 * anywhere public. Email + password only.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email: email.trim(), password: pw });
      if (!data?.user?.is_admin) {
        // Auth succeeded but user is not an admin. Wipe the session and bail.
        await api.post("/auth/logout").catch(() => {});
        setError("This account is not authorized for the console.");
        setLoading(false);
        return;
      }
      await refresh();
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(formatApiError(err) || "Sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-chalk flex flex-col" data-testid="admin-login-page">
      <main className="flex-1 grid place-items-center px-5 py-12">
        <form
          onSubmit={submit}
          className="w-full max-w-sm border border-chalk/30 bg-ink p-6 sm:p-8"
          data-testid="admin-login-form"
        >
          <div className="flex items-center gap-2 text-signal">
            <ShieldAlert size={14} />
            <span className="mono-tag">{"{ admin console }"}</span>
          </div>
          <h1 className="font-display text-3xl uppercase mt-3 leading-[0.95]">
            Restricted.
            <br />
            <span className="text-signal">Sign in.</span>
          </h1>

          <label className="block mt-6">
            <span className="mono-tag text-chalk/70">EMAIL</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-transparent border-b-2 border-chalk/40 focus:border-signal outline-none py-2 font-mono text-sm"
              data-testid="admin-email-input"
            />
          </label>

          <label className="block mt-5">
            <span className="mono-tag text-chalk/70">PASSWORD</span>
            <div className="mt-2 flex items-center gap-2 border-b-2 border-chalk/40 focus-within:border-signal">
              <LockIcon size={14} className="text-chalk/40" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="flex-1 bg-transparent outline-none py-2 font-mono text-sm"
                data-testid="admin-password-input"
              />
            </div>
          </label>

          {error && (
            <p className="mono-tag text-danger mt-4" data-testid="admin-login-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !pw}
            className="mt-6 w-full px-4 py-3 bg-signal text-chalk font-mono text-xs tracking-widest uppercase border border-signal disabled:opacity-40 inline-flex items-center justify-center gap-2"
            data-testid="admin-login-submit"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? "Authenticating…" : "Enter console"}
          </button>
        </form>
      </main>
    </div>
  );
}
