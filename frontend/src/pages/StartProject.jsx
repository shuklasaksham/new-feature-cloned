import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Loader2, Clock } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { api, formatApiError } from "../lib/api";

export default function StartProject() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedProjects, setSavedProjects] = useState([]); // returning-user list
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupTimer = useRef(null);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((val || "").trim());

  // Debounced lookup of saved projects when the email looks valid.
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!validateEmail(email)) {
      setSavedProjects([]);
      return;
    }
    lookupTimer.current = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const { data } = await api.get("/projects/by-email", {
          params: { email: email.trim().toLowerCase() },
        });
        setSavedProjects(Array.isArray(data) ? data : []);
      } catch {
        setSavedProjects([]);
      } finally {
        setLookupLoading(false);
      }
    }, 500);
    return () => lookupTimer.current && clearTimeout(lookupTimer.current);
  }, [email]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Tell us your name — first or full, your call.");
    if (!validateEmail(email)) return setError("That email doesn't look right. Try a real one.");
    if (!projectName.trim()) return setError("Name the project — you'll see it again if you come back.");
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/projects", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        project_name: projectName.trim(),
      });
      navigate(`/project/${data.id}`);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col" data-testid="start-page">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-ink blueprint-bg">
          <div className="max-w-[1100px] mx-auto px-5 sm:px-6 md:px-10 py-12 md:py-20 grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-7">
              <p className="mono-label flex items-center gap-3">
                <span className="dot-live" />
                START A PROJECT
              </p>
              <h1 className="font-display text-[44px] sm:text-[64px] md:text-[88px] lg:text-[104px] uppercase mt-6 leading-[0.9]">
                A senior brain.
                <br />
                <span className="text-signal">Two minutes</span> from now.
              </h1>
              <p className="mt-6 text-muted max-w-xl text-base md:text-lg">
                No account. No payment. Just tell us who you are and name your project — Bracket
                walks you through five steps and hands back artifacts you can send today.
              </p>

              <div className="mt-8 grid sm:grid-cols-3 gap-0 border border-ink max-w-2xl">
                {[
                  ["FREE", "During early access."],
                  ["NO ACCOUNT", "Skip the login dance."],
                  ["FIVE STEPS", "Roughly two minutes per."],
                ].map(([t, c], i) => (
                  <div
                    key={t}
                    className={`p-4 bg-chalk ${i < 2 ? "sm:border-r border-ink" : ""} ${i < 2 ? "border-b sm:border-b-0 border-ink" : ""}`}
                  >
                    <p className="mono-tag text-signal">{t}</p>
                    <p className="text-sm mt-2">{c}</p>
                  </div>
                ))}
              </div>

              <p className="mono-tag text-muted mt-8">
                COME BACK ANYTIME · USE THE SAME EMAIL TO PICK UP WHERE YOU LEFT OFF.
              </p>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <form
                onSubmit={submit}
                noValidate
                className="card-brut p-5 sm:p-6 md:p-8 space-y-6"
                data-testid="start-form"
              >
                <div className="flex items-center justify-between">
                  <p className="mono-label">{"{ form · new project }"}</p>
                  <span className="mono-tag text-signal">FREE</span>
                </div>

                <div>
                  <label className="mono-tag text-muted">YOUR NAME · REQUIRED</label>
                  <input
                    className="input-line mt-2"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="e.g. Ada Lovelace"
                    data-testid="start-name-input"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mono-tag text-muted">EMAIL · REQUIRED</label>
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    className="input-line mt-2"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@studio.com"
                    data-testid="start-email-input"
                  />
                </div>

                {(savedProjects.length > 0 || lookupLoading) && (
                  <div className="border border-ink bg-chalk -mx-1 sm:mx-0" data-testid="saved-projects-panel">
                    <div className="px-4 py-3 border-b border-ink bg-paper flex items-center justify-between gap-3">
                      <p className="mono-tag text-signal">
                        {lookupLoading
                          ? "LOOKING UP…"
                          : `WELCOME BACK · ${savedProjects.length} SAVED PROJECT${savedProjects.length === 1 ? "" : "S"}`}
                      </p>
                    </div>
                    {!lookupLoading && (
                      <ul className="max-h-48 overflow-y-auto divide-y divide-ink">
                        {savedProjects.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => navigate(`/project/${p.id}`)}
                              className="w-full text-left px-4 py-3 hover:bg-paper flex items-center justify-between gap-3 group"
                              data-testid={`saved-project-${p.id}`}
                            >
                              <div className="min-w-0">
                                <p className="font-display text-base truncate">{p.name}</p>
                                <p className="mono-tag text-muted mt-1 flex items-center gap-2">
                                  <Clock size={10} />
                                  <span>STEP {p.step} / 5 · {p.status.toUpperCase()}</span>
                                </p>
                              </div>
                              <ArrowRight
                                size={14}
                                className="shrink-0 group-hover:translate-x-1 transition-transform"
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div>
                  <label className="mono-tag text-muted">PROJECT NAME · REQUIRED</label>
                  <input
                    className="input-line mt-2"
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="e.g. Acme rebrand · landing"
                    data-testid="start-project-name-input"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3"
                    data-testid="start-error"
                  >
                    <span
                      aria-hidden
                      className="mt-[2px] font-mono text-signal text-[11px] tracking-[0.22em] font-semibold select-none"
                    >
                      {"{ ! }"}
                    </span>
                    <p className="text-sm text-ink leading-snug">{error}</p>
                  </div>
                )}

                <div className="border-t border-ink pt-5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-brut w-full justify-center"
                    data-testid="start-submit-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Starting…
                      </>
                    ) : (
                      <>
                        Start the project <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                  <p className="mono-tag text-muted mt-3">
                    BY STARTING, YOU AGREE WE'LL EMAIL YOU ONCE — A SHORT THANK-YOU.
                  </p>
                </div>
              </form>

              <p className="mono-tag text-muted mt-4">
                ALREADY KNOW THE FLOW?{" "}
                <Link to="/how-it-works" className="link-u text-ink">
                  See the five steps →
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
