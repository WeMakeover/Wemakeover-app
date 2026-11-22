/**
 * Seed De-Tan & Bleach services (flat list, no Regular/Premium). No images.
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/seedDetanBleachServices.js
 */
import dotenv from 'dotenv';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';

dotenv.config({ override: true });

const CATEGORY_NAME = 'De-Tan & Bleach';

const SERVICES = [
  { name: 'Face & Neck De-tan', duration: '30 min', price: 399 },
  { name: 'Hand & Leg De-tan', duration: '45 min', price: 599 },
  { name: 'Full Body De-tan', duration: '1 hr 20 min', price: 999 },
  { name: 'Face & Neck Bleach', duration: '30 min', price: 249 },
  { name: 'Hand & Leg Bleach', duration: '45 min', price: 399 },
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
      serviceType: 'Standard',
      legacyCategory: 'Regular',
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
        tags: ['detan', 'bleach'],
      },
    });
    console.log(`✅ ${svc.name} — ${priceDisplay(svc.price)}`);
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
