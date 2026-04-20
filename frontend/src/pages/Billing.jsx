import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import AppNav from "../components/AppNav";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { PRICING } from "../lib/constants";

export default function Billing() {
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    try {
      const { data } = await api.get("/billing/me");
      setStatus(data);
    } catch (e) {
      setError(formatApiError(e));
    }
  };
  useEffect(() => { loadStatus(); }, []);

  const upgrade = async (tier) => {
    setLoading(true);
    setError("");
    try {
      const origin = window.location.origin;
      const { data } = await api.post("/billing/checkout", { tier, currency, origin_url: origin });
      window.location.href = data.url;
    } catch (err) {
      setError(formatApiError(err));
      setLoading(false);
    }
  };

  const cur = PRICING.currencies[currency];
  const tier = status?.tier || "free";

  return (
    <div className="min-h-screen bg-paper" data-testid="billing-page">
      <AppNav />
      <main className="max-w-[1400px] mx-auto px-6 md:px-10 py-10">
        <p className="mono-label">{"{ billing }"}</p>
        <h1 className="font-display text-5xl uppercase mt-3">
          Your <span className="text-signal">plan.</span>
        </h1>

        <div className="mt-8 border border-ink bg-chalk p-6" data-testid="current-plan-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="mono-tag text-muted">CURRENT PLAN</p>
              <h2 className="font-display text-4xl uppercase mt-1">{tier}</h2>
              {status?.active_until && (
                <p className="text-sm text-muted mt-2">Active until {new Date(status.active_until).toLocaleDateString()}</p>
              )}
            </div>
            <div className="inline-flex items-center border border-ink">
              {Object.keys(PRICING.currencies).map((c) => (
                <button key={c} onClick={() => setCurrency(c)} className={`px-5 py-3 mono-tag ${currency === c ? "bg-ink text-chalk" : "bg-paper"}`} data-testid={`billing-currency-${c}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 border border-danger bg-chalk p-3" data-testid="billing-error"><p className="mono-tag text-danger">ERROR</p><p className="text-sm mt-1">{error}</p></div>
        )}

        <div className="mt-10 grid md:grid-cols-3 gap-0 border border-ink">
          {PRICING.tiers.map((t, idx) => {
            const isStudio = t.id === "studio";
            const price = cur[t.id];
            const isCurrent = tier === t.id;
            return (
              <div key={t.id} className={`p-8 ${isStudio ? "bg-ink text-chalk" : "bg-chalk"} ${idx < 2 ? "md:border-r border-ink" : ""}`} data-testid={`billing-tier-${t.id}`}>
                <div className="flex items-center justify-between">
                  <span className={`mono-label ${isStudio ? "text-faint" : ""}`}>{t.name}</span>
                  {isCurrent ? <span className="mono-tag text-signal">ACTIVE</span> : t.badge && <span className="mono-tag text-signal">{t.badge}</span>}
                </div>
                <p className={`mt-3 text-sm ${isStudio ? "text-faint" : "text-muted"}`}>{t.tagline}</p>
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="font-display text-6xl">{cur.symbol}{price}</span>
                  <span className={`mono-tag ${isStudio ? "text-faint" : "text-muted"}`}>{t.id === "free" ? "/ FOREVER" : "/ 30 DAYS"}</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm"><Check size={14} className="mt-1 shrink-0 text-signal" /><span>{f}</span></li>
                  ))}
                </ul>
                {t.id === "free" ? (
                  <div className="mt-8 mono-tag text-muted">Included</div>
                ) : isCurrent ? (
                  <button className="btn-ghost w-full justify-center mt-8" disabled data-testid={`billing-current-${t.id}`}>Current plan</button>
                ) : (
                  <button
                    onClick={() => upgrade(t.id)}
                    disabled={loading}
                    className={`w-full justify-center mt-8 ${isStudio ? "btn-brut bg-chalk text-ink border-chalk hover:bg-signal hover:text-chalk hover:border-signal" : "btn-brut"}`}
                    data-testid={`billing-upgrade-${t.id}`}
                  >
                    {loading ? <><Loader2 size={14} className="animate-spin" /> Redirecting…</> : <>Upgrade to {t.name} <ArrowRight size={14} /></>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mono-tag text-muted mt-8">SECURE PAYMENTS BY STRIPE · 30-DAY ACCESS · CANCEL ANYTIME</p>
      </main>
    </div>
  );
}
