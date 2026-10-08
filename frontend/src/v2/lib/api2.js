import { api } from "../../lib/api";

/* Minimal v2 API surface used by the ported marketing pages. The `api`
   instance already prefixes /api, so paths here omit it. */
export const v2 = {
  contact: (body) => api.post("/contact", body).then((r) => r.data),
};
