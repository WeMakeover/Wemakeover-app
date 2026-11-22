/**
 * ServiceableCity store — Prisma/Postgres (Phase 5).
 * Mongoose-like API for existing controllers/utils.
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
  createdBy: 'createdById',
  updatedBy: 'updatedById',
};

function titleCase(str) {
  if (!str) return str;
  return String(str)
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function unescapeRegexSource(source) {
  return String(source).replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
}

/**
 * Convert RegExp filter values to Prisma-friendly equals/contains objects
 * so existing controller RegExp usage keeps working.
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

    if (val instanceof RegExp) {
      const exact = val.source.startsWith('^') && val.source.endsWith('$');
      const text = exact
        ? unescapeRegexSource(val.source.slice(1, -1))
        : unescapeRegexSource(val.source);
      const mode = val.flags.includes('i') ? 'insensitive' : 'default';
      out[key] = exact
        ? { equals: text, mode }
        : { contains: text, mode };
    } else {
      out[key] = val;
    }
  }
  return out;
}

function toDateOrNull(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Numeric timestamp string
    if (/^\d{10,13}$/.test(trimmed)) {
      const n = Number(trimmed);
      const ms = trimmed.length === 10 ? n * 1000 : n;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function mapWriteData(raw = {}) {
  const data = { ...raw };
  if (data.createdBy !== undefined) {
    data.createdById =
      typeof data.createdBy === 'string'
        ? data.createdBy
        : data.createdBy?._id || data.createdBy?.id || null;
    delete data.createdBy;
  }
  if (data.updatedBy !== undefined) {
    data.updatedById =
      typeof data.updatedBy === 'string'
        ? data.updatedBy
        : data.updatedBy?._id || data.updatedBy?.id || null;
    delete data.updatedBy;
  }
  if (data.city != null) data.city = titleCase(String(data.city).trim());
  if (data.state != null) data.state = titleCase(String(data.state).trim());
  if (data.launchDate !== undefined) {
    data.launchDate = toDateOrNull(data.launchDate);
  }
  if (data.lastBookingAt !== undefined) {
    data.lastBookingAt = toDateOrNull(data.lastBookingAt);
  }
  delete data._id;
  delete data.id;
  delete data.fullLocation;
  return data;
}

function shapeServiceableCity(row) {
  if (!row) return null;

  const displayName =
    row.displayName || `${row.city}, ${row.state}`;

  const doc = {
    _id: row.id,
    id: row.id,
    city: row.city,
    state: row.state,
    country: row.country,
    isActive: row.isActive,
    displayName,
    priority: row.priority ?? 0,
    serviceRadius: row.serviceRadius,
    coveragePincodes: row.coveragePincodes || [],
    launchDate: row.launchDate,
    description: row.description,
    notes: row.notes,
    bookingCount: row.bookingCount ?? 0,
    lastBookingAt: row.lastBookingAt,
    createdBy: row.createdById,
    updatedBy: row.updatedById,
    createdById: row.createdById,
    updatedById: row.updatedById,
    fullLocation: displayName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapServiceableCity(doc, { isNew: false });
}

function wrapServiceableCity(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      const city = titleCase(String(this.city || '').trim());
      const stateName = titleCase(String(this.state || 'Bihar').trim());
      const displayName =
        this.displayName || `${city}, ${stateName}`;

      const data = {
        city,
        state: stateName,
        country: this.country || 'India',
        isActive: this.isActive !== false,
        displayName,
        priority: this.priority ?? 0,
        serviceRadius: this.serviceRadius ?? null,
        coveragePincodes: Array.isArray(this.coveragePincodes)
          ? this.coveragePincodes
          : [],
        launchDate: toDateOrNull(this.launchDate),
        description: this.description ?? null,
        notes: this.notes ?? null,
        bookingCount: this.bookingCount ?? 0,
        lastBookingAt: toDateOrNull(this.lastBookingAt),
        createdById:
          this.createdById ??
          (typeof this.createdBy === 'string'
            ? this.createdBy
            : this.createdBy?._id || this.createdBy?.id) ??
          null,
        updatedById:
          this.updatedById ??
          (typeof this.updatedBy === 'string'
            ? this.updatedBy
            : this.updatedBy?._id || this.updatedBy?.id) ??
          null,
      };

      const row = state.isNew
        ? await prisma.serviceableCity.create({ data })
        : await prisma.serviceableCity.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeServiceableCity(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    async toggleActive() {
      this.isActive = !this.isActive;
      return this.save();
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.toggleActive;
      delete obj.toObject;
      delete obj.toJSON;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },
  };
}

function ServiceableCityConstructor(data = {}) {
  return wrapServiceableCity(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      city: data.city,
      state: data.state || 'Bihar',
      country: data.country || 'India',
      isActive: data.isActive !== false,
      displayName: data.displayName,
      priority: data.priority ?? 0,
      serviceRadius: data.serviceRadius ?? null,
      coveragePincodes: Array.isArray(data.coveragePincodes)
        ? data.coveragePincodes
        : [],
      launchDate: data.launchDate || new Date(),
      description: data.description,
      notes: data.notes,
      bookingCount: data.bookingCount ?? 0,
      lastBookingAt: data.lastBookingAt ?? null,
      createdBy: data.createdBy ?? data.createdById,
      updatedBy: data.updatedBy ?? data.updatedById,
      createdById: data.createdById ?? data.createdBy,
      updatedById: data.updatedById ?? data.updatedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.serviceableCity.findMany({
    where: toPrismaWhere(preprocessFilter(filter), FIELD_MAP),
    orderBy:
      toPrismaOrderBy(opts.sort) || [{ priority: 'desc' }, { city: 'asc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeServiceableCity(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapServiceableCity(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const ServiceableCity = Object.assign(ServiceableCityConstructor, {
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
    const doc = ServiceableCityConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.serviceableCity.count({
      where: toPrismaWhere(preprocessFilter(filter), FIELD_MAP),
    });
  },

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await execFindOne(filter);
    if (!existing) return null;

    const data = {};
    if (update.$inc && typeof update.$inc === 'object') {
      for (const [key, amount] of Object.entries(update.$inc)) {
        data[key] = { increment: Number(amount) || 0 };
      }
    }

    Object.assign(data, mapWriteData(pickUpdateData(update)));

    const row = await prisma.serviceableCity.update({
      where: { id: existing._id },
      data,
    });

    const shaped = shapeServiceableCity(row);
    return options.new === false
      ? existing
      : options.lean
        ? shaped.toObject()
        : shaped;
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) =>
      ServiceableCity.findOneAndUpdate({ _id: String(id) }, update, {
        ...options,
        lean: opts.lean || options.lean,
      }),
    );
  },

  async findByIdAndDelete(id) {
    try {
      const row = await prisma.serviceableCity.delete({
        where: { id: String(id) },
      });
      return shapeServiceableCity(row);
    } catch {
      return null;
    }
  },

  async aggregate(pipeline = []) {
    const rows = await prisma.serviceableCity.findMany();
    return runAggregate(
      rows.map((r) => shapeServiceableCity(r).toObject()),
      pipeline,
    );
  },

  async getActiveCities() {
    return execFind(
      { isActive: true },
      {
        sort: { priority: -1, city: 1 },
        select: 'city state displayName priority coveragePincodes',
        lean: true,
      },
    );
  },

  async isServiceable(cityName) {
    if (!cityName) return false;

    const normalizedCity = cityName.trim();
    const city = await prisma.serviceableCity.findFirst({
      where: {
        city: { equals: normalizedCity, mode: 'insensitive' },
        isActive: true,
      },
    });

    return !!city;
  },

  async getCityDetails(cityName) {
    if (!cityName) return null;

    const normalizedCity = cityName.trim();
    const row = await prisma.serviceableCity.findFirst({
      where: {
        city: { equals: normalizedCity, mode: 'insensitive' },
        isActive: true,
      },
    });

    return row ? shapeServiceableCity(row).toObject() : null;
  },

  async incrementBookingCount(cityName) {
    if (!cityName) return;

    const normalizedCity = cityName.trim();
    const existing = await prisma.serviceableCity.findFirst({
      where: {
        city: { equals: normalizedCity, mode: 'insensitive' },
      },
    });

    if (!existing) return;

    await prisma.serviceableCity.update({
      where: { id: existing.id },
      data: {
        bookingCount: { increment: 1 },
        lastBookingAt: new Date(),
      },
    });
  },
});

export default ServiceableCity;
