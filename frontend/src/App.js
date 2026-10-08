import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";

import ProtectedRoute from "./components/ProtectedRoute";
import RequirePlan from "./components/RequirePlan";
import AppShell from "./components/AppShell";
import ScrollToTop from "./components/ScrollToTop";
import DeviceGate from "./components/DeviceGate";
import InstallPrompt from "./components/InstallPrompt";
import { DialogProvider } from "./components/Dialog";
import { AuthProvider } from "./lib/AuthContext";

// ── Bracket 2.0 marketing (new look) ──────────────────────────────────────
import V2MarketingLayout from "./v2/pages/marketing/Layout";
import V2Landing from "./v2/pages/marketing/Landing";
import { Pricing as V2Pricing, Privacy as V2Privacy, Terms as V2Terms, Security as V2Security, NotFound as V2NotFound } from "./v2/pages/marketing/Pages";
import { UseCases as V2UseCases, Changelog as V2Changelog, About as V2About, Contact as V2Contact } from "./v2/pages/marketing/More";

import Login from "./pages/Login";
import ChoosePlan from "./pages/ChoosePlan";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import FirstProject from "./pages/FirstProject";
import SelectSource from "./pages/SelectSource";
import BuildingProject from "./pages/BuildingProject";
import ClaimProjects from "./pages/ClaimProjects";
import AppEntry from "./pages/AppEntry";
import ConnectWork from "./pages/ConnectWork";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import ProjectMemory from "./pages/ProjectMemory";
import ProjectFlow from "./pages/ProjectFlow";
import ProjectOverview from "./pages/ProjectOverview";
import ProjectDocument from "./pages/ProjectDocument";
import ClientReview from "./pages/ClientReview";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

import { useAnalyticsTracker } from "./lib/analyticsTracker";

import "./App.css";

function AnalyticsTrackerMount() {
  useAnalyticsTracker();
  return null;
}

// Tool routes require BOTH auth and an active plan (admins exempt).
function Tool({ children }) {
  return (
    <ProtectedRoute>
      <RequirePlan>{children}</RequirePlan>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <MotionConfig reducedMotion="user">
      <DeviceGate>
      <AuthProvider>
        <DialogProvider>
        <BrowserRouter>
        <ScrollToTop />
        <AnalyticsTrackerMount />
        <Toaster position="top-right" richColors />
        <InstallPrompt />
        <Routes>
          {/* Marketing — public (Bracket 2.0 look) */}
          <Route element={<V2MarketingLayout />}>
            <Route path="/" element={<V2Landing />} />
            <Route path="/pricing" element={<V2Pricing />} />
            <Route path="/privacy" element={<V2Privacy />} />
            <Route path="/terms" element={<V2Terms />} />
            <Route path="/security" element={<V2Security />} />
            <Route path="/use-cases" element={<V2UseCases />} />
            <Route path="/changelog" element={<V2Changelog />} />
            <Route path="/about" element={<V2About />} />
            <Route path="/contact" element={<V2Contact />} />
            <Route path="*" element={<V2NotFound />} />
          </Route>

          {/* Auth flow */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/plan" element={<ProtectedRoute><ChoosePlan /></ProtectedRoute>} />
          <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/payment/cancel" element={<ProtectedRoute><PaymentCancel /></ProtectedRoute>} />
          <Route path="/welcome" element={<Tool><FirstProject /></Tool>} />
          <Route path="/welcome/select" element={<Tool><SelectSource /></Tool>} />
          <Route path="/welcome/building" element={<Tool><BuildingProject /></Tool>} />
          <Route path="/claim" element={<Tool><ClaimProjects /></Tool>} />

          {/* Tool (auth + active plan required) — wrapped in AppShell w/ collapsible sidebar */}
          {/* /app → straight into the latest project (old dashboard removed) */}
          <Route path="/app" element={<Tool><AppEntry /></Tool>} />
          <Route path="/app/new" element={<Tool><AppEntry /></Tool>} />
          <Route path="/app/connect" element={<Tool><ConnectWork /></Tool>} />
          <Route path="/app/activity" element={<Tool><AppShell><Activity /></AppShell></Tool>} />
          <Route path="/start" element={<Navigate to="/app" replace />} />
          <Route path="/settings" element={<ProtectedRoute><AppShell><Settings /></AppShell></ProtectedRoute>} />
          <Route path="/project/:id" element={<ProtectedRoute><ProjectMemory /></ProtectedRoute>} />
          <Route path="/project/:id/legacy" element={<Tool><AppShell><ProjectOverview /></AppShell></Tool>} />
          <Route path="/project/:id/flow" element={<Tool><AppShell><ProjectFlow /></AppShell></Tool>} />
          <Route path="/project/:id/document" element={<Tool><AppShell><ProjectDocument /></AppShell></Tool>} />

          {/* Public client review */}
          <Route path="/r/:token" element={<ClientReview />} />

          {/* Hidden admin console — not linked from anywhere public */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedAdminRoute><AppShell><AdminDashboard /></AppShell></ProtectedAdminRoute>} />
        </Routes>
      </BrowserRouter>
        </DialogProvider>
    </AuthProvider>
      </DeviceGate>
      </MotionConfig>
    </HelmetProvider>
  );
}
