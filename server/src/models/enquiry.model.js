/**
 * Enquiry store — Prisma/Postgres (Phase 5).
 */

import crypto from 'crypto';
import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
  pickUpdateData,
} from '../platform/stores/mongoCompat.js';
import { runAggregate } from '../platform/stores/aggregate.js';
import { getNextEnquiryNumber } from './counter.model.js';

const FIELD_MAP = {
  assignedTo: 'assignedToId',
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

function normalizeAdminNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map((n) => {
    const id = n._id || n.id || crypto.randomUUID();
    return {
      _id: id,
      id,
      note: n.note,
      addedBy: toId(n.addedBy),
      addedAt: n.addedAt || new Date(),
    };
  });
}

function shapeEnquiry(row, { populatedUser, populatedAssignedTo } = {}) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    enquiryNumber: row.enquiryNumber,
    userId: populatedUser !== undefined ? populatedUser : row.userId,
    source: row.source,
    userDetails: row.userDetails || {},
    serviceDetails: row.serviceDetails || {},
    enquiryDetails: row.enquiryDetails || {},
    status: row.status,
    priority: row.priority,
    assignedTo: populatedAssignedTo !== undefined ? populatedAssignedTo : row.assignedToId,
    assignedToId: row.assignedToId,
    resolvedAt: row.resolvedAt,
    adminNotes: row.adminNotes || [],
    internalComments: row.internalComments || '',
    metadata: row.metadata || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapEnquiry(doc, { isNew: false });
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

