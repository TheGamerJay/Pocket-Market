const API = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000";

async function req(path, { method="GET", body, headers={}, isForm=false } = {}) {
  const opts = {
    method,
    credentials: "include",
    headers: isForm ? headers : { "Content-Type": "application/json", ...headers }
  };
  if (body !== undefined) opts.body = isForm ? body : JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  base: API,

  health: () => req("/api/health"),

  me: () => req("/api/auth/me"),
  signup: (payload) => req("/api/auth/signup", { method:"POST", body: payload }),
  login: (payload) => req("/api/auth/login", { method:"POST", body: payload }),
  logout: () => req("/api/auth/logout", { method:"POST" }),
  forgot: (payload) => req("/api/auth/forgot", { method:"POST", body: payload }),
  reset: (payload) => req("/api/auth/reset", { method:"POST", body: payload }),

  feed: () => req("/api/listings"),
  listing: (id) => req(`/api/listings/${id}`),
  createListing: (payload) => req("/api/listings", { method:"POST", body: payload }),
  updateListing: (id, payload) => req(`/api/listings/${id}`, { method:"PUT", body: payload }),
  deleteListing: (id) => req(`/api/listings/${id}`, { method:"DELETE" }),

  uploadListingImages: (id, files) => {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    return req(`/api/listings/${id}/images`, { method:"POST", body: form, isForm:true, headers:{} });
  },

  toggleObserving: (listingId) => req(`/api/observing/toggle/${listingId}`, { method:"POST" }),
  myObserving: () => req("/api/observing"),

  startConversation: (payload) => req("/api/messages/start", { method:"POST", body: payload }),
  conversations: () => req("/api/messages/conversations"),
  messages: (conversationId) => req(`/api/messages/${conversationId}`),
  sendMessage: (conversationId, payload) => req(`/api/messages/${conversationId}`, { method:"POST", body: payload }),

  warningText: () => req("/api/safety/warning-text"),
  setSafeMeet: (listingId, payload) => req(`/api/safety/listing/${listingId}/safe-meet`, { method:"POST", body: payload }),
  ackSafety: (payload) => req("/api/safety/ack", { method:"POST", body: payload }),

  featured: () => req("/api/boosts/featured"),
  boostDurations: () => req("/api/boosts/durations"),

  billingStatus: () => req("/api/billing/status"),
  setPro: (is_pro) => req("/api/billing/set-pro", { method:"POST", body: { is_pro } }),

  ads: () => req("/api/ads")
};
