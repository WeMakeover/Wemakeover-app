/**
 * Coupon store — Prisma/Postgres (Phase 3).
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

function shapeCoupon(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    code: row.code,
    description: row.description,
    type: row.type,
    value: row.value,
    maxDiscount: row.maxDiscount,
    minOrderValue: row.minOrderValue,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    usageLimit: row.usageLimit,
    usageCount: row.usageCount,
    perUserLimit: row.perUserLimit,
    isActive: row.isActive,
    createdBy: row.createdById,
    updatedBy: row.updatedById,
    createdById: row.createdById,
    updatedById: row.updatedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapCoupon(doc, { isNew: false });
}

function wrapCoupon(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      const code = String(this.code || '').trim().toUpperCase();
      const data = {
        code,
        description: this.description || '',
        type: this.type,
        value: Number(this.value) || 0,
        maxDiscount: this.maxDiscount ?? null,
        minOrderValue: this.minOrderValue ?? 0,
        startsAt: this.startsAt ?? null,
        endsAt: this.endsAt ?? null,
        usageLimit: this.usageLimit ?? null,
        usageCount: this.usageCount ?? 0,
        perUserLimit: this.perUserLimit ?? 1,
        isActive: this.isActive !== false,
        createdById: this.createdById ?? this.createdBy ?? null,
        updatedById: this.updatedById ?? this.updatedBy ?? null,
      };

      const row = state.isNew
        ? await prisma.coupon.create({ data })
        : await prisma.coupon.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeCoupon(row);
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
}

function CouponConstructor(data = {}) {
  return wrapCoupon(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      code: data.code,
      description: data.description || '',
      type: data.type,
      value: data.value,
      maxDiscount: data.maxDiscount ?? null,
      minOrderValue: data.minOrderValue ?? 0,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      usageLimit: data.usageLimit ?? null,
      usageCount: data.usageCount ?? 0,
      perUserLimit: data.perUserLimit ?? 1,
      isActive: data.isActive !== false,
      createdBy: data.createdBy ?? data.createdById,
      updatedBy: data.updatedBy ?? data.updatedById,
      createdById: data.createdById ?? data.createdBy,
      updatedById: data.updatedById ?? data.updatedBy,
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.coupon.findMany({
    where: toPrismaWhere(filter, FIELD_MAP),
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeCoupon(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapCoupon(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Coupon = Object.assign(CouponConstructor, {
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
    const doc = CouponConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.coupon.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  async updateOne(filter, update) {
    const existing = await execFindOne(filter);
    if (!existing) return { matchedCount: 0, modifiedCount: 0 };

    const data = {};
    if (update.$inc && typeof update.$inc === 'object') {
      for (const [key, amount] of Object.entries(update.$inc)) {
        data[key] = { increment: Number(amount) || 0 };
      }
    }

    const setData = pickUpdateData(update);
    if (setData.createdBy !== undefined) {
      setData.createdById = setData.createdBy;
      delete setData.createdBy;
    }
    if (setData.updatedBy !== undefined) {
      setData.updatedById = setData.updatedBy;
      delete setData.updatedBy;
    }
    if (setData.code) setData.code = String(setData.code).trim().toUpperCase();
    Object.assign(data, setData);

    await prisma.coupon.update({
      where: { id: existing._id },
      data,
    });

    return { matchedCount: 1, modifiedCount: 1 };
  },

  async findByIdAndDelete(id) {
    try {
      const row = await prisma.coupon.delete({ where: { id: String(id) } });
      return shapeCoupon(row);
    } catch {
      return null;
    }
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) => {
      const existing = await execFindOne({ _id: String(id) });
      if (!existing) return null;

      const setData = pickUpdateData(update);
      if (setData.createdBy !== undefined) {
        setData.createdById = setData.createdBy;
        delete setData.createdBy;
      }
      if (setData.updatedBy !== undefined) {
        setData.updatedById = setData.updatedBy;
        delete setData.updatedBy;
      }
      if (setData.code) setData.code = String(setData.code).trim().toUpperCase();

      const row = await prisma.coupon.update({
        where: { id: String(id) },
        data: setData,
      });
      const shaped = shapeCoupon(row);
      return opts.lean || options.lean ? shaped.toObject() : shaped;
    });
  },
});

export default Coupon;
