import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import BracketMark from "../components/BracketMark";
import { useAuth } from "../lib/AuthContext";
import { api, formatApiError } from "../lib/api";
import { WORK_TYPES, STRUGGLES } from "../lib/constants";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [workType, setWorkType] = useState("");
  const [struggle, setStruggle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const next = () => {
    setError("");
    if (step === 1 && !workType) return setError("Pick the closest match — we'll tune Bracket for you.");
    if (step === 2 && !struggle) return setError("Pick what you struggle with most.");
    setStep(step + 1);
  };

  const save = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/onboarding", { work_type: workType, struggle });
      setUser(data);
      navigate("/app/new", { replace: true });
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper blueprint-bg" data-testid="onboarding-page">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">
        <div className="flex items-center justify-between">
          <BracketMark />
          <p className="mono-label">STEP {step} / 02</p>
        </div>

        <div className="mt-8 step-line"><span style={{ width: `${(step / 2) * 100}%` }} /></div>

        <div className="mt-14 animate-fade-up">
          {step === 1 && (
            <div data-testid="onboarding-step-1">
              <p className="mono-label">{"{ intent capture · 01 }"}</p>
              <h1 className="font-display text-5xl md:text-7xl uppercase mt-4">
                What kind of<br />
                work do you <span className="text-signal">do?</span>
              </h1>
              <p className="mt-5 text-muted max-w-lg">We'll tune Bracket's stance. A freelancer needs different posture than someone running an agency.</p>

              <div className="mt-10 space-y-0 border border-ink">
                {WORK_TYPES.map((w, i) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWorkType(w.id)}
                    className={`w-full text-left p-6 flex items-start gap-5 ${workType === w.id ? "bg-ink text-chalk" : "bg-chalk hover:bg-paper"} ${i < WORK_TYPES.length - 1 ? "border-b border-ink" : ""} transition`}
                    data-testid={`onboarding-worktype-${w.id}`}
                  >
                    <span className="mono-label shrink-0 mt-1">0{i + 1}</span>
                    <span className="flex-1">
                      <span className="font-display text-2xl block">{w.label}</span>
                      <span className={`text-sm mt-1 block ${workType === w.id ? "text-faint" : "text-muted"}`}>{w.copy}</span>
                    </span>
                    <ArrowRight size={16} className="mt-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div data-testid="onboarding-step-2">
              <p className="mono-label">{"{ intent capture · 02 }"}</p>
              <h1 className="font-display text-5xl md:text-7xl uppercase mt-4">
                What do you<br />
                struggle with <span className="text-signal">most?</span>
              </h1>
              <p className="mt-5 text-muted max-w-lg">One answer only. The one that keeps you up at night.</p>

              <div className="mt-10 space-y-0 border border-ink">
                {STRUGGLES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStruggle(s.id)}
                    className={`w-full text-left p-6 flex items-start gap-5 ${struggle === s.id ? "bg-ink text-chalk" : "bg-chalk hover:bg-paper"} ${i < STRUGGLES.length - 1 ? "border-b border-ink" : ""} transition`}
                    data-testid={`onboarding-struggle-${s.id}`}
                  >
                    <span className="mono-label shrink-0 mt-1">0{i + 1}</span>
                    <span className="flex-1">
                      <span className="font-display text-2xl block">{s.label}</span>
                      <span className={`text-sm mt-1 block ${struggle === s.id ? "text-faint" : "text-muted"}`}>{s.copy}</span>
                    </span>
                    <ArrowRight size={16} className="mt-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 border border-danger bg-chalk p-3" data-testid="onboarding-error">
              <p className="mono-tag text-danger">HMM</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <div className="mt-10 flex justify-between items-center">
            {step > 1 ? (
              <button className="btn-ghost" onClick={() => setStep(step - 1)} data-testid="onboarding-back-btn">
                ← Back
              </button>
            ) : <span />}

            {step < 2 ? (
              <button className="btn-brut" onClick={next} data-testid="onboarding-next-btn">
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn-brut" onClick={save} disabled={loading} data-testid="onboarding-finish-btn">
                {loading ? "Saving…" : <>Enter Bracket <ArrowRight size={16} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
