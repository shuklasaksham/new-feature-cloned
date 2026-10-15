// Voice AI API client — thin wrappers over the app's shared axios instance (/api/voice/*).
import { api, formatApiError } from "../../lib/api";

const get = (url, params) => api.get(`/voice${url}`, { params }).then((r) => r.data);
const post = (url, body) => api.post(`/voice${url}`, body ?? {}).then((r) => r.data);
const put = (url, body) => api.put(`/voice${url}`, body).then((r) => r.data);
const patch = (url, body) => api.patch(`/voice${url}`, body).then((r) => r.data);

export const voiceApi = {
  workspace: () => get("/workspace"),
  reset: () => post("/reset"),
  updateSettings: (settings) => put("/settings", settings),
  setContactAuthorized: (id, authorized) => put(`/contacts/${id}`, { authorized }),
  markNotificationsRead: () => post("/notifications/read"),

  createSession: () => post("/sessions"),
  sessions: () => get("/sessions"),
  session: (id) => get(`/sessions/${id}`),
  say: (id, text, mode = "voice") => post(`/sessions/${id}/turns`, { text, mode }),
  decide: (sessionId, actionId, decision) => post(`/sessions/${sessionId}/actions/${actionId}/${decision}`),

  prepareCall: (contactId, requestText = "", source = "workspace") =>
    post("/calls", { contact_id: contactId, request_text: requestText, source }),
  calls: (params) => get("/calls", params),
  call: (id) => get(`/calls/${id}`),
  editPlan: (id, plan) => patch(`/calls/${id}/plan`, plan),
  confirmCall: (id, body) => post(`/calls/${id}/confirm`, body),
  endCall: (id) => post(`/calls/${id}/end`),
  cancelCall: (id) => post(`/calls/${id}/cancel`),
  retryCall: (id) => post(`/calls/${id}/retry`),
  review: (id, acceptedIds) => post(`/calls/${id}/review`, { accepted_ids: acceptedIds }),
  dismissReview: (id) => post(`/calls/${id}/review/dismiss`),
};

export { formatApiError };

export const isLive = (call) => ["dialing", "ringing", "connected"].includes(call?.status);
export const isEnded = (call) => ["completed", "no_answer", "busy", "failed", "canceled"].includes(call?.status);
