import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

// Paywall gate for tool routes. A logged-in user must have an active plan
// (or be an admin) to reach the workspace. Without this, a returning session
// could navigate straight to /app or /project/:id and bypass payment.
// Assumes it's rendered inside <ProtectedRoute> (user already resolved).
export default function RequirePlan({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="mono-label">LOADING…</p>
      </div>
    );
  }
  if (user && !user.plan && !user.is_admin) {
    return <Navigate to="/plan" replace />;
  }
  return children;
}
