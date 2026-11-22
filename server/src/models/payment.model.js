/**
 * Payment store — Prisma/Postgres (Phase 4).
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
};

function shapePayment(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    user: row.userId,
    userId: row.userId,
    razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId,
    razorpaySignature: row.razorpaySignature,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    paymentMethod: row.paymentMethod,
    orderDetails: row.orderDetails || {},
    bookingDetails: row.bookingDetails || {},
    metadata: row.metadata || {},
    paidAt: row.paidAt,
    failedAt: row.failedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    get formattedAmount() {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format((this.amount || 0) / 100);
    },
  };

  return wrapPayment(doc, { isNew: false });
}

function mapWrite(input = {}) {
  return {
    userId: String(input.userId || input.user),
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId ?? null,
    razorpaySignature: input.razorpaySignature ?? null,
    amount: Number(input.amount) || 0,
    currency: input.currency || 'INR',
    status: input.status || 'created',
    paymentMethod: input.paymentMethod ?? null,
    orderDetails: input.orderDetails ?? undefined,
    bookingDetails: input.bookingDetails ?? undefined,
    metadata: input.metadata ?? undefined,
    paidAt: input.paidAt ?? null,
    failedAt: input.failedAt ?? null,
    expiresAt: input.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000),
  };
}

function wrapPayment(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      const data = mapWrite(this);
      const row = state.isNew
        ? await prisma.payment.create({ data })
        : await prisma.payment.update({
            where: { id: this._id || this.id },
            data,
          });
      const shaped = shapePayment(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    async updatePaymentStatus(status, paymentData = {}) {
      this.status = status;
      if (status === 'paid') {
        this.razorpayPaymentId = paymentData.payment_id;
        this.razorpaySignature = paymentData.signature;
        this.paymentMethod = paymentData.method;
        this.paidAt = new Date();
      } else if (status === 'failed') {
        this.failedAt = new Date();
      }
      return this.save();
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.updatePaymentStatus;
      delete obj.toObject;
      delete obj.toJSON;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },
  };
}

function PaymentConstructor(data = {}) {
  return wrapPayment(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      user: data.user || data.userId,
      userId: data.userId || data.user,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId ?? null,
      razorpaySignature: data.razorpaySignature ?? null,
      amount: data.amount,
      currency: data.currency || 'INR',
      status: data.status || 'created',
      paymentMethod: data.paymentMethod ?? null,
      orderDetails: data.orderDetails || {},
      bookingDetails: data.bookingDetails || {},
      metadata: data.metadata || {},
      paidAt: data.paidAt ?? null,
      failedAt: data.failedAt ?? null,
      expiresAt: data.expiresAt || new Date(Date.now() + 30 * 60 * 1000),
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.payment.findMany({
    where: toPrismaWhere(filter, FIELD_MAP),
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapePayment(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapPayment(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Payment = Object.assign(PaymentConstructor, {
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
    const doc = PaymentConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.payment.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  findActivePayments(userId) {
    return Payment.find({
      user: String(userId),
      status: { $in: ['created', 'attempted'] },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  },

  async getPaymentStats(userId) {
    const rows = await prisma.payment.findMany({
      where: { userId: String(userId) },
    });
    return runAggregate(
      rows.map((r) => shapePayment(r).toObject()),
      [
        { $match: { user: String(userId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ],
    );
  },

  async aggregate(pipeline = []) {
    const rows = await prisma.payment.findMany();
    return runAggregate(
      rows.map((r) => shapePayment(r).toObject()),
      pipeline,
    );
  },
});

export default Payment;
