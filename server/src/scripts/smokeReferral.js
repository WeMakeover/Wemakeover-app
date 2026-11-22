/**
 * Smoke-test Refer & Earn Phase 2 logic (no HTTP server required).
 * Usage: node --experimental-strip-types src/scripts/smokeReferral.js
 *
 * Creates two temp users, applies referral, creates a completed booking,
 * runs reward processor, then cleans up.
 */

import 'dotenv/config';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';
import {
  ensureUserHasReferralCode,
  applyReferralCode,
  validateReferralCode,
  processReferralOnBookingCompleted,
  getReferralProfile,
} from '../services/referral.service.js';
import { REFERRAL_CONFIG } from '../configs/referral.config.js';

const stamp = Date.now();

async function createUser(label) {
  return prisma.user.create({
    data: {
      name: `Smoke ${label}`,
      email: `smoke.referral.${label}.${stamp}@example.com`,
      phoneNumber: `9${String(stamp).slice(-9)}`.slice(0, 10),
      isVerified: true,
      role: 'user',
    },
  });
}

async function main() {
  console.log('Connecting…');
  await connectPostgres();
  console.log('Reward amount:', REFERRAL_CONFIG.rewardAmountEach);

  let referrer;
  let referee;
  let booking;

  try {
    referrer = await createUser('referrer');
    // Ensure unique phone for second user
    referee = await prisma.user.create({
      data: {
        name: 'Smoke referee',
        email: `smoke.referral.referee.${stamp}@example.com`,
        phoneNumber: `8${String(stamp).slice(-9)}`.slice(0, 10),
        isVerified: true,
        role: 'user',
      },
    });

    const codeResult = await ensureUserHasReferralCode(referrer.id);
    if (!codeResult.success || !codeResult.user.referralCode) {
      throw new Error('Failed to assign referral code to referrer');
    }
    const code = codeResult.user.referralCode;
    console.log('Referrer code:', code);

    const validation = await validateReferralCode(code);
    if (!validation.valid) throw new Error(`Validate failed: ${validation.message}`);
    console.log('Validate OK');

    const applied = await applyReferralCode({ refereeUserId: referee.id, code });
    if (!applied.success) throw new Error(`Apply failed: ${applied.message}`);
    console.log('Applied OK, referral id:', applied.referral.id);

    await ensureUserHasReferralCode(referee.id);

    booking = await prisma.booking.create({
      data: {
        orderNumber: `SMOKE-REF-${stamp}`,
        userId: referee.id,
        status: 'completed',
        paymentStatus: 'completed',
        bookingDetails: { date: new Date().toISOString(), slot: '10:00-11:00' },
        pricing: {
          subtotal: 500,
          taxAmount: 0,
          platformFee: 150,
          totalAmount: 650,
          currency: 'INR',
        },
      },
    });

    const reward = await processReferralOnBookingCompleted(booking.id);
    console.log('Reward result:', JSON.stringify(reward, null, 2));

    if (!reward.success || reward.skipped) {
      throw new Error(`Expected reward, got: ${JSON.stringify(reward)}`);
    }

    const [refreshedReferrer, refreshedReferee, profile] = await Promise.all([
      prisma.user.findUnique({ where: { id: referrer.id } }),
      prisma.user.findUnique({ where: { id: referee.id } }),
      getReferralProfile(referrer.id),
    ]);

    console.log('Referrer balance:', refreshedReferrer.wmCoinBalance);
    console.log('Referee balance:', refreshedReferee.wmCoinBalance);
    console.log('Profile stats:', profile.data?.stats);
    console.log('Share URL:', profile.data?.shareUrl);

    if (refreshedReferrer.wmCoinBalance !== REFERRAL_CONFIG.rewardAmountEach) {
      throw new Error('Referrer balance mismatch');
    }
    if (refreshedReferee.wmCoinBalance !== REFERRAL_CONFIG.rewardAmountEach) {
      throw new Error('Referee balance mismatch');
    }

    // Regression: auth.service signup must return a user id (referral attach depends on it)
    const { signup } = await import('../services/auth.service.js');
    const signupUser = await signup({
      name: 'Smoke Signup Path',
      email: `smoke.referral.signup.${stamp}@example.com`,
      phoneNumber: `7${String(stamp).slice(-9)}`.slice(0, 10),
      password: 'TestPass1!',
    });
    const signupId = signupUser?._id || signupUser?.id;
    if (!signupId) {
      throw new Error('auth.service signup did not return user id — referral attach would fail');
    }
    console.log('Signup returns id OK:', signupId);
    await prisma.user.delete({ where: { id: String(signupId) } }).catch(() => {});

    // Idempotency: second call should skip
    const again = await processReferralOnBookingCompleted(booking.id);
    if (!again.skipped) throw new Error('Expected second reward call to skip');
    console.log('Idempotent skip OK');

    console.log('\n✅ Referral Phase 2 smoke test passed');
  } finally {
    // Cleanup in dependency order
    if (booking?.id) {
      await prisma.wmCoinLedgerEntry.deleteMany({ where: { bookingId: booking.id } }).catch(() => {});
      await prisma.booking.delete({ where: { id: booking.id } }).catch(() => {});
    }
    if (referee?.id) {
      await prisma.referral.deleteMany({ where: { refereeId: referee.id } }).catch(() => {});
      await prisma.wmCoinLedgerEntry.deleteMany({ where: { userId: referee.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: referee.id } }).catch(() => {});
    }
    if (referrer?.id) {
      await prisma.wmCoinLedgerEntry.deleteMany({ where: { userId: referrer.id } }).catch(() => {});
      await prisma.referral.deleteMany({ where: { referrerId: referrer.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: referrer.id } }).catch(() => {});
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Smoke test failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPostgres().catch(() => {});
  });
