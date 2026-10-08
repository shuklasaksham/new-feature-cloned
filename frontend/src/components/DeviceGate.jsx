import React, { useEffect, useState } from "react";

const BRACKET_LOGO =
  "https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/jl2k3bid_new-logo-1.png";

// Bracket is a dense, keyboard-driven desktop workspace. Phones and tablets
// (including landscape) are blocked with a friendly "continue on desktop"
// screen. Desktop = fine pointer + width ≥ 1024px.
function computeBlocked() {
  if (typeof window === "undefined") return false;
  // Touch devices (phones + tablets, incl. landscape) have a coarse pointer.
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle|PlayBook|BlackBerry|Opera Mini|IEMobile/i.test(
    navigator.userAgent || ""
  );
  // A real desktop keeps a FINE pointer even under heavy OS/browser scaling
  // (e.g. a 1366px laptop at 150% → ~910 CSS px), so we never block on width
  // alone — only a genuinely tiny window is caught as a fallback.
  const tiny = window.innerWidth < 768;
  return Boolean(coarse || uaMobile || tiny);
}

// Public, fully-responsive marketing pages are allowed on any device; only the
// dense desktop workspace is gated.
const MARKETING_PATHS = new Set(["/", "/pricing", "/privacy", "/terms", "/security", "/use-cases", "/changelog", "/about", "/contact"]);
function isMarketingPath() {
  if (typeof window === "undefined") return false;
  return MARKETING_PATHS.has(window.location.pathname);
}

export default function DeviceGate({ children }) {
  const [blocked, setBlocked] = useState(computeBlocked);
  const [marketing, setMarketing] = useState(isMarketingPath);

  useEffect(() => {
    const onResize = () => setBlocked(computeBlocked());
    const onNav = () => setMarketing(isMarketingPath());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("popstate", onNav);
    // react-router uses history.pushState (no popstate) — patch to emit nav events.
    const origPush = window.history.pushState;
    window.history.pushState = function (...args) {
      const r = origPush.apply(this, args);
      onNav();
      return r;
    };
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("popstate", onNav);
      window.history.pushState = origPush;
    };
  }, []);

  if (!blocked || marketing) return children;

  return (
    <div className="device-gate" data-testid="device-gate">
      <div className="device-gate-card">
        <img src={BRACKET_LOGO} alt="Bracket" className="device-gate-logo" />
        <h1 className="device-gate-title">Bracket is built for desktop</h1>
        <p className="device-gate-copy">
          Bracket is a dense, keyboard-driven workspace for managing client
          projects. It isn't available on phones or tablets yet — please open{" "}
          <strong>bracket</strong> on a laptop or desktop computer to continue.
        </p>
        <p className="device-gate-url">use-bracket.com</p>
      </div>
    </div>
  );
}
