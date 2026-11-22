/**
 * Order store — Prisma/Postgres (Phase 4).
 */

import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
} from '../platform/stores/mongoCompat.js';
import { runAggregate } from '../platform/stores/aggregate.js';

const FIELD_MAP = {
  user: 'userId',
  payment: 'paymentId',
};

function shapeServices(rows = []) {
  return (rows || []).map((s) => ({
    serviceId: s.serviceId,
    name: s.name,
    description: s.description,
    price: s.price,
    quantity: s.quantity,
    image: s.image,
    category: s.category,
    duration: s.duration != null ? String(s.duration) : null,
  }));
}

function shapeOrder(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    user: row.userId,
    userId: row.userId,
    orderNumber: row.orderNumber,
    payment: row.paymentId,
    paymentId: row.paymentId,
    status: row.status,
    paymentStatus: row.paymentStatus,
    services: shapeServices(row.services),
    pricing: row.pricing || {},
    booking: row.booking || {},
    provider: row.provider || null,
    timeline: Array.isArray(row.timeline) ? row.timeline : row.timeline || [],
    feedback: row.feedback || null,
    cancellation: row.cancellation || null,
    metadata: row.metadata || {},
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapOrder(doc, { isNew: false });
}

function mapServiceRows(services = []) {
  return (services || []).map((s) => ({
    serviceId: s.serviceId ? String(s.serviceId) : null,
    name: s.name,
    description: s.description ?? null,
    price: Number(s.price) || 0,
    quantity: Number(s.quantity) || 1,
    image: s.image ?? null,
    category: s.category ?? null,
    duration:
      s.duration == null || s.duration === ''
        ? null
        : Number.parseInt(String(s.duration), 10) || null,
  }));
}

function wrapOrder(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      const data = {
        userId: String(this.user || this.userId),
        orderNumber: this.orderNumber,
        paymentId: this.payment || this.paymentId || null,
        status: this.status || 'pending',
        paymentStatus: this.paymentStatus || 'pending',
        pricing: this.pricing || {},
        booking: this.booking || {},
        provider: this.provider ?? undefined,
        timeline: this.timeline || [],
        feedback: this.feedback ?? undefined,
        cancellation: this.cancellation ?? undefined,
        metadata: this.metadata ?? undefined,
        completedAt: this.completedAt ?? null,
      };

      const serviceRows = mapServiceRows(this.services);

      let row;
      if (state.isNew) {
        row = await prisma.order.create({
          data: {
            ...data,
            services: { create: serviceRows },
          },
          include: { services: true },
        });
      } else {
        const id = this._id || this.id;
        await prisma.$transaction(async (tx) => {
          await tx.orderService.deleteMany({ where: { orderId: id } });
          await tx.order.update({
            where: { id },
            data: {
              ...data,
              services: { create: serviceRows },
            },
          });
        });
        row = await prisma.order.findUnique({
          where: { id },
          include: { services: true },
        });
      }

      const shaped = shapeOrder(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    async updateStatus(status, note, updatedBy = 'system') {
      this.status = status;
      if (!Array.isArray(this.timeline)) this.timeline = [];
      this.timeline.push({
        status,
        timestamp: new Date(),
        note: note || '',
        updatedBy,
      });
      if (status === 'completed') this.completedAt = new Date();
      return this.save();
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.updateStatus;
      delete obj.toObject;
      delete obj.toJSON;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },
  };
}

function OrderConstructor(data = {}) {
  return wrapOrder(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      user: data.user || data.userId,
      userId: data.userId || data.user,
      orderNumber: data.orderNumber,
      payment: data.payment || data.paymentId || null,
      paymentId: data.paymentId || data.payment || null,
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'pending',
      services: Array.isArray(data.services) ? data.services.map((s) => ({ ...s })) : [],
      pricing: data.pricing || {},
      booking: data.booking || {},
      provider: data.provider || null,
      timeline: Array.isArray(data.timeline) ? [...data.timeline] : [],
      feedback: data.feedback || null,
      cancellation: data.cancellation || null,
      metadata: data.metadata || {},
      completedAt: data.completedAt || null,
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.order.findMany({
    where: toPrismaWhere(filter, FIELD_MAP),
    include: { services: true },
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeOrder(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapOrder(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Order = Object.assign(OrderConstructor, {
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
    const doc = OrderConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.order.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  async aggregate(pipeline = []) {
    const rows = await prisma.order.findMany({ include: { services: true } });
    return runAggregate(
      rows.map((r) => shapeOrder(r).toObject()),
      pipeline,
    );
  },
});

export default Order;
