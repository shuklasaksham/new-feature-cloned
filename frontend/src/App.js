import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import MarketingLayout from "./components/MarketingLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./lib/AuthContext";

import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import UseCases from "./pages/UseCases";
import Pricing from "./pages/Pricing";
import CaseStudies from "./pages/CaseStudies";

import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import ClaimProjects from "./pages/ClaimProjects";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import ProjectFlow from "./pages/ProjectFlow";
import ProjectOverview from "./pages/ProjectOverview";
import ProjectDocument from "./pages/ProjectDocument";
import ClientReview from "./pages/ClientReview";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Marketing — public */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/use-cases" element={<UseCases />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/case-studies" element={<CaseStudies />} />
          </Route>

          {/* Auth flow */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/claim" element={<ProtectedRoute><ClaimProjects /></ProtectedRoute>} />

          {/* Tool (auth required) — wrapped in AppShell w/ collapsible sidebar */}
          <Route path="/app" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
          <Route path="/app/new" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
          <Route path="/start" element={<Navigate to="/app" replace />} />
          <Route path="/settings" element={<ProtectedRoute><AppShell><Settings /></AppShell></ProtectedRoute>} />
          <Route path="/project/:id" element={<ProtectedRoute><AppShell><ProjectOverview /></AppShell></ProtectedRoute>} />
          <Route path="/project/:id/flow" element={<ProtectedRoute><AppShell><ProjectFlow /></AppShell></ProtectedRoute>} />
          <Route path="/project/:id/document" element={<ProtectedRoute><AppShell><ProjectDocument /></AppShell></ProtectedRoute>} />

          {/* Public client review */}
          <Route path="/r/:token" element={<ClientReview />} />

          {/* Hidden admin console — not linked from anywhere public */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
