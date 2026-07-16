import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Share, PlusSquare, Download, Check } from "lucide-react";
import BracketMark from "./BracketMark";

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

/**
 * InstallPrompt — "Install Bracket" popup shown on every page load on phones
 * (no dismissal persistence, per product spec). Android/Chrome: triggers the
 * native install prompt via the captured `beforeinstallprompt` event. iOS
 * Safari can't install programmatically, so we show the 2-step instructions.
 */
const IOS_GUIDE_KEY = "bracket.ios.installed";

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (!window.matchMedia("(max-width: 768px)").matches) return;

    let cancelled = false;
    (async () => {
      // Chrome/Android: skip when the app is already installed on the device.
      try {
        if (navigator.getInstalledRelatedApps) {
          const apps = await navigator.getInstalledRelatedApps();
          if (apps && apps.length > 0) return;
        }
      } catch { /* unsupported — fall through */ }
      if (cancelled) return;

      if (isIOS()) {
        // iOS gives browsers NO installed-state API. Once the user has been
        // through the install guide, assume installed and stop nagging.
        if (localStorage.getItem(IOS_GUIDE_KEY) === "1") return;
        setIos(true);
        setTimeout(() => { if (!cancelled) setVisible(true); }, 1600);
        return;
      }

      const onBIP = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisible(true);
      };
      // `beforeinstallprompt` only fires when the app is NOT installed —
      // installed Android devices never see this popup.
      window.addEventListener("beforeinstallprompt", onBIP);
    })();
    return () => { cancelled = true; };
  }, []);

  const openIosGuide = () => {
    setIosGuide(true);
    try { localStorage.setItem(IOS_GUIDE_KEY, "1"); } catch { /* ignore */ }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setVisible(false);
    } catch { /* ignore */ }
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return createPortal(
    <div className="install-prompt" role="dialog" aria-label="Install Bracket" data-testid="install-prompt">
      <button
        type="button"
        className="install-prompt-close"
        onClick={() => setVisible(false)}
        aria-label="Not now"
        data-testid="install-prompt-close"
      >
        <X size={15} />
      </button>
      <div className="install-prompt-row">
        <span className="install-prompt-icon" aria-hidden="true">
          <BracketMark size={22} />
        </span>
        <div className="min-w-0">
          <p className="install-prompt-title">Install Bracket</p>
          <p className="install-prompt-sub">
            Full-screen, on your home screen — like a real app.
          </p>
        </div>
      </div>
      {ios ? (
        iosGuide ? (
          <div data-testid="install-prompt-ios-steps">
            <ol className="install-prompt-steps install-prompt-steps--big">
              <li>
                <span className="install-step-num">1</span>
                <span className="install-step-icon"><Share size={16} /></span>
                Tap the <strong>Share</strong> button in your browser bar
              </li>
              <li>
                <span className="install-step-num">2</span>
                <span className="install-step-icon"><PlusSquare size={16} /></span>
                Scroll and tap <strong>Add to Home Screen</strong>
              </li>
              <li>
                <span className="install-step-num">3</span>
                <span className="install-step-icon"><Check size={16} /></span>
                Tap <strong>Add</strong> — Bracket appears on your home screen
              </li>
            </ol>
            <p className="install-prompt-note">
              Apple only allows installing from the Share menu — no site can skip these steps.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={openIosGuide}
            className="install-prompt-cta"
            data-testid="install-prompt-install-btn"
          >
            <Download size={14} /> Install app
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={install}
          className="install-prompt-cta"
          data-testid="install-prompt-install-btn"
        >
          <Download size={14} /> Install app
        </button>
      )}
    </div>,
    document.body
  );
}
