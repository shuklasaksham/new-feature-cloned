import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import BracketMark from "../components/BracketMark";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import DemoPlayer from "../components/DemoPlayer";
import { api, formatApiError } from "../lib/api";

const ROLES = [
  { id: "freelance", label: "Freelance designer" },
  { id: "agency", label: "Agency / studio" },
  { id: "in-house", label: "In-house / product" },
  { id: "student", label: "Student / junior" },
  { id: "other", label: "Other" },
];

const LAUNCH_DATE = new Date(2026, 4, 30, 12, 0, 0); // May 30, 12:00 PM local

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function Pad({ n }) {
  return <span>{String(n).padStart(2, "0")}</span>;
}

export default function Waitlist() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("freelance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [position, setPosition] = useState(null);
  const { d, h, m, s } = useCountdown(LAUNCH_DATE);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError("Your email — so we can reach you.");
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/waitlist", { email: email.trim().toLowerCase(), name, role });
      setDone(true);
      setPosition(data.position || null);
    } catch (err) {
      const raw = formatApiError(err);
      const friendly = /email/i.test(raw)
        ? "That doesn't look like a working email. Try a real one — we'll only use it once."
        : raw;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col" data-testid="waitlist-page">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-ink blueprint-bg">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-14 md:py-20 grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
              <p className="mono-label flex items-center gap-3">
                <span className="dot-live" />
                A 30-SECOND LOOK
              </p>

              <div className="mt-5" data-testid="waitlist-demo-slot">
                <DemoPlayer />
              </div>

              <p className="mono-label flex items-center gap-3 mt-12">
                <span className="dot-live" />
                FIRST LIGHT IN
              </p>

              <div className="mt-6 grid grid-cols-4 gap-3 max-w-2xl" data-testid="countdown-timer">
                {[
                  { n: d, l: "DAYS" },
                  { n: h, l: "HOURS" },
                  { n: m, l: "MINUTES" },
                  { n: s, l: "SECONDS" },
                ].map((c) => (
                  <div key={c.l} className="border border-ink bg-chalk p-3 md:p-5 text-center shadow-brut">
                    <p className="font-display text-4xl md:text-6xl tracking-tight text-ink leading-none">
                      <Pad n={c.n} />
                    </p>
                    <p className="mono-tag text-muted mt-2 md:mt-3">{c.l}</p>
                  </div>
                ))}
              </div>
              <p className="mono-tag text-muted mt-4">
                LAUNCH · 30 MAY · 12:00 PM
              </p>

              <h1 className="font-display text-[56px] sm:text-[84px] md:text-[112px] uppercase mt-12 leading-[0.9]">
                Reserve your
                <br />
                <span className="text-signal italic">seat</span> in the first cohort.
              </h1>

              <p className="mt-6 text-muted max-w-xl text-lg">
                Bracket is being built in private with a small group of designers. The first cohort is limited — you'll
                get early access, a dedicated feedback loop, and founder pricing for life.
              </p>

              <div className="mt-8 grid sm:grid-cols-3 gap-0 border border-ink max-w-2xl" data-testid="waitlist-benefits">
                {[
                  ["ALPHA ACCESS", "Before anyone else."],
                  ["FOUNDER PRICING", "Locked in, forever."],
                  ["DIRECT LINE", "To the team. Not a form."],
                ].map(([t, c], i) => (
                  <div key={t} className={`p-4 bg-chalk ${i < 2 ? "sm:border-r border-ink" : ""} ${i < 2 ? "border-b sm:border-b-0 border-ink" : ""}`}>
                    <p className="mono-tag text-signal">{t}</p>
                    <p className="text-sm mt-2">{c}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              {!done ? (
                <form onSubmit={submit} className="card-brut p-6 md:p-8 space-y-6" data-testid="waitlist-form">
                  <div className="flex items-center justify-between">
                    <p className="mono-label">{"{ form · alpha-rsvp }"}</p>
                    <span className="mono-tag text-signal">STATUS · OPEN</span>
                  </div>

                  <div>
                    <label className="mono-tag text-muted">FULL NAME · OPTIONAL</label>
                    <input
                      className="input-line mt-2"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ada Lovelace"
                      data-testid="waitlist-name-input"
                    />
                  </div>

                  <div>
                    <label className="mono-tag text-muted">EMAIL · REQUIRED</label>
                    <input
                      type="email"
                      required
                      className="input-line mt-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@studio.com"
                      data-testid="waitlist-email-input"
                    />
                  </div>

                  <div>
                    <label className="mono-tag text-muted">I AM A…</label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`px-3 py-2 mono-tag border transition ${role === r.id ? "bg-signal border-signal text-chalk" : "bg-paper border-ink hover:bg-ink hover:text-chalk"}`}
                          data-testid={`waitlist-role-${r.id}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="border-l-2 border-ink bg-paper pl-4 py-3" data-testid="waitlist-error">
                      <p className="mono-tag text-muted">NOTE</p>
                      <p className="text-sm mt-1 text-ink">{error}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-ink pt-5">
                    <p className="mono-tag text-muted flex-1">ONE EMAIL. NO SPAM. UNSUBSCRIBE WITH A SINGLE KEYSTROKE.</p>
                    <button type="submit" disabled={loading} className="btn-brut justify-center" data-testid="waitlist-submit-btn">
                      {loading ? <><Loader2 size={14} className="animate-spin" /> Reserving…</> : <>Reserve my seat <ArrowUpRight size={14} /></>}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="border border-ink p-8 bg-ink text-chalk shadow-brut" data-testid="waitlist-success">
                  <div className="w-12 h-12 bg-signal text-chalk flex items-center justify-center">
                    <Check size={22} />
                  </div>
                  <p className="mono-label text-faint mt-6">RSVP CONFIRMED</p>
                  <h2 className="font-display text-4xl mt-3 text-chalk">You're in the cohort.</h2>
                  <p className="mt-4 text-faint text-sm">
                    We sent a confirmation to <span className="font-mono text-signal">{email}</span>. When Bracket opens, you'll hear from us before anyone else.
                  </p>
                  {position && (
                    <p className="mono-tag text-signal mt-6">POSITION · #{String(position).padStart(4, "0")}</p>
                  )}
                  <Link
                    to="/how-it-works"
                    className="mt-8 w-full inline-flex items-center justify-center gap-3 px-5 py-4 border border-chalk font-mono uppercase text-[12px] tracking-[0.14em] font-semibold transition"
                    style={{ background: "#ffffff", color: "#0A0A0A", boxShadow: "4px 4px 0 #0033FF" }}
                    data-testid="waitlist-next-cta"
                  >
                    See what's coming →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-b border-ink bg-ink text-chalk">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-14">
            <p className="mono-label text-faint">{"{ why a waitlist }"}</p>
            <h2 className="font-display text-4xl md:text-6xl uppercase mt-4 max-w-4xl">
              We're not shipping fast.
              <br />
              We're shipping <span className="text-signal">right.</span>
            </h2>
            <p className="mt-5 text-faint max-w-2xl">
              Bracket is a way of thinking. Getting that wrong would be worse than not shipping at all. The alpha cohort
              shapes the product with us — then we open it up.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
