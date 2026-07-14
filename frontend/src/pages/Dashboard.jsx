import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUp,
  Loader2,
  Check,
  Layers,
  ListChecks,
  CalendarRange,
  AlertTriangle,
  ScrollText,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import Seo from "../components/Seo";

// Quick-start seed briefs — one click drops a realistic messy paste in the
// hero input so a curious user can watch Bracket work without typing a word.
const QUICK_STARTS = [
  {
    key: "saas-landing",
    label: "SaaS Landing Page",
    kicker: "Fintech · 3-week launch",
    icon: Layers,
    paste:
`Hey — we finally got the greenlight to redo our landing page. Founder here is Ankit.

We've been sending you Stripe and Linear as references but honestly our product is way more technical — it's treasury management for startup CFOs. Also budget is 80k INR and we need it in 3 weeks max because we launch on Nov 15.

One thing that has us worried — the current site converts at 0.4% and our sales team is very sensitive about anything they think might hurt demo bookings.

Quick side question — should we do a full brand refresh in the same sprint or is that a separate scope? Let me know if you need anything else!

— Ankit`,
  },
  {
    key: "mobile-app",
    label: "Mobile App Design",
    kicker: "Consumer · MVP scope",
    icon: Layers,
    paste:
`Meeting notes // Kickoff for the Loop mobile app

Founder (Priya) wants a v1 iOS app in 8 weeks. Target: gen-Z, 18-24, urban India. Habit tracking + streaks + a very light social feed. She keeps oscillating between "TikTok simple" and "Notion power-user" for the UX.

Team: solo iOS dev, no designer in-house. She'd want us to hand off Figma + a small motion prototype for onboarding. Budget flexible-ish, around 2.5L INR total.

Big open question: should there be a web mirror on day 1? Investors have been asking, but the dev capacity says no. Priya wants my read.

Also — no clear stance yet on whether we launch with premium tier from day 1 or free-only for 6 months.`,
  },
  {
    key: "website-redesign",
    label: "Website Redesign",
    kicker: "B2B · Site refresh",
    icon: Layers,
    paste:
`Hi! We're a 40-person B2B analytics company (Series B, based in Austin). Our current marketing site was built 3 years ago by our first designer who's since left. It looks dated and honestly doesn't convert.

What we know: we want to redesign the site (10-12 pages), migrate to a new CMS (Webflow ideally), and get it live before our sales kickoff on Jan 15. Budget is $18-22k.

What we don't know: whether we should refresh the whole brand (colors, type, illustration) at the same time or keep the current identity. Our head of marketing wants a full refresh; our CEO wants "just make it look modern."

Also unclear: how much SEO work is in scope. We rank well on 3 pages we don't want to break during migration.`,
  },
  {
    key: "brand-identity",
    label: "Brand Identity",
    kicker: "D2C · Naming + logo",
    icon: Layers,
    paste:
`Meeting notes // Loop Coffee brand kickoff

Priya (solo founder, ex-restaurant, launching 2 blends first) wants:
— brand naming + logo
— packaging: pouch + label
— IG launch kit (10-15 posts)

Budget: 1.2L INR, timeline flexible-ish, needs to be ready before Diwali (early Nov).

References she loves: Blue Tokai for the design language, Third Wave for the tone, "but different" — honestly not sure what she means yet.

She keeps flipping between "premium" (matte, gold foil, coffee-nerdy) and "approachable" (playful, lifestyle, mass appeal). Last meeting she said both in the same sentence.

My worry: 1.2L is tight for full naming + brand + packaging + launch kit. And she has strong opinions but hasn't defined a clear customer or price point yet.`,
  },
  {
    key: "discovery-workshop",
    label: "Discovery Workshop",
    kicker: "Enterprise · Pre-project",
    icon: Layers,
    paste:
`We're a mid-size healthcare SaaS (~250 employees) and we've been running the same UX for our provider dashboard for 4 years. Complaints from customers are compounding but every internal proposal to "fix it" has been shot down as too big.

We'd like to run a discovery workshop with our head of product, 2 PMs, our data lead, and 2 customer-success folks. Goal: leave the room with (a) a shared read of what's actually broken, (b) 3 prioritized bets, (c) rough sizing so I can pitch a Q1 project internally.

Timeline: within the next 3 weeks. Budget for workshop + light output doc: $6-8k.

Concerns: our head of product is opinionated and tends to dominate rooms. I want the workshop format to give the CS folks equal air.`,
  },
];

