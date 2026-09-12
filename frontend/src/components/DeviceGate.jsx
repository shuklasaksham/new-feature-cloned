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

export default function DeviceGate({ children }) {
  const [blocked, setBlocked] = useState(computeBlocked);

  useEffect(() => {
    const onResize = () => setBlocked(computeBlocked());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  if (!blocked) return children;

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
