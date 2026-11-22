import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { getAvailableCoupons, validateCoupon } from '../controllers/coupon.controller.js';

const couponRouter = express.Router();

couponRouter.use(authenticateToken);

/**
 * @route GET /api/coupons/available?subtotal=
 * @desc List coupons the user can apply to the current cart
 */
couponRouter.get('/available', getAvailableCoupons);

/**
 * @route POST /api/coupons/validate
 * @desc Validate coupon code against cart subtotal
 */
couponRouter.post('/validate', validateCoupon);

export default couponRouter;
