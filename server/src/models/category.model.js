/**
 * Category store — Prisma/Postgres (Phase 2).
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
};

function shapeCategory(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    imagePublicId: row.imagePublicId,
    mobileImage: row.mobileImage,
    mobileImagePublicId: row.mobileImagePublicId,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    metadata: row.metadata || {},
    createdBy: row.createdById,
    updatedBy: row.updatedById,
    createdById: row.createdById,
    updatedById: row.updatedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapCategory(doc, { isNew: false });
}

function wrapCategory(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      const data = {
        name: this.name,
        slug: this.slug ?? null,
        description: this.description ?? null,
        image: this.image ?? null,
        imagePublicId: this.imagePublicId ?? null,
        mobileImage: this.mobileImage ?? null,
        mobileImagePublicId: this.mobileImagePublicId ?? null,
        displayOrder: Number.parseInt(this.displayOrder, 10) || 0,
        isActive: this.isActive !== false,
        metadata: this.metadata ?? undefined,
        createdById: this.createdById ?? this.createdBy ?? null,
        updatedById: this.updatedById ?? this.updatedBy ?? null,
      };

      const row = state.isNew
        ? await prisma.category.create({ data })
        : await prisma.category.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeCategory(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    async getServiceCount() {
      return prisma.service.count({
        where: { categoryId: this._id || this.id, isActive: true },
      });
    },

    async canBeDeleted() {
      const count = await prisma.service.count({
        where: { categoryId: this._id || this.id },
      });
      return count === 0;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.getServiceCount;
      delete obj.canBeDeleted;
      delete obj.toObject;
      delete obj.toJSON;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },
  };
}

function CategoryConstructor(data = {}) {
  return wrapCategory(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: data.image,
      imagePublicId: data.imagePublicId,
      mobileImage: data.mobileImage,
      mobileImagePublicId: data.mobileImagePublicId,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive !== false,
      metadata: data.metadata || {},
      createdBy: data.createdBy ?? data.createdById,
      updatedBy: data.updatedBy ?? data.updatedById,
      createdById: data.createdById ?? data.createdBy,
      updatedById: data.updatedById ?? data.updatedBy,
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.category.findMany({
    where: toPrismaWhere(filter, FIELD_MAP),
    orderBy: toPrismaOrderBy(opts.sort) || [{ displayOrder: 'asc' }, { name: 'asc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeCategory(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapCategory(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Category = Object.assign(CategoryConstructor, {
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
    const doc = CategoryConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.category.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await execFindOne(filter);
    if (!existing) return null;

    const data = pickUpdateData(update);
    if (data.createdBy !== undefined) {
      data.createdById = data.createdBy;
      delete data.createdBy;
    }
    if (data.updatedBy !== undefined) {
      data.updatedById = data.updatedBy;
      delete data.updatedBy;
    }
    delete data._id;
    delete data.id;

    const row = await prisma.category.update({
      where: { id: existing._id },
      data,
    });

    const shaped = shapeCategory(row);
    return options.lean ? shaped.toObject() : shaped;
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) =>
      Category.findOneAndUpdate({ _id: String(id) }, update, {
        ...options,
        lean: opts.lean || options.lean,
      }),
    );
  },

  async findByIdAndDelete(id) {
    try {
      const row = await prisma.category.delete({ where: { id: String(id) } });
      return shapeCategory(row);
    } catch {
      return null;
    }
  },

  findActive() {
    return Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
  },
});

export default Category;
