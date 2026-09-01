import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { X, Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };

// Both plans, priced in INR and USD. Payment always goes through Razorpay.
const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    unit: "/month",
    price: { inr: "999", usd: "12" },
    features: ["Up to 10 active projects", "Unlimited archived projects", "Best for ongoing client work"],
  },
  {
    id: "project",
    label: "Single project",
    unit: "/project",
    price: { inr: "199", usd: "2" },
    features: ["1 active project", "Active for 60 days", "Best for occasional client work"],
  },
];

const SYMBOL = { inr: "₹", usd: "$" };

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

/**
 * PlanModal — in-app plan picker + Razorpay checkout. Lets a user buy/upgrade
 * without being kicked out of the tool to the marketing pricing page.
 * On success, sends them straight into the new-project connect flow.
 */
export default function PlanModal({ open, onClose, defaultPlan = "monthly", title = "Add another project" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState(defaultPlan);
  const [currency, setCurrency] = useState("inr");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setSelected(defaultPlan);
  }, [open, defaultPlan]);

  if (!open) return null;

  const options = [
    ...PLANS,
  ];

  const activateTest = async () => {
    setLoading(true);
    try {
      await api.post("/payments/test-activate");
      toast.success("Test plan activated — let's set up your project.");
      navigate("/welcome", { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't activate the test plan.");
      setLoading(false);
    }
  };

  const pay = async () => {
    if (selected === "test") return activateTest();
    setLoading(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Couldn't load Razorpay — check your connection and retry.");
        setLoading(false);
        return;
      }
      const { data } = await api.post("/payments/razorpay/order", { plan_id: selected, currency });
      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Bracket",
        description: data.plan_label,
        order_id: data.order_id,
        theme: { color: "#0a0a0a" },
        handler: async (resp) => {
          try {
            await api.post("/payments/razorpay/verify", {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success("Payment confirmed — let's set up your project.");
            navigate("/welcome", { replace: true });
          } catch {
            toast.error("Payment captured but confirmation failed. Refresh in a moment.");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch (e) {
      const detail = e?.response?.data?.detail;
      toast.error(detail || "Couldn't start checkout — please try again.");
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onClose?.(); }}
      data-testid="plan-modal"
    >
      <div
        className="w-full max-w-[440px] page-enter"
        style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", padding: "24px" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="mono-tag text-[9.5px]" style={{ color: "var(--text-3, #7a7a7a)" }}>CHOOSE A PLAN</p>
            <h2 className="mt-1 font-semibold text-[19px] tracking-[-0.01em]" style={{ color: "#fff" }} data-testid="plan-modal-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            className="shrink-0 grid place-items-center transition-colors"
            style={{ width: 30, height: 30, borderRadius: 9999, border: "1px solid rgba(255,255,255,0.14)", color: "#9a9a9a" }}
            data-testid="plan-modal-close"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Currency toggle */}
        <div className="mt-4 inline-flex p-0.5" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9999 }}>
          {["inr", "usd"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className="px-3.5 h-7 text-[12px] font-semibold transition-colors"
              style={{
                ...MONO,
                borderRadius: 9999,
                background: currency === c ? "#fff" : "transparent",
                color: currency === c ? "#000" : "#9a9a9a",
              }}
              data-testid={`plan-modal-currency-${c}`}
            >
              {SYMBOL[c]} {c.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="mt-4 space-y-2.5">
          {options.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className="w-full text-left p-4 transition-colors"
                style={{
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  border: `1px solid ${active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 10,
                }}
                data-testid={`plan-modal-option-${p.id}`}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-[20px]" style={{ color: "#fff" }}>
                    {SYMBOL[currency]}{p.price[currency]}
                  </span>
                  <span className="text-[12px]" style={{ ...MONO, color: "#8a8a8a" }}>{p.unit}</span>
                  <span className="ml-auto text-[11px] font-medium" style={{ ...MONO, color: active ? "#fff" : "#6a6a6a" }}>{p.label}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[12px]" style={{ color: "#9a9a9a" }}>
                      <Check size={12} style={{ color: active ? "#fff" : "#6a6a6a" }} /> {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={pay}
          disabled={loading}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 h-11 text-[13px] font-semibold transition-colors disabled:opacity-60"
          style={{ ...MONO, background: "#fff", color: "#000", borderRadius: 9999 }}
          data-testid="plan-modal-pay"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : selected === "test" ? <>Activate free test plan <ArrowRight size={14} /></> : <>Pay with UPI / Card <ArrowRight size={14} /></>}
        </button>
        <p className="mt-2.5 text-center text-[10.5px]" style={{ ...MONO, color: "#5a5a5a" }}>
          {selected === "test" ? "Temporary test access · no payment" : "UPI · cards · netbanking · Razorpay"}
        </p>
      </div>
    </div>,
    document.body
  );
}
