import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Share, PlusSquare, Download } from "lucide-react";
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
export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (!window.matchMedia("(max-width: 768px)").matches) return;

    if (isIOS()) {
      setIos(true);
      const t = setTimeout(() => setVisible(true), 1600);
      return () => clearTimeout(t);
    }

    const onBIP = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

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
        <ol className="install-prompt-steps" data-testid="install-prompt-ios-steps">
          <li>
            <Share size={14} className="text-signal shrink-0" />
            Tap the <strong>Share</strong> button below
          </li>
          <li>
            <PlusSquare size={14} className="text-signal shrink-0" />
            Choose <strong>Add to Home Screen</strong>
          </li>
        </ol>
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
