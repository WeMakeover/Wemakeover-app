/**
 * Booking store — Prisma/Postgres (Phase 4).
 * Preserves Mongoose-like API, instance methods, and post-save side effects.
 */

import { prisma } from '../platform/db/postgres.js';
import { calculateOrderPricing } from '../utils/pricing.utils.js';
import { sendBookingNotificationToAdmin } from '../services/email.service.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
  pickUpdateData,
} from '../platform/stores/mongoCompat.js';
import { runAggregate } from '../platform/stores/aggregate.js';

const FIELD_MAP = {};

function parseDuration(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  const n = Number.parseInt(String(value).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function shapeServices(rows = []) {
  return (rows || []).map((s) => ({
    _id: s.id,
    id: s.id,
    serviceId: s.serviceId || undefined,
    name: s.name,
    description: s.description,
    price: s.price,
    quantity: s.quantity,
    image: s.image,
    category: s.category,
    duration: s.duration != null ? String(s.duration) : null,
    optionLabel: s.optionLabel,
  }));
}

function computeVirtuals(doc) {
  const now = new Date();
  const bookingDate = doc.bookingDetails?.date ? new Date(doc.bookingDetails.date) : null;
  const canBeCancelled =
    ['pending', 'confirmed'].includes(doc.status) && bookingDate && bookingDate > now;
  const canBeRescheduled =
    ['pending', 'confirmed'].includes(doc.status) && bookingDate && bookingDate > now;
  const canBeReviewed =
    ['completed', 'cancelled', 'no_show'].includes(doc.status) &&
    !doc.reviewDetails?.reviewSubmittedAt;
  const reviewPending =
    canBeReviewed &&
    !!doc.reviewDetails?.reviewRequestedAt &&
    !doc.reviewDetails?.reviewSubmittedAt;

  return {
    isUpcoming: bookingDate ? bookingDate >= now && ['confirmed', 'pending'].includes(doc.status) : false,
    isPast: bookingDate ? bookingDate < now : false,
    canBeCancelled,
    canBeRescheduled,
    canBeReviewed,
    reviewPending,
  };
}

function shapeBooking(row, { populatedUser } = {}) {
  if (!row) return null;

  const pricing = {
    ...(row.pricing && typeof row.pricing === 'object' ? row.pricing : {}),
  };
  if (row.couponId && !pricing.couponId) pricing.couponId = row.couponId;

  const doc = {
    _id: row.id,
    id: row.id,
    orderNumber: row.orderNumber,
    userId: populatedUser || row.userId,
    status: row.status,
    paymentStatus: row.paymentStatus,
    services: shapeServices(row.services),
    bookingDetails: row.bookingDetails || {},
    pricing,
    paymentDetails: row.paymentDetails || {},
    cancellationDetails: row.cancellationDetails || {},
    reschedulingDetails: row.reschedulingDetails || {},
    notes: row.notes || {},
    metadata: row.metadata || {},
    reviewDetails: row.reviewDetails || {},
    couponId: row.couponId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...computeVirtuals({
      status: row.status,
      bookingDetails: row.bookingDetails,
      reviewDetails: row.reviewDetails,
    }),
  };

  return wrapBooking(doc, { isNew: false });
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
    duration: parseDuration(s.duration),
    optionLabel: s.optionLabel ?? null,
  }));
}

function applyNestedFilters(docs, filter = {}) {
  const nestedEntries = Object.entries(filter).filter(
    ([key]) =>
      key.includes('.') ||
      (key === '_id' && filter._id && typeof filter._id === 'object'),
  );

  if (!nestedEntries.length && !(filter._id && typeof filter._id === 'object')) {
    return docs;
  }

  return docs.filter((doc) =>
    Object.entries(filter).every(([key, expected]) => {
      if (!key.includes('.') && !(key === '_id' && expected && typeof expected === 'object')) {
        return true; // already applied in SQL where possible
      }

      if (key === '_id' && expected?.$ne != null) {
        return String(doc._id) !== String(expected.$ne);
      }

      const parts = key.split('.');
      let actual = doc;
      for (const p of parts) {
        actual = actual?.[p];
      }

      if (expected && typeof expected === 'object' && !(expected instanceof Date) && !Array.isArray(expected)) {
        if (expected.$gte != null) {
          if (!(new Date(actual) >= new Date(expected.$gte))) return false;
        }
        if (expected.$gt != null) {
          if (!(new Date(actual) > new Date(expected.$gt))) return false;
        }
        if (expected.$lte != null) {
          if (!(new Date(actual) <= new Date(expected.$lte))) return false;
        }
        if (expected.$lt != null) {
          if (!(new Date(actual) < new Date(expected.$lt))) return false;
        }
        if (expected.$in && !expected.$in.map(String).includes(String(actual))) return false;
        if (expected.$ne != null && String(actual) === String(expected.$ne)) return false;
        return true;
      }

      if (expected instanceof Date || actual instanceof Date) {
        return new Date(actual).getTime() === new Date(expected).getTime();
      }

      // date string vs Date equality (slot matching often passes Date/string)
      if (key.endsWith('.date') && actual && expected) {
        return new Date(actual).toDateString() === new Date(expected).toDateString();
      }

      return String(actual) === String(expected);
    }),
  );
}

