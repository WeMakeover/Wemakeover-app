/**
 * Notification store — Prisma/Postgres (Phase 5).
 */

import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
  pickUpdateData,
} from '../platform/stores/mongoCompat.js';

const FIELD_MAP = {};

function shapeNotification(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    message: row.message,
    bookingId: row.bookingId,
    reviewId: row.reviewId,
    metadata: row.metadata || {},
    isRead: row.isRead,
    readAt: row.readAt,
    expiresAt: row.expiresAt,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapNotification(doc, { isNew: false });
}

function wrapNotification(doc, { isNew = false } = {}) {
  const state = { isNew };

  const api = {
    ...doc,

    async markAsRead() {
      this.isRead = true;
      this.readAt = new Date();
      return this.save();
    },

    async save() {
      const wasNew = state.isNew;

      const data = {
        userId: String(this.userId),
        type: this.type,
        title: this.title,
        message: this.message,
        bookingId: this.bookingId ?? null,
        reviewId: this.reviewId ?? null,
        metadata: this.metadata ?? undefined,
        isRead: this.isRead ?? false,
        readAt: this.readAt ?? null,
        expiresAt: this.expiresAt ?? null,
        priority: this.priority || 'normal',
      };

      const row = state.isNew
        ? await prisma.notification.create({ data })
        : await prisma.notification.update({ where: { id: this._id || this.id }, data });

      const shaped = shapeNotification(row);
      Object.assign(this, shaped);
      state.isNew = false;

      // Mirror every newly created in-app notification as a push (fire-and-forget).
      // Lazy import avoids a circular dependency (push.service -> User model).
      if (wasNew) {
        import('../services/push.service.js')
          .then(({ sendNotificationPush }) => sendNotificationPush(this))
          .catch((error) => console.error('Push dispatch failed:', error?.message));
      }

      return this;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.markAsRead;
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

function NotificationConstructor(data = {}) {
  return wrapNotification(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      bookingId: data.bookingId ?? null,
      reviewId: data.reviewId ?? null,
      metadata: data.metadata || {},
      isRead: data.isRead ?? false,
      readAt: data.readAt ?? null,
      expiresAt: data.expiresAt ?? null,
      priority: data.priority || 'normal',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

async function loadBookingsLite(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return {};
  const rows = await prisma.booking.findMany({
    where: { id: { in: unique } },
    include: { services: true },
  });
  return Object.fromEntries(
    rows.map((r) => [
      r.id,
      {
        _id: r.id,
        id: r.id,
        orderNumber: r.orderNumber,
        status: r.status,
        services: (r.services || []).map((s) => ({ _id: s.id, id: s.id, name: s.name, price: s.price, quantity: s.quantity })),
      },
    ]),
  );
}

async function loadReviewsLite(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return {};
  const rows = await prisma.review.findMany({ where: { id: { in: unique } } });
  return Object.fromEntries(
    rows.map((r) => [r.id, { _id: r.id, id: r.id, type: r.type, status: r.status, adminResponse: r.adminResponse }]),
  );
}

async function applyPopulates(docs, populates = []) {
  if (!populates.length) return docs;

  const needBooking = populates.some((p) => p.path === 'bookingId');
  const needReview = populates.some((p) => p.path === 'reviewId');

  const [bookingsMap, reviewsMap] = await Promise.all([
    needBooking ? loadBookingsLite(docs.map((d) => d.bookingId)) : {},
    needReview ? loadReviewsLite(docs.map((d) => d.reviewId)) : {},
  ]);

  return docs.map((doc) => {
    const obj = doc.toObject();
    if (needBooking) obj.bookingId = obj.bookingId ? bookingsMap[obj.bookingId] || obj.bookingId : obj.bookingId;
    if (needReview) obj.reviewId = obj.reviewId ? reviewsMap[obj.reviewId] || obj.reviewId : obj.reviewId;
    return wrapNotification(obj, { isNew: false });
  });
}

async function execFind(filter = {}, opts = {}) {
  const rows = await prisma.notification.findMany({
    where: toPrismaWhere(filter, FIELD_MAP),
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  let docs = rows.map((r) => shapeNotification(r));
  docs = await applyPopulates(docs, opts.populates);

  return docs.map((doc) => {
    const plain = applySelectToObject(doc.toObject(), opts.select);
    return opts.lean ? plain : wrapNotification(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Notification = Object.assign(NotificationConstructor, {
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
    const doc = NotificationConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.notification.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  async updateMany(filter, update) {
    const data = pickUpdateData(update);
    const result = await prisma.notification.updateMany({
      where: toPrismaWhere(filter, FIELD_MAP),
      data,
    });
    return { matchedCount: result.count, modifiedCount: result.count, acknowledged: true };
  },

  async deleteOne(filter = {}) {
    const existing = await execFindOne(filter);
    if (!existing) return { deletedCount: 0 };
    await prisma.notification.delete({ where: { id: existing._id } });
    return { deletedCount: 1 };
  },

  async findOneAndDelete(filter = {}) {
    const existing = await execFindOne(filter);
    if (!existing) return null;
    await prisma.notification.delete({ where: { id: existing._id } });
    return existing;
  },

  async findByIdAndDelete(id) {
    return Notification.findOneAndDelete({ _id: String(id) });
  },

  getUnreadCount(userId) {
    return Notification.countDocuments({
    userId, 
    isRead: false,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });
  },

  getForUser(userId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  
  const query = { 
    userId,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    };
    if (unreadOnly) query.isRead = false;

    return new QueryChain((opts) =>
      execFind(query, {
        ...opts,
        sort: opts.sort || { createdAt: -1 },
        skip: (page - 1) * limit,
        limit,
        populates: [{ path: 'bookingId' }, { path: 'reviewId' }],
      }),
    );
  },

  markAllAsRead(userId) {
    return Notification.updateMany(
    { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
  );
  },

  createReviewRequest(userId, booking) {
    const serviceNames = (booking.services || []).map((s) => s.name).join(', ');
  
    return Notification.create({
    userId,
    type: 'review_request',
    title: 'How was your experience?',
    message: `Your booking for ${serviceNames} has been completed. We'd love to hear your feedback!`,
    bookingId: booking._id,
    metadata: {
      orderNumber: booking.orderNumber,
      serviceName: serviceNames,
      actionUrl: `/reviews/submit?booking=${booking._id}`,
    },
    priority: 'normal',
  });
  },

  createBookingConfirmation(userId, booking) {
    const serviceNames = (booking.services || []).map((s) => s.name).join(', ');
  const slot = booking.bookingDetails?.slot;

    return Notification.create({
    userId,
    type: 'booking_confirmed',
    title: 'Booking confirmed!',
    message: `Your booking for ${serviceNames}${slot ? ` is set for ${slot}` : ''}. We look forward to seeing you!`,
    bookingId: booking._id,
    metadata: {
      orderNumber: booking.orderNumber,
      serviceName: serviceNames,
      actionUrl: `/bookings/${booking._id}`,
    },
    priority: 'normal',
  });
  },

  createBookingCancelled(userId, booking, { refundEligible = false, refundAmount = 0 } = {}) {
    const serviceNames = (booking.services || []).map((s) => s.name).join(', ');
    const refundNote =
      refundEligible && refundAmount > 0 ? ` A refund of ₹${refundAmount} is being processed.` : '';

    return Notification.create({
    userId,
    type: 'booking_cancelled',
    title: 'Booking cancelled',
    message: `Your booking for ${serviceNames} has been cancelled.${refundNote}`,
    bookingId: booking._id,
    metadata: {
      orderNumber: booking.orderNumber,
      serviceName: serviceNames,
      actionUrl: `/bookings/${booking._id}`,
    },
    priority: 'high',
  });
  },

  createBookingRescheduled(userId, booking, { newDate, newSlot } = {}) {
    const serviceNames = (booking.services || []).map((s) => s.name).join(', ');
  const when = [newDate, newSlot].filter(Boolean).join(' · ');

    return Notification.create({
    userId,
    type: 'booking_rescheduled',
    title: 'Booking rescheduled',
    message: `Your booking for ${serviceNames} is now scheduled${when ? ` for ${when}` : ''}.`,
    bookingId: booking._id,
    metadata: {
      orderNumber: booking.orderNumber,
      serviceName: serviceNames,
      actionUrl: `/bookings/${booking._id}`,
    },
    priority: 'normal',
  });
  },

  createPaymentReceived(userId, booking, { amount } = {}) {
    const serviceNames = (booking.services || []).map((s) => s.name).join(', ');
  const paid = amount ?? booking.pricing?.totalAmount;

    return Notification.create({
    userId,
    type: 'payment_received',
    title: 'Payment received',
    message: `We've received your payment${paid ? ` of ₹${paid}` : ''} for ${serviceNames}. Thank you!`,
    bookingId: booking._id,
    metadata: {
      orderNumber: booking.orderNumber,
      serviceName: serviceNames,
      actionUrl: `/bookings/${booking._id}`,
    },
    priority: 'normal',
  });
  },

  createComplaintResponse(userId, review, newStatus) {
  const statusMessages = {
    reviewed: 'Your complaint is being reviewed by our team.',
    resolved: 'Your complaint has been resolved.',
    dismissed: 'Your complaint has been reviewed and closed.',
  };
  
  const adminResponse = review.adminResponse || '';
  const hasAdminReply = adminResponse && adminResponse.trim().length > 0;
  const message = hasAdminReply
      ? adminResponse.length > 200
        ? `${adminResponse.slice(0, 200)}…`
        : adminResponse
      : statusMessages[newStatus] || 'There is an update on your complaint.';
  
  const metadata = {
    orderNumber: review.orderNumber,
    complaintStatus: newStatus,
    actionUrl: `/my-reviews`,
    adminResponse: hasAdminReply ? adminResponse : undefined,
    serviceName: review.serviceName,
  };
  
    return Notification.create({
    userId,
    type: 'complaint_response',
    title: hasAdminReply ? 'Reply to your complaint' : 'Update on your complaint',
    message,
    reviewId: review._id,
    bookingId: review.bookingId,
    metadata,
    priority: 'high',
  });
  },

  async cleanupOldNotifications(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
    const result = await prisma.notification.deleteMany({
      where: { isRead: true, createdAt: { lt: cutoffDate } },
    });
    return { deletedCount: result.count };
  },
});

export default Notification;
