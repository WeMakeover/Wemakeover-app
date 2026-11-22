import axios from 'axios';

const backendurl = import.meta.env.VITE_BACKEND_URL;

const adminCouponsApiInstance = axios.create({
  baseURL: `${backendurl}/admin/coupons`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

adminCouponsApiInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/auth/login';
    }
    const errorMessage = error.response?.data?.message || 'Coupon request failed';
    return Promise.reject(new Error(errorMessage));
  }
);

export const adminCouponsApi = {
  getAllCoupons: (params = {}) => adminCouponsApiInstance.get('/', { params }),
  getCouponById: (couponId) => adminCouponsApiInstance.get(`/${couponId}`),
  createCoupon: (data) => adminCouponsApiInstance.post('/', data),
  updateCoupon: (couponId, data) => adminCouponsApiInstance.put(`/${couponId}`, data),
  deleteCoupon: (couponId) => adminCouponsApiInstance.delete(`/${couponId}`),
  toggleCouponActive: (couponId) => adminCouponsApiInstance.patch(`/${couponId}/toggle-active`),
  getCouponRedemptions: (couponId) => adminCouponsApiInstance.get(`/${couponId}/redemptions`),
};
