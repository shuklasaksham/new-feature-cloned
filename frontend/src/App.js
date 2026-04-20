import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/AuthContext";
import MarketingLayout from "./components/MarketingLayout";

import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import UseCases from "./pages/UseCases";
import Pricing from "./pages/Pricing";
import CaseStudies from "./pages/CaseStudies";
import Waitlist from "./pages/Waitlist";

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

          {/* Waitlist (replaces auth + app during coming-soon mode) */}
          <Route path="/waitlist" element={<Waitlist />} />

          {/* Coming-soon mode: all auth/app routes redirect to waitlist */}
          <Route path="/login" element={<Navigate to="/waitlist" replace />} />
          <Route path="/signup" element={<Navigate to="/waitlist" replace />} />
          <Route path="/onboarding" element={<Navigate to="/waitlist" replace />} />
          <Route path="/app/*" element={<Navigate to="/waitlist" replace />} />
          <Route path="/billing/*" element={<Navigate to="/waitlist" replace />} />
          <Route path="/share/*" element={<Navigate to="/waitlist" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
