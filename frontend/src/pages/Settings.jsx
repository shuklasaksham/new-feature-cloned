import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock as LockIcon, CreditCard, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Avatar from "../components/Avatar";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useDialog } from "../components/Dialog";

const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch { return "—"; }
};

export default function Settings() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();
  const [name, setName] = useState(user?.name || "");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [avatar, setAvatar] = useState(user?.avatar || "mono-1");
  const [pwd, setPwd] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setDesignation(user.designation || "");
    setAvatar(user.avatar || "mono-1");
  }, [user]);

  const loadBilling = async () => {
    setBillingLoading(true);
    try {
      const { data } = await api.get("/payments/billing");
      setBilling(data);
    } catch { /* ignore */ } finally {
      setBillingLoading(false);
    }
  };
  useEffect(() => { loadBilling(); }, []);

  const cancelPlan = async () => {
    const ok = await dialog.confirm({
      title: "Cancel your plan?",
      message: billing?.recurring
        ? "Your subscription won't renew and you'll return to no active plan. You can re-subscribe anytime."
        : "This will remove your current plan. You can choose a new one anytime.",
      confirmLabel: "Cancel plan",
      tone: "danger",
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await api.post("/payments/cancel");
      await refresh();
      await loadBilling();
      toast.success("Your plan has been cancelled.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCancelling(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch("/auth/me", { name: name.trim(), designation: designation.trim(), avatar });
      await refresh();
      toast.success("Saved.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePwd = async () => {
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters.");
    setSavingPwd(true);
    try {
      await api.post("/auth/password/set", { password: pwd });
      await refresh();
      setPwd("");
      toast.success("Password updated. Next time you can sign in with email + password.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-clip" data-testid="settings-page">
      {/* Cinematic dashboard backdrop — unified with /app. */}
      <div aria-hidden="true" className="hero-ambient hero-ambient--dashboard" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: "var(--bg)" }}
      />
      <main className="relative max-w-[760px] mx-auto px-5 sm:px-6 md:px-10 py-10 md:py-14 page-enter">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-[12px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={12} /> Back
        </button>
        <h1 className="t-hero mt-4">Account</h1>
        <p className="text-[13px] text-[var(--text-3)] mt-1.5">{user?.email}</p>

        <section className="card-linear p-6 mt-8 space-y-5" data-testid="settings-profile-card">
          <span className="section-label"><span className="dot" />Profile</span>
          <label className="block">
            <span className="t-meta">Name</span>
            <input className="input-line mt-2" value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name"/>
          </label>
          <label className="block">
            <span className="t-meta">Designation</span>
            <input className="input-line mt-2" value={designation} onChange={(e) => setDesignation(e.target.value)} data-testid="settings-designation"/>
          </label>
          <div>
            <p className="t-meta">Your mark</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar size={44} initial={name || user?.email || "B"} />
              <span className="text-[13px] text-[var(--text-3)]">Auto-generated from your name.</span>
            </div>
          </div>
          <button onClick={saveProfile} disabled={savingProfile} className="btn-primary" data-testid="settings-save-profile">
            {savingProfile ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : "Save profile"}
          </button>
        </section>

        <section className="card-linear p-6 mt-4 space-y-4" data-testid="settings-password-card">
          <span className="section-label"><span className="dot" /><LockIcon size={10} className="ml-0.5"/> Password</span>
          <p className="text-[13px] text-[var(--text-2)] leading-[1.65]">
            {user?.has_password ? "Set a new password." : "Set a password so you don't need OTP each time."}
          </p>
          <input
            type="password"
            className="input-line"
            placeholder="At least 8 characters"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            data-testid="settings-password-input"
          />
          <button onClick={savePwd} disabled={savingPwd || pwd.length < 8} className="btn-primary" data-testid="settings-save-password">
            {savingPwd ? "Saving…" : user?.has_password ? "Update password" : "Set password"}
          </button>
        </section>
        <section className="card-linear p-6 mt-4 space-y-4" data-testid="settings-billing-card">
          <span className="section-label"><span className="dot" /><CreditCard size={11} className="ml-0.5" /> Billing</span>
          {billingLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-3)]"><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : billing?.plan ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-display font-semibold text-[18px] text-[var(--text)]" data-testid="billing-plan-label">{billing.label}</p>
                  <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                    ${billing.amount}{billing.recurring ? " / month" : " · one-time"}
                  </p>
                </div>
                <span className="mono-tag px-2 py-0.5 rounded text-[9.5px]" style={{ background: "rgba(34,197,94,0.10)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                  ACTIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-md p-3" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
                  <p className="t-meta">Started</p>
                  <p className="text-[13.5px] text-[var(--text)] mt-1" data-testid="billing-since">{fmtDate(billing.since)}</p>
                </div>
                <div className="rounded-md p-3" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
                  <p className="t-meta">{billing.recurring ? "Renews on" : "Access until"}</p>
                  <p className="text-[13.5px] text-[var(--text)] mt-1" data-testid="billing-renews">{fmtDate(billing.renews_on)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button onClick={() => navigate("/plan")} className="btn-primary" data-testid="billing-change-plan">
                  Change plan <ArrowRight size={14} />
                </button>
                <button
                  onClick={cancelPlan}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 px-4 h-9 text-[13px] font-medium transition-colors"
                  style={{ background: "transparent", border: "1px solid var(--danger-soft)", borderRadius: "6px", color: "var(--danger)" }}
                  data-testid="billing-cancel-plan"
                >
                  {cancelling ? <Loader2 size={13} className="animate-spin" /> : null} Cancel plan
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] text-[var(--text-2)] leading-[1.65]">You don&apos;t have an active plan yet.</p>
              <button onClick={() => navigate("/plan")} className="btn-primary" data-testid="billing-choose-plan">
                Choose a plan <ArrowRight size={14} />
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
