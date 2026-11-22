import { prisma } from '../platform/db/postgres.js';
import { REFERRAL_CONFIG } from '../configs/referral.config.js';

const normalizeCode = (code) =>
  typeof code === 'string' ? code.trim().toUpperCase().replace(/\s+/g, '') : '';

/** Retire old coupon-based milestone rewards (no longer used). */
async function retireReferralBonusCoupons() {
  await prisma.coupon.updateMany({
    where: {
      code: { in: ['WMREF1000', 'WMREF1500'] },
      isActive: true,
    },
    data: { isActive: false },
  });
}

async function getInviteCounts(userId) {
  const [pendingCount, rewardedCount] = await Promise.all([
    prisma.referral.count({
      where: { referrerId: userId, status: 'pending' },
    }),
    prisma.referral.count({
      where: { referrerId: userId, status: 'rewarded' },
    }),
  ]);
  return {
    pendingCount,
    rewardedCount,
    totalInvites: pendingCount + rewardedCount,
  };
}

async function hasClaimedMilestoneBonus(userId) {
  const existing = await prisma.wmCoinLedgerEntry.findFirst({
    where: { userId, type: 'referral_milestone_bonus' },
    select: { id: true },
  });
  return Boolean(existing);
}

async function hasClaimedMilestoneFacial(userId) {
  const existing = await prisma.wmCoinLedgerEntry.findFirst({
    where: { userId, type: 'referral_milestone_facial' },
    select: { id: true },
  });
  return Boolean(existing);
}

function randomCodeBody(length = REFERRAL_CONFIG.codeBodyLength) {
  const alphabet = REFERRAL_CONFIG.codeAlphabet;
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `${REFERRAL_CONFIG.codePrefix}${randomCodeBody()}`;
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique referral code');
}

/**
 * Ensure the user has a personal referral code (lazy backfill for existing users).
 */
export async function ensureUserHasReferralCode(userId) {
  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: {
      id: true,
      referralCode: true,
      wmCoinBalance: true,
      name: true,
    },
  });

  if (!user) {
    return { success: false, error: 'USER_NOT_FOUND', message: 'User not found' };
  }

  if (user.referralCode) {
    return { success: true, user };
  }

  const referralCode = await generateUniqueReferralCode();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { referralCode },
    select: {
      id: true,
      referralCode: true,
      wmCoinBalance: true,
      name: true,
    },
  });

  return { success: true, user: updated };
}

export function buildShareUrl(referralCode) {
  const code = encodeURIComponent(referralCode);
  // Prefer app deep link for shares from mobile; web URL remains a fallback.
  const appScheme = process.env.REFERRAL_APP_SCHEME || 'wemakeover';
  return `${appScheme}://register?ref=${code}`;
}

export function buildWebShareUrl(referralCode) {
  const base = String(REFERRAL_CONFIG.shareBaseUrl).replace(/\/$/, '');
  return `${base}/register?ref=${encodeURIComponent(referralCode)}`;
}

/**
 * Validate a referral code for use at Register.
 * @param {string} code
 * @param {{ excludeUserId?: string }} [opts]
 */
export async function validateReferralCode(code, opts = {}) {
  const normalized = normalizeCode(code);

  if (!normalized) {
    return { valid: false, message: 'Referral code is required' };
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: normalized },
    select: {
      id: true,
      name: true,
      referralCode: true,
      isActive: true,
    },
  });

  if (!referrer || !referrer.isActive) {
    return { valid: false, message: 'Invalid referral code' };
  }

  if (opts.excludeUserId && String(referrer.id) === String(opts.excludeUserId)) {
    return { valid: false, message: 'You cannot use your own referral code' };
  }

  return {
    valid: true,
    message: 'Referral code applied successfully',
    referrer: {
      id: referrer.id,
      name: referrer.name,
      referralCode: referrer.referralCode,
    },
  };
}

/**
 * Apply referral code to a newly registered user (one-time, register only).
 */
