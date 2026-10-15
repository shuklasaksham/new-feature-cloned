// Bracket Voice AI — mounted by App.js at /voice/* (auth + plan required).
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { VoiceProvider } from "./store";
import AskVoice from "./pages/AskVoice";
import CallPrep from "./pages/CallPrep";
import LiveCall from "./pages/LiveCall";
import CallSummary from "./pages/CallSummary";
import MemoryReview from "./pages/MemoryReview";
import Calls from "./pages/Calls";
import VoiceSettings from "./pages/VoiceSettings";
import Workspace from "./pages/Workspace";
import "./voice.css";

export default function VoiceAIRoutes() {
  return (
    <VoiceProvider>
      <Routes>
        <Route index element={<AskVoice />} />
        <Route path="workspace" element={<Workspace />} />
        <Route path="calls" element={<Calls />} />
        <Route path="calls/:id" element={<CallSummary />} />
        <Route path="calls/:id/prepare" element={<CallPrep />} />
        <Route path="calls/:id/live" element={<LiveCall />} />
        <Route path="calls/:id/review" element={<MemoryReview />} />
        <Route path="settings" element={<VoiceSettings />} />
        <Route path="*" element={<Navigate to="/voice" replace />} />
      </Routes>
    </VoiceProvider>
  );
}
