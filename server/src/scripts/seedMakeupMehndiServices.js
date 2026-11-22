/**
 * Seed Makeup & Mehndi services (no images — upload via admin later).
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/seedMakeupMehndiServices.js
 */
import dotenv from 'dotenv';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';

dotenv.config({ override: true });

const CATEGORY_NAME = 'Makeup & Mehndi';

const SERVICES = [
  // Regular
  { name: 'Party Makeup', duration: '1hr 45min', price: 2499, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Regular Mehndi (Both hands)', duration: '30min', price: 499, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Premium Mehndi (Both hands)', duration: '60min', price: 999, serviceType: 'Standard', legacyCategory: 'Regular' },
  { name: 'Bridal Mehndi (Both hand & leg)', duration: '3hr 30mins', price: 5100, serviceType: 'Standard', legacyCategory: 'Regular' },
  // Bridal (shown under Premium tab in app when Bridal tab is hidden)
  { name: 'Engagement Makeup', duration: '2hr 30mins', price: 7999, serviceType: 'Bridal', legacyCategory: 'Bridal' },
  { name: 'Reception Makeup', duration: '2hr 30mins', price: 8999, serviceType: 'Bridal', legacyCategory: 'Bridal' },
  { name: 'Bridal Makeup', duration: '3hr 30mins', price: 14999, serviceType: 'Bridal', legacyCategory: 'Bridal' },
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
        tags: ['makeup', 'mehndi'],
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