export async function applyReferralCode({ refereeUserId, code }) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { success: false, error: 'CODE_REQUIRED', message: 'Referral code is required' };
  }

  const validation = await validateReferralCode(normalized, {
    excludeUserId: refereeUserId,
  });

  if (!validation.valid) {
    return { success: false, error: 'INVALID_CODE', message: validation.message };
  }

  const referee = await prisma.user.findUnique({
    where: { id: String(refereeUserId) },
    select: { id: true, referredById: true },
  });

  if (!referee) {
    return { success: false, error: 'USER_NOT_FOUND', message: 'User not found' };
  }

  if (referee.referredById) {
    return {
      success: false,
      error: 'ALREADY_REFERRED',
      message: 'A referral code has already been applied to this account',
    };
  }

  const existing = await prisma.referral.findUnique({
    where: { refereeId: referee.id },
    select: { id: true },
  });

  if (existing) {
    return {
      success: false,
      error: 'ALREADY_REFERRED',
      message: 'A referral code has already been applied to this account',
    };
  }

  const rewardAmountEach = REFERRAL_CONFIG.rewardAmountEach;

  const referral = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: referee.id },
      data: { referredById: validation.referrer.id },
    });

    return tx.referral.create({
      data: {
        referrerId: validation.referrer.id,
        refereeId: referee.id,
        referralCode: normalized,
        status: 'pending',
        rewardAmountEach,
      },
    });
  });

  // Auto-credit 10-invite WM Coins milestone for the referrer (idempotent).
  claimMilestoneBonus(validation.referrer.id).catch(() => {});

  return {
    success: true,
    message: validation.message,
    referral,
    referrer: validation.referrer,
  };
}

/**
 * After a booking is marked completed: if it’s the friend’s first completed
 * booking and they have a pending referral, credit ₹200 WM Coins to both sides.
 */
export async function processReferralOnBookingCompleted(bookingId) {
  if (!bookingId) {
    return { success: false, skipped: true, reason: 'NO_BOOKING_ID' };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: String(bookingId) },
    select: { id: true, userId: true, status: true },
  });

  if (!booking) {
    return { success: false, skipped: true, reason: 'BOOKING_NOT_FOUND' };
  }

  if (booking.status !== 'completed') {
    return { success: false, skipped: true, reason: 'NOT_COMPLETED' };
  }

  const referral = await prisma.referral.findUnique({
    where: { refereeId: booking.userId },
  });

  if (!referral) {
    return { success: true, skipped: true, reason: 'NO_REFERRAL' };
  }

  if (referral.status === 'rewarded') {
    return { success: true, skipped: true, reason: 'ALREADY_REWARDED' };
  }

  if (referral.status !== 'pending') {
    return { success: true, skipped: true, reason: `STATUS_${referral.status}` };
  }

  const completedCount = await prisma.booking.count({
    where: {
      userId: booking.userId,
      status: 'completed',
    },
  });

  // Only the friend’s first completed booking qualifies.
  if (completedCount !== 1) {
    return { success: true, skipped: true, reason: 'NOT_FIRST_COMPLETED' };
  }

  const amount = referral.rewardAmountEach || REFERRAL_CONFIG.rewardAmountEach;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-check inside transaction for race safety
      const locked = await tx.referral.findUnique({
        where: { id: referral.id },
      });

      if (!locked || locked.status !== 'pending') {
        return { skipped: true, reason: 'RACE_ALREADY_PROCESSED' };
      }

      const referrer = await tx.user.findUnique({
        where: { id: locked.referrerId },
        select: { id: true, wmCoinBalance: true },
      });
      const referee = await tx.user.findUnique({
        where: { id: locked.refereeId },
        select: { id: true, wmCoinBalance: true },
      });

      if (!referrer || !referee) {
        throw new Error('Referral parties not found');
      }

      const referrerBalance = (referrer.wmCoinBalance || 0) + amount;
      const refereeBalance = (referee.wmCoinBalance || 0) + amount;

      await tx.user.update({
        where: { id: referrer.id },
        data: { wmCoinBalance: referrerBalance },
      });
      await tx.user.update({
        where: { id: referee.id },
        data: { wmCoinBalance: refereeBalance },
      });

      await tx.wmCoinLedgerEntry.create({
        data: {
          userId: referrer.id,
          amount,
          balanceAfter: referrerBalance,
          type: 'referral_reward_referrer',
          referralId: locked.id,
          bookingId: booking.id,
          note: `Refer & Earn: ₹${amount} for friend’s first completed booking`,
        },
      });

      await tx.wmCoinLedgerEntry.create({
        data: {
          userId: referee.id,
          amount,
          balanceAfter: refereeBalance,
          type: 'referral_reward_referee',
          referralId: locked.id,
          bookingId: booking.id,
          note: `Refer & Earn: ₹${amount} welcome reward on first completed booking`,
        },
      });

      const updatedReferral = await tx.referral.update({
        where: { id: locked.id },
        data: {
          status: 'rewarded',
          qualifyingBookingId: booking.id,
          rewardedAt: new Date(),
        },
      });

      return {
        skipped: false,
        referral: updatedReferral,
        referrerBalance,
        refereeBalance,
        amount,
      };
    });

    if (result.skipped) {
      return { success: true, skipped: true, reason: result.reason };
    }

    console.log(
      `✅ Referral rewarded: referral=${result.referral.id} booking=${booking.id} amount=${result.amount}`
    );

    return { success: true, skipped: false, data: result };
  } catch (error) {
    console.error('Referral reward failed:', error);
    return {
      success: false,
      skipped: false,
      error: error.message,
      message: 'Failed to process referral reward',
    };
  }
}

