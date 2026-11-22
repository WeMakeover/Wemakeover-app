/**
 * Seed the 6 home-screen categories with matched illustration images.
 *
 * Usage (from server/):
 *   node --experimental-strip-types src/scripts/seedHomeCategories.js
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
  {
    name: 'Facial & Cleanup',
    slug: 'facial-cleanup',
    description: 'Professional facial treatments and deep cleanup for glowing skin.',
    displayOrder: 1,
    file: 'facial-cleanup.png',
  },
  {
    name: 'Waxing',
    slug: 'waxing',
    description: 'Smooth, long-lasting hair removal with professional waxing.',
    displayOrder: 2,
    file: 'waxing.png',
  },
  {
    name: 'Manicure & Pedicure',
    slug: 'manicure-pedicure',
    description: 'Nail care, polish, and grooming for hands and feet.',
    displayOrder: 3,
    file: 'manicure-pedicure.png',
  },
  {
    name: 'De-Tan & Bleach',
    slug: 'detan-bleach',
    description: 'De-tan cleansers, scrubs, and masks for even-toned skin.',
    displayOrder: 4,
    file: 'detan-bleach.png',
  },
  {
    name: 'Makeup & Mehndi',
    slug: 'makeup-mehndi',
    description: 'Party, bridal makeup and mehndi for every occasion.',
    displayOrder: 5,
    file: 'makeup-mehndi.png',
  },
  {
    name: 'Massage & Body Polish',
    slug: 'massage-body-polish',
    description: 'Relaxing massage and body polish treatments at home.',
    displayOrder: 6,
    file: 'massage-body-polish.png',
  },
];

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function uploadImage(filePath, slug) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'wemakeover/categories',
    public_id: `category-${slug}`,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    format: 'png',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error('❌ Cloudinary env vars missing');
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  await connectPostgres();

  const created = [];
  for (const cat of CATEGORIES) {
    const filePath = path.join(imagesDir, cat.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing image file: ${filePath}`);
    }

    console.log(`⬆️  Uploading ${cat.name}…`);
    const { url, publicId } = await uploadImage(filePath, cat.slug || slugify(cat.name));

    const row = await prisma.category.upsert({
      where: { name: cat.name },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true,
        image: url,
        imagePublicId: publicId,
        mobileImage: url,
        mobileImagePublicId: publicId,
      },
      update: {
        slug: cat.slug,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true,
        image: url,
        imagePublicId: publicId,
        mobileImage: url,
        mobileImagePublicId: publicId,
      },
    });

    created.push({ id: row.id, name: row.name, slug: row.slug, image: row.image });
    console.log(`✅ ${row.name}`);
  }

  console.log('\nDone. Categories:');
  console.log(JSON.stringify(created, null, 2));
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
