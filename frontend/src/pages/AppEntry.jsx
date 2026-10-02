import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../lib/api";

// The old projects-grid dashboard is gone. /app now routes straight into the
// most recent project workspace (the new "dashboard"), or into onboarding when
// the user has no projects yet.
export default function AppEntry() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    api.get("/projects")
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        const real = list.find((p) => p && !p.is_demo && p.id);
        const target = real || list.find((p) => p?.id);
        if (target?.id) navigate(`/project/${target.id}`, { replace: true });
        else navigate("/welcome", { replace: true });
      })
      .catch(() => { if (!cancelled) navigate("/welcome", { replace: true }); });
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#000" }} data-testid="app-entry-loading">
      <Loader2 size={20} className="animate-spin" style={{ color: "#6b6b6b" }} />
    </div>
  );
}
