import Coupon from '../../models/coupon.model.js';
import CouponRedemption from '../../models/couponRedemption.model.js';
import { normalizeCode } from '../../services/coupon.service.js';

const parseOptionalNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseOptionalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const createCoupon = async (req, res) => {
  try {
    const code = normalizeCode(req.body.code);
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Coupon code already exists' });
    }

    const type = req.body.type;
    if (!['percentage', 'flat'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be percentage or flat' });
    }

    const value = parseOptionalNumber(req.body.value);
    if (value == null || value <= 0) {
      return res.status(400).json({ success: false, message: 'Value must be greater than 0' });
    }

    if (type === 'percentage' && value > 100) {
      return res.status(400).json({ success: false, message: 'Percentage cannot exceed 100' });
    }

    const perUserLimit = parseOptionalNumber(req.body.perUserLimit, 1);
    const usageLimit = parseOptionalNumber(req.body.usageLimit, null);

    const coupon = await Coupon.create({
      code,
      description: req.body.description || '',
      type,
      value,
      maxDiscount: type === 'percentage' ? parseOptionalNumber(req.body.maxDiscount, null) : null,
      minOrderValue: parseOptionalNumber(req.body.minOrderValue, 0),
      startsAt: parseOptionalDate(req.body.startsAt),
      endsAt: parseOptionalDate(req.body.endsAt),
      usageLimit,
      perUserLimit: Math.max(1, perUserLimit || 1),
      isActive: req.body.isActive !== false,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: { coupon },
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create coupon' });
  }
};

export const getAllCoupons = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.isActive === 'true') filter.isActive = true;
    if (req.query.isActive === 'false') filter.isActive = false;
    if (req.query.search) {
      filter.code = { $regex: normalizeCode(req.query.search), $options: 'i' };
    }

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
      Coupon.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        coupons,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit) || 1,
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    return res.status(200).json({ success: true, data: { coupon } });
  } catch (error) {
    console.error('Get coupon error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch coupon' });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    if (req.body.code != null) {
      const nextCode = normalizeCode(req.body.code);
      if (!nextCode) {
        return res.status(400).json({ success: false, message: 'Coupon code is required' });
      }
      const duplicate = await Coupon.findOne({ code: nextCode, _id: { $ne: coupon._id } });
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Coupon code already exists' });
      }
      coupon.code = nextCode;
    }

    if (req.body.description != null) coupon.description = req.body.description;
    if (req.body.type != null) {
      if (!['percentage', 'flat'].includes(req.body.type)) {
        return res.status(400).json({ success: false, message: 'Type must be percentage or flat' });
      }
      coupon.type = req.body.type;
    }
    if (req.body.value != null) {
      const value = parseOptionalNumber(req.body.value);
      if (value == null || value <= 0) {
        return res.status(400).json({ success: false, message: 'Value must be greater than 0' });
      }
      if (coupon.type === 'percentage' && value > 100) {
        return res.status(400).json({ success: false, message: 'Percentage cannot exceed 100' });
      }
      coupon.value = value;
    }
    if (req.body.maxDiscount !== undefined) {
      coupon.maxDiscount =
        coupon.type === 'percentage' ? parseOptionalNumber(req.body.maxDiscount, null) : null;
    }
    if (req.body.minOrderValue != null) {
      coupon.minOrderValue = Math.max(0, parseOptionalNumber(req.body.minOrderValue, 0));
    }
    if (req.body.startsAt !== undefined) coupon.startsAt = parseOptionalDate(req.body.startsAt);
    if (req.body.endsAt !== undefined) coupon.endsAt = parseOptionalDate(req.body.endsAt);
    if (req.body.usageLimit !== undefined) {
      coupon.usageLimit = parseOptionalNumber(req.body.usageLimit, null);
    }
    if (req.body.perUserLimit != null) {
      coupon.perUserLimit = Math.max(1, parseOptionalNumber(req.body.perUserLimit, 1));
    }
    if (req.body.isActive != null) coupon.isActive = Boolean(req.body.isActive);

    coupon.updatedBy = req.user.id;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: { coupon },
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
      data: { _id: coupon._id },
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
};

export const toggleCouponActive = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    coupon.isActive = !coupon.isActive;
    coupon.updatedBy = req.user.id;
    await coupon.save();
    return res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`,
      data: { coupon },
    });
  } catch (error) {
    console.error('Toggle coupon error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update coupon status' });
  }
};

export const getCouponRedemptions = async (req, res) => {
  try {
    const redemptions = await CouponRedemption.find({ couponId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'name email phoneNumber')
      .lean();

    return res.status(200).json({ success: true, data: { redemptions } });
  } catch (error) {
    console.error('Get coupon redemptions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch redemptions' });
  }
};
