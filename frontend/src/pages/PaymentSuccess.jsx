import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";

const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };
const MAX_TRIES = 8;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [state, setState] = useState("checking"); // checking | paid | timeout | error
  const tries = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) { setState("error"); return; }
    let timer;
    const poll = async () => {
      if (tries.current >= MAX_TRIES) { setState("timeout"); return; }
      tries.current += 1;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setState("paid");
          await refresh();
          setTimeout(() => navigate("/app", { replace: true }), 1400);
          return;
        }
        if (["failed", "expired"].includes(data.payment_status)) { setState("error"); return; }
      } catch { /* keep polling */ }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => clearTimeout(timer);
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "#000" }} data-testid="payment-success-page">
      <Seo title="Payment" path="/payment/success" noindex />
      <div className="text-center max-w-[420px]">
        {state === "checking" && (
          <>
            <Loader2 size={30} className="animate-spin" style={{ color: "#8184C4", margin: "0 auto" }} />
            <p className="mt-5 font-display text-[22px] font-semibold" style={{ color: "#fff" }}>Confirming your payment…</p>
            <p className="mt-2 text-[12.5px]" style={{ ...MONO, color: "#7a7a7a" }}>This only takes a moment.</p>
          </>
        )}
        {state === "paid" && (
          <>
            <CheckCircle2 size={34} style={{ color: "#16A34A", margin: "0 auto" }} />
            <p className="mt-5 font-display text-[24px] font-semibold" style={{ color: "#fff" }}>You're in.</p>
            <p className="mt-2 text-[12.5px]" style={{ ...MONO, color: "#7a7a7a" }}>Taking you to your dashboard…</p>
          </>
        )}
        {(state === "timeout" || state === "error") && (
          <>
            <XCircle size={32} style={{ color: "#DC2626", margin: "0 auto" }} />
            <p className="mt-5 font-display text-[22px] font-semibold" style={{ color: "#fff" }}>
              {state === "timeout" ? "Still processing" : "Something went wrong"}
            </p>
            <p className="mt-2 text-[12.5px]" style={{ ...MONO, color: "#7a7a7a" }}>
              {state === "timeout" ? "Your payment is taking longer than usual. Check your dashboard shortly." : "We couldn't confirm this payment."}
            </p>
            <button type="button" onClick={() => navigate("/plan", { replace: true })} className="login-submit mt-6" style={{ maxWidth: 260, margin: "24px auto 0" }} data-testid="payment-success-back">
              Back to plans
            </button>
          </>
        )}
      </div>
    </div>
  );
}
