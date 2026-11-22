/**
 * CouponRedemption store — Prisma/Postgres (Phase 3/4).
 * bookingId FK → Booking (Phase 4).
 */

import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
} from '../platform/stores/mongoCompat.js';

const FIELD_MAP = {};

function shapeRedemption(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    couponId: row.couponId,
    couponCode: row.couponCode,
    userId: row.userId,
    bookingId: row.bookingId,
    orderNumber: row.orderNumber,
    discountAmount: row.discountAmount,
    subtotal: row.subtotal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapRedemption(doc, { isNew: false });
}

function wrapRedemption(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      const data = {
        couponId: String(this.couponId),
        couponCode: String(this.couponCode || '').trim().toUpperCase(),
        userId: String(this.userId),
        bookingId: this.bookingId ? String(this.bookingId) : null,
        orderNumber: this.orderNumber ?? null,
        discountAmount: Number(this.discountAmount) || 0,
        subtotal: Number(this.subtotal) || 0,
      };

      const row = state.isNew
        ? await prisma.couponRedemption.create({ data })
        : await prisma.couponRedemption.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeRedemption(row);
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

function CouponRedemptionConstructor(data = {}) {
  return wrapRedemption(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      couponId: data.couponId,
      couponCode: data.couponCode,
      userId: data.userId,
      bookingId: data.bookingId ?? null,
      orderNumber: data.orderNumber ?? null,
      discountAmount: data.discountAmount,
      subtotal: data.subtotal,
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.couponRedemption.findMany({
    where: toPrismaWhere(filter, FIELD_MAP),
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeRedemption(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapRedemption(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const CouponRedemption = Object.assign(CouponRedemptionConstructor, {
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
    const doc = CouponRedemptionConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.couponRedemption.count({
      where: toPrismaWhere(filter, FIELD_MAP),
    });
  },
});

export default CouponRedemption;
