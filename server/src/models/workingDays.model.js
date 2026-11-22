/**
 * WorkingDays store — Prisma/Postgres (Phase 5).
 */

import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
} from '../platform/stores/mongoCompat.js';

const FIELD_MAP = {
  createdBy: 'createdById',
  updatedBy: 'updatedById',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toMinutes(time) {
  return String(time)
    .split(':')
    .reduce((acc, t) => 60 * acc + Number(t), 0);
}

function minutesToTime(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function computeVirtuals(doc) {
  const dayName = DAY_NAMES[doc.dayOfWeek];
  let workingHours = 0;
  if (doc.isWorking && doc.startTime && doc.endTime) {
    workingHours = toMinutes(doc.endTime) - toMinutes(doc.startTime);
  }
  return { dayName, workingHours };
}

function shapeWorkingDay(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    isWorking: row.isWorking,
    startTime: row.startTime,
    endTime: row.endTime,
    breakStart: row.breakStart,
    breakEnd: row.breakEnd,
    createdBy: row.createdById,
    updatedBy: row.updatedById,
    createdById: row.createdById,
    updatedById: row.updatedById,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  doc.dayName = computeVirtuals(doc).dayName;
  doc.workingHours = computeVirtuals(doc).workingHours;

  return wrapWorkingDay(doc, { isNew: false });
}

function wrapWorkingDay(doc, { isNew = false } = {}) {
  const state = { isNew };

  const api = {
    ...doc,

    toSafeObject() {
      return this.toObject();
    },

    isWorkingAtTime(time) {
      if (!this.isWorking) return false;

      const timeMinutes = toMinutes(time);
      const startMinutes = toMinutes(this.startTime);
      const endMinutes = toMinutes(this.endTime);

      if (timeMinutes < startMinutes || timeMinutes >= endMinutes) return false;

      if (this.breakStart && this.breakEnd) {
        const breakStartMinutes = toMinutes(this.breakStart);
        const breakEndMinutes = toMinutes(this.breakEnd);
        if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) return false;
      }

      return true;
    },

    getAvailableTimeSlots(slotDuration = 45) {
      if (!this.isWorking) return [];

      const startMinutes = toMinutes(this.startTime);
      const endMinutes = toMinutes(this.endTime);

      let breakStartMinutes = null;
      let breakEndMinutes = null;
      if (this.breakStart && this.breakEnd) {
        breakStartMinutes = toMinutes(this.breakStart);
        breakEndMinutes = toMinutes(this.breakEnd);
      }

      const slots = [];
      let currentMinutes = startMinutes;

      while (currentMinutes + slotDuration <= endMinutes) {
        if (breakStartMinutes != null && breakEndMinutes != null) {
          if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
            currentMinutes = breakEndMinutes;
            continue;
          }
          if (currentMinutes + slotDuration > breakStartMinutes && currentMinutes < breakEndMinutes) {
            currentMinutes = breakEndMinutes;
            continue;
          }
        }

        slots.push({
          startTime: minutesToTime(currentMinutes),
          endTime: minutesToTime(currentMinutes + slotDuration),
          duration: slotDuration,
        });

        currentMinutes += slotDuration;
      }

      return slots;
    },

    async save() {
      if (this.isWorking) {
        const startMinutes = toMinutes(this.startTime);
        const endMinutes = toMinutes(this.endTime);
        if (endMinutes <= startMinutes) {
          throw new Error('End time must be after start time');
        }

        if (this.breakStart && this.breakEnd) {
          const breakStartMinutes = toMinutes(this.breakStart);
          const breakEndMinutes = toMinutes(this.breakEnd);
          if (breakEndMinutes <= breakStartMinutes) {
            throw new Error('Break end time must be after break start time');
          }
          if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
            throw new Error('Break time must be within working hours');
          }
        }
      }

      const data = {
        dayOfWeek: Number(this.dayOfWeek),
        isWorking: this.isWorking !== false,
        startTime: this.isWorking ? this.startTime ?? null : null,
        endTime: this.isWorking ? this.endTime ?? null : null,
        breakStart: this.isWorking ? this.breakStart ?? null : null,
        breakEnd: this.isWorking ? this.breakEnd ?? null : null,
        isActive: this.isActive !== false,
        createdById: this.createdById ?? this.createdBy ?? null,
        updatedById: this.updatedById ?? this.updatedBy ?? null,
      };

      const row = state.isNew
        ? await prisma.workingDay.create({ data })
        : await prisma.workingDay.update({ where: { id: this._id || this.id }, data });

      const shaped = shapeWorkingDay(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.toSafeObject;
      delete obj.isWorkingAtTime;
      delete obj.getAvailableTimeSlots;
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

function WorkingDayConstructor(data = {}) {
  const doc = {
    _id: data._id || data.id,
    id: data.id || data._id,
    dayOfWeek: data.dayOfWeek,
    isWorking: data.isWorking !== undefined ? data.isWorking : true,
    startTime: data.startTime ?? null,
    endTime: data.endTime ?? null,
    breakStart: data.breakStart ?? null,
    breakEnd: data.breakEnd ?? null,
    createdBy: data.createdBy ?? data.createdById ?? null,
    updatedBy: data.updatedBy ?? data.updatedById ?? null,
    createdById: data.createdById ?? data.createdBy ?? null,
    updatedById: data.updatedById ?? data.updatedBy ?? null,
    isActive: data.isActive !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  const virtuals = computeVirtuals(doc);
  return wrapWorkingDay({ ...doc, ...virtuals }, { isNew: true });
}

function sqlSafeFilter(filter = {}) {
  const safe = {};
  for (const [key, val] of Object.entries(filter)) {
    if (key === '_id') {
      safe.id = typeof val === 'object' && val !== null ? val : String(val);
      continue;
    }
    if (key === 'dayOfWeek' && val != null) {
      safe.dayOfWeek = typeof val === 'object' ? val : Number(val);
      continue;
    }
    safe[key] = val;
  }
  return toPrismaWhere(safe, FIELD_MAP);
}

async function execFind(filter = {}, opts = {}) {
  const where = sqlSafeFilter(filter);
  const rows = await prisma.workingDay.findMany({
    where,
    orderBy: toPrismaOrderBy(opts.sort) || [{ dayOfWeek: 'asc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeWorkingDay(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapWorkingDay(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const WorkingDays = Object.assign(WorkingDayConstructor, {
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
    const doc = WorkingDayConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.workingDay.count({ where: sqlSafeFilter(filter) });
  },

  getWorkingDay(dayOfWeek) {
    return WorkingDays.findOne({ dayOfWeek, isActive: true });
  },

  getAllWorkingDays() {
    return WorkingDays.find({ isActive: true }).sort({ dayOfWeek: 1 });
  },

  async isDateWorking(date) {
    const dayOfWeek = new Date(date).getDay();
    const workingDay = await execFindOne({ dayOfWeek, isActive: true });
    return workingDay ? workingDay.isWorking : false;
  },

  async getAvailableSlotsForDate(date, slotDuration = 45) {
    const dayOfWeek = new Date(date).getDay();
    const workingDay = await execFindOne({ dayOfWeek, isActive: true });
    if (!workingDay || !workingDay.isWorking) return [];
    return workingDay.getAvailableTimeSlots(slotDuration);
  },
});

export default WorkingDays;
