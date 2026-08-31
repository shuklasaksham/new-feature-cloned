import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";
import ParticleField from "../components/ParticleField";

const HALFTONE_IMG =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/hvro4m6p_right-img.png";
const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";
const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };
const SYMBOL = { inr: "₹", usd: "$" };

const PLANS = [
  { id: "monthly", price: { inr: "999", usd: "12" }, unit: "/month", features: "Upto 10 active projects • Unlimited team members", desc: "Best for ongoing client work" },
  { id: "project", price: { inr: "199", usd: "2" }, unit: "/project", features: "1 project • Active for 60 days", desc: "Best for occasional client work" },
];

export default function ChoosePlan() {
  const [selected, setSelected] = useState("monthly");
  const [currency, setCurrency] = useState("inr");
  const [loading, setLoading] = useState(false);
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const activateTestPlan = async () => {
    setLoading(true);
    try {
      await api.post("/payments/test-activate");
      await refresh();
      toast.success("Test plan activated — welcome to Bracket.");
      navigate("/welcome", { replace: true });
    } catch (e) {
      toast.error(formatApiError(e));
      setLoading(false);
    }
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const payWithRazorpay = async () => {
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
            toast.success("Payment confirmed — welcome to Bracket.");
            window.location.href = "/payment/success";
          } catch (e) {
            toast.error(formatApiError(e));
            setLoading(false);
          }
        },
        modal: { ondismiss: () => { setLoading(false); toast("Payment cancelled."); } },
      });
      rzp.on("payment.failed", (r) => {
        toast.error(r?.error?.description || "Payment failed — please try again.");
        setLoading(false);
      });
      rzp.open();
    } catch (e) {
      toast.error(formatApiError(e));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#000" }} data-testid="choose-plan-page">
      <Seo title="Choose your plan" path="/plan" noindex />

      <div className="relative flex flex-col justify-center w-full lg:w-[46%] xl:w-[42%] px-7 sm:px-14 lg:px-16 xl:px-20 py-10">
        <div className="max-w-[480px] w-full page-enter">
          <Link to="/" aria-label="Bracket home" className="inline-flex mb-6">
            <img src={BRACKET_LOGO} alt="Bracket" width={46} height={46} style={{ display: "block" }} />
          </Link>
          <h1 className="font-display font-semibold tracking-[-0.02em] text-[40px] leading-none" style={{ color: "#fff" }}>
            Choose your plan
          </h1>
          <p className="mt-3 text-[13px]" style={{ ...MONO, color: "#7a7a7a" }}>
            Choose monthly or pay for a single project
          </p>

          <div className="mt-5 inline-flex p-0.5" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9999 }} data-testid="choose-plan-currency-toggle">
            {["inr", "usd"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className="px-4 h-8 text-[12px] font-semibold transition-colors"
                style={{ ...MONO, borderRadius: 9999, background: currency === c ? "#fff" : "transparent", color: currency === c ? "#000" : "#9a9a9a" }}
                data-testid={`choose-plan-currency-${c}`}
              >
                {SYMBOL[c]} {c.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4">
            {PLANS.map((p) => {
              const active = selected === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className="text-left px-6 py-5 transition-colors"
                  style={{ background: "#0a0a0a", border: `1px solid ${active ? "#5f5f5f" : "#242424"}`, borderRadius: 16 }}
                  data-testid={`plan-${p.id}`}
                  aria-pressed={active}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-1 shrink-0"
                      style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${active ? "#fff" : "#3a3a3a"}`, boxSizing: "border-box", display: "grid", placeItems: "center" }}
                    >
                      {active && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "block" }} />}
                    </span>
                    <div className="min-w-0">
                      <p className="leading-none">
                        <span className="font-display font-semibold text-[26px]" style={{ color: "#fff" }}>{SYMBOL[currency]}{p.price[currency]}</span>
                        <span className="text-[15px]" style={{ ...MONO, color: "#9a9a9a" }}>{p.unit}</span>
                      </p>
                      <p className="mt-3 text-[12.5px]" style={{ ...MONO, color: "#b8b8b8" }}>{p.features}</p>
                      <p className="mt-2 text-[13px]" style={{ color: "#7a7a7a" }}>{p.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={payWithRazorpay} disabled={loading} className="login-submit mt-6" data-testid="plan-continue">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Pay with UPI / Card <ArrowRight size={15} /></>}
          </button>
          {user?.can_test_plan && (
            <button
              type="button"
              onClick={activateTestPlan}
              disabled={loading}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 text-[12.5px] font-semibold transition-colors disabled:opacity-60"
              style={{ ...MONO, background: "transparent", color: "#c9c9c9", border: "1px dashed #3a3a3a", borderRadius: 9999 }}
              data-testid="plan-test-activate"
            >
              <Zap size={14} /> Activate free test plan (₹0)
            </button>
          )}
          <p className="text-center mt-4 text-[11px]" style={{ ...MONO, color: "#565656" }}>
            UPI, cards & netbanking · Razorpay · Test mode
          </p>
        </div>
      </div>

      <div className="hidden lg:block relative flex-1 overflow-hidden fade-in" style={{ background: "#000" }} aria-hidden="true">
        <ParticleField />
        <div className="absolute inset-y-0 left-0 w-1/4" style={{ background: "linear-gradient(to right, #000 0%, transparent 100%)" }} />
      </div>
    </div>
  );
}