const AI_OUTPUTS = [
  { icon: ListChecks,   label: "Scope",             hint: "in / out / deliverables" },
  { icon: Layers,       label: "Deliverables",      hint: "sized + owned" },
  { icon: CalendarRange,label: "Timeline",          hint: "sprints + milestones" },
  { icon: AlertTriangle,label: "Risks",             hint: "before your client sees them" },
  { icon: Check,        label: "Decisions",         hint: "with rationale + trade-offs" },
  { icon: ScrollText,   label: "Client-ready docs", hint: "sign-off + PDF" },
];

const RECENT_STATUS_STYLE = {
  draft:       { backgroundColor: "transparent",         color: "var(--text-2)", border: "1px solid var(--hairline)" },
  in_progress: { backgroundColor: "var(--surface-2)",    color: "var(--text)",   border: "1px solid var(--hairline)" },
  locked:      { backgroundColor: "#2E5BFF",             color: "#FFFFFF",       border: "1px solid #2E5BFF" },
};
const RECENT_STATUS_LABEL = { draft: "DRAFT", in_progress: "IN PROGRESS", locked: "LOCKED" };

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paste, setPaste] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/projects");
        setProjects(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-focus the hero paste box after mount (unless the user hovered a
  // project card first — we don't want to hijack focus if they're navigating).
  useEffect(() => {
    const t = setTimeout(() => {
      if (inputRef.current && !document.activeElement?.closest?.("a,button,textarea,input")) {
        inputRef.current.focus();
      }
    }, 260);
    return () => clearTimeout(t);
  }, []);

  const wordCount = paste.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = paste.trim().length >= 20 && !submitting;

  // Hand off the paste to a new project's Step 1. We stash the paste in
  // sessionStorage keyed by project id so Step 1 can hydrate it on mount
  // (avoids URL length limits + accidental sharing of pastes via link).
  const structureBrief = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const derivedName = deriveProjectName(paste);
      const { data } = await api.post("/projects", { project_name: derivedName });
      try {
        window.sessionStorage.setItem(`bracket:pending-paste:${data.id}`, paste);
      } catch (e) { /* private-mode / quota — Step 1 shows empty input, no crash */ }
      navigate(`/project/${data.id}/flow`);
    } catch (e) {
      toast.error(formatApiError(e));
      setSubmitting(false);
    }
  };

  const applyTemplate = (t) => {
    setPaste(t.paste);
    // Nudge the caret into view without stealing scroll if user is browsing.
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  return (
    <div className="h-full flex flex-col" data-testid="dashboard-page">
      <Seo title="Dashboard" path="/app" noindex />
      <main className="flex-1 max-w-[1080px] w-full mx-auto px-6 sm:px-8 md:px-10 py-6 md:py-8 page-enter flex flex-col justify-center min-h-0">
        {/* Hero */}
        <div className="text-center">
          <span className="section-label"><span className="dot" />Client Operating System</span>
          <h1
            className="mt-3 font-display font-semibold tracking-[-0.03em] leading-[1.05] text-[30px] sm:text-[38px] md:text-[44px]"
            data-testid="dashboard-hero-headline"
          >
            Turn messy client conversations<br className="hidden sm:block" /> into client-ready projects.
          </h1>
          <p className="mt-3 max-w-[620px] mx-auto text-[13px] sm:text-sm text-[var(--text-2)] leading-relaxed">
            Paste an email, WhatsApp chat, meeting notes, or a brief. Bracket generates scope,
            deliverables, timelines, risks, and documentation — the whole client-ready package.
          </p>
        </div>

        {/* Hero input — the ONE primary action */}
        <div className="mt-5 relative" data-testid="dashboard-hero-input-wrap">
          <div className="hero-input relative">
            <textarea
              ref={inputRef}
              rows={3}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  structureBrief();
                }
              }}
              placeholder={"Paste your client's message here… An email. A WhatsApp thread. Kickoff notes. Whatever they sent you — Bracket reads the mess."}
              className="hero-input-textarea"
              data-testid="dashboard-hero-paste-input"
            />
            <div className="hero-input-footer">
              <div className="text-xs text-[var(--text-3)] flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardPaste size={12} /> Paste anything
                </span>
                {paste.trim() && (
                  <span data-testid="dashboard-hero-word-count">
                    {wordCount} word{wordCount === 1 ? "" : "s"}
                  </span>
                )}
                <span className="hidden md:inline text-[var(--text-3)]">
                  <kbd className="mono-tag px-1.5 py-0.5 rounded border border-[var(--hairline)]">⌘↵</kbd> to structure
                </span>
              </div>
              <button
                type="button"
                onClick={structureBrief}
                disabled={!canSubmit}
                className="clay-signal px-4 py-2 t-tag press inline-flex items-center gap-2 disabled:opacity-40"
                data-testid="dashboard-hero-structure-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Setting up…
                  </>
                ) : (
                  <>
                    Structure this brief <ArrowUp size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick-start briefs */}
        <div className="mt-5" data-testid="dashboard-quickstart-wrap">
          <div className="flex items-baseline justify-between mb-2">
            <p className="mono-label text-[var(--text-3)]">
              <span className="dot" /> Or start from an example
            </p>
            <p className="text-[11px] text-[var(--text-3)] hidden sm:block">1-click populates the box</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {QUICK_STARTS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="quickstart-card quickstart-card--compact group text-left"
                  data-testid={`dashboard-quickstart-${t.key}`}
                >
                  <Icon size={13} className="text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors" />
                  <p className="mt-2 text-[13px] font-medium leading-tight">{t.label}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-3)] leading-snug">{t.kicker}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI output preview — sets expectation of what Bracket produces */}
        <div className="mt-5" data-testid="dashboard-outputs-wrap">
          <p className="mono-label text-[var(--text-3)] mb-2">
            <span className="dot" /> Bracket produces
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {AI_OUTPUTS.map((o) => {
              const Icon = o.icon;
              return (
                <div key={o.label} className="output-preview-card output-preview-card--compact">
                  <Icon size={13} className="text-[var(--accent)]" />
                  <p className="mt-1.5 text-[13px] font-medium leading-tight">{o.label}</p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--text-3)] leading-snug">{o.hint}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent projects — only if any exist. Deliberately understated. */}
        {loading ? (
          <div
            className="mt-5 grid sm:grid-cols-2 gap-2.5"
            data-testid="dashboard-loading-skeleton"
            aria-busy="true"
          >
            {[0, 1].map((i) => (
              <div key={i} className="card-brut p-3">
                <div className="skeleton-bar h-2.5 w-24 rounded" />
                <div className="skeleton-bar h-3 w-1/2 rounded mt-2" />
                <div className="skeleton-bar h-2.5 w-1/3 rounded mt-2" />
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="mt-5" data-testid="dashboard-recent-wrap">
            <div className="flex items-baseline justify-between mb-2">
              <p className="mono-label text-[var(--text-3)]">
                <span className="dot" /> Recent · {projects.length}
              </p>
              <Link
                to="/app/projects"
                className="text-[11px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
                data-testid="dashboard-recent-view-all"
              >
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5" data-testid="dashboard-recent-list">
              {projects.slice(0, 2).map((p) => {
                const isLocked = p.status === "locked";
                const stepPct = Math.round(((p.step || 1) / 5) * 100);
                return (
                  <Link
                    key={p.id}
                    to={`/project/${p.id}`}
                    className="recent-card recent-card--compact group"
                    data-testid={`dashboard-recent-${p.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-[13px] truncate flex-1">{p.name}</p>
                      <span
                        className="mono-tag px-1.5 py-0.5 rounded shrink-0 text-[10px]"
                        style={RECENT_STATUS_STYLE[p.status] || RECENT_STATUS_STYLE.draft}
                      >
                        {RECENT_STATUS_LABEL[p.status] || "DRAFT"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
                      <span>Step {p.step || 1} / 5</span>
                      <span>·</span>
                      <span>{formatDate(p.updated_at)}</span>
                      <span className="ml-auto text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                        Resume <ArrowRight size={10}/>
                      </span>
                    </div>
                    <div className="mt-2 h-[2px] bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${stepPct}%`, backgroundColor: isLocked ? "#2E5BFF" : "var(--text-2)" }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

// ---- helpers ----

// Derive a short project name from the first ~5 meaningful words of the paste.
// Falls back to a timestamped default. Keeps the sidebar list readable.
function deriveProjectName(paste) {
  const cleaned = paste
    .replace(/^(hey|hi|hello|dear)[,!.\s]+/i, "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  const first = cleaned.split(/\s+/).slice(0, 6).join(" ");
  if (first.length >= 8) {
    // Trim to a natural word boundary, cap at 60 chars.
    return (first.length > 60 ? first.slice(0, 57).trimEnd() + "…" : first);
  }
  const d = new Date();
  return `Client brief · ${d.toLocaleString("en", { month: "short", day: "numeric" })}`;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
