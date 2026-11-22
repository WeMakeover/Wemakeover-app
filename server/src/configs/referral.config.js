/**
 * Refer & Earn — product rules.
 *
 * Per-referral reward: ₹200 WM Coins each (referrer + friend)
 * Trigger: friend’s first booking status = completed
 * Code applied: Register only
 * Destination: WM Coins balance + ledger
 * Milestones (UI): 5 invites → free O3+ Cleanup; 10 invites → ₹1500 WM Coins (one-time claim)
 */

export const REFERRAL_CONFIG = {
  rewardAmountEach: Number(process.env.REFERRAL_REWARD_AMOUNT) || 200,
  codePrefix: 'WM',
  codeBodyLength: 6,
  /** Characters used in referral codes (no 0/O/1/I to reduce confusion). */
  codeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  shareBaseUrl:
    process.env.REFERRAL_SHARE_BASE_URL ||
    process.env.CLIENT_URL ||
    'https://wemakeover.co.in',
  /** Milestone rewards (UI + claim actions). */
  milestones: {
    goalInvites: 10,
    facial: {
      target: 5,
      serviceName: 'O3+ Cleanup',
      serviceType: 'Premium',
      categoryName: 'Facial & Cleanup',
    },
    bonus: {
      target: 10,
      wmCoinAmount: Number(process.env.REFERRAL_MILESTONE_BONUS_AMOUNT) || 1500,
    },
  },
};

export default REFERRAL_CONFIG;
