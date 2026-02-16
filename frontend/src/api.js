const API = import.meta.env.VITE_API_BASE !== undefined ? import.meta.env.VITE_API_BASE : "http://127.0.0.1:5000";

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
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("file", file);
    return req("/api/auth/avatar", { method:"POST", body: form, isForm:true, headers:{} });
  },
  forgot: (payload) => req("/api/auth/forgot", { method:"POST", body: payload }),
  reset: (payload) => req("/api/auth/reset", { method:"POST", body: payload }),

  search: (params) => req(`/api/listings/search?${new URLSearchParams(params)}`),
  myListings: () => req("/api/listings/mine"),
  feed: (page = 1, sort = "newest") => req(`/api/listings?page=${page}&per_page=20&sort=${sort}`),
  purchases: () => req("/api/listings/purchases"),
  renewListing: (id) => req(`/api/listings/${id}/renew`, { method:"POST" }),
  reorderImages: (id, imageIds) => req(`/api/listings/${id}/images/reorder`, { method:"PUT", body: { image_ids: imageIds } }),
  onboardingDone: () => req("/api/auth/onboarding-done", { method:"POST" }),
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
  boostStatus: () => req("/api/boosts/status"),
  boostRules: () => req("/api/boosts/rules"),
  activateBoost: (payload) => req("/api/boosts/activate", { method:"POST", body: payload }),
  boostCheckout: (payload) => req("/api/boosts/create-checkout", { method:"POST", body: payload }),

  billingStatus: () => req("/api/billing/status"),
  createCheckoutSession: () => req("/api/billing/create-checkout-session", { method:"POST" }),
  createPortalSession: () => req("/api/billing/create-portal-session", { method:"POST" }),

  ads: () => req("/api/ads"),

  notifications: () => req("/api/notifications"),
  unreadNotifCount: () => req("/api/notifications/unread-count"),
  markNotifsRead: () => req("/api/notifications/mark-read", { method:"POST" }),

  similarListings: (id) => req(`/api/listings/${id}/similar`),
  priceHistory: (id) => req(`/api/listings/${id}/price-history`),

  makeOffer: (payload) => req("/api/offers/make", { method:"POST", body: payload }),
  listingOffers: (listingId) => req(`/api/offers/listing/${listingId}`),
  respondOffer: (offerId, payload) => req(`/api/offers/${offerId}/respond`, { method:"POST", body: payload }),

  savedSearches: () => req("/api/saved-searches"),
  saveSearch: (payload) => req("/api/saved-searches", { method:"POST", body: payload }),
  deleteSavedSearch: (id) => req(`/api/saved-searches/${id}`, { method:"DELETE" }),

  userProfile: (userId) => req(`/api/users/${userId}/profile`),
  toggleBlock: (userId) => req(`/api/users/${userId}/block`, { method:"POST" }),
  reportUser: (userId, payload) => req(`/api/users/${userId}/report`, { method:"POST", body: payload }),

  createReview: (payload) => req("/api/reviews", { method:"POST", body: payload }),
  sellerReviews: (sellerId) => req(`/api/reviews/seller/${sellerId}`),
  canReview: (listingId) => req(`/api/reviews/listing/${listingId}/can-review`),

  myStats: () => req("/api/listings/my-stats"),
  trackView: (id) => req(`/api/listings/${id}/view`, { method:"POST" }),
  myDrafts: () => req("/api/listings/drafts"),
  publishDraft: (id) => req(`/api/listings/${id}/publish`, { method:"POST" }),
  bulkAction: (payload) => req("/api/listings/bulk", { method:"POST", body: payload }),

  sendChatImage: (conversationId, file) => {
    const form = new FormData();
    form.append("file", file);
    return req(`/api/messages/${conversationId}/image`, { method:"POST", body: form, isForm:true, headers:{} });
  },

  createMeetupToken: (listingId) => req(`/api/listings/${listingId}/meetup-token`, { method:"POST" }),
  confirmMeetup: (token) => req(`/api/listings/meetup-confirm/${token}`, { method:"POST" }),

  supportContact: (payload) => req("/api/support/contact", { method:"POST", body: payload }),

  // Email verification
  sendVerification: () => req("/api/auth/send-verification", { method:"POST" }),
  verifyEmail: (token) => req(`/api/auth/verify?token=${encodeURIComponent(token)}`),

  // Web Push
  getVapidKey: () => req("/api/push/vapid"),
  subscribePush: (subscription) => req("/api/push/subscribe", { method:"POST", body: subscription }),
  unsubscribePush: (endpoint) => req("/api/push/unsubscribe", { method:"DELETE", body: { endpoint } }),

  // Admin
  adminDashboard: () => req("/api/admin/dashboard"),
  adminUsers: (params) => req(`/api/admin/users?${new URLSearchParams(params)}`),
  adminBanUser: (id) => req(`/api/admin/users/${id}/ban`, { method:"POST" }),
  adminTogglePro: (id) => req(`/api/admin/users/${id}/toggle-pro`, { method:"POST" }),
  adminToggleVerified: (id) => req(`/api/admin/users/${id}/toggle-verified`, { method:"POST" }),
  adminListings: (params) => req(`/api/admin/listings?${new URLSearchParams(params)}`),
  adminDeleteListing: (id) => req(`/api/admin/listings/${id}`, { method:"DELETE" }),
  adminReports: (params) => req(`/api/admin/reports?${new URLSearchParams(params)}`),
  adminResolveReport: (id, payload) => req(`/api/admin/reports/${id}/resolve`, { method:"POST", body: payload }),
  adminReviews: (params) => req(`/api/admin/reviews?${new URLSearchParams(params)}`),
  adminDeleteReview: (id) => req(`/api/admin/reviews/${id}`, { method:"DELETE" }),
  adminAds: () => req("/api/admin/ads"),
  adminCreateAd: (payload) => req("/api/admin/ads", { method:"POST", body: payload }),
  adminUpdateAd: (id, payload) => req(`/api/admin/ads/${id}`, { method:"PUT", body: payload }),
  adminDeleteAd: (id) => req(`/api/admin/ads/${id}`, { method:"DELETE" }),
};