/**
 * One-time claim: ₹1500 WM Coins after 10 invites.
 */
export async function claimMilestoneBonus(userId) {
  if (!userId) {
    return { success: false, message: 'Authentication required' };
  }

  const { target, wmCoinAmount } = REFERRAL_CONFIG.milestones.bonus;
  const amount = Math.round(wmCoinAmount) || 1500;

  const { totalInvites } = await getInviteCounts(userId);
  if (totalInvites < target) {
    return {
      success: false,
      message: `Invite ${target} friends to unlock this bonus`,
      data: { invited: totalInvites, target },
    };
  }

  if (await hasClaimedMilestoneBonus(userId)) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { wmCoinBalance: true },
    });
    return {
      success: false,
      alreadyClaimed: true,
      message: 'Bonus already claimed',
      data: {
        wmCoinBalance: user?.wmCoinBalance || 0,
        claimed: true,
        amount,
      },
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.wmCoinLedgerEntry.findFirst({
        where: { userId, type: 'referral_milestone_bonus' },
        select: { id: true },
      });
      if (existing) {
        return { alreadyClaimed: true };
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, wmCoinBalance: true },
      });
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const balanceAfter = (user.wmCoinBalance || 0) + amount;
      await tx.user.update({
        where: { id: user.id },
        data: { wmCoinBalance: balanceAfter },
      });
      await tx.wmCoinLedgerEntry.create({
        data: {
          userId: user.id,
          amount,
          balanceAfter,
          type: 'referral_milestone_bonus',
          note: `Refer & Earn milestone: ₹${amount} WM Coins for inviting ${target} friends`,
        },
      });

      return { balanceAfter };
    });

    if (result.alreadyClaimed) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { wmCoinBalance: true },
      });
      return {
        success: false,
        alreadyClaimed: true,
        message: 'Bonus already claimed',
        data: {
          wmCoinBalance: user?.wmCoinBalance || 0,
          claimed: true,
          amount,
        },
      };
    }

    // Best-effort: stop serving legacy milestone coupons.
    await retireReferralBonusCoupons().catch(() => {});

    return {
      success: true,
      message: `₹${amount} WM Coins credited`,
      data: {
        amount,
        wmCoinBalance: result.balanceAfter,
        claimed: true,
      },
    };
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' };
    }
    console.error('claimMilestoneBonus failed:', error);
    return {
      success: false,
      message: 'Failed to claim milestone bonus',
      error: error.message,
    };
  }
}

/**
 * One-time claim: free Premium Facial (O3+ Cleanup) after 5 invites.
 * Marks reward as used so the app can hide the Add button permanently.
 */
export async function claimMilestoneFacial(userId) {
  if (!userId) {
    return { success: false, message: 'Authentication required' };
  }

  const facial = REFERRAL_CONFIG.milestones.facial;
  const { totalInvites } = await getInviteCounts(userId);
  if (totalInvites < facial.target) {
    return {
      success: false,
      message: `Invite ${facial.target} friends to unlock this reward`,
      data: { invited: totalInvites, target: facial.target },
    };
  }

  if (await hasClaimedMilestoneFacial(userId)) {
    return {
      success: false,
      alreadyClaimed: true,
      message: 'Free Premium Facial already claimed',
      data: {
        claimed: true,
        serviceName: facial.serviceName,
        serviceType: facial.serviceType,
        categoryName: facial.categoryName,
      },
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.wmCoinLedgerEntry.findFirst({
        where: { userId, type: 'referral_milestone_facial' },
        select: { id: true },
      });
      if (existing) {
        return { alreadyClaimed: true };
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, wmCoinBalance: true },
      });
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      await tx.wmCoinLedgerEntry.create({
        data: {
          userId: user.id,
          amount: 0,
          balanceAfter: user.wmCoinBalance || 0,
          type: 'referral_milestone_facial',
          note: `Refer & Earn milestone: Free ${facial.serviceName} (${facial.serviceType}) for inviting ${facial.target} friends`,
        },
      });

      return { ok: true };
    });

    if (result.alreadyClaimed) {
      return {
        success: false,
        alreadyClaimed: true,
        message: 'Free Premium Facial already claimed',
        data: {
          claimed: true,
          serviceName: facial.serviceName,
          serviceType: facial.serviceType,
          categoryName: facial.categoryName,
        },
      };
    }

    return {
      success: true,
      message: 'Free Premium Facial unlocked',
      data: {
        claimed: true,
        serviceName: facial.serviceName,
        serviceType: facial.serviceType,
        categoryName: facial.categoryName,
      },
    };
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' };
    }
    console.error('claimMilestoneFacial failed:', error);
    return {
      success: false,
      message: 'Failed to claim free facial reward',
      error: error.message,
    };
  }
}

