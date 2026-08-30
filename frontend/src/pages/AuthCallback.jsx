import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

/**
 * Lands here after Emergent Google Auth: URL contains #session_id=...
 * Exchanges it server-side, sets the session cookie, refreshes the user,
 * then sends the user to /onboarding (new) or /app (returning).
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();
  // useRef so React StrictMode's double-mount doesn't double-exchange.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const hash = window.location.hash || "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const sessionId = params.get("session_id");
      if (!sessionId) {
        navigate("/login", { replace: true });
        return;
      }
      // Strip the fragment ASAP so a refresh doesn't try to re-use a burned id.
      window.history.replaceState({}, "", window.location.pathname);
      try {
        const { data } = await api.post("/auth/google/exchange", { session_id: sessionId });
        setUser(data.user);
        await refresh();
        if (!data.user?.plan) {
          navigate("/plan", { replace: true });
        } else if (data.is_new || !data.user?.designation) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/app", { replace: true });
        }
      } catch {
        navigate("/login?err=google", { replace: true });
      }
    })();
  }, [navigate, setUser, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <p className="mono-label flex items-center justify-center gap-3"><span className="dot-live" /> SIGNING YOU IN</p>
        <p className="font-display text-2xl uppercase mt-4">One moment.</p>
      </div>
    </div>
  );
}
