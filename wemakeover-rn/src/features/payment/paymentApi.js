import http from "../../lib/http";

const base = "/payment";

export const createPaymentOrder = (orderData) => http.post(`${base}/create-order`, orderData);
export const verifyPayment = (paymentData) => http.post(`${base}/verify`, paymentData);
export const createCODOrder = (orderData) => http.post(`${base}/create-cod`, orderData);
export const getPaymentHistory = (params = {}) => http.get(`${base}/history`, { params });
export const getPaymentDetails = (paymentId) => http.get(`${base}/${paymentId}`);
export const cancelPaymentOrder = (orderId) => http.post(`${base}/cancel`, { orderId });
export const getPaymentStats = () => http.get(`${base}/stats/overview`);
