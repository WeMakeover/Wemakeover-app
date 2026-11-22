/**
 * BookingConfig store — Prisma/Postgres (Phase 5).
 * Mongoose-like API for existing controllers/services.
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
  lastUpdatedBy: 'lastUpdatedById',
};

function formattedValue(value, metadata) {
  const unit = metadata?.unit || 'rupees';
  switch (unit) {
    case 'rupees':
      return `₹${value}`;
    case 'hours':
      return `${value} hours`;
    case 'count':
      return `${value}`;
    case 'percentage':
      return `${value}%`;
    case 'minutes':
      return `${value} minutes`;
    default:
      return `${value}`;
  }
}

function shapeUserLite(user) {
  if (!user) return null;
  if (typeof user === 'string') return user;
  return {
    _id: user.id || user._id,
    id: user.id || user._id,
    name: user.name,
    email: user.email,
  };
}

function shapeBookingConfig(row, { populated } = {}) {
  if (!row) return null;

  const metadata =
    row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const auditLog = Array.isArray(row.auditLog) ? row.auditLog : [];

  const lastUpdatedBy =
    populated?.lastUpdatedBy !== undefined
      ? populated.lastUpdatedBy
      : row.lastUpdatedById;

  const doc = {
    _id: row.id,
    id: row.id,
    configKey: row.configKey,
    value: row.value,
    currency: row.currency,
    description: row.description,
    isActive: row.isActive,
    lastUpdatedBy,
    lastUpdatedById: row.lastUpdatedById,
    metadata,
    auditLog,
    formattedValue: formattedValue(row.value, metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapBookingConfig(doc, { isNew: false });
}

function wrapBookingConfig(doc, { isNew = false } = {}) {
  const state = {
    isNew,
    previousValue: undefined,
    updateReason: undefined,
  };

  return {
    ...doc,

    async save() {
      let auditLog = Array.isArray(this.auditLog) ? [...this.auditLog] : [];

      if (
        !state.isNew &&
        state.previousValue !== undefined &&
        state.previousValue !== this.value
      ) {
        auditLog.push({
          updatedBy: this.lastUpdatedById || this.lastUpdatedBy,
          previousValue: state.previousValue,
          newValue: this.value,
          updatedAt: new Date(),
          reason: state.updateReason || 'Updated via admin panel',
        });
      }

      const data = {
        configKey: String(this.configKey || '')
          .trim()
          .toUpperCase(),
        value: Number(this.value) || 0,
        currency: (this.currency || 'INR').toUpperCase(),
        description: this.description ?? null,
        isActive: this.isActive !== false,
        lastUpdatedById:
          this.lastUpdatedById ??
          (typeof this.lastUpdatedBy === 'string'
            ? this.lastUpdatedBy
            : this.lastUpdatedBy?._id || this.lastUpdatedBy?.id) ??
          null,
        metadata: this.metadata || {},
        auditLog,
      };

      const row = state.isNew
        ? await prisma.bookingConfig.create({ data })
        : await prisma.bookingConfig.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeBookingConfig(row);
      Object.assign(this, shaped);
      state.isNew = false;
      state.previousValue = undefined;
      state.updateReason = undefined;
      return this;
    },

    async updateValue(newValue, adminId, reason = null) {
      state.previousValue = this.value;
      state.updateReason = reason;
      this.value = newValue;
      this.lastUpdatedBy = adminId;
      this.lastUpdatedById = adminId;
      return this.save();
    },

    async toggleActive(adminId) {
      this.isActive = !this.isActive;
      this.lastUpdatedBy = adminId;
      this.lastUpdatedById = adminId;
      return this.save();
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.updateValue;
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

function BookingConfigConstructor(data = {}) {
  return wrapBookingConfig(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      configKey: data.configKey,
      value: data.value,
      currency: data.currency || 'INR',
      description: data.description,
      isActive: data.isActive !== false,
      lastUpdatedBy: data.lastUpdatedBy ?? data.lastUpdatedById,
      lastUpdatedById: data.lastUpdatedById ?? data.lastUpdatedBy,
      metadata: data.metadata || {},
      auditLog: Array.isArray(data.auditLog) ? data.auditLog : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

async function applyPopulates(rows, populates = []) {
  if (!populates.length) return rows.map((row) => shapeBookingConfig(row));

  const needLastUpdated = populates.some((p) => p.path === 'lastUpdatedBy');
  const userIds = new Set();

  for (const row of rows) {
    if (needLastUpdated && row.lastUpdatedById) {
      userIds.add(row.lastUpdatedById);
    }
  }

  const users = userIds.size
    ? await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const byId = Object.fromEntries(
    users.map((u) => [u.id, shapeUserLite(u)]),
  );

  return rows.map((row) =>
    shapeBookingConfig(row, {
      populated: {
        lastUpdatedBy: row.lastUpdatedById
          ? byId[row.lastUpdatedById] || row.lastUpdatedById
          : null,
      },
    }),
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.bookingConfig.findMany({
    where: toPrismaWhere(filter, FIELD_MAP),
    orderBy: toPrismaOrderBy(opts.sort) || [{ configKey: 'asc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  const shaped = await applyPopulates(rows, opts.populates);
  return shaped.map((doc) => {
    const plain = applySelectToObject(doc.toObject(), opts.select);
    return opts.lean ? plain : wrapBookingConfig(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const BookingConfig = Object.assign(BookingConfigConstructor, {
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
    const doc = BookingConfigConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.bookingConfig.count({
      where: toPrismaWhere(filter, FIELD_MAP),
    });
  },

  async deleteOne(filter = {}) {
    const existing = await execFindOne(filter);
    if (!existing) return { deletedCount: 0 };
    await prisma.bookingConfig.delete({ where: { id: existing._id } });
    return { deletedCount: 1 };
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) => {
      const existing = await execFindOne({ _id: String(id) });
      if (!existing) return null;

      const setData = pickUpdateData(update);
      if (setData.lastUpdatedBy !== undefined) {
        setData.lastUpdatedById = setData.lastUpdatedBy;
        delete setData.lastUpdatedBy;
      }
      if (setData.configKey) {
        setData.configKey = String(setData.configKey).trim().toUpperCase();
      }
      delete setData._id;
      delete setData.id;

      const row = await prisma.bookingConfig.update({
        where: { id: String(id) },
        data: setData,
      });

      const shaped = shapeBookingConfig(row);
      return opts.lean || options.lean ? shaped.toObject() : shaped;
    });
  },

  getByKey(configKey) {
    return BookingConfig.findOne({
      configKey: String(configKey).toUpperCase(),
      isActive: true,
    });
  },

  getAllActive() {
    return BookingConfig.find({ isActive: true })
      .populate('lastUpdatedBy', 'name email')
      .sort({ configKey: 1 });
  },

  async seedInitialConfigs(adminId) {
    const initialConfigs = [
      {
        configKey: 'MINIMUM_ORDER_VALUE',
        value: 799,
        currency: 'INR',
        description: 'Minimum order value required to place a booking',
        isActive: true,
        lastUpdatedBy: adminId,
        metadata: {
          unit: 'rupees',
          displayName: 'Minimum Order Value',
          helpText:
            'Users must add services worth at least this amount to place a booking. This ensures service quality and operational efficiency.',
          validationRules: {
            min: 0,
            max: 10000,
            step: 1,
          },
        },
      },
      {
        configKey: 'MAX_RESCHEDULE_COUNT',
        value: 3,
        currency: 'INR',
        description: 'Maximum number of times a booking can be rescheduled',
        isActive: true,
        lastUpdatedBy: adminId,
        metadata: {
          unit: 'count',
          displayName: 'Max Reschedule Count',
          helpText:
            'Limits the number of times a customer can reschedule their booking to prevent abuse.',
          validationRules: {
            min: 0,
            max: 10,
            step: 1,
          },
        },
      },
      {
        configKey: 'CANCELLATION_WINDOW_HOURS',
        value: 2,
        currency: 'INR',
        description:
          'Minimum hours before booking time when cancellation is allowed',
        isActive: true,
        lastUpdatedBy: adminId,
        metadata: {
          unit: 'hours',
          displayName: 'Cancellation Window',
          helpText:
            'Customers can cancel their booking only if it is more than this many hours away.',
          validationRules: {
            min: 0,
            max: 72,
            step: 1,
          },
        },
      },
      {
        configKey: 'RESCHEDULE_WINDOW_HOURS',
        value: 4,
        currency: 'INR',
        description:
          'Minimum hours before booking time when rescheduling is allowed',
        isActive: true,
        lastUpdatedBy: adminId,
        metadata: {
          unit: 'hours',
          displayName: 'Reschedule Window',
          helpText:
            'Customers can reschedule their booking only if it is more than this many hours away.',
          validationRules: {
            min: 0,
            max: 72,
            step: 1,
          },
        },
      },
      {
        configKey: 'MAX_BOOKINGS_PER_SLOT',
        value: 1,
        currency: 'INR',
        description: 'Maximum number of bookings allowed per time slot',
        isActive: true,
        lastUpdatedBy: adminId,
        metadata: {
          unit: 'count',
          displayName: 'Bookings Per Slot',
          helpText:
            'How many customers can book the same time slot. Set to 1 when one therapist serves one customer per slot.',
          validationRules: {
            min: 1,
            max: 50,
            step: 1,
          },
        },
      },
    ];

    const results = [];
    for (const config of initialConfigs) {
      try {
        const existing = await BookingConfig.findOne({
          configKey: config.configKey,
        });
        if (!existing) {
          const newConfig = await BookingConfig.create(config);
          results.push({ success: true, config: newConfig });
        } else {
          results.push({
            success: false,
            message: `Config ${config.configKey} already exists`,
            config: existing,
          });
        }
      } catch (error) {
        results.push({
          success: false,
          message: error.message,
          configKey: config.configKey,
        });
      }
    }

    return results;
  },
});

export default BookingConfig;
