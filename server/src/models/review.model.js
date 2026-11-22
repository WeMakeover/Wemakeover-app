/**
 * Review store — Prisma/Postgres (Phase 5).
 */

import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
  pickUpdateData,
} from '../platform/stores/mongoCompat.js';
import { runAggregate } from '../platform/stores/aggregate.js';

const EDIT_WINDOW_HOURS = 48;

const FIELD_MAP = {
  respondedBy: 'respondedById',
};

function toId(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value._id || value.id || null;
  return value;
}

function getPath(obj, path) {
  return path.split('.').reduce((acc, p) => (acc == null ? undefined : acc[p]), obj);
}

function matchesValue(actual, expected) {
  if (expected && typeof expected === 'object' && !(expected instanceof Date) && !Array.isArray(expected)) {
    if (expected.$regex !== undefined) {
      const flags = String(expected.$options || '').includes('i') ? 'i' : '';
      try {
        return new RegExp(expected.$regex, flags).test(String(actual ?? ''));
      } catch {
        return false;
      }
    }
    if (expected.$in) return expected.$in.map(String).includes(String(actual));
    if (expected.$nin) {
      return !expected.$nin.some((v) => (v === null ? actual == null : String(v) === String(actual)));
    }
    if (expected.$ne !== undefined) return String(actual) !== String(expected.$ne);
    if (expected.$exists === false) return actual == null;
    if (expected.$exists === true) return actual != null;
    if (expected.$gte !== undefined && !(new Date(actual) >= new Date(expected.$gte))) return false;
    if (expected.$gt !== undefined && !(new Date(actual) > new Date(expected.$gt))) return false;
    if (expected.$lte !== undefined && !(new Date(actual) <= new Date(expected.$lte))) return false;
    if (expected.$lt !== undefined && !(new Date(actual) < new Date(expected.$lt))) return false;
    return true;
  }
  if (actual instanceof Date || expected instanceof Date) {
    return new Date(actual).getTime() === new Date(expected).getTime();
  }
  return String(actual) === String(expected);
}

function docMatchesFilter(doc, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some((f) => docMatchesFilter(doc, f));
    if (key === '$and') return expected.every((f) => docMatchesFilter(doc, f));
    if (key.startsWith('$')) return true;
    const actual = key === '_id' ? doc._id : getPath(doc, key);
    return matchesValue(actual, expected);
  });
}

function hasDottedKeys(cond) {
  if (!cond || typeof cond !== 'object') return false;
  if (Array.isArray(cond)) return cond.some(hasDottedKeys);
  return Object.entries(cond).some(([k, v]) => {
    if (k === '$or' || k === '$and') return hasDottedKeys(v);
    return k.includes('.');
  });
}

function needsJsFilter(filter = {}) {
  return (
    Object.keys(filter).some((k) => k.includes('.')) ||
    (filter.$or && hasDottedKeys(filter.$or)) ||
    (filter.$and && hasDottedKeys(filter.$and))
  );
}

function sqlSafeFilter(filter = {}) {
  const safe = {};
  for (const [key, val] of Object.entries(filter)) {
    if (key === '_id') {
      safe.id = typeof val === 'object' && val !== null ? val : String(val);
      continue;
    }
    if (key.includes('.')) continue;
    if ((key === '$or' || key === '$and') && hasDottedKeys(val)) continue;
    safe[key] = val;
  }
  return toPrismaWhere(safe, FIELD_MAP);
}

function computeVirtuals(row) {
  const expires = row.editWindowExpiresAt ? new Date(row.editWindowExpiresAt) : null;
  const canBeEdited = expires ? new Date() < expires : false;
  const editTimeRemaining = expires ? Math.max(0, expires.getTime() - Date.now()) : 0;
  return { canBeEdited, editTimeRemaining };
}

function shapeReview(row, { populatedUser, populatedBooking, populatedResponder, populatedService } = {}) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    userId: populatedUser !== undefined ? populatedUser : row.userId,
    bookingId: populatedBooking !== undefined ? populatedBooking : row.bookingId,
    orderNumber: row.orderNumber,
    serviceId: populatedService !== undefined ? populatedService : row.serviceId,
    customerDetails: row.customerDetails || {},
    serviceName: row.serviceName,
    rating: row.rating,
    comment: row.comment,
    type: row.type,
    complaintCategory: row.complaintCategory,
    status: row.status,
    adminResponse: row.adminResponse,
    respondedBy: populatedResponder !== undefined ? populatedResponder : row.respondedById,
    respondedById: row.respondedById,
    respondedAt: row.respondedAt,
    source: row.source,
    isEdited: row.isEdited,
    editedAt: row.editedAt,
    editWindowExpiresAt: row.editWindowExpiresAt,
    userNotifiedOfResponse: row.userNotifiedOfResponse,
    userNotifiedAt: row.userNotifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...computeVirtuals(row),
  };

  return wrapReview(doc, { isNew: false });
}

