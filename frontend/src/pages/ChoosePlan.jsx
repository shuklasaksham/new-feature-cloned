import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import Seo from "../components/Seo";
import ParticleField from "../components/ParticleField";

const HALFTONE_IMG =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/hvro4m6p_right-img.png";
const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";
const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };

const CURRENCIES = {
  usd: { code: "usd", symbol: "$", label: "USD", methods: "Cards" },
  inr: { code: "inr", symbol: "₹", label: "INR", methods: "UPI & cards" },
};

const PLANS = [
  { id: "monthly", price: { usd: "29", inr: "2,499" }, unit: "/month", features: "Upto 10 active projects • Unlimited team members", desc: "Best for ongoing client work" },
  { id: "project", price: { usd: "9", inr: "749" }, unit: "/project", features: "1 project • Active for 60 days", desc: "Best for occasional client work" },
];

export default function ChoosePlan() {
  const [selected, setSelected] = useState("monthly");
  const [currency, setCurrency] = useState("usd");
  const [loading, setLoading] = useState(false);

  const cur = CURRENCIES[currency];

  const goToCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        plan_id: selected,
        origin_url: window.location.origin,
        currency,
      });
      window.location.href = data.checkout_url;
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

          {/* Currency toggle */}
          <div className="mt-6 inline-flex p-1 rounded-full" style={{ background: "#0a0a0a", border: "1px solid #242424" }} data-testid="currency-toggle">
            {Object.values(CURRENCIES).map((c) => {
              const on = currency === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.code)}
                  className="px-4 py-1.5 rounded-full text-[12px] transition-colors"
                  style={{ ...MONO, background: on ? "#fff" : "transparent", color: on ? "#000" : "#8a8a8a" }}
                  data-testid={`currency-${c.code}`}
                  aria-pressed={on}
                >
                  {c.symbol} {c.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4">
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
                        <span className="font-display font-semibold text-[26px]" style={{ color: "#fff" }}>{cur.symbol}{p.price[currency]}</span>
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

          <button type="button" onClick={goToCheckout} disabled={loading} className="login-submit mt-6" data-testid="plan-continue">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={15} /></>}
          </button>
          <p className="text-center mt-4 text-[11px]" style={{ ...MONO, color: "#565656" }}>
            {cur.methods} accepted · Test mode · card 4242 4242 4242 4242
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
