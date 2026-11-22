/**
 * Seed the first admin user into Neon Postgres (Phase 2 auth).
 *
 * Usage (from server/):
 *   npm run seed:admin
 *
 * Optional env:
 *   ADMIN_EMAIL / ADMIN_PHONE_NUMBER / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME
 */

import dotenv from 'dotenv';
import { connectPostgres, disconnectPostgres } from '../platform/db/postgres.js';
import { User } from '../models/user.model.js';

dotenv.config({ override: true });

function generatePassword() {
  const base = 'Wm';
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${base}@${suffix}1`;
}

async function seedAdminUser() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('❌ DATABASE_URL is not set in server/.env');
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) {
    console.error('❌ ADMIN_EMAIL is not set in server/.env');
    process.exit(1);
  }

  const phone = (process.env.ADMIN_PHONE_NUMBER || '').trim();
  const password = (process.env.SEED_ADMIN_PASSWORD || '').trim() || generatePassword();
  const name = (process.env.SEED_ADMIN_NAME || 'Wemakeover Admin').trim();

  if (password.length < 6) {
    console.error('❌ SEED_ADMIN_PASSWORD must be at least 6 characters');
    process.exit(1);
  }

  try {
    await connectPostgres();
    console.log('✅ PostgreSQL (Neon) connected');

    const existing = await User.findOne({ email }).select('+password role isVerfied isActive');
    if (existing?.role === 'admin') {
      console.log(`ℹ️  Admin already exists for ${email}`);
      console.log('   Use the existing password or reset via forgot-password / SEED_ADMIN_PASSWORD re-run after delete.');
      return;
    }

    if (existing) {
      existing.role = 'admin';
      existing.isVerfied = true;
      existing.isActive = true;
      existing.password = password;
      await existing.save();
      console.log(`✅ Promoted existing user to admin: ${email}`);
    } else {
      const admin = new User({
        name,
        email,
        ...(phone.length === 10 ? { phoneNumber: phone } : {}),
        password,
        role: 'admin',
        isVerfied: true,
        isActive: true,
      });
      await admin.save();
      console.log(`✅ Admin user created: ${email}`);
    }

    console.log('');
    console.log('── Login credentials (save these) ──');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('   Admin URL: http://localhost:5173/auth/login');
    console.log('──────────────────────────────────');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await disconnectPostgres();
  }
}

seedAdminUser();
