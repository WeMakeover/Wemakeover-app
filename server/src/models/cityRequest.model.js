/**
 * CityRequest store — Prisma/Postgres (Phase 5).
 * Mongoose-like API for existing controllers.
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

const FIELD_MAP = {
  resolvedBy: 'resolvedById',
};

function unescapeRegexSource(source) {
  return String(source).replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
}

/**
 * Normalize Mongo-style filters used by admin controllers
 * (RegExp instances, anchored $regex → case-insensitive equals).
 */
function preprocessFilter(filter = {}) {
  if (!filter || typeof filter !== 'object') return {};

  if (filter.$or) {
    return { $or: filter.$or.map((part) => preprocessFilter(part)) };
  }
  if (filter.$and) {
    return { $and: filter.$and.map((part) => preprocessFilter(part)) };
  }

  const out = {};
  for (const [key, val] of Object.entries(filter)) {
    if (key.startsWith('$')) {
      out[key] = val;
      continue;
    }

    // Nested JSON paths (e.g. userDetails.name) — leave for runAggregate / skip Prisma path
    if (key.includes('.')) {
      out[key] = val;
      continue;
    }

    if (val instanceof RegExp) {
      const exact = val.source.startsWith('^') && val.source.endsWith('$');
      const text = exact
        ? unescapeRegexSource(val.source.slice(1, -1))
        : unescapeRegexSource(val.source);
      const mode = val.flags.includes('i') ? 'insensitive' : 'default';
      out[key] = exact
        ? { equals: text, mode }
        : { contains: text, mode };
      continue;
    }

    if (val && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val) && val.$regex != null) {
      const rx = val.$regex;
      const options = String(val.$options || (rx instanceof RegExp ? rx.flags : '') || '');
      const source = rx instanceof RegExp ? rx.source : String(rx);
      const exact = source.startsWith('^') && source.endsWith('$');
      const text = exact
        ? unescapeRegexSource(source.slice(1, -1))
        : unescapeRegexSource(source);
      const mode = options.includes('i') ? 'insensitive' : 'default';
      out[key] = exact
        ? { equals: text, mode }
        : { contains: text, mode };
      continue;
    }

    out[key] = val;
  }
  return out;
}

async function nextRequestNumber() {
  const existing = await prisma.counter.findUnique({
    where: { id: 'cityRequestNumber' },
  });

  if (!existing) {
    const count = await prisma.cityRequest.count();
    await prisma.counter.upsert({
      where: { id: 'cityRequestNumber' },
      create: { id: 'cityRequestNumber', seq: count },
      update: {},
    });
  }

  const result = await prisma.counter.update({
    where: { id: 'cityRequestNumber' },
    data: { seq: { increment: 1 } },
  });

  return `CReq${String(result.seq).padStart(6, '0')}`;
}

function mapWriteData(raw = {}) {
  const data = { ...raw };
  if (data.resolvedBy !== undefined) {
    data.resolvedById =
      typeof data.resolvedBy === 'string'
        ? data.resolvedBy
        : data.resolvedBy?._id || data.resolvedBy?.id || null;
    delete data.resolvedBy;
  }
  if (data.user !== undefined) {
    data.userId = data.user;
    delete data.user;
  }
  delete data._id;
  delete data.id;
  return data;
}

function shapeCityRequest(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    requestNumber: row.requestNumber,
    userId: row.userId,
    requestedCity: row.requestedCity,
    requestedState: row.requestedState,
    userDetails: row.userDetails || {},
    message: row.message ?? '',
    status: row.status,
    source: row.source,
    adminNotes: row.adminNotes ?? '',
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedById,
    resolvedById: row.resolvedById,
    metadata: row.metadata || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapCityRequest(doc, { isNew: false });
}

