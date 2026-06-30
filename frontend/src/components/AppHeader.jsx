import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings as SettingsIcon, FolderPlus } from "lucide-react";
import BracketMark from "./BracketMark";
import Avatar from "./Avatar";
import { useAuth } from "../lib/AuthContext";

/**
 * Sticky app header shown on Dashboard + Project pages.
 * Shows the user's avatar (top-right) with a dropdown for Settings / Logout.
 */
export default function AppHeader({ rightExtra }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDown = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 glass" data-testid="app-header">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 h-16 flex items-center justify-between gap-3">
        <Link to="/app" className="flex items-center gap-3 shrink-0">
          <BracketMark size={26} />
        </Link>

        <div className="flex items-center gap-3 shrink-0">
          {rightExtra}
          {user && (
            <div className="relative" ref={ref}>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 px-2 py-1 border border-ink bg-paper hover:bg-ink hover:text-chalk transition-colors"
                aria-expanded={open}
                aria-haspopup="menu"
                data-testid="profile-menu-trigger"
              >
                <Avatar id={user.avatar || "mono-1"} size={26} initial={user.name || user.email} />
                <span className="mono-tag hidden sm:inline">{(user.name || user.email).split(" ")[0].toUpperCase()}</span>
              </button>
              {open && (
                <div
                  className="absolute right-0 mt-2 w-64 border border-ink bg-paper shadow-brut z-40"
                  role="menu"
                  data-testid="profile-menu-panel"
                >
                  <div className="p-4 border-b border-ink flex items-center gap-3">
                    <Avatar id={user.avatar || "mono-1"} size={36} initial={user.name || user.email} />
                    <div className="min-w-0">
                      <p className="font-display text-base truncate">{user.name || "—"}</p>
                      <p className="mono-tag text-muted truncate">{user.email}</p>
                      {user.designation && <p className="text-xs text-muted mt-1 truncate">{user.designation}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => { setOpen(false); navigate("/app/new"); }}
                    className="w-full text-left p-3 mono-tag hover:bg-chalk flex items-center gap-2"
                    role="menuitem"
                    data-testid="profile-menu-new"
                  >
                    <FolderPlus size={12} /> NEW PROJECT
                  </button>
                  <button
                    onClick={() => { setOpen(false); navigate("/settings"); }}
                    className="w-full text-left p-3 mono-tag hover:bg-chalk flex items-center gap-2"
                    role="menuitem"
                    data-testid="profile-menu-settings"
                  >
                    <SettingsIcon size={12} /> ACCOUNT SETTINGS
                  </button>
                  <button
                    onClick={async () => { setOpen(false); await logout(); navigate("/", { replace: true }); }}
                    className="w-full text-left p-3 mono-tag hover:bg-danger hover:text-chalk flex items-center gap-2 border-t border-ink"
                    role="menuitem"
                    data-testid="profile-menu-logout"
                  >
                    <LogOut size={12} /> SIGN OUT
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
