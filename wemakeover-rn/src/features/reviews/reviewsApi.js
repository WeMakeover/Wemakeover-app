import http from "../../lib/http";

/**
 * Reviews API (mobile). The shared `http` instance attaches the bearer token,
 * the `X-Client: mobile` header, and unwraps the response body for us.
 */
const base = "/reviews";

export const reviewsApi = {
  verifyToken: (token) => http.get(`${base}/verify-token/${token}`),

  submitReview: (reviewData) => http.post(`${base}/`, { source: "mobile", ...reviewData }),

  getPendingReviews: () => http.get(`${base}/pending`),

  getMyReviews: (params = {}) => http.get(`${base}/my-reviews`, { params }),

  getReviewById: (reviewId) => http.get(`${base}/${reviewId}`),

  editReview: (reviewId, updates) => http.patch(`${base}/${reviewId}`, updates),

  getTestimonials: (params = {}) => http.get(`${base}/testimonials`, { params }),

  getTestimonialStats: () => http.get(`${base}/testimonials/stats`),
};

export default reviewsApi;
