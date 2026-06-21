import axios from "axios";

// Prefer same-origin in the browser (works on custom domains + preview).
const ENV_BACKEND = process.env.REACT_APP_BACKEND_URL;
const BACKEND_URL =
  typeof window !== "undefined" && window.location && window.location.origin
    ? window.location.origin
    : ENV_BACKEND;
export const API_BASE = `${BACKEND_URL}/api`;

// withCredentials=true so the httpOnly session_token cookie flows on every call.
export const api = axios.create({ baseURL: API_BASE, withCredentials: true });

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" · ");
  }
  if (detail?.msg) return detail.msg;
  return String(detail);
}
