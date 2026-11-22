/**
 * Update MINIMUM_ORDER_VALUE in Neon Postgres.
 * Run: node --experimental-strip-types src/scripts/updateMinimumOrderValue.js
 */

import dotenv from 'dotenv';
import BookingConfig from '../models/bookingConfig.model.js';
import { User } from '../models/user.model.js';
import { connectPostgres, disconnectPostgres } from '../platform/db/postgres.js';
import { deleteCache } from '../uitils/redis/redis.utils.js';
import redis from '../configs/redis.config.js';

dotenv.config();

const TARGET_MOV = 799;
const CONFIG_KEY = 'MINIMUM_ORDER_VALUE';
const CACHE_KEY = `booking:config:${CONFIG_KEY}`;

const getSeedAdminId = async () => {
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  if (admin) return admin._id;

  const anyUser = await User.findOne().select('_id');
  if (anyUser) return anyUser._id;

  throw new Error('No users found — seed an admin first (npm run seed:admin)');
};

const updateMinimumOrderValue = async () => {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set');
  }

  await connectPostgres();
  console.log('✅ Connected to PostgreSQL (Neon)');

  let config = await BookingConfig.findOne({ configKey: CONFIG_KEY });

  if (!config) {
    const adminId = await getSeedAdminId();
    console.log(`⚠️ Config ${CONFIG_KEY} not found — creating with ₹${TARGET_MOV}`);

    config = await BookingConfig.create({
      configKey: CONFIG_KEY,
      value: TARGET_MOV,
      currency: 'INR',
      description: 'Minimum order value required to place a booking',
      isActive: true,
      lastUpdatedBy: adminId,
      metadata: {
        unit: 'rupees',
        displayName: 'Minimum Order Value',
        helpText:
          'Users must add services worth at least this amount to place a booking. This ensures service quality and operational efficiency.',
        validationRules: {
          min: 0,
          max: 10000,
          step: 1,
        },
      },
    });

    console.log(`✅ Created ${CONFIG_KEY} in database with value ₹${TARGET_MOV}`);
  } else {
    const previousValue = config.value;
    console.log(`📋 Current MOV in database: ₹${previousValue}`);

    if (previousValue === TARGET_MOV) {
      console.log(`ℹ️ MOV is already ₹${TARGET_MOV} — no database update needed`);
    } else {
      config._previousValue = previousValue;
      config._updateReason = `Launch threshold update: ${previousValue} → ${TARGET_MOV}`;
      config.value = TARGET_MOV;
      await config.save();
      console.log(`✅ Database updated: ₹${previousValue} → ₹${TARGET_MOV}`);
    }
  }

  try {
    const cacheCleared = await deleteCache(CACHE_KEY);
    console.log(
      cacheCleared
        ? `✅ Redis cache cleared for ${CACHE_KEY}`
        : `ℹ️ Redis cache key ${CACHE_KEY} was not present (already fresh)`,
    );
  } catch (error) {
    console.warn('⚠️ Redis cache clear failed (DB update still applied):', error.message);
  }

  const verified = await BookingConfig.findOne({ configKey: CONFIG_KEY });
  console.log(`🔍 Verified MOV in database: ₹${verified?.value}`);
};

updateMinimumOrderValue()
  .catch((error) => {
    console.error('❌ MOV migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPostgres().catch(() => {});
    redis.disconnect();
    process.exit();
  });
