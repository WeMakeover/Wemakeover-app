import http from "../../lib/http";

/**
 * Notifications API (mobile). Uses the shared authenticated `http` instance,
 * which unwraps the response body.
 */
const base = "/notifications";

export const notificationsApi = {
  // Register the device's native FCM token with the backend (auth-protected).
  registerFcmToken: (fcmToken) => http.post("/auth/fcm-token", { fcmToken }),

  getNotifications: (params = {}) => http.get(`${base}/`, { params }),

  getUnreadCount: () => http.get(`${base}/unread-count`),

  getReviewRequests: () => http.get(`${base}/review-requests`),

  markAsRead: (notificationId) => http.patch(`${base}/${notificationId}/read`),

  markAllAsRead: () => http.patch(`${base}/mark-all-read`),

  deleteNotification: (notificationId) => http.delete(`${base}/${notificationId}`),
};

export default notificationsApi;
