import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "../lib/api";
import { PROVIDER_META } from "../lib/providersMeta";
import Seo from "../components/Seo";
import ParticleField from "../components/ParticleField";
import OnboardingTour from "../components/OnboardingTour";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";
const MONO = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" };

const CARDS = [
  { key: "gmail", title: "Gmail", desc: "Connect a client email conversation", Icon: GmailIcon },
  { key: "slack", title: "Slack", desc: "Connect a project channel", Icon: SlackIcon },
  { key: "figma", title: "Figma", desc: "Connect a project file", Icon: FigmaIcon },
  { key: "github", title: "GitHub", desc: "Connect a repository", Icon: GithubIcon },
];

export default function FirstProject() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState({}); // key -> status
  const [busy, setBusy] = useState(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const pendingOAuth = useRef(null);
  const popupRef = useRef(null);

  const openDemo = async () => {
    setDemoBusy(true);
    try {
      const { data } = await api.post("/demo/open");
      if (data?.project_id) navigate(`/project/${data.project_id}`);
      else throw new Error();
    } catch (e) {
      toast.error(formatApiError(e) || "Couldn't open the demo — please try again.");
      setDemoBusy(false);
    }
  };

  const loadProviders = async () => {
    try {
      const { data } = await api.get("/connect/providers");
      const map = {};
      (data.providers || []).forEach((p) => { map[p.key] = p.status; });
      setStatuses(map);
      return map;
    } catch {
      return {};
    }
  };
  useEffect(() => { loadProviders(); }, []);

  // OAuth popup completion — the callback posts "bracket-oauth:{key}:{ok|error}"
  useEffect(() => {
    const onMsg = (e) => {
      if (typeof e.data !== "string" || !e.data.startsWith("bracket-oauth:")) return;
      const [, key, result] = e.data.split(":");
      pendingOAuth.current = null;
      setBusy(null);
      if (result === "ok") {
        toast.success(`${PROVIDER_META[key]?.label || key} connected.`);
        navigate(`/welcome/select?tool=${key}`);
      } else {
        toast.error("Authorization didn't complete — please try again.");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async (card) => {
    const status = statuses[card.key];
    if (status === "connected") { navigate(`/welcome/select?tool=${card.key}`); return; }
    if (status === "setup_required") {
      toast.info(`${card.title} isn't enabled yet — it needs one-time admin configuration.`);
      return;
    }
    // One-click OAuth: open popup synchronously (popup-blocker safe), then aim it.
    const popup = window.open("about:blank", "bracket-oauth", "width=560,height=680");
    popupRef.current = popup;
    pendingOAuth.current = card.key;
    setBusy(card.key);
    // Fallback: on live the app + popup can be on different origins, so the
    // callback's postMessage may never reach us. Watch for the popup closing
    // and VERIFY the connection directly — then proceed like the success path.
    const watch = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        clearInterval(watch);
        if (pendingOAuth.current === card.key) {
          pendingOAuth.current = null;
          api.get(`/connect/${card.key}/sources`)
            .then(() => { setBusy(null); navigate(`/welcome/select?tool=${card.key}`); })
            .catch(() => { setBusy(null); });
        }
      }
    }, 600);
    try {
      const { data } = await api.get(`/connect/${card.key}/auth-url`);
      if (popup) popup.location = data.url;
      else window.open(data.url, "_blank");
    } catch (e) {
      clearInterval(watch);
      pendingOAuth.current = null;
      if (popup) popup.close();
      setBusy(null);
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#000" }} data-testid="first-project-page">
      <Seo title="Bring your first project into Bracket" path="/welcome" noindex />
      <OnboardingTour />

      {/* LEFT — content */}
      <div className="relative flex flex-col justify-center w-full lg:w-[54%] xl:w-[52%] px-7 sm:px-14 lg:px-16 xl:px-20 py-10">
        <div className="max-w-[820px] w-full page-enter">
          <img src={BRACKET_LOGO} alt="Bracket" width={52} height={52} style={{ display: "block" }} />
          <h1 className="mt-6 font-display font-semibold tracking-[-0.025em] text-[34px] sm:text-[40px] leading-[1.05] xl:whitespace-nowrap" style={{ color: "#fff" }}>
            Bring your first project into bracket
          </h1>
          <p className="mt-3 text-[13px]" style={{ ...MONO, color: "#7a7a7a" }}>
            Connect where the conversation is already happening.
          </p>

          <button
            type="button"
            onClick={openDemo}
            disabled={demoBusy}
            className="demo-choice group mt-8 text-left w-full flex items-center gap-4 px-5 py-4 transition-colors disabled:opacity-60"
            data-testid="first-project-demo"
          >
            <span className="shrink-0 inline-flex items-center justify-center demo-choice-icon" style={{ width: 40, height: 40 }}>
              {demoBusy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={20} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="block font-display font-semibold text-[18px] tracking-[-0.01em]" style={{ color: "#fff" }}>Try a demo workspace</span>
                <span className="demo-choice-badge">Recommended</span>
              </span>
              <span className="block mt-0.5 text-[12.5px]" style={{ ...MONO, color: "#9a9a9a" }}>
                Experience Bracket with a fictional project. No integrations required.
              </span>
            </span>
            <span className="shrink-0" style={{ color: "#ba9" }} aria-hidden="true">
              <ArrowRight size={18} className="first-project-arrow" />
            </span>
          </button>

          <div className="mt-8 mb-1 flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: "#1e1e1e" }} />
            <span className="text-[11px]" style={{ ...MONO, color: "#6a6a6a", letterSpacing: "0.14em" }}>OR CONNECT MY BUSINESS</span>
            <span className="h-px flex-1" style={{ background: "#1e1e1e" }} />
          </div>

          <div className="mt-5 flex flex-col gap-4 max-w-[600px]">
            {CARDS.map(({ key, title, desc, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => pick({ key, title })}
                disabled={busy === key}
                className="first-project-card group text-left w-full flex items-center gap-4 px-5 py-4 transition-colors disabled:opacity-60"
                style={{ background: "#0a0a0a", border: "1px solid #242424", borderRadius: 14 }}
                data-testid={`first-project-${key}`}
              >
                <span className="shrink-0 inline-flex items-center justify-center" style={{ width: 40, height: 40 }}>
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold text-[18px] tracking-[-0.01em]" style={{ color: "#fff" }}>{title}</span>
                  <span className="block mt-0.5 text-[12.5px]" style={{ ...MONO, color: "#7f7f7f" }}>{desc}</span>
                </span>
                <span className="shrink-0" style={{ color: "#5f5f5f" }} aria-hidden="true">
                  {busy === key ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={18} className="first-project-arrow" />}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate("/app")}
            className="mt-8 inline-flex items-center gap-2 text-[13px] transition-colors"
            style={{ ...MONO, color: "#8a8a8a" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#8a8a8a"; }}
            data-testid="first-project-back"
          >
            <ArrowLeft size={15} /> Back
          </button>
        </div>
      </div>

      {/* RIGHT — animated particle field */}
      <div className="hidden lg:block relative flex-1 overflow-hidden fade-in" style={{ background: "#000" }} aria-hidden="true" data-testid="first-project-visual">
        <ParticleField />
        <div className="absolute inset-y-0 left-0 w-1/4" style={{ background: "linear-gradient(to right, #000 0%, transparent 100%)" }} />
      </div>
    </div>
  );
}

/* ── Authentic multicolor brand marks ─────────────────────────────── */
function GmailIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block" }}>
      <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
      <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
      <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
      <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z" />
      <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 122.8 122.8" aria-hidden="true" style={{ display: "block" }}>
      <path fill="#e01e5a" d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" />
      <path fill="#36c5f0" d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" />
      <path fill="#2eb67d" d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" />
      <path fill="#ecb22e" d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" />
    </svg>
  );
}

function FigmaIcon() {
  return (
    <svg width="24" height="36" viewBox="0 0 38 57" aria-hidden="true" style={{ display: "block" }}>
      <path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
      <path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
      <path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
      <path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
      <path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path fill="#f5f5f5" d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}