function wrapReview(doc, { isNew = false } = {}) {
  const state = {
    isNew,
    originalRating: doc.rating,
    originalComment: doc.comment,
  };

  const api = {
    ...doc,

    canUserEdit(userId) {
      if (!this.userId || String(toId(this.userId)) !== String(userId)) return false;
      if (!this.editWindowExpiresAt) return false;
      return new Date() < new Date(this.editWindowExpiresAt);
    },

    async respondToComplaint(adminId, response, newStatus = 'reviewed') {
      this.adminResponse = response;
      this.respondedBy = adminId;
      this.respondedById = adminId;
      this.respondedAt = new Date();
      this.status = newStatus;
      return this.save();
    },

    async save() {
      const now = new Date();
      let editWindowExpiresAt = this.editWindowExpiresAt;
      if (state.isNew && !editWindowExpiresAt) {
        editWindowExpiresAt = new Date(now.getTime() + EDIT_WINDOW_HOURS * 60 * 60 * 1000);
      }

      let isEdited = this.isEdited || false;
      let editedAt = this.editedAt || null;
      if (!state.isNew && (this.rating !== state.originalRating || this.comment !== state.originalComment)) {
        isEdited = true;
        editedAt = now;
      }

      const data = {
        userId: toId(this.userId),
        bookingId: toId(this.bookingId),
        orderNumber: this.orderNumber ?? null,
        serviceId: this.serviceId ?? null,
        customerDetails: this.customerDetails ?? undefined,
        serviceName: this.serviceName ?? null,
        rating: this.rating ?? null,
        comment: this.comment ?? '',
        type: this.type || 'review',
        complaintCategory: this.complaintCategory ?? null,
        status: this.status || 'pending',
        adminResponse: this.adminResponse ?? null,
        respondedById: toId(this.respondedById ?? this.respondedBy),
        respondedAt: this.respondedAt ?? null,
        source: this.source || 'web',
        isEdited,
        editedAt,
        editWindowExpiresAt,
        userNotifiedOfResponse: this.userNotifiedOfResponse ?? false,
        userNotifiedAt: this.userNotifiedAt ?? null,
      };

      const row = state.isNew
        ? await prisma.review.create({ data })
        : await prisma.review.update({ where: { id: this._id || this.id }, data });

      const shaped = shapeReview(row);
      Object.assign(this, shaped);
      state.isNew = false;
      state.originalRating = this.rating;
      state.originalComment = this.comment;
      return this;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.canUserEdit;
      delete obj.respondToComplaint;
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

function ReviewConstructor(data = {}) {
  return wrapReview(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      userId: toId(data.userId) ?? null,
      bookingId: toId(data.bookingId) ?? null,
      orderNumber: data.orderNumber ?? null,
      serviceId: data.serviceId ?? null,
      customerDetails: data.customerDetails || {},
      serviceName: data.serviceName ?? null,
      rating: data.rating ?? null,
      comment: data.comment ?? '',
      type: data.type || 'review',
      complaintCategory: data.complaintCategory ?? null,
      status: data.status || 'pending',
      adminResponse: data.adminResponse ?? null,
      respondedBy: toId(data.respondedBy ?? data.respondedById) ?? null,
      respondedById: toId(data.respondedById ?? data.respondedBy) ?? null,
      respondedAt: data.respondedAt ?? null,
      source: data.source || 'web',
      isEdited: data.isEdited ?? false,
      editedAt: data.editedAt ?? null,
      editWindowExpiresAt: data.editWindowExpiresAt ?? null,
      userNotifiedOfResponse: data.userNotifiedOfResponse ?? false,
      userNotifiedAt: data.userNotifiedAt ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

async function loadUsersLite(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, email: true, phoneNumber: true },
  });
  return Object.fromEntries(
    users.map((u) => [
      u.id,
      { _id: u.id, id: u.id, name: u.name, email: u.email, phoneNumber: u.phoneNumber, phone: u.phoneNumber },
    ]),
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
        bookingDetails: r.bookingDetails,
        services: (r.services || []).map((s) => ({
          _id: s.id,
          id: s.id,
          name: s.name,
          price: s.price,
          quantity: s.quantity,
        })),
      },
    ]),
  );
}

async function loadServicesLite(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return {};
  const rows = await prisma.service.findMany({ where: { id: { in: unique } } });
  return Object.fromEntries(rows.map((r) => [r.id, { _id: r.id, id: r.id, name: r.name }]));
}

