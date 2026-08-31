import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";

const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    // Payment is already confirmed server-side (Razorpay signature verify +
    // webhook safety net) before we land here. Just refresh the session and go.
    let timer;
    (async () => {
      try { await refresh(); } catch (e) { /* noop */ }
      timer = setTimeout(() => navigate("/app", { replace: true }), 1500);
    })();
    return () => clearTimeout(timer);
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "#000" }} data-testid="payment-success-page">
      <Seo title="Payment" path="/payment/success" noindex />
      <div className="text-center max-w-[420px] page-enter">
        <div className="fade-in">
          <CheckCircle2 size={34} style={{ color: "#22C55E", margin: "0 auto" }} />
          <p className="mt-5 font-display text-[24px] font-semibold" style={{ color: "#fff" }}>You're in.</p>
          <p className="mt-2 text-[12.5px]" style={{ ...MONO, color: "#7a7a7a" }}>Setting up your workspace…</p>
        </div>
      </div>
    </div>
  );
}
