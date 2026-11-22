/**
 * Service store — Prisma/Postgres (Phase 2).
 * Options live in service_options; API still exposes embedded `options[]`.
 */

import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
  pickUpdateData,
} from '../platform/stores/mongoCompat.js';

const FIELD_MAP = {
  createdBy: 'createdById',
  updatedBy: 'updatedById',
  category: 'legacyCategory',
  image: 'images',
};

function shapeOptions(options = []) {
  return (options || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((o) => ({
      _id: o.id,
      id: o.id,
      label: o.label,
      price: o.price,
      priceDisplay: o.priceDisplay,
    }));
}

function shapeService(row, { populated = {} } = {}) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    name: row.name,
    nameLine2: row.nameLine2,
    description: row.description,
    price: row.price,
    priceDisplay: row.priceDisplay,
    taxIncluded: row.taxIncluded,
    duration: row.duration,
    categoryId: row.categoryId,
    category: row.legacyCategory,
    legacyCategory: row.legacyCategory,
    serviceType: row.serviceType,
    image: row.images || [],
    images: row.images || [],
    imagePublicIds: row.imagePublicIds || [],
    mobileImage: row.mobileImage,
    mobileImagePublicId: row.mobileImagePublicId,
    bodyContent: row.bodyContent,
    ctaContent: row.ctaContent,
    cardType: row.cardType,
    isActive: row.isActive,
    isAvailable: row.isAvailable,
    tags: row.tags || [],
    popularity: row.popularity,
    showInPopularNearYou: row.showInPopularNearYou ?? false,
    popularNearYouOrder: row.popularNearYouOrder ?? 0,
    options: shapeOptions(row.options),
    createdBy: populated.createdBy || row.createdById,
    updatedBy: populated.updatedBy || row.updatedById,
    createdById: row.createdById,
    updatedById: row.updatedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapService(doc, { isNew: false });
}

async function replaceOptions(serviceId, options) {
  await prisma.serviceOption.deleteMany({ where: { serviceId } });
  if (!Array.isArray(options) || options.length === 0) return;

  await prisma.serviceOption.createMany({
    data: options.map((o, index) => ({
      serviceId,
      label: o.label,
      price: Number(o.price) || 0,
      priceDisplay: o.priceDisplay ?? null,
      sortOrder: o.sortOrder ?? index,
    })),
  });
}

function mapWriteData(input = {}) {
  const prismaData = {};

  const scalarMap = {
    name: 'name',
    nameLine2: 'nameLine2',
    description: 'description',
    price: 'price',
    priceDisplay: 'priceDisplay',
    taxIncluded: 'taxIncluded',
    duration: 'duration',
    categoryId: 'categoryId',
    serviceType: 'serviceType',
    imagePublicIds: 'imagePublicIds',
    mobileImage: 'mobileImage',
    mobileImagePublicId: 'mobileImagePublicId',
    bodyContent: 'bodyContent',
    ctaContent: 'ctaContent',
    cardType: 'cardType',
    isActive: 'isActive',
    isAvailable: 'isAvailable',
    tags: 'tags',
    popularity: 'popularity',
    showInPopularNearYou: 'showInPopularNearYou',
    popularNearYouOrder: 'popularNearYouOrder',
  };

  for (const [from, to] of Object.entries(scalarMap)) {
    if (input[from] !== undefined) prismaData[to] = input[from];
  }

  if (input.legacyCategory !== undefined) {
    prismaData.legacyCategory = input.legacyCategory;
  } else if (input.category !== undefined) {
    prismaData.legacyCategory = input.category;
  }

  if (input.createdById !== undefined) prismaData.createdById = input.createdById;
  else if (input.createdBy !== undefined) {
    prismaData.createdById =
      typeof input.createdBy === 'object' && input.createdBy?._id
        ? input.createdBy._id
        : input.createdBy;
  }

  if (input.updatedById !== undefined) prismaData.updatedById = input.updatedById;
  else if (input.updatedBy !== undefined) {
    prismaData.updatedById =
      typeof input.updatedBy === 'object' && input.updatedBy?._id
        ? input.updatedBy._id
        : input.updatedBy;
  }

  if (input.images !== undefined || input.image !== undefined) {
    const raw = input.images !== undefined ? input.images : input.image;
    prismaData.images = Array.isArray(raw) ? raw : raw ? [raw] : [];
  }

  return prismaData;
}

