/**
 * Upload pre-processed transparent category PNGs and update DB URLs.
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/stripCategoryBlackBg.js
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { connectPostgres, disconnectPostgres, prisma } from '../platform/db/postgres.js';

dotenv.config({ override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.resolve(
  __dirname,
  '../../scripts/category-seed-images/transparent'
);

const CATEGORIES = [
  { name: 'Facial & Cleanup', slug: 'facial-cleanup', file: 'facial-cleanup.png' },
  { name: 'Waxing', slug: 'waxing', file: 'waxing.png' },
  { name: 'Manicure & Pedicure', slug: 'manicure-pedicure', file: 'manicure-pedicure.png' },
  { name: 'De-Tan & Bleach', slug: 'detan-bleach', file: 'detan-bleach.png' },
  { name: 'Makeup & Mehndi', slug: 'makeup-mehndi', file: 'makeup-mehndi.png' },
  { name: 'Massage & Body Polish', slug: 'massage-body-polish', file: 'massage-body-polish.png' },
];

async function main() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  await connectPostgres();

  for (const cat of CATEGORIES) {
    const filePath = path.join(imagesDir, cat.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing ${filePath}`);
    }

    console.log(`⬆️  ${cat.name}…`);
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'wemakeover/categories',
      public_id: `category-${cat.slug}`,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      format: 'png',
    });

    const url = result.secure_url;
    const publicId = result.public_id;

    await prisma.category.updateMany({
      where: { name: cat.name },
      data: {
        image: url,
        imagePublicId: publicId,
        mobileImage: url,
        mobileImagePublicId: publicId,
      },
    });

    console.log(`✅ ${cat.name} → ${url}`);
  }

  await disconnectPostgres();
  console.log('\nDone — transparent PNGs live.');
}

main().catch(async (err) => {
  console.error('❌ Failed:', err);
  try {
    await disconnectPostgres();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