function sqlSafeFilter(filter = {}) {
  const safe = {};
  for (const [key, val] of Object.entries(filter)) {
    if (key.includes('.')) continue;
    if (key === '_id' && val && typeof val === 'object') {
      if (val.$ne) safe.id = { not: String(val.$ne) };
      continue;
    }
    if (key === '_id') {
      safe.id = String(val);
      continue;
    }
    safe[key] = val;
  }
  return toPrismaWhere(safe, FIELD_MAP);
}

async function loadUsers(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, email: true, phoneNumber: true },
  });
  return Object.fromEntries(
    users.map((u) => [
      u.id,
      {
        _id: u.id,
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phoneNumber,
        phoneNumber: u.phoneNumber,
      },
    ]),
  );
}

function wrapBooking(doc, { isNew = false } = {}) {
  const state = {
    isNew,
    statusChangedToReviewable: false,
    prevStatus: doc.status,
  };

  const api = {
    ...doc,

    async save() {
      const wasNew = state.isNew;
      const reviewable = ['completed', 'cancelled', 'no_show'];
      if (!wasNew && reviewable.includes(this.status) && this.status !== state.prevStatus) {
        state.statusChangedToReviewable = true;
      }
  
  if (!this.orderNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
        this.orderNumber = `BOOK-${new Date().getFullYear()}-${timestamp}-${random
          .toString()
          .padStart(4, '0')}`;
      }

      // Recalc pricing when services present
      if (Array.isArray(this.services) && this.services.length) {
        if (!this.pricing) this.pricing = {};
        this.pricing.subtotal = this.services.reduce(
          (total, service) => total + (Number(service.price) || 0) * (Number(service.quantity) || 1),
          0,
        );
        const discountAmount = this.pricing.discountAmount || 0;
        const wmCoinAmount = this.pricing.wmCoinAmount || 0;
        const pricing = calculateOrderPricing(this.pricing.subtotal, {
          discountAmount,
          wmCoinAmount,
        });
        this.pricing.discountAmount = pricing.discountAmount;
        this.pricing.discountedSubtotal = pricing.discountedSubtotal;
        this.pricing.wmCoinAmount = pricing.wmCoinAmount;
    this.pricing.platformFee = pricing.platformFee;
    this.pricing.taxAmount = pricing.taxAmount;
    this.pricing.totalAmount = pricing.totalAmount;
  }

      const userId =
        typeof this.userId === 'object' && this.userId?._id
          ? this.userId._id
          : this.userId;

      const couponId =
        this.couponId ||
        this.pricing?.couponId ||
        null;

      const data = {
        orderNumber: this.orderNumber,
        userId: String(userId),
        status: this.status || 'pending',
        paymentStatus: this.paymentStatus || 'pending',
        bookingDetails: this.bookingDetails || {},
        pricing: this.pricing || {},
        paymentDetails: this.paymentDetails ?? undefined,
        cancellationDetails: this.cancellationDetails ?? undefined,
        reschedulingDetails: this.reschedulingDetails ?? undefined,
        notes: this.notes ?? undefined,
        metadata: this.metadata ?? undefined,
        reviewDetails: this.reviewDetails ?? undefined,
        couponId: couponId ? String(couponId) : null,
      };

      const serviceRows = mapServiceRows(this.services);

      let row;
      if (state.isNew) {
        row = await prisma.booking.create({
          data: {
            ...data,
            services: { create: serviceRows },
          },
          include: { services: true },
        });
      } else {
        const id = this._id || this.id;
        await prisma.$transaction(async (tx) => {
          await tx.bookingService.deleteMany({ where: { bookingId: id } });
          await tx.booking.update({
            where: { id },
            data: {
              ...data,
              services: { create: serviceRows },
            },
          });
        });
        row = await prisma.booking.findUnique({
          where: { id },
          include: { services: true },
        });
      }

      const shaped = shapeBooking(row);
      Object.assign(this, shaped);
      state.isNew = false;
      state.prevStatus = this.status;

      // Post-save side effects (non-blocking)
      if (wasNew) {
      setImmediate(async () => {
        try {
            const users = await loadUsers([row.userId]);
            const forEmail = shapeBooking(row, { populatedUser: users[row.userId] });
            await sendBookingNotificationToAdmin(forEmail);
        } catch (emailError) {
          console.error('❌ Failed to send admin notification email:', emailError);
        }
      });
    }
    
      if (
        state.statusChangedToReviewable &&
        !this.reviewDetails?.reviewRequestedAt
      ) {
      setImmediate(async () => {
        try {
          const { triggerReviewRequest } = await import('../services/review.service.js');
            await triggerReviewRequest(this._id);
        } catch (reviewError) {
          console.error('❌ Failed to trigger review request:', reviewError);
        }
      });
  }
  
      return this;
    },

    async cancelBooking(reason, cancelledBy = 'customer') {
  this.status = 'cancelled';
  this.cancellationDetails = {
    cancelledAt: new Date(),
    cancelledBy,
    cancellationReason: reason,
        refundEligible: this.paymentStatus === 'completed' && this.canBeCancelled,
  };
  return this.save();
    },

    async rescheduleBooking(newDate, newSlot, newPaymentMethod, reason, rescheduledBy = 'customer') {
  if (!this.canBeRescheduled) {
    throw new Error('This booking cannot be rescheduled');
  }
  
      if (!this.reschedulingDetails) this.reschedulingDetails = {};
  if (!this.reschedulingDetails.originalDate) {
    this.reschedulingDetails.originalDate = this.bookingDetails.date;
    this.reschedulingDetails.originalSlot = this.bookingDetails.slot;
  }
  
  this.bookingDetails.date = newDate;
  this.bookingDetails.slot = newSlot;
  
      if (!this.paymentDetails) this.paymentDetails = {};
  if (newPaymentMethod && this.paymentDetails.paymentMethod !== newPaymentMethod) {
    this.paymentDetails.paymentMethod = newPaymentMethod;
  }
  
  this.reschedulingDetails.rescheduledAt = new Date();
  this.reschedulingDetails.rescheduledBy = rescheduledBy;
  this.reschedulingDetails.rescheduleReason = reason || '';
      this.reschedulingDetails.rescheduleCount =
        (this.reschedulingDetails.rescheduleCount || 0) + 1;
  
  return this.save();
    },

    async completePayment(paymentDetails) {
  this.paymentStatus = 'completed';
  this.paymentDetails = {
        ...(this.paymentDetails || {}),
    ...paymentDetails,
        paidAt: new Date(),
      };
      if (this.status === 'pending') this.status = 'confirmed';
      return this.save();
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.cancelBooking;
      delete obj.rescheduleBooking;
      delete obj.completePayment;
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

function BookingConstructor(data = {}) {
  return wrapBooking(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      orderNumber: data.orderNumber,
      userId: data.userId,
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'pending',
      services: Array.isArray(data.services) ? data.services.map((s) => ({ ...s })) : [],
      bookingDetails: data.bookingDetails || {},
      pricing: data.pricing || {},
      paymentDetails: data.paymentDetails || {},
      cancellationDetails: data.cancellationDetails || {},
      reschedulingDetails: data.reschedulingDetails || {},
      notes: data.notes || {},
      metadata: data.metadata || {},
      reviewDetails: data.reviewDetails || {},
      couponId: data.couponId || data.pricing?.couponId || null,
      ...computeVirtuals(data),
    },
    { isNew: true },
  );
}

async function execFind(filter = {}, opts = {}) {
  const where = sqlSafeFilter(filter);
  const rows = await prisma.booking.findMany({
    where,
    include: { services: true },
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  let docs = rows.map((row) => shapeBooking(row));
  docs = applyNestedFilters(docs, filter).map((d) => wrapBooking(d.toObject?.() || d, { isNew: false }));

  // Re-apply skip/limit after nested filter if nested keys present
  const hasNested = Object.keys(filter).some((k) => k.includes('.'));
  if (hasNested) {
    if (opts.skip) docs = docs.slice(opts.skip);
    if (opts.limit != null) docs = docs.slice(0, opts.limit);
  }

  if (opts.populates?.some((p) => p.path === 'userId')) {
    const byId = await loadUsers(docs.map((d) => (typeof d.userId === 'object' ? d.userId.id : d.userId)));
    docs = docs.map((d) => {
      const uid = typeof d.userId === 'object' ? d.userId.id || d.userId._id : d.userId;
      d.userId = byId[uid] || d.userId;
      return d;
    });
  }

  return docs.map((doc) => {
    const plain = applySelectToObject(doc.toObject(), opts.select);
    return opts.lean ? plain : wrapBooking(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Booking = Object.assign(BookingConstructor, {
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
    const doc = BookingConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    if (Object.keys(filter).some((k) => k.includes('.'))) {
      const docs = await execFind(filter, { lean: true });
      return docs.length;
    }
    return prisma.booking.count({ where: sqlSafeFilter(filter) });
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) => {
      const existing = await execFindOne({ _id: String(id) });
      if (!existing) return null;

      const data = pickUpdateData(update);
      Object.assign(existing, data);
      if (data.pricing) existing.pricing = { ...existing.pricing, ...data.pricing };
      if (data.bookingDetails) {
        existing.bookingDetails = { ...existing.bookingDetails, ...data.bookingDetails };
      }
      if (data.paymentDetails) {
        existing.paymentDetails = { ...existing.paymentDetails, ...data.paymentDetails };
      }
      if (data.reviewDetails) {
        existing.reviewDetails = { ...existing.reviewDetails, ...data.reviewDetails };
      }

      await existing.save();

      if (opts.populates?.some((p) => p.path === 'userId') || options.populate) {
        return execFindOne({ _id: String(id) }, { ...opts, populates: opts.populates || [{ path: 'userId' }] });
      }

      return opts.lean || options.lean ? existing.toObject() : existing;
    });
  },

  async findByUser(userId, options = {}) {
    const filter = { userId: String(userId) };
    if (options.status) filter.status = options.status;
    if (options.dateFrom || options.dateTo) {
      filter['bookingDetails.date'] = {};
      if (options.dateFrom) filter['bookingDetails.date'].$gte = new Date(options.dateFrom);
      if (options.dateTo) filter['bookingDetails.date'].$lte = new Date(options.dateTo);
    }
    return execFind(filter, {
      sort: { createdAt: -1 },
      limit: options.limit || 50,
      skip: options.skip || 0,
      populates: [{ path: 'userId' }],
    });
  },

  findUpcomingBookings(userId) {
    return new QueryChain(async (opts) => {
  const now = new Date();
      const docs = await execFind(
        {
          userId: String(userId),
          status: { $in: ['confirmed', 'pending'] },
    'bookingDetails.date': { $gte: now },
        },
        {
          ...opts,
          sort: opts.sort || { createdAt: 1 },
          populates: [{ path: 'userId' }],
        },
      );
      return docs.sort(
        (a, b) =>
          new Date(a.bookingDetails.date) - new Date(b.bookingDetails.date),
      );
    });
  },

  findPastBookings(userId) {
    return new QueryChain(async (opts) => {
  const now = new Date();
      return execFind(
        {
          userId: String(userId),
          'bookingDetails.date': { $lt: now },
        },
        {
          ...opts,
          sort: opts.sort || { createdAt: -1 },
          populates: [{ path: 'userId' }],
        },
      );
    });
  },

  findPendingReviewBookings(userId) {
    return new QueryChain(async (opts) => {
      const docs = await execFind(
        {
          userId: String(userId),
    status: { $in: ['completed', 'cancelled', 'no_show'] },
        },
        {
          ...opts,
          sort: opts.sort || { updatedAt: -1 },
          populates: [{ path: 'userId' }],
        },
      );
      return docs.filter((d) => !d.reviewDetails?.reviewSubmittedAt);
    });
  },

  async findByReviewToken(token) {
    const rows = await prisma.booking.findMany({
      where: {
        reviewDetails: {
          path: ['reviewToken'],
          equals: token,
        },
      },
      include: { services: true },
    });

    const now = new Date();
    const row = rows.find((r) => {
      const expiry = r.reviewDetails?.reviewTokenExpiry;
      return expiry && new Date(expiry) > now;
    });
    if (!row) return null;

    const users = await loadUsers([row.userId]);
    return shapeBooking(row, { populatedUser: users[row.userId] });
  },

  async aggregate(pipeline = []) {
    const rows = await prisma.booking.findMany({ include: { services: true } });
    const docs = rows.map((r) => shapeBooking(r).toObject());
    return runAggregate(docs, pipeline);
  },
});

export default Booking;
