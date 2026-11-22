import express from 'express';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware.js';
import {
  getMyReferralController,
  validateReferralCodeController,
  claimMilestoneBonusController,
  claimMilestoneFacialController,
} from '../controllers/referral.controller.js';

const referralRouter = express.Router();

/**
 * @route GET /api/referrals/me
 * @desc Own referral code, WM coin balance, invite stats
 */
referralRouter.get('/me', authenticateToken, getMyReferralController);

/**
 * @route POST /api/referrals/milestones/bonus/claim
 * @desc Claim one-time ₹1500 WM Coins after 10 invites
 */
referralRouter.post(
  '/milestones/bonus/claim',
  authenticateToken,
  claimMilestoneBonusController
);

/**
 * @route POST /api/referrals/milestones/facial/claim
 * @desc Claim one-time free Premium Facial after 5 invites
 */
referralRouter.post(
  '/milestones/facial/claim',
  authenticateToken,
  claimMilestoneFacialController
);

/**
 * @route GET /api/referrals/validate?code=
 * @desc Public validation for Register (optionalAuth to block own-code when logged in)
 */
referralRouter.get('/validate', optionalAuth, validateReferralCodeController);

/**
 * @route POST /api/referrals/validate
 * @desc Same as GET, accepts { code } body (handy for clients)
 */
referralRouter.post('/validate', optionalAuth, validateReferralCodeController);

export default referralRouter;
