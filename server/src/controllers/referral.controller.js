import {
  getReferralProfile,
  validateReferralCode,
  claimMilestoneBonus,
  claimMilestoneFacial,
} from '../services/referral.service.js';

export const getMyReferralController = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await getReferralProfile(userId);
    if (!result.success) {
      const status = result.error === 'USER_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: result.message || 'Failed to load referral profile',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('getMyReferralController error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load referral profile',
    });
  }
};

export const claimMilestoneBonusController = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await claimMilestoneBonus(userId);
    if (!result.success) {
      const status = result.alreadyClaimed ? 409 : result.error === 'USER_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: result.message || 'Failed to claim bonus',
        data: result.data || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('claimMilestoneBonusController error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to claim milestone bonus',
    });
  }
};

export const claimMilestoneFacialController = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await claimMilestoneFacial(userId);
    if (!result.success) {
      const status = result.alreadyClaimed ? 409 : result.error === 'USER_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: result.message || 'Failed to claim facial reward',
        data: result.data || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('claimMilestoneFacialController error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to claim free facial reward',
    });
  }
};

export const validateReferralCodeController = async (req, res) => {
  try {
    const code = req.query.code ?? req.body?.code;
    const excludeUserId = req.user?.id || req.user?._id || undefined;

    const result = await validateReferralCode(code, { excludeUserId });

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
        referrerName: result.referrer.name,
        referralCode: result.referrer.referralCode,
      },
    });
  } catch (error) {
    console.error('validateReferralCodeController error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate referral code',
    });
  }
};
