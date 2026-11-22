/**
 * Seed Facial & Cleanup Premium services (no images — upload via admin later).
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/seedFacialPremiumServices.js
 */
import dotenv from 'dotenv';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';

dotenv.config({ override: true });

const CATEGORY_NAME = 'Facial & Cleanup';

const SERVICES = [
  { name: 'O3+ Shine & Glow Facial', duration: '1hr 10min', price: 1299 },
  { name: 'Raaga Gold Facial', duration: '1hr 10min', price: 1199 },
  { name: 'Raaga Anti-Ageing Facial', duration: '1hr 10min', price: 1199 },
  { name: 'Raaga Fairness Facial', duration: '1hr 10min', price: 1199 },
  { name: 'O3+ Cleanup', duration: '50min', price: 999 },
];

function priceDisplay(price) {
  return `₹${Number(price).toFixed(2)}`;
}

async function main() {
  await connectPostgres();

  const category = await prisma.category.findFirst({
    where: { name: CATEGORY_NAME },
  });
  if (!category) {
    throw new Error(`Category "${CATEGORY_NAME}" not found`);
  }

  for (const svc of SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { categoryId: category.id, name: svc.name },
    });

    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          duration: svc.duration,
          price: svc.price,
          priceDisplay: priceDisplay(svc.price),
          taxIncluded: true,
          serviceType: 'Premium',
          legacyCategory: 'Premium',
          isActive: true,
          isAvailable: true,
        },
      });
      console.log(`⏭️  Updated: ${svc.name}`);
      continue;
    }

    await prisma.service.create({
      data: {
        name: svc.name,
        description: `${svc.name} — professional at-home service.`,
        price: svc.price,
        priceDisplay: priceDisplay(svc.price),
        taxIncluded: true,
        duration: svc.duration,
        categoryId: category.id,
        legacyCategory: 'Premium',
        serviceType: 'Premium',
        images: [],
        imagePublicIds: [],
        isActive: true,
        isAvailable: true,
        cardType: 'Vertical',
        tags: ['facial', 'cleanup', 'premium'],
      },
    });
    console.log(`✅ ${svc.name} — ${priceDisplay(svc.price)}`);
  }

  console.log(`\nDone. Premium services under ${CATEGORY_NAME}.`);
  await disconnectPostgres();
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  try {
    await disconnectPostgres();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
