/**
 * Dev helper: ensure a user has at least N referral invites (pending),
 * then auto-credit fires on next getReferralProfile (Refer & Earn open).
 *
 * Usage:
 *   node --experimental-strip-types src/scripts/bumpReferralInvitesForTest.js
 *   node --experimental-strip-types src/scripts/bumpReferralInvitesForTest.js --user=<uuid>
 *   node --experimental-strip-types src/scripts/bumpReferralInvitesForTest.js --target=10
 */
import { prisma } from '../platform/db/postgres.js';
import { REFERRAL_CONFIG } from '../configs/referral.config.js';

function argValue(prefix) {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function resolveUser(userId) {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        referralCode: true,
        wmCoinBalance: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new Error(`User not found: ${userId}`);
    return user;
  }

  const user = await prisma.user.findFirst({
    where: { role: 'user', isActive: true },
    orderBy: [{ lastLoginAt: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      referralCode: true,
      wmCoinBalance: true,
      lastLoginAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new Error('No active app user found');
  return user;
}

async function main() {
  const target = Math.max(1, Number(argValue('--target=') || REFERRAL_CONFIG.milestones.bonus.target || 10));
  const userIdArg = argValue('--user=');
  const user = await resolveUser(userIdArg);

  const existing = await prisma.referral.count({
    where: { referrerId: user.id },
  });
  const need = Math.max(0, target - existing);

  console.log(
    JSON.stringify(
      {
        selected: {
          id: user.id,
          name: user.name,
          wmCoinBalance: user.wmCoinBalance,
          referralCode: user.referralCode,
          existingInvites: existing,
          target,
          willCreate: need,
        },
      },
      null,
      2
    )
  );

  if (need === 0) {
    console.log('Already at/above target. Open Refer & Earn to auto-credit if not claimed.');
    return;
  }

  const code = user.referralCode || `TEST${user.id.slice(0, 6).toUpperCase()}`;
  if (!user.referralCode) {
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code },
    });
  }

  const stamp = Date.now();
  for (let i = 0; i < need; i += 1) {
    const email = `test.invite.${stamp}.${i}@example.invalid`;
    const referee = await prisma.user.create({
      data: {
        name: `Test Invite ${i + 1}`,
        email,
        role: 'user',
        isVerified: true,
        isActive: true,
        referredById: user.id,
      },
      select: { id: true },
    });

    await prisma.referral.create({
      data: {
        referrerId: user.id,
        refereeId: referee.id,
        referralCode: code,
        status: 'pending',
        rewardAmountEach: REFERRAL_CONFIG.rewardAmountEach ?? 200,
      },
    });
  }

  const after = await prisma.referral.count({ where: { referrerId: user.id } });
  console.log(JSON.stringify({ done: true, invitesNow: after }, null, 2));
  console.log('Open Refer & Earn in the app (pull to refresh) to auto-add ₹1500 WM Coins.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
