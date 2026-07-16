import React from "react";
import AppSidebar from "./AppSidebar";
import MobileTabBar from "./MobileTabBar";

/**
 * AppShell — layout for authenticated routes (/app, /settings, /project/*).
 * Desktop: collapsible left sidebar. Mobile (≤768px): sidebar is hidden and
 * an app-style bottom tab bar takes over (CSS-driven swap).
 */
export default function AppShell({ children }) {
  return (
    <div className="app-shell" data-testid="app-shell">
      <AppSidebar />
      <main className="app-shell-main">{children}</main>
      <MobileTabBar />
    </div>
  );
}