function wrapService(doc, { isNew = false } = {}) {
  const state = { isNew, options: doc.options || [] };

  return {
    ...doc,

    async save() {
      const data = mapWriteData(this);
      if (!data.name && state.isNew) {
        throw new Error('Service name is required');
      }

      let row;
      if (state.isNew) {
        row = await prisma.service.create({
          data,
          include: { options: true },
        });
        await replaceOptions(row.id, this.options || state.options);
        row = await prisma.service.findUnique({
          where: { id: row.id },
          include: { options: true },
        });
      } else {
        const id = this._id || this.id;
        row = await prisma.service.update({
          where: { id },
          data,
          include: { options: true },
        });
        if (this.options) {
          await replaceOptions(id, this.options);
          row = await prisma.service.findUnique({
            where: { id },
            include: { options: true },
          });
        }
      }

      const shaped = shapeService(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    async incrementPopularity() {
      const id = this._id || this.id;
      const row = await prisma.service.update({
        where: { id },
        data: { popularity: { increment: 1 } },
        include: { options: true },
      });
      const shaped = shapeService(row);
      Object.assign(this, shaped);
      return this;
    },

    async toggleAvailability() {
      const id = this._id || this.id;
      const row = await prisma.service.update({
        where: { id },
        data: { isAvailable: !this.isAvailable },
        include: { options: true },
      });
      const shaped = shapeService(row);
      Object.assign(this, shaped);
      return this;
    },

    // Mongoose compat no-op — options are persisted via replaceOptions on save()
    markModified() {},

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.incrementPopularity;
      delete obj.toggleAvailability;
      delete obj.markModified;
      delete obj.toObject;
      delete obj.toJSON;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },
  };
}

function ServiceConstructor(data = {}) {
  return wrapService(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      name: data.name,
      nameLine2: data.nameLine2,
      description: data.description,
      price: data.price ?? 0,
      priceDisplay: data.priceDisplay,
      taxIncluded: data.taxIncluded !== false,
      duration: data.duration,
      categoryId: data.categoryId,
      category: data.category || data.legacyCategory,
      legacyCategory: data.legacyCategory || data.category,
      serviceType: data.serviceType || 'Standard',
      image: data.image || data.images || [],
      images: data.images || data.image || [],
      imagePublicIds: data.imagePublicIds || [],
      mobileImage: data.mobileImage,
      mobileImagePublicId: data.mobileImagePublicId,
      bodyContent: data.bodyContent,
      ctaContent: data.ctaContent || 'Add',
      cardType: data.cardType || 'Vertical',
      isActive: data.isActive !== false,
      isAvailable: data.isAvailable !== false,
      tags: data.tags || [],
      popularity: data.popularity || 0,
      options: data.options || [],
      createdBy: data.createdBy || data.createdById,
      updatedBy: data.updatedBy || data.updatedById,
      createdById: data.createdById || data.createdBy,
      updatedById: data.updatedById || data.updatedBy,
    },
    { isNew: true },
  );
}

async function applyPopulates(rows, populates = []) {
  if (!populates.length) return rows.map((row) => shapeService(row));

  const needCreated = populates.some((p) => p.path === 'createdBy');
  const needUpdated = populates.some((p) => p.path === 'updatedBy');

  const userIds = new Set();
  for (const row of rows) {
    if (needCreated && row.createdById) userIds.add(row.createdById);
    if (needUpdated && row.updatedById) userIds.add(row.updatedById);
  }

  const users = userIds.size
    ? await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const byId = Object.fromEntries(
    users.map((u) => [
      u.id,
      { _id: u.id, id: u.id, name: u.name, username: u.name, email: u.email },
    ]),
  );

  return rows.map((row) =>
    shapeService(row, {
      populated: {
        createdBy: row.createdById ? byId[row.createdById] || row.createdById : null,
        updatedBy: row.updatedById ? byId[row.updatedById] || row.updatedById : null,
      },
    }),
  );
}

async function execFind(filter, opts = {}) {
  // Translate image → images already via FIELD_MAP; category string → legacyCategory
  const where = toPrismaWhere(filter, FIELD_MAP);

  const rows = await prisma.service.findMany({
    where,
    include: { options: true },
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  const shaped = await applyPopulates(rows, opts.populates);
  return shaped.map((doc) => {
    const plain = applySelectToObject(doc.toObject(), opts.select);
    return opts.lean ? plain : wrapService(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Service = Object.assign(ServiceConstructor, {
  find(filter = {}) {
    return new QueryChain((opts) => execFind(filter, opts));
  },

  findOne(filter = {}) {
    return new QueryChain((opts) => execFindOne(filter, opts));
  },

  findById(id) {
    if (!id) return new QueryChain(async () => null);
    return new QueryChain((opts) => execFindOne({ _id: String(id) }, opts));
  },

  async create(data) {
    const doc = ServiceConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.service.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await execFindOne(filter);
    if (!existing) return null;

    const raw = pickUpdateData(update);
    const optionsList = raw.options;
    const data = mapWriteData(raw);

    const row = await prisma.service.update({
      where: { id: existing._id },
      data,
      include: { options: true },
    });

    if (optionsList !== undefined) {
      await replaceOptions(existing._id, optionsList);
    }

    const fresh = await prisma.service.findUnique({
      where: { id: existing._id },
      include: { options: true },
    });

    const shaped = shapeService(fresh);
    return options.lean ? shaped.toObject() : shaped;
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) => {
      const result = await Service.findOneAndUpdate({ _id: String(id) }, update, {
        ...options,
        lean: opts.lean || options.lean,
      });
      if (!result || !opts.populates?.length) return result;

      const row = await prisma.service.findUnique({
        where: { id: String(id) },
        include: { options: true },
      });
      const [shaped] = await applyPopulates([row], opts.populates);
      return opts.lean ? shaped.toObject() : shaped;
    });
  },

  async findByIdAndDelete(id) {
    try {
      const row = await prisma.service.delete({
        where: { id: String(id) },
        include: { options: true },
      });
      return shapeService(row);
    } catch {
      return null;
    }
  },

  findByCategory(category) {
    return Service.find({ category, isActive: true });
  },

  findByCategoryId(categoryId) {
    return Service.find({ categoryId, isActive: true });
  },

  async findPopularServices(limit = 10) {
    const take = Math.max(1, Number(limit) || 10);

    const curated = await prisma.service.findMany({
      where: { isActive: true, showInPopularNearYou: true },
      orderBy: [{ popularNearYouOrder: 'asc' }, { createdAt: 'asc' }],
      take,
      include: { options: true },
    });

    if (curated.length > 0) {
      return curated.map((row) => shapeService(row));
    }

    // Fallback when nothing curated yet (legacy behaviour)
    const fallback = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ popularity: 'desc' }, { createdAt: 'desc' }],
      take,
      include: { options: true },
    });
    return fallback.map((row) => shapeService(row));
  },
});

export default Service;
