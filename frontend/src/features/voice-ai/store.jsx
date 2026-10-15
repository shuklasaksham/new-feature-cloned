// Voice AI workspace state + feature-local toasts, shared by every Voice AI page.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { voiceApi, formatApiError } from "./api";
import Icon from "./components/Icon";

const Ctx = createContext(null);

export function VoiceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const ws = await voiceApi.workspace();
      setWorkspace(ws);
      setError(null);
      return ws;
    } catch (e) {
      setError(formatApiError(e));
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
    // Keep the docked call chip and notifications current without a socket.
    const t = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const toast = useCallback((message, opts = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 4500);
  }, []);

  return (
    <Ctx.Provider value={{ workspace, setWorkspace, refresh, error, toast }}>
      {children}
      <div className="bv toast-wrap" role="status" aria-live="polite" style={{ background: "transparent" }}>
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <Icon name={t.tone === "danger" ? "alert" : "check-circle"} className={t.tone === "danger" ? "c-danger" : "c-success"} />
            <span className="t-body-s">{t.message}</span>
            {t.action ? (
              <button className="btn ghost s" onClick={t.action.onClick}>{t.action.label}</button>
            ) : <span style={{ width: 4 }} />}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useVoice = () => useContext(Ctx);
