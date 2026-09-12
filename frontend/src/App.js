import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";

import MarketingLayout from "./components/MarketingLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RequirePlan from "./components/RequirePlan";
import AppShell from "./components/AppShell";
import ScrollToTop from "./components/ScrollToTop";
import DeviceGate from "./components/DeviceGate";
import InstallPrompt from "./components/InstallPrompt";
import { DialogProvider } from "./components/Dialog";
import { AuthProvider } from "./lib/AuthContext";

import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

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
          {/* Marketing — public */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
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
          <Route path="/project/:id" element={<Tool><ProjectMemory /></Tool>} />
          <Route path="/project/:id/legacy" element={<Tool><AppShell><ProjectOverview /></AppShell></Tool>} />
          <Route path="/project/:id/flow" element={<Tool><AppShell><ProjectFlow /></AppShell></Tool>} />
          <Route path="/project/:id/document" element={<Tool><AppShell><ProjectDocument /></AppShell></Tool>} />

          {/* Public client review */}
          <Route path="/r/:token" element={<ClientReview />} />

          {/* Hidden admin console — not linked from anywhere public */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedAdminRoute><AppShell><AdminDashboard /></AppShell></ProtectedAdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
        </DialogProvider>
    </AuthProvider>
      </DeviceGate>
      </MotionConfig>
    </HelmetProvider>
  );
}
