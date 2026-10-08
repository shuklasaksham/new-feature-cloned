import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import Seo from "../components/Seo";

const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };

export default function PaymentCancel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: "#000" }} data-testid="payment-cancel-page">
      <Seo title="Payment cancelled" path="/payment/cancel" noindex />
      <div className="text-center max-w-[420px]">
        <XCircle size={32} style={{ color: "#9a9a9a", margin: "0 auto" }} />
        <p className="mt-5 font-display text-[22px] font-semibold" style={{ color: "#fff" }}>Payment cancelled</p>
        <p className="mt-2 text-[12.5px]" style={{ ...MONO, color: "#7a7a7a" }}>No charge was made. You can pick a plan whenever you're ready.</p>
        <button type="button" onClick={() => navigate("/plan", { replace: true })} className="login-submit mt-6" style={{ maxWidth: 260, margin: "24px auto 0" }} data-testid="payment-cancel-back">
          Back to plans
        </button>
      </div>
    </div>
  );
}
