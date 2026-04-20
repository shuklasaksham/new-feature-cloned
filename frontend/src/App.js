import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/AuthContext";
import MarketingLayout from "./components/MarketingLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import UseCases from "./pages/UseCases";
import Pricing from "./pages/Pricing";
import CaseStudies from "./pages/CaseStudies";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";

import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import ProjectFlow from "./pages/ProjectFlow";
import Moments from "./pages/Moments";
import Templates from "./pages/Templates";
import Workspace from "./pages/Workspace";
import Billing from "./pages/Billing";
import BillingReturn from "./pages/BillingReturn";
import Share from "./pages/Share";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Marketing */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/use-cases" element={<UseCases />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/case-studies" element={<CaseStudies />} />
          </Route>

          {/* Auth (no chrome) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          {/* App */}
          <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/app/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
          <Route path="/app/projects/:id" element={<ProtectedRoute><ProjectFlow /></ProtectedRoute>} />
          <Route path="/app/moments" element={<ProtectedRoute><Moments /></ProtectedRoute>} />
          <Route path="/app/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
          <Route path="/app/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
          <Route path="/app/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

          {/* Billing return + public share */}
          <Route path="/billing/success" element={<ProtectedRoute><BillingReturn /></ProtectedRoute>} />
          <Route path="/share/:token" element={<Share />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
