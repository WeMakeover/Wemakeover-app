import express from 'express';
import { checkAuth, requireAdmin } from '../../middlewares/auth.middleware.js';
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
  getCouponRedemptions,
} from '../../controllers/admin/coupon.admin.controller.js';

const couponAdminRouter = express.Router();

couponAdminRouter.post('/', checkAuth, requireAdmin, createCoupon);
couponAdminRouter.get('/', checkAuth, requireAdmin, getAllCoupons);
couponAdminRouter.get('/:id/redemptions', checkAuth, requireAdmin, getCouponRedemptions);
couponAdminRouter.get('/:id', checkAuth, requireAdmin, getCouponById);
couponAdminRouter.put('/:id', checkAuth, requireAdmin, updateCoupon);
couponAdminRouter.patch('/:id/toggle-active', checkAuth, requireAdmin, toggleCouponActive);
couponAdminRouter.delete('/:id', checkAuth, requireAdmin, deleteCoupon);

export default couponAdminRouter;
