import Coupon from '../models/coupon.model.js';
import CouponRedemption from '../models/couponRedemption.model.js';
import { calculateOrderPricing } from '../utils/pricing.utils.js';

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function computeDiscountAmount(coupon, subtotal) {
  const amount = Math.max(0, Math.round(subtotal || 0));
  if (!coupon || amount <= 0) return 0;

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.round((amount * coupon.value) / 100);
    if (coupon.maxDiscount != null && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = Math.round(coupon.value);
  }

  return Math.min(discount, amount);
}

function isWithinDateRange(coupon, now = new Date()) {
  if (coupon.startsAt && now < new Date(coupon.startsAt)) return false;
  if (coupon.endsAt && now > new Date(coupon.endsAt)) return false;
  return true;
}

export async function getCouponByCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return Coupon.findOne({ code: normalized });
}

export async function validateCouponForOrder({ code, subtotal, userId }) {
  const normalized = normalizeCode(code);
  const roundedSubtotal = Math.max(0, Math.round(subtotal || 0));

  if (!normalized) {
    return { valid: false, message: 'Please enter a coupon code' };
  }

  const coupon = await getCouponByCode(normalized);
  if (!coupon) {
    return { valid: false, message: 'Invalid coupon code' };
  }

  if (!coupon.isActive) {
    return { valid: false, message: 'This coupon is no longer active' };
  }

  if (!isWithinDateRange(coupon)) {
    return { valid: false, message: 'This coupon has expired or is not active yet' };
  }

  if (coupon.minOrderValue > 0 && roundedSubtotal < coupon.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order of ₹${coupon.minOrderValue} required for this coupon`,
    };
  }

  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit' };
  }

  if (userId) {
    const userRedemptions = await CouponRedemption.countDocuments({
      couponId: coupon._id,
      userId,
    });
    if (userRedemptions >= coupon.perUserLimit) {
      return {
        valid: false,
        message:
          coupon.perUserLimit === 1
            ? 'You have already used this coupon'
            : `You can only use this coupon ${coupon.perUserLimit} time(s)`,
      };
    }
  }

  const discountAmount = computeDiscountAmount(coupon, roundedSubtotal);
  if (discountAmount <= 0) {
    return { valid: false, message: 'This coupon does not apply to your cart' };
  }

  const pricing = calculateOrderPricing(roundedSubtotal, { discountAmount });

  return {
    valid: true,
    message: `You saved ₹${discountAmount}`,
    coupon: {
      id: coupon._id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      perUserLimit: coupon.perUserLimit,
      usageLimit: coupon.usageLimit,
      usageCount: coupon.usageCount,
    },
    discountAmount,
    pricing,
  };
}

export async function listAvailableCouponsForUser({ subtotal, userId }) {
  const now = new Date();
  const roundedSubtotal = Math.max(0, Math.round(subtotal || 0));

  const coupons = await Coupon.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  const available = [];

  for (const coupon of coupons) {
    if (!isWithinDateRange(coupon, now)) continue;
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) continue;
    if (coupon.minOrderValue > 0 && roundedSubtotal < coupon.minOrderValue) continue;

    if (userId) {
      const userRedemptions = await CouponRedemption.countDocuments({
        couponId: coupon._id,
        userId,
      });
      if (userRedemptions >= coupon.perUserLimit) continue;
    }

    const discountAmount = computeDiscountAmount(coupon, roundedSubtotal);
    if (discountAmount <= 0) continue;

    const offerLabel =
      coupon.type === 'percentage'
        ? `${coupon.value}% off${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ''}`
        : `₹${coupon.value} off`;

    available.push({
      id: coupon._id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount,
      discountAmount,
      offerLabel,
      savingsLabel: `Save ₹${discountAmount}`,
    });
  }

  return available;
}

export async function redeemCoupon({
  code,
  userId,
  bookingId = null,
  orderNumber = null,
  subtotal,
  discountAmount,
}) {
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    throw new Error('Coupon not found');
  }

  const redemption = await CouponRedemption.create({
    couponId: coupon._id,
    couponCode: coupon.code,
    userId,
    bookingId,
    orderNumber,
    discountAmount,
    subtotal,
  });

  await Coupon.updateOne({ _id: coupon._id }, { $inc: { usageCount: 1 } });

  return redemption;
}

export { computeDiscountAmount, normalizeCode };
