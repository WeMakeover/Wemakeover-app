/**
 * Seed Manicure & Pedicure Regular + Premium services (no images).
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/seedManicurePedicureServices.js
 */
import dotenv from 'dotenv';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';

dotenv.config({ override: true });

const CATEGORY_NAME = 'Manicure & Pedicure';

const SERVICES = [
  // Regular
  { name: 'Manicure', duration: '40min', price: 399, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Pedicure', duration: '40min', price: 499, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Mani & Pedi Combo', duration: '1hr 30min', price: 749, serviceType: 'Standard', legacyCategory: 'Regular' },
  // Premium (same display names; distinguished by serviceType)
  { name: 'Manicure', duration: '1hr 10min', price: 599, serviceType: 'Premium', legacyCategory: 'Premium' },
  { name: 'Pedicure', duration: '1hr 10min', price: 699, serviceType: 'Premium', legacyCategory: 'Premium' },
  { name: 'Mani & Pedi Combo', duration: '1hr 40min', price: 1099, serviceType: 'Premium', legacyCategory: 'Premium' },
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
        tags: ['manicure', 'pedicure'],
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
