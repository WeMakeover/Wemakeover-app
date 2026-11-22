/**
 * Seed Waxing Regular + Premium services (no images — upload via admin later).
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/seedWaxingServices.js
 */
import dotenv from 'dotenv';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';

dotenv.config({ override: true });

const CATEGORY_NAME = 'Waxing';

const SERVICES = [
  // Regular
  { name: 'Hand & Leg Honey Waxing', duration: '1hr 05min', price: 599, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Underarms Waxing', duration: '15min', price: 149, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Face Waxing (Peel off)', duration: '15min', price: 249, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Bikini Waxing', duration: '30min', price: 499, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Full Body Waxing (Honey)', duration: '1hr 15min', price: 999, serviceType: 'Standard', legacyCategory: 'Regular' },
  // Premium
  { name: 'Hand & Leg Rica Waxing', duration: '1hr 05min', price: 799, serviceType: 'Premium', legacyCategory: 'Premium' },
  { name: 'Full Body Rica Waxing', duration: '1hr 30min', price: 1599, serviceType: 'Premium', legacyCategory: 'Premium' },
  { name: 'Full Body O3+ Waxing', duration: '1hr 50min', price: 1899, serviceType: 'Premium', legacyCategory: 'Premium' },
  { name: 'Underarms Sanfe/O3+ Peel-off Waxing', duration: '25min', price: 249, serviceType: 'Premium', legacyCategory: 'Premium' },
  { name: 'Bikini Sanfe/O3+ Peel-off Waxing', duration: '45mins', price: 599, serviceType: 'Premium', legacyCategory: 'Premium' },
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

    const data = {
      duration: svc.duration,
      price: svc.price,
      priceDisplay: priceDisplay(svc.price),
      taxIncluded: true,
      serviceType: svc.serviceType,
      legacyCategory: svc.legacyCategory,
      isActive: true,
      isAvailable: true,
    };

    if (existing) {
      await prisma.service.update({ where: { id: existing.id }, data });
      console.log(`⏭️  Updated: ${svc.name}`);
      continue;
    }

    await prisma.service.create({
      data: {
        name: svc.name,
        description: `${svc.name} — professional at-home service.`,
        ...data,
        categoryId: category.id,
        images: [],
        imagePublicIds: [],
        cardType: 'Vertical',
        tags: ['waxing'],
      },
    });
    console.log(`✅ ${svc.name} — ${priceDisplay(svc.price)} [${svc.legacyCategory}]`);
  }

  console.log(`\nDone. Services under ${CATEGORY_NAME}.`);
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