function wrapCityRequest(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      if (state.isNew && !this.requestNumber) {
        this.requestNumber = await nextRequestNumber();
      }

      const data = {
        requestNumber: this.requestNumber,
        userId: this.userId || null,
        requestedCity:
          this.requestedCity != null
            ? String(this.requestedCity).trim()
            : this.requestedCity,
        requestedState:
          this.requestedState != null
            ? String(this.requestedState).trim()
            : null,
        userDetails: this.userDetails || {},
        message: this.message ?? '',
        status: this.status || 'pending',
        source: this.source || 'footer_modal',
        adminNotes: this.adminNotes ?? '',
        resolvedAt: this.resolvedAt ?? null,
        resolvedById:
          this.resolvedById ??
          (typeof this.resolvedBy === 'string'
            ? this.resolvedBy
            : this.resolvedBy?._id || this.resolvedBy?.id) ??
          null,
        metadata: this.metadata || {},
      };

      const row = state.isNew
        ? await prisma.cityRequest.create({ data })
        : await prisma.cityRequest.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeCityRequest(row);
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

function CityRequestConstructor(data = {}) {
  return wrapCityRequest(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      requestNumber: data.requestNumber,
      userId: data.userId ?? null,
      requestedCity: data.requestedCity,
      requestedState: data.requestedState ?? null,
      userDetails: data.userDetails || {},
      message: data.message ?? '',
      status: data.status || 'pending',
      source: data.source || 'footer_modal',
      adminNotes: data.adminNotes ?? '',
      resolvedAt: data.resolvedAt ?? null,
      resolvedBy: data.resolvedBy ?? data.resolvedById ?? null,
      resolvedById: data.resolvedById ?? data.resolvedBy ?? null,
      metadata: data.metadata || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

function getNestedPath(obj, path) {
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function matchRegexValue(actual, expected) {
  if (!expected || typeof expected !== 'object' || expected.$regex == null) {
    return null;
  }
  const rx =
    expected.$regex instanceof RegExp
      ? expected.$regex
      : new RegExp(String(expected.$regex), String(expected.$options || ''));
  return rx.test(String(actual ?? ''));
}

function matchDocLocal(doc, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$and') return expected.every((part) => matchDocLocal(doc, part));
    if (key === '$or') return expected.some((part) => matchDocLocal(doc, part));

    const actual = getNestedPath(doc, key);

    if (expected && typeof expected === 'object' && !(expected instanceof Date) && !Array.isArray(expected)) {
      const regexHit = matchRegexValue(actual, expected);
      if (regexHit !== null) return regexHit;

      if (expected.$gte != null && !(new Date(actual) >= new Date(expected.$gte) || actual >= expected.$gte)) {
        return false;
      }
      if (expected.$lte != null && !(new Date(actual) <= new Date(expected.$lte) || actual <= expected.$lte)) {
        return false;
      }
      if (expected.$gt != null && !(new Date(actual) > new Date(expected.$gt) || actual > expected.$gt)) {
        return false;
      }
      if (expected.$lt != null && !(new Date(actual) < new Date(expected.$lt) || actual < expected.$lt)) {
        return false;
      }
      if (expected.$in && !expected.$in.map(String).includes(String(actual))) return false;
      if (expected.$ne != null && String(actual) === String(expected.$ne)) return false;
      return true;
    }

    return String(actual) === String(expected);
  });
}

function filterDocsInMemory(docs, filter) {
  if (!filter || !Object.keys(filter).length) return docs;
  return docs.filter((doc) => matchDocLocal(doc, filter));
}

function filterHasNestedPaths(filter = {}) {
  if (!filter || typeof filter !== 'object') return false;
  if (filter.$or) return filter.$or.some(filterHasNestedPaths);
  if (filter.$and) return filter.$and.some(filterHasNestedPaths);
  return Object.keys(filter).some((k) => !k.startsWith('$') && k.includes('.'));
}

function filterNeedsInMemory(filter = {}) {
  if (!filter || typeof filter !== 'object') return false;
  if (filterHasNestedPaths(filter)) return true;
  // Anchored RegExp via $regex: RegExp also needs preprocess; non-nested handled by Prisma
  return false;
}

async function execFind(filter, opts = {}) {
  // Nested JSON path filters (userDetails.name etc.) aren't expressible in Prisma
  // where — fetch + filter in-memory.
  if (filterNeedsInMemory(filter)) {
    const rows = await prisma.cityRequest.findMany({
      orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    });
    let matched = filterDocsInMemory(
      rows.map((r) => shapeCityRequest(r).toObject()),
      filter,
    );
    if (opts.sort) {
      matched = runAggregate(matched, [{ $sort: opts.sort }]);
    }
    if (opts.skip) matched = matched.slice(opts.skip);
    if (opts.limit != null) matched = matched.slice(0, opts.limit);

    return matched.map((plain) => {
      const selected = applySelectToObject(plain, opts.select);
      return opts.lean ? selected : wrapCityRequest(selected, { isNew: false });
    });
  }

  const rows = await prisma.cityRequest.findMany({
    where: toPrismaWhere(preprocessFilter(filter), FIELD_MAP),
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeCityRequest(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapCityRequest(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const CityRequest = Object.assign(CityRequestConstructor, {
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
    const doc = CityRequestConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    if (filterNeedsInMemory(filter)) {
      const rows = await prisma.cityRequest.findMany();
      return filterDocsInMemory(
        rows.map((r) => shapeCityRequest(r).toObject()),
        filter,
      ).length;
    }
    return prisma.cityRequest.count({
      where: toPrismaWhere(preprocessFilter(filter), FIELD_MAP),
    });
  },

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await execFindOne(filter);
    if (!existing) return null;

    const data = mapWriteData(pickUpdateData(update));
    const row = await prisma.cityRequest.update({
      where: { id: existing._id },
      data,
    });

    const shaped = shapeCityRequest(row);
    return options.new === false
      ? existing
      : options.lean
        ? shaped.toObject()
        : shaped;
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) =>
      CityRequest.findOneAndUpdate({ _id: String(id) }, update, {
        ...options,
        lean: opts.lean || options.lean,
      }),
    );
  },

  async aggregate(pipeline = []) {
    const rows = await prisma.cityRequest.findMany();
    let docs = rows.map((r) => shapeCityRequest(r).toObject());

    const stages = Array.isArray(pipeline) ? [...pipeline] : [];
    // Use local matcher for $match so $regex / nested JSON paths work
    if (stages[0]?.$match) {
      docs = filterDocsInMemory(docs, stages[0].$match);
      stages.shift();
    }

    return runAggregate(docs, stages);
  },

  async distinct(field) {
    const prismaField =
      field === '_id'
        ? 'id'
        : FIELD_MAP[field] || field;

    const rows = await prisma.cityRequest.findMany({
      select: { [prismaField]: true },
      distinct: [prismaField],
    });

    return rows
      .map((r) => r[prismaField])
      .filter((v) => v != null);
  },
});

export default CityRequest;