/**
 * Spend WM Coins against product subtotal (never against platform fee).
 * Call after booking is created so bookingId can be linked.
 */
export async function redeemWmCoins(userId, amount, { bookingId } = {}) {
  const redeemAmount = Math.max(0, Math.round(Number(amount) || 0));
  if (!userId || redeemAmount <= 0) {
    return { success: true, skipped: true, amount: 0 };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, wmCoinBalance: true },
      });
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const balance = user.wmCoinBalance || 0;
      if (balance < redeemAmount) {
        throw new Error('INSUFFICIENT_WM_COINS');
      }

      const balanceAfter = balance - redeemAmount;
      await tx.user.update({
        where: { id: user.id },
        data: { wmCoinBalance: balanceAfter },
      });
      await tx.wmCoinLedgerEntry.create({
        data: {
          userId: user.id,
          amount: -redeemAmount,
          balanceAfter,
          type: 'redeem',
          bookingId: bookingId || null,
          note: `Redeemed ₹${redeemAmount} WM Coins on booking`,
        },
      });

      return { balanceAfter };
    });

    return {
      success: true,
      data: {
        amount: redeemAmount,
        wmCoinBalance: result.balanceAfter,
      },
    };
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' };
    }
    if (error.message === 'INSUFFICIENT_WM_COINS') {
      return {
        success: false,
        message: 'Insufficient WM Coins balance',
        error: 'INSUFFICIENT_WM_COINS',
      };
    }
    console.error('redeemWmCoins failed:', error);
    return {
      success: false,
      message: 'Failed to redeem WM Coins',
      error: error.message,
    };
  }
}

/**
 * Profile payload for Refer & Earn screen / Account.
 */
export async function getReferralProfile(userId) {
  const ensured = await ensureUserHasReferralCode(userId);
  if (!ensured.success) {
    return ensured;
  }

  const { user } = ensured;

  const [counts, recentRewards, bonusClaimedInitial, facialClaimed] = await Promise.all([
    getInviteCounts(user.id),
    prisma.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        referralCode: true,
        rewardAmountEach: true,
        rewardedAt: true,
        createdAt: true,
        referee: { select: { id: true, name: true } },
      },
    }),
    hasClaimedMilestoneBonus(user.id),
    hasClaimedMilestoneFacial(user.id),
  ]);

  const { pendingCount, rewardedCount, totalInvites } = counts;
  const { facial, bonus, goalInvites } = REFERRAL_CONFIG.milestones;

  // Auto-credit ₹1500 WM Coins once the user hits 10 invites (idempotent).
  let wmCoinBalance = user.wmCoinBalance || 0;
  let bonusClaimed = bonusClaimedInitial;
  let bonusJustCredited = false;
  if (totalInvites >= bonus.target && !bonusClaimed) {
    const credited = await claimMilestoneBonus(user.id);
    if (credited?.success || credited?.alreadyClaimed) {
      bonusClaimed = true;
      if (credited?.data?.wmCoinBalance != null) {
        wmCoinBalance = credited.data.wmCoinBalance;
      }
      bonusJustCredited = Boolean(credited?.success);
    }
  }

  // Fire-and-forget cleanup of old coupon rewards.
  retireReferralBonusCoupons().catch(() => {});

  return {
    success: true,
    data: {
      referralCode: user.referralCode,
      shareUrl: buildShareUrl(user.referralCode),
      webShareUrl: buildWebShareUrl(user.referralCode),
      wmCoinBalance,
      rewardAmountEach: REFERRAL_CONFIG.rewardAmountEach,
      stats: {
        pending: pendingCount,
        rewarded: rewardedCount,
        totalInvites,
      },
      milestones: {
        goalInvites,
        invited: totalInvites,
        facial: {
          target: facial.target,
          unlocked: totalInvites >= facial.target,
          claimed: facialClaimed,
          serviceName: facial.serviceName,
          serviceType: facial.serviceType,
          categoryName: facial.categoryName,
        },
        bonus: {
          target: bonus.target,
          unlocked: totalInvites >= bonus.target,
          amount: bonus.wmCoinAmount,
          claimed: bonusClaimed,
          justCredited: bonusJustCredited,
        },
      },
      referrals: recentRewards.map((r) => ({
        id: r.id,
        status: r.status,
        friendName: r.referee?.name || 'Friend',
        rewardAmountEach: r.rewardAmountEach,
        rewardedAt: r.rewardedAt,
        createdAt: r.createdAt,
      })),
    },
  };
}
