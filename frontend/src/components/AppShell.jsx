import React from "react";
import AppSidebar from "./AppSidebar";

/**
 * AppShell — layout for authenticated routes (/app, /settings, /project/*).
 * Renders the collapsible sidebar on the left and the page content to the
 * right. Mobile: sidebar collapses to a thin icon rail (handled in CSS).
 */
export default function AppShell({ children }) {
  return (
    <div className="app-shell" data-testid="app-shell">
      <AppSidebar />
      <main className="app-shell-main">{children}</main>
    </div>
  );
}
