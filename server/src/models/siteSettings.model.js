/**
 * SiteSettings store — Prisma/Postgres (Phase 5).
 * A single Json `settings` column holds { hero, gallery, branding }; the API
 * shapes hero/gallery/branding as flat top-level fields on the document.
 */

import { prisma } from '../platform/db/postgres.js';
import { QueryChain } from '../platform/stores/mongoCompat.js';

function defaultHero() {
  return {
    mainImage: { url: '', publicId: '' },
    categoryIcons: [
      { categoryName: 'Professional Makeup', iconUrl: '', publicId: '', order: 1 },
      { categoryName: 'Cleanup & Facial', iconUrl: '', publicId: '', order: 2 },
      { categoryName: 'Professional Mehendi', iconUrl: '', publicId: '', order: 3 },
      { categoryName: 'Waxing', iconUrl: '', publicId: '', order: 4 },
      { categoryName: 'Mani/Pedi & Massage', iconUrl: '', publicId: '', order: 5 },
      { categoryName: 'Detan & Bleach', iconUrl: '', publicId: '', order: 6 },
    ],
  };
}

function defaultGallery() {
  return {
    slides: [
      {
        title: 'Quick Grooming',
        description: 'Quick grooming to enhance your look in minutes.',
        imageUrl: '',
        publicId: '',
        active: true,
        order: 1,
      },
      {
        title: 'Bridal Makeup',
        description: 'Elegant bridal makeup for your special day.',
        imageUrl: '',
        publicId: '',
        active: true,
        order: 2,
      },
      {
        title: 'Mehendi Stories',
        description: 'Beautiful mehendi designs to complete your look.',
        imageUrl: '',
        publicId: '',
        active: true,
        order: 3,
      },
    ],
  };
}

function defaultBranding() {
  return {
    primaryLogo: { url: '', publicId: '' },
    adminLogo: { url: '', publicId: '', usePrimary: true },
  };
}

function shapeSiteSettings(row) {
  if (!row) return null;

  const settings = row.settings && typeof row.settings === 'object' ? row.settings : {};

  const doc = {
    _id: row.id,
    id: row.id,
    version: row.version,
    hero: settings.hero || defaultHero(),
    gallery: settings.gallery || defaultGallery(),
    branding: settings.branding || defaultBranding(),
    lastUpdatedBy: row.lastUpdatedById,
    lastUpdatedById: row.lastUpdatedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapSiteSettings(doc, { isNew: false });
}

function wrapSiteSettings(doc, { isNew = false } = {}) {
  const state = { isNew };

  const api = {
    ...doc,

    async save() {
      const data = {
        version: this.version ?? 1,
        settings: {
          hero: this.hero || defaultHero(),
          gallery: this.gallery || defaultGallery(),
          branding: this.branding || defaultBranding(),
        },
        lastUpdatedById: this.lastUpdatedById ?? this.lastUpdatedBy ?? null,
      };

      const row = state.isNew
        ? await prisma.siteSettings.create({ data })
        : await prisma.siteSettings.update({ where: { id: this._id || this.id }, data });

      const shaped = shapeSiteSettings(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.toObject;
      delete obj.toJSON;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },
  };

  return api;
}

function SiteSettingsConstructor(data = {}) {
  return wrapSiteSettings(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      version: data.version ?? 1,
      hero: data.hero || defaultHero(),
      gallery: data.gallery || defaultGallery(),
      branding: data.branding || defaultBranding(),
      lastUpdatedBy: data.lastUpdatedBy ?? data.lastUpdatedById ?? null,
      lastUpdatedById: data.lastUpdatedById ?? data.lastUpdatedBy ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

const SiteSettings = Object.assign(SiteSettingsConstructor, {
  findOne() {
    return new QueryChain(async () => {
      const row = await prisma.siteSettings.findFirst();
      return shapeSiteSettings(row);
    });
  },

  async getSettings() {
    const row = await prisma.siteSettings.findFirst();
    if (row) return shapeSiteSettings(row);

    const doc = SiteSettingsConstructor({});
    await doc.save();
    return doc;
  },

  async updateSettings(updates, userId) {
    const settings = await SiteSettings.getSettings();

    if (updates.hero) {
      settings.hero = { ...settings.hero, ...updates.hero };
    }
    if (updates.gallery) {
      settings.gallery = { ...settings.gallery, ...updates.gallery };
    }
    if (updates.branding) {
      settings.branding = { ...settings.branding };
      if (updates.branding.primaryLogo) {
        settings.branding.primaryLogo = { ...settings.branding.primaryLogo, ...updates.branding.primaryLogo };
      }
      if (updates.branding.adminLogo) {
        settings.branding.adminLogo = { ...settings.branding.adminLogo, ...updates.branding.adminLogo };
      }
    }

    if (userId != null) {
      settings.lastUpdatedBy = userId;
      settings.lastUpdatedById = userId;
    }
    settings.version = (settings.version || 1) + 1;

    await settings.save();
    return settings;
  },
});

export default SiteSettings;