function wrapEnquiry(doc, { isNew = false } = {}) {
  const state = { isNew };

  const api = {
    ...doc,

    canTransitionTo(newStatus) {
      const validTransitions = {
        pending: ['contacted', 'cancelled'],
        contacted: ['quoted', 'cancelled'],
        quoted: ['converted', 'cancelled'],
        converted: [],
        cancelled: [],
      };
      return validTransitions[this.status]?.includes(newStatus) || false;
    },

    async populate(path) {
      if (path === 'userId' && this.userId) {
        const id = toId(this.userId);
        const map = await loadUsersLite([id]);
        this.userId = map[id] || this.userId;
      } else if (path === 'assignedTo' && this.assignedTo) {
        const id = toId(this.assignedTo);
        const map = await loadUsersLite([id]);
        this.assignedTo = map[id] || this.assignedTo;
      } else if (path === 'adminNotes.addedBy') {
        const ids = (this.adminNotes || []).map((n) => toId(n.addedBy));
        const map = await loadUsersLite(ids);
        this.adminNotes = (this.adminNotes || []).map((n) => ({
          ...n,
          addedBy: map[toId(n.addedBy)] || n.addedBy,
        }));
      }
      return this;
    },

    async save() {
      const wasNew = state.isNew;

      if (wasNew && !this.enquiryNumber) {
        this.enquiryNumber = await getNextEnquiryNumber();
      }

      const data = {
        enquiryNumber: this.enquiryNumber,
        userId: toId(this.userId) ?? null,
        source: this.source ?? null,
        userDetails: this.userDetails ?? undefined,
        serviceDetails: this.serviceDetails ?? undefined,
        enquiryDetails: this.enquiryDetails ?? undefined,
        status: this.status || 'pending',
        priority: this.priority || 'medium',
        assignedToId: toId(this.assignedToId ?? this.assignedTo) ?? null,
        resolvedAt: this.resolvedAt ?? null,
        adminNotes: normalizeAdminNotes(this.adminNotes),
        internalComments: this.internalComments ?? '',
        metadata: this.metadata ?? undefined,
      };

      const row = wasNew
        ? await prisma.enquiry.create({ data })
        : await prisma.enquiry.update({ where: { id: this._id || this.id }, data });

      const shaped = shapeEnquiry(row);
      Object.assign(this, shaped);
      state.isNew = false;

      if (wasNew) {
        console.log('✅ Enquiry created successfully:', this.enquiryNumber);
        console.log('🔔 Enquiry saved! Sending notification emails...');

        const enquirySnapshot = this.toObject();

        import('../services/email.service.js')
          .then(({ sendEnquiryNotificationToAdmin, sendEnquiryConfirmationToUser }) => {
            setImmediate(async () => {
              try {
                await sendEnquiryNotificationToAdmin(enquirySnapshot);
                console.log('✅ Admin notification email sent for enquiry:', enquirySnapshot.enquiryNumber);

                await sendEnquiryConfirmationToUser(enquirySnapshot);
                console.log('✅ User confirmation email sent for enquiry:', enquirySnapshot.enquiryNumber);
              } catch (emailError) {
                console.error('❌ Failed to send enquiry emails:', emailError);
              }
            });
          })
          .catch((error) => console.error('⚠️ Error in post-save email notification:', error));
      }

      return this;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.canTransitionTo;
      delete obj.populate;
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

function EnquiryConstructor(data = {}) {
  return wrapEnquiry(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      enquiryNumber: data.enquiryNumber || null,
      userId: toId(data.userId) ?? null,
      source: data.source ?? null,
      userDetails: data.userDetails || {},
      serviceDetails: data.serviceDetails || {},
      enquiryDetails: data.enquiryDetails || {},
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      assignedTo: toId(data.assignedTo ?? data.assignedToId) ?? null,
      assignedToId: toId(data.assignedToId ?? data.assignedTo) ?? null,
      resolvedAt: data.resolvedAt ?? null,
      adminNotes: normalizeAdminNotes(data.adminNotes || []),
      internalComments: data.internalComments ?? '',
      metadata: data.metadata || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

async function applyPopulates(docs, populates = []) {
  if (!populates.length) return docs;

  const needUser = populates.some((p) => p.path === 'userId');
  const needAssigned = populates.some((p) => p.path === 'assignedTo');
  const needNotes = populates.some((p) => p.path === 'adminNotes.addedBy');

  const ids = [];
  if (needUser) ids.push(...docs.map((d) => d.userId));
  if (needAssigned) ids.push(...docs.map((d) => d.assignedTo));
  if (needNotes) docs.forEach((d) => ids.push(...(d.adminNotes || []).map((n) => n.addedBy)));

  const usersMap = ids.length ? await loadUsersLite(ids) : {};

  return docs.map((doc) => {
    const obj = doc.toObject();
    if (needUser) obj.userId = obj.userId ? usersMap[obj.userId] || obj.userId : obj.userId;
    if (needAssigned) obj.assignedTo = obj.assignedTo ? usersMap[obj.assignedTo] || obj.assignedTo : obj.assignedTo;
    if (needNotes) {
      obj.adminNotes = (obj.adminNotes || []).map((n) => ({ ...n, addedBy: usersMap[n.addedBy] || n.addedBy }));
    }
    return wrapEnquiry(obj, { isNew: false });
  });
}

async function execFind(filter = {}, opts = {}) {
  const jsFilter = needsJsFilter(filter);
  const where = sqlSafeFilter(filter);

  const rows = await prisma.enquiry.findMany({
    where,
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: jsFilter ? 0 : opts.skip || 0,
    take: jsFilter ? undefined : opts.limit ?? undefined,
  });

  let docs = rows.map((r) => shapeEnquiry(r));

  if (jsFilter) {
    docs = docs.filter((d) => docMatchesFilter(d.toObject(), filter));
    if (opts.skip) docs = docs.slice(opts.skip);
    if (opts.limit != null) docs = docs.slice(0, opts.limit);
  }

  docs = await applyPopulates(docs, opts.populates);

  return docs.map((doc) => {
    const plain = applySelectToObject(doc.toObject(), opts.select);
    return opts.lean ? plain : wrapEnquiry(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

async function countDocumentsInternal(filter = {}) {
  if (needsJsFilter(filter)) {
    const rows = await prisma.enquiry.findMany({ where: sqlSafeFilter(filter) });
    const docs = rows.map((r) => shapeEnquiry(r).toObject());
    return docs.filter((d) => docMatchesFilter(d, filter)).length;
  }
  return prisma.enquiry.count({ where: sqlSafeFilter(filter) });
}

const Enquiry = Object.assign(EnquiryConstructor, {
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
    const doc = EnquiryConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return countDocumentsInternal(filter);
  },

  async aggregate(pipeline = []) {
    const rows = await prisma.enquiry.findMany();
    const docs = rows.map((r) => shapeEnquiry(r).toObject());
    return runAggregate(docs, pipeline);
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) => {
      const existing = await execFindOne({ _id: String(id) });
      if (!existing) return null;

      const data = pickUpdateData(update);
      if (data.assignedTo !== undefined) {
        data.assignedToId = toId(data.assignedTo);
        delete data.assignedTo;
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

  async getEnquiriesWithFilters(filters = {}, options = {}) {
    const { status, priority, source, startDate, endDate, searchTerm } = filters;

    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (source) query.source = source;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (searchTerm) {
      query.$or = [
        { enquiryNumber: { $regex: searchTerm, $options: 'i' } },
        { 'userDetails.name': { $regex: searchTerm, $options: 'i' } },
        { 'userDetails.email': { $regex: searchTerm, $options: 'i' } },
        { 'userDetails.phone': { $regex: searchTerm, $options: 'i' } },
        { 'serviceDetails.serviceName': { $regex: searchTerm, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [enquiries, total] = await Promise.all([
      execFind(query, {
        sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
        skip,
        limit,
        populates: [{ path: 'userId' }, { path: 'assignedTo' }],
        lean: true,
      }),
      countDocumentsInternal(query),
    ]);

    return {
      enquiries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
});

export default Enquiry;
