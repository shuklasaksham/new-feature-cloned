import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const MAX_ATTEMPTS = 8;
const INTERVAL = 2500;

export default function BillingReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState("pending"); // pending | success | failed | timeout
  const [tier, setTier] = useState(null);
  const [error, setError] = useState("");
  const attemptsRef = useRef(0);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      setState("failed");
      setError("Missing session id.");
      return;
    }
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      attemptsRef.current += 1;
      try {
        const { data } = await api.get(`/billing/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setTier(data.tier);
          setState("success");
          await refresh();
          return;
        }
        if (data.status === "expired") {
          setState("failed");
          setError("The checkout session expired.");
          return;
        }
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setState("timeout");
          return;
        }
        setTimeout(poll, INTERVAL);
      } catch (e) {
        setError(formatApiError(e));
        setState("failed");
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, refresh]);

  return (
    <div className="min-h-screen bg-paper blueprint-bg flex flex-col" data-testid="billing-return-page">
      <header className="border-b border-ink bg-paper">
        <div className="max-w-[900px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/"><BracketMark /></Link>
          <span className="mono-tag text-muted">BILLING</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-xl card-brut p-10" data-testid="billing-return-card">
          {state === "pending" && (
            <>
              <Loader2 className="animate-spin text-signal" size={32} />
              <p className="mono-label mt-6">PROCESSING</p>
              <h1 className="font-display text-4xl uppercase mt-3">Confirming with Stripe…</h1>
              <p className="mt-4 text-muted">Don't close this tab. This takes a few seconds.</p>
            </>
          )}
          {state === "success" && (
            <>
              <div className="w-12 h-12 bg-signal text-chalk flex items-center justify-center"><Check size={24} /></div>
              <p className="mono-label mt-6">PAID</p>
              <h1 className="font-display text-4xl uppercase mt-3">Welcome to {(tier || "PRO").toUpperCase()}.</h1>
              <p className="mt-4 text-muted">Your access is active for 30 days. Every feature unlocked. No tier gymnastics.</p>
              <button onClick={() => navigate("/app")} className="btn-brut w-full justify-center mt-8" data-testid="billing-return-dashboard">
                Go to dashboard →
              </button>
            </>
          )}
          {state === "failed" && (
            <>
              <div className="w-12 h-12 bg-danger text-chalk flex items-center justify-center"><X size={24} /></div>
              <p className="mono-label mt-6 text-danger">SOMETHING DIDN'T GO THROUGH</p>
              <h1 className="font-display text-3xl uppercase mt-3">Payment wasn't completed.</h1>
              <p className="mt-4 text-muted">{error || "You weren't charged. Try again, or use a different card."}</p>
              <Link to="/app/billing" className="btn-ghost w-full justify-center mt-8" data-testid="billing-return-retry">
                Back to billing
              </Link>
            </>
          )}
          {state === "timeout" && (
            <>
              <p className="mono-label text-muted">TIMED OUT</p>
              <h1 className="font-display text-3xl uppercase mt-3">Taking longer than usual.</h1>
              <p className="mt-4 text-muted">Payment will update automatically when Stripe confirms. Feel free to check in a minute.</p>
              <button onClick={() => window.location.reload()} className="btn-brut w-full justify-center mt-8" data-testid="billing-return-refresh">
                Check again
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
