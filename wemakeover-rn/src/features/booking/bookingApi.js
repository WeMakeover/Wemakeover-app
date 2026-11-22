import http from "../../lib/http";

const base = "/bookings";

export const bookingApi = {
  getUserBookings: (params = {}) => http.get(`${base}/my-bookings`, { params }),
  getBookingById: (bookingId) => http.get(`${base}/${bookingId}`),
  createBooking: (bookingData) => http.post(`${base}/`, bookingData),
  cancelBooking: (bookingId, cancellationReason) =>
    http.put(`${base}/${bookingId}/cancel`, { action: "cancel", cancellationReason }),
  rescheduleBooking: (bookingId, rescheduleData) =>
    http.patch(`${base}/${bookingId}/reschedule`, rescheduleData),
  updatePaymentStatus: (bookingId, paymentDetails) =>
    http.put(`${base}/${bookingId}/payment-status`, paymentDetails),
  completeBookingPayment: (bookingId, paymentData) =>
    http.post(`${base}/${bookingId}/complete-payment`, paymentData),
  getBookingStats: () => http.get(`${base}/stats`),
  getUpcomingBookings: (limit = 5) => http.get(`${base}/upcoming`, { params: { limit } }),
  getAvailableSlots: (date) => http.get(`${base}/available-slots`, { params: { date } }),
  getMinimumOrderValue: () => http.get(`${base}/minimum-order-value`),
};

export default bookingApi;