async function applyPopulates(docs, populates = []) {
  if (!populates.length) return docs;

  const needUser = populates.some((p) => p.path === 'userId');
  const needBooking = populates.some((p) => p.path === 'bookingId');
  const needResponder = populates.some((p) => p.path === 'respondedBy');
  const needService = populates.some((p) => p.path === 'serviceId');

  const userIds = [];
  if (needUser) userIds.push(...docs.map((d) => d.userId));
  if (needResponder) userIds.push(...docs.map((d) => d.respondedBy));

  const [usersMap, bookingsMap, servicesMap] = await Promise.all([
    userIds.length ? loadUsersLite(userIds) : {},
    needBooking ? loadBookingsLite(docs.map((d) => d.bookingId)) : {},
    needService ? loadServicesLite(docs.map((d) => d.serviceId)) : {},
  ]);

  return docs.map((doc) => {
    const obj = doc.toObject();
    if (needUser) obj.userId = obj.userId ? usersMap[obj.userId] || obj.userId : obj.userId;
    if (needResponder) obj.respondedBy = obj.respondedBy ? usersMap[obj.respondedBy] || obj.respondedBy : obj.respondedBy;
    if (needBooking) obj.bookingId = obj.bookingId ? bookingsMap[obj.bookingId] || obj.bookingId : obj.bookingId;
    if (needService) obj.serviceId = obj.serviceId ? servicesMap[obj.serviceId] || obj.serviceId : obj.serviceId;
    return wrapReview(obj, { isNew: false });
  });
}

async function execFind(filter = {}, opts = {}) {
  const jsFilter = needsJsFilter(filter);
  const where = sqlSafeFilter(filter);

  const rows = await prisma.review.findMany({
    where,
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: jsFilter ? 0 : opts.skip || 0,
    take: jsFilter ? undefined : opts.limit ?? undefined,
  });

  let docs = rows.map((r) => shapeReview(r));

  if (jsFilter) {
    docs = docs.filter((d) => docMatchesFilter(d.toObject(), filter));
    if (opts.skip) docs = docs.slice(opts.skip);
    if (opts.limit != null) docs = docs.slice(0, opts.limit);
  }

  docs = await applyPopulates(docs, opts.populates);

  return docs.map((doc) => {
    const plain = applySelectToObject(doc.toObject(), opts.select);
    return opts.lean ? plain : wrapReview(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

async function countDocumentsInternal(filter = {}) {
  if (needsJsFilter(filter)) {
    const rows = await prisma.review.findMany({ where: sqlSafeFilter(filter) });
    const docs = rows.map((r) => shapeReview(r).toObject());
    return docs.filter((d) => docMatchesFilter(d, filter)).length;
  }
  return prisma.review.count({ where: sqlSafeFilter(filter) });
}

const Review = Object.assign(ReviewConstructor, {
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
    const doc = ReviewConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return countDocumentsInternal(filter);
  },

  async aggregate(pipeline = []) {
    const rows = await prisma.review.findMany();
    const docs = rows.map((r) => shapeReview(r).toObject());
    return runAggregate(docs, pipeline);
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) => {
      const existing = await execFindOne({ _id: String(id) });
      if (!existing) return null;

      const data = pickUpdateData(update);
      if (data.respondedBy !== undefined) {
        data.respondedById = toId(data.respondedBy);
        delete data.respondedBy;
      }
      Object.assign(existing, data);
      await existing.save();

      const populates = opts.populates?.length ? opts.populates : options.populate ? [{ path: 'userId' }] : [];
      if (populates.length) {
        return execFindOne({ _id: String(id) }, { ...opts, populates });
      }

      return opts.lean || options.lean ? existing.toObject() : existing;
    });
  },

  findByBooking(bookingId) {
    return new QueryChain((opts) =>
      execFindOne({ bookingId: String(bookingId) }, { ...opts, populates: [{ path: 'userId' }] }),
    );
  },

  findPendingComplaints() {
    return new QueryChain((opts) =>
      execFind(
        { type: 'complaint', status: 'pending' },
        {
          ...opts,
          sort: opts.sort || { createdAt: -1 },
          populates: [{ path: 'userId' }, { path: 'bookingId' }],
        },
      ),
    );
  },

  async getReviewStats() {
    const rows = await prisma.review.findMany();
    const docs = rows.map((r) => shapeReview(r).toObject());

    const typeStats = runAggregate(docs, [
      { $group: { _id: '$type', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
    ]);

    const complaintStatusStats = runAggregate(docs, [
    { $match: { type: 'complaint' } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return { typeStats, complaintStatusStats };
  },
});

export default Review;
