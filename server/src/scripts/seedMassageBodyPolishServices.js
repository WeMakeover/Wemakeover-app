/**
 * Seed Massage & Body Polish Regular + Premium services (no images).
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/seedMassageBodyPolishServices.js
 */
import dotenv from 'dotenv';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';

dotenv.config({ override: true });

const CATEGORY_NAME = 'Massage & Body Polish';

const SERVICES = [
  // Regular
  { name: 'Head & Neck Massage', duration: '25min', price: 299, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Relaxing Foot Massage', duration: '20min', price: 199, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Full Body Massage', duration: '1hr 05min', price: 999, serviceType: 'Standard', legacyCategory: 'Regular' },
  // Premium
  { name: 'Full Body Massage', duration: '1hr 45min', price: 1499, serviceType: 'Premium', legacyCategory: 'Premium' },
  { name: 'Full Body Polish+Detan', duration: '2hr 10min', price: 2199, serviceType: 'Premium', legacyCategory: 'Premium' },
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
      where: {
        categoryId: category.id,
        name: svc.name,
        serviceType: svc.serviceType,
      },
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
      console.log(`⏭️  Updated: ${svc.name} [${svc.legacyCategory}]`);
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
        tags: ['massage', 'body-polish'],
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
