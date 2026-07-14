import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
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
  Paperclip,
  Pencil,
  Square,
  CheckSquare,
  Trash2,
  Plus,
  Search,
  FolderOpen,
  Lock,
  CircleDot,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";
import { useDialog } from "../components/Dialog";

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

const STAGE_STYLE = {
  in_progress: { backgroundColor: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--hairline)" },
  locked:      { backgroundColor: "#5E6AD2", color: "#FFFFFF", border: "1px solid #5E6AD2" },
  concerns:    { backgroundColor: "#EF4444", color: "#FFFFFF", border: "1px solid #EF4444" },
  accepted:    { backgroundColor: "#22C55E", color: "#0A0A0C", border: "1px solid #22C55E" },
};
// Stage precedence: client review outcome > locked > in progress.
// "awaiting_reply" / "sent" = waiting on the client → shown as IN PROGRESS.
function projectStage(p) {
  if (p.share_status === "accepted") return { key: "accepted", label: "ACCEPTED" };
  if (p.share_status === "rejected") return { key: "concerns", label: "HAVE CONCERNS" };
  if (p.share_status === "awaiting_reply" || p.share_status === "sent")
    return { key: "in_progress", label: "IN PROGRESS" };
  if (p.status === "locked") return { key: "locked", label: "LOCKED" };
  return { key: "in_progress", label: "IN PROGRESS" };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { prompt: promptDialog, confirm: confirmDialog } = useDialog();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paste, setPaste] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  // ─── Multi-select bulk-delete ─────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = (visibleProjects) => {
    setSelectedIds(new Set(visibleProjects.map((p) => p.id)));
  };
  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = await confirmDialog({
      title: ids.length === 1 ? "Delete 1 project?" : `Delete ${ids.length} projects?`,
      message: "This can't be undone. All associated inputs and generated outputs will be permanently removed.",
      confirmLabel: `Delete ${ids.length}`,
      cancelLabel: "Keep them",
      tone: "danger",
    });
    if (!ok) return;
    setBulkDeleting(true);
    try {
      const { data } = await api.post("/projects/bulk-delete", { ids });
      setProjects((list) => list.filter((p) => !selectedIds.has(p.id)));
      clearSelection();
      toast.success(`Deleted ${data.deleted} project${data.deleted === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBulkDeleting(false);
    }
  };

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

  // Hand off the paste to a new project's Step 1. Backend uses the raw
  // paste to generate a proper AI project title (falls back to the client
  // heuristic if AI generation fails). We stash the paste in sessionStorage
  // so Step 1 can auto-submit on mount.
  const structureBrief = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const derivedName = deriveProjectName(paste);
      const { data } = await api.post("/projects", {
        project_name: derivedName,
        raw_paste: paste,
      });
      try {
        window.sessionStorage.setItem(`bracket:pending-paste:${data.id}`, paste);
      } catch (e) { /* private-mode / quota — Step 1 shows empty input, no crash */ }
      navigate(`/project/${data.id}/flow`);
    } catch (e) {
      toast.error(formatApiError(e));
      setSubmitting(false);
    }
  };

  // ─── FILE UPLOAD BRIEF ────────────────────────────────────────────────
  // Accept PDF / TXT / PNG / JPEG. Backend parses the file, extracts text
  // (or OCRs images via Gemini), and (if the brief has enough info) chains
  // Steps 1-4 in the background. We poll every 3s for up to 3 minutes and
  // land the user on whichever step the pipeline actually reached.
  const handleFileUpload = async (file) => {
    if (!file) return;
    const okTypes = ["application/pdf", "text/plain", "image/png", "image/jpeg", "image/jpg"];
    const okExt = /\.(pdf|txt|png|jpe?g)$/i.test(file.name || "");
    if (!okTypes.includes(file.type) && !okExt) {
      toast.error("Only PDF, TXT, PNG, or JPEG files are supported.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File is too large (max 8 MB).");
      return;
    }
    setUploading(true);
    const toastId = toast.loading("Reading your brief… Bracket is thinking.");
    let projectId = null;
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const { data } = await api.post("/projects/upload-brief", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000,
      });
      projectId = data.id;
      toast.dismiss(toastId);
      // Immediate feedback — the auto-advance runs in the background.
      const pollToast = toast.loading("Brief loaded. Bracket is generating your document…");
      // Poll up to 3 min for the auto-advance to complete.
      const started = Date.now();
      let finalStatus = data.auto_advance_status || "pending";
      while (Date.now() - started < 180000) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const { data: p } = await api.get(`/projects/${projectId}`);
          if (p.auto_advance_status && p.auto_advance_status !== "pending") {
            finalStatus = p.auto_advance_status;
            break;
          }
          if (p.step >= 5) { finalStatus = "advanced"; break; }
        } catch { /* keep polling on transient errors */ }
      }
      toast.dismiss(pollToast);
      if (finalStatus === "advanced") {
        toast.success("Brief complete — jumping to the final step.");
      } else if (finalStatus === "partial") {
        toast.info("Brief mostly ready — finish the last step manually.");
      } else if (finalStatus === "insufficient") {
        toast.info("Brief loaded. Bracket will guide you from Step 1.");
      } else {
        toast.info("Brief loaded — pick up from where Bracket got to.");
      }
      navigate(`/project/${projectId}/flow`);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(formatApiError(e));
      // If the project was created before an error, still land on it.
      if (projectId) navigate(`/project/${projectId}/flow`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Optimistic rename — prompt, PATCH, patch local state on success. Keeps
  // the interaction snappy on the dashboard.
  const renameProject = async (p) => {
    const nextName = await promptDialog({
      title: "Rename project",
      message: "Give this project a clearer name.",
      defaultValue: p.name,
      placeholder: "New project name",
      confirmLabel: "Save",
    });
    const trimmed = (nextName || "").trim();
    if (!trimmed || trimmed === p.name) return;
    try {
      const { data } = await api.patch(`/projects/${p.id}`, { name: trimmed });
      setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, name: data.name } : x)));
      toast.success("Renamed.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Confirm + DELETE. Removes from local list on success.
  const deleteProject = async (p) => {
    const ok = await confirmDialog({
      title: `Delete "${p.name}"?`,
      message: "This can't be undone. All associated inputs and generated outputs will be permanently removed.",
      confirmLabel: "Delete project",
      cancelLabel: "Keep it",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/projects/${p.id}`);
      setProjects((list) => list.filter((x) => x.id !== p.id));
      toast.success("Project deleted.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const applyTemplate = (t) => {
    setPaste(t.paste);
    // Nudge the caret into view without stealing scroll if user is browsing.
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const shouldReduce = useReducedMotion();
  const { user } = useAuth();

  // ─── Search + status filter over the projects list ─────────────────
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");   // all | draft | in_progress | locked

  const stats = useMemo(() => {
    const total = projects.length;
    let inProgress = 0, locked = 0;
    for (const p of projects) {
      if (p.status === "locked") locked += 1;
      else if ((p.step || 1) > 1) inProgress += 1;
    }
    return { total, inProgress, locked, draft: total - inProgress - locked };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "locked") return p.status === "locked";
      if (statusFilter === "in_progress") return p.status !== "locked" && (p.step || 1) > 1;
      if (statusFilter === "draft") return p.status !== "locked" && (p.step || 1) === 1;
      return true;
    });
  }, [projects, query, statusFilter]);

  // Only show the onboarding "examples + what we produce" tiles for
  // brand-new users. Once they have a project, they've seen the goods.
  const hasProjects = !loading && projects.length > 0;

  // Cinematic staggered entry matching Landing/Login.
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: shouldReduce ? 0 : 0.06, delayChildren: 0.04 } },
  };
  const item = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  const greeting = (() => {
    const first = (user?.name || user?.email || "").split(/[ .@]/)[0];
    const h = new Date().getHours();
    const timeOfDay = h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    return first ? `${timeOfDay}, ${first[0].toUpperCase()}${first.slice(1)}.` : `${timeOfDay}.`;
  })();

  const focusComposer = () => {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="dashboard-root relative min-h-full" data-testid="dashboard-page">
      <Seo title="Dashboard" path="/app" noindex />

      {/* Cinematic dark backdrop — dimmer version of the marketing ambient. */}
      <div aria-hidden="true" className="hero-ambient hero-ambient--dashboard" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #08090A 0%, #06070A 55%, #050506 100%)" }}
      />

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="relative max-w-[1440px] w-full mx-auto px-6 sm:px-8 md:px-10 py-6 md:py-8 flex flex-col gap-5 md:gap-6"
      >
        {/* ─── Header — greeting + primary CTA + stats ────────────────── */}
        <motion.header variants={item} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="mono-tag text-muted text-[10px]">DASHBOARD</p>
            <h1 className="mt-1.5 font-display font-semibold tracking-[-0.028em] leading-[1.1] text-[26px] sm:text-[30px] text-[var(--text)]" data-testid="dashboard-greeting">
              {greeting}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--text-3)]">
              {hasProjects
                ? `You have ${stats.total} project${stats.total === 1 ? "" : "s"} · ${stats.locked} locked · ${stats.inProgress} in progress.`
                : "Paste a client conversation and Bracket does the thinking."}
            </p>
          </div>
        </motion.header>

        {/* Stat pills — only show when the user has projects. */}
        {hasProjects && (
          <motion.div variants={item} className="grid grid-cols-3 gap-3" data-testid="dashboard-stats">
            <StatCard label="Total projects" value={stats.total} icon={FolderOpen} accent="var(--text-2)" />
            <StatCard label="In progress" value={stats.inProgress} icon={CircleDot} accent="#7CD5FF" />
            <StatCard label="Locked" value={stats.locked} icon={Lock} accent="#5E6AD2" />
          </motion.div>
        )}

        {/* ─── Composer — always the primary path. Big paste target. ──── */}
        <motion.section variants={item} data-testid="dashboard-composer-section">
          <div className="dashboard-paste-panel liquid-glass relative overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute -top-20 -right-20 h-[220px] w-[220px] rounded-full blur-[80px] opacity-[0.08] pointer-events-none"
              style={{ background: "radial-gradient(closest-side, #5E6AD2, transparent 70%)" }}
            />
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
              className="dashboard-paste-textarea"
              data-testid="dashboard-hero-paste-input"
            />
            <div className="dashboard-paste-footer">
              <div className="text-[11.5px] text-[var(--text-3)] flex items-center gap-3 flex-wrap">
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
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.png,.jpg,.jpeg,application/pdf,text/plain,image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  data-testid="dashboard-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || submitting}
                  className="clay-ghost px-3 py-2 t-tag press inline-flex items-center gap-1.5 disabled:opacity-40"
                  data-testid="dashboard-hero-upload-btn"
                  title="Upload a PDF, TXT, PNG or JPEG brief"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Reading…
                    </>
                  ) : (
                    <>
                      <Paperclip size={12} /> Attach file
                    </>
                  )}
                </button>
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
        </motion.section>

        {/* ─── With projects: projects list. Without: onboarding tiles. ─ */}
        {loading ? (
          <motion.div variants={item} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true" data-testid="dashboard-loading-skeleton">
            {[0, 1, 2].map((i) => (
              <div key={i} className="dashboard-tile p-4">
                <div className="skeleton-bar h-2.5 w-24 rounded" />
                <div className="skeleton-bar h-3 w-1/2 rounded mt-3" />
                <div className="skeleton-bar h-2.5 w-1/3 rounded mt-2" />
              </div>
            ))}
          </motion.div>
        ) : hasProjects ? (
          <>
            {/* Projects list header — search + filter tabs */}
            <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid="dashboard-projects-header">
              <p className="mono-tag text-muted text-[10px]">YOUR PROJECTS · {filteredProjects.length}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="dashboard-search relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    className="dashboard-search-input"
                    data-testid="dashboard-search-input"
                  />
                </div>
                <div className="dashboard-filter-tabs">
                  {[
                    { key: "all", label: "All" },
                    { key: "in_progress", label: "In progress" },
                    { key: "locked", label: "Locked" },
                    { key: "draft", label: "Draft" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatusFilter(f.key)}
                      className={`dashboard-filter-tab ${statusFilter === f.key ? "active" : ""}`}
                      data-testid={`dashboard-filter-${f.key}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div variants={item} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="dashboard-projects-grid">
              {filteredProjects.length === 0 ? (
                <div className="col-span-full dashboard-tile dashboard-tile--empty flex items-center justify-center h-[100px]">
                  <p className="text-[12.5px] text-[var(--text-3)]">No projects match your filters.</p>
                </div>
              ) : (
                <>
                  {/* Selection bar — only appears when at least one project
                     is ticked. Sticks to the top of the grid, offers select-all
                     and a single bulk-delete action. */}
                  {selectedIds.size > 0 && (
                    <div
                      className="col-span-full dashboard-selection-bar"
                      data-testid="dashboard-selection-bar"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          className="dashboard-selection-toggle"
                          onClick={() => {
                            if (selectedIds.size === filteredProjects.length) {
                              clearSelection();
                            } else {
                              selectAllVisible(filteredProjects);
                            }
                          }}
                          data-testid="dashboard-selection-toggle-all"
                          aria-label={selectedIds.size === filteredProjects.length ? "Clear selection" : "Select all"}
                        >
                          {selectedIds.size === filteredProjects.length ? (
                            <CheckSquare size={14} />
                          ) : (
                            <Square size={14} />
                          )}
                          <span>
                            {selectedIds.size === filteredProjects.length
                              ? "All selected"
                              : `${selectedIds.size} selected`}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="dashboard-selection-link"
                          onClick={() => selectAllVisible(filteredProjects)}
                          data-testid="dashboard-selection-select-all"
                        >
                          Select all ({filteredProjects.length})
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={bulkDelete}
                          disabled={bulkDeleting}
                          className="dashboard-selection-danger"
                          data-testid="dashboard-selection-bulk-delete"
                        >
                          {bulkDeleting ? (
                            <><Loader2 size={12} className="animate-spin" /> Deleting…</>
                          ) : (
                            <><Trash2 size={12} /> Delete {selectedIds.size}</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="dashboard-selection-ghost"
                          data-testid="dashboard-selection-clear"
                          aria-label="Cancel selection"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  {filteredProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onRename={renameProject}
                      onDelete={deleteProject}
                      selected={selectedIds.has(p.id)}
                      selectionActive={selectedIds.size > 0}
                      onToggleSelect={() => toggleSelect(p.id)}
                    />
                  ))}
                </>
              )}
            </motion.div>
          </>
        ) : (
          // ─── Empty state (first-time user) — teach the product. ───────
          <>
            <motion.div variants={item} data-testid="dashboard-quickstart-wrap">
              <div className="flex items-baseline justify-between mb-3">
                <p className="mono-tag text-muted text-[10px]">START FROM AN EXAMPLE</p>
                <p className="text-[10.5px] text-[var(--text-3)]">1-click populates the box</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {QUICK_STARTS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="example-card group text-left"
                      data-testid={`dashboard-quickstart-${t.key}`}
                    >
                      <span className="example-card-arrow" aria-hidden="true">
                        <ArrowRight size={11} />
                      </span>
                      <span className="example-card-icon">
                        <Icon size={16} />
                      </span>
                      <p className="mt-3 text-[13.5px] font-medium leading-tight">{t.label}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-3)] leading-snug">{t.kicker}</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div variants={item} data-testid="dashboard-outputs-wrap">
              <div className="flex items-baseline justify-between mb-3">
                <p className="mono-tag text-muted text-[10px]">WHAT BRACKET PRODUCES</p>
                <p className="text-[10.5px] text-[var(--text-3)]">the full client-ready package</p>
              </div>
              <div className="produces-manifest">
                {AI_OUTPUTS.map((o) => {
                  const Icon = o.icon;
                  return (
                    <div key={o.label} className="produces-manifest-row">
                      <span className="produces-manifest-check" aria-hidden="true">
                        <Check size={11} />
                      </span>
                      <Icon size={13} className="text-[var(--text-3)] shrink-0" />
                      <p className="text-[12.5px] font-medium text-[var(--text)]">{o.label}</p>
                      <p className="text-[11px] text-[var(--text-3)] hidden md:block truncate">{o.hint}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </motion.main>
    </div>
  );
}

// ─── Stat pill ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="dashboard-stat-card" data-testid={`dashboard-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between">
        <p className="mono-tag text-muted text-[10px]">{label.toUpperCase()}</p>
        <Icon size={12} style={{ color: accent }} />
      </div>
      <p className="mt-2 font-display font-semibold tracking-[-0.02em] text-[28px] leading-none">{value}</p>
    </div>
  );
}

// ─── Project card — actions ALWAYS visible on the card, no hover trick.
function ProjectCard({ project: p, onRename, onDelete, selected, selectionActive, onToggleSelect }) {
  const isLocked = p.status === "locked";
  const stepPct = Math.round(((p.step || 1) / 5) * 100);
  const stage = projectStage(p);
  return (
    <div
      className={`dashboard-project-card relative ${selected ? "is-selected" : ""} ${selectionActive ? "is-selection-active" : ""}`}
      data-testid={`dashboard-recent-${p.id}`}
    >
      {/* Selection checkbox — always visible on hover, always visible once
         selection mode is active (any card ticked). Clicking the checkbox
         toggles selection without navigating. */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect?.(); }}
        className="dashboard-project-checkbox"
        aria-label={selected ? "Unselect project" : "Select project"}
        aria-pressed={selected}
        data-testid={`dashboard-recent-select-${p.id}`}
      >
        {selected ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>
      <Link to={`/project/${p.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-[14px] leading-snug line-clamp-2 flex-1">{p.name}</p>
          <span
            className="mono-tag px-1.5 py-0.5 rounded shrink-0 text-[9.5px]"
            style={STAGE_STYLE[stage.key]}
            data-testid={`dashboard-stage-${p.id}`}
          >
            {stage.label}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
          <span>Step {p.step || 1} / 5</span>
          <span>·</span>
          <span>{formatDate(p.updated_at)}</span>
        </div>
        <div className="mt-3 h-[3px] bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${stepPct}%`,
              background: isLocked
                ? "linear-gradient(90deg, #5E6AD2, #7CD5FF)"
                : "linear-gradient(90deg, var(--text-2), var(--text-3))",
            }}
          />
        </div>
      </Link>
      <div className="dashboard-project-actions" data-testid={`dashboard-project-actions-${p.id}`}>
        <Link
          to={`/project/${p.id}`}
          className="dashboard-project-action"
          title="Open project"
          data-testid={`dashboard-open-${p.id}`}
          aria-label="Open project"
        >
          <ArrowRight size={12} /> Open
        </Link>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRename(p); }}
          className="dashboard-project-action dashboard-project-action--icon"
          title="Rename"
          aria-label="Rename project"
          data-testid={`dashboard-recent-rename-${p.id}`}
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(p); }}
          className="dashboard-project-action dashboard-project-action--icon dashboard-project-action--danger"
          title="Delete"
          aria-label="Delete project"
          data-testid={`dashboard-recent-delete-${p.id}`}
        >
          <Trash2 size={12} />
        </button>
      </div>
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
