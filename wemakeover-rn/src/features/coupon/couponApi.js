import http from "../../lib/http";

export const fetchAvailableCouponsApi = (subtotal) =>
  http.get("/coupons/available", { params: { subtotal } });

export const validateCouponApi = ({ code, subtotal }) =>
  http.post("/coupons/validate", { code, subtotal });
