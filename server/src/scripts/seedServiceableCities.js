/**
 * Seed serviceable cities into Neon Postgres.
 * Run: node --experimental-strip-types src/scripts/seedServiceableCities.js
 */

import dotenv from 'dotenv';
import ServiceableCity from '../models/serviceableCity.model.js';
import { User } from '../models/user.model.js';
import { connectPostgres, disconnectPostgres } from '../platform/db/postgres.js';

dotenv.config();

const initialCities = [
  {
    city: 'Gaya',
    state: 'Bihar',
    country: 'India',
    displayName: 'Gaya, Bihar',
    priority: 10,
    isActive: true,
    description:
      'Gaya is one of our primary service locations offering comprehensive beauty and wellness services.',
    coveragePincodes: ['823001', '823002', '823003', '823004'],
    launchDate: new Date('2024-01-01'),
    notes: 'Initial launch city - Full service coverage',
  },
  {
    city: 'Patna',
    state: 'Bihar',
    country: 'India',
    displayName: 'Patna, Bihar',
    priority: 9,
    isActive: true,
    description:
      'Patna, the capital city of Bihar, is served with premium beauty and wellness services.',
    coveragePincodes: [
      '800001',
      '800002',
      '800003',
      '800004',
      '800005',
      '800006',
      '800007',
      '800008',
    ],
    launchDate: new Date('2024-01-15'),
    notes: 'Capital city - Expanding service coverage',
  },
];

const seedServiceableCities = async () => {
  try {
    console.log('🌱 [Seed] Starting serviceable cities seed...');

    if (!process.env.DATABASE_URL?.trim()) {
      throw new Error('DATABASE_URL is not set');
    }

    await connectPostgres();
    console.log('✅ [Seed] Connected to PostgreSQL (Neon)');

    const admin = await User.findOne({ role: 'admin' });
    const createdBy = admin?._id || null;

    for (const cityData of initialCities) {
      const existing = await ServiceableCity.findOne({
        city: cityData.city,
        state: cityData.state,
      });

      if (existing) {
        console.log(`ℹ️ [Seed] Already exists: ${cityData.city}, ${cityData.state}`);
        continue;
      }

      const city = await ServiceableCity.create({
        ...cityData,
        createdBy,
        updatedBy: createdBy,
      });
      console.log(`✓ [Seed] Inserted ${city.city}, ${city.state}`);
    }

    console.log('🎉 [Seed] Seed completed successfully!');
  } catch (error) {
    console.error('❌ [Seed] Error during seeding:', error);
    process.exitCode = 1;
  } finally {
    await disconnectPostgres().catch(() => {});
    process.exit();
  }
};

seedServiceableCities();
