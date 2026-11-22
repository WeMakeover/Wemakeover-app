/**
 * Seed Facial & Cleanup services (no images — upload via admin later).
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/seedFacialCleanupServices.js
 */
import dotenv from 'dotenv';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';

dotenv.config({ override: true });

const CATEGORY_NAME = 'Facial & Cleanup';

const SERVICES = [
  { name: 'Refreshing Fruit Facial', duration: '45min', price: 699 },
  { name: 'Refreshing Cleanup', duration: '45min', price: 599 },
  { name: 'Aroma Magic Bridal Glow Facial', duration: '45min', price: 799 },
  { name: 'Aroma Magic Skin Glow Facial', duration: '45min', price: 799 },
  { name: 'Rice Water Facial', duration: '45mins', price: 599 },
  { name: 'Mama Earth Ubtan Facial', duration: '45mins', price: 799 },
  { name: 'Mama Earth Vit-C Facial', duration: '45mins', price: 799 },
  { name: 'VLCC De-Tan Facial', duration: '45mins', price: 799 },
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

  const created = [];
  for (const svc of SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { categoryId: category.id, name: svc.name },
    });
    if (existing) {
      console.log(`⏭️  Exists: ${svc.name}`);
      created.push({ id: existing.id, name: existing.name, skipped: true });
      continue;
    }

    const row = await prisma.service.create({
      data: {
        name: svc.name,
        description: `${svc.name} — professional at-home service.`,
        price: svc.price,
        priceDisplay: priceDisplay(svc.price),
        taxIncluded: true,
        duration: svc.duration,
        categoryId: category.id,
        legacyCategory: 'Regular',
        serviceType: 'Standard',
        images: [],
        imagePublicIds: [],
        isActive: true,
        isAvailable: true,
        cardType: 'Vertical',
        tags: ['facial', 'cleanup'],
      },
    });

    console.log(`✅ ${row.name} — ${row.priceDisplay}`);
    created.push({ id: row.id, name: row.name, price: row.price });
  }

  console.log(`\nDone. ${created.length} services under ${CATEGORY_NAME}.`);
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
