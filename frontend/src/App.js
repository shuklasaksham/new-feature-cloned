import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import MarketingLayout from "./components/MarketingLayout";

import Landing from "./pages/Landing";
import HowItWorks from "./pages/HowItWorks";
import UseCases from "./pages/UseCases";
import Pricing from "./pages/Pricing";
import CaseStudies from "./pages/CaseStudies";
import StartProject from "./pages/StartProject";
import ProjectFlow from "./pages/ProjectFlow";

import "./App.css";

export default function App() {
  return (
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

        {/* Tool — anonymous, no account required */}
        <Route path="/start" element={<StartProject />} />
        <Route path="/project/:id" element={<ProjectFlow />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
