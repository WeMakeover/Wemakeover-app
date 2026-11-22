import { validateCouponForOrder, listAvailableCouponsForUser } from '../services/coupon.service.js';

export const getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const subtotal = Number(req.query.subtotal);
    const roundedSubtotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0;

    const coupons = await listAvailableCouponsForUser({
      subtotal: roundedSubtotal,
      userId,
    });

    return res.status(200).json({
      success: true,
      data: { coupons },
    });
  } catch (error) {
    console.error('Get available coupons error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available coupons',
    });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { code, subtotal } = req.body;

    if (!code || String(code).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required',
      });
    }

    const subtotalNum = Number(subtotal);
    if (!Number.isFinite(subtotalNum) || subtotalNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid subtotal is required',
      });
    }

    const result = await validateCouponForOrder({
      code,
      subtotal: subtotalNum,
      userId,
    });

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        coupon: result.coupon,
        discountAmount: result.discountAmount,
        pricing: result.pricing,
      },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
    });
  }
};
