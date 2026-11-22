/**
 * DailySlots store — Prisma/Postgres (Phase 5).
 * Backed by DailySlotDay (one row per date) + DailySlotTime (child rows).
 * Preserves the Mongoose-like API: one document per date with an embedded
 * `slots[]` array where each slot's `_id`/`id` is the DailySlotTime.id.
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
  createdBy: 'createdById',
};

function toMinutes(time) {
  return String(time)
    .split(':')
    .reduce((acc, t) => 60 * acc + Number(t), 0);
}

/** Normalize any date-like input to UTC midnight (matches the @db.Date column). */
function normalizeDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const iso = d.toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
}

function toSlotRow(slot = {}) {
  return {
    startTime: slot.startTime,
    endTime: slot.endTime,
    maxBookings: slot.maxBookings != null ? Number(slot.maxBookings) : 10,
    currentBookings: slot.currentBookings != null ? Number(slot.currentBookings) : 0,
    isAvailable: slot.isAvailable !== undefined ? !!slot.isAvailable : true,
    notes: slot.notes || null,
  };
}

function shapeSlot(row) {
  return {
    _id: row.id,
    id: row.id,
    startTime: row.startTime,
    endTime: row.endTime,
    maxBookings: row.maxBookings,
    currentBookings: row.currentBookings,
    isAvailable: row.isAvailable,
    notes: row.notes,
  };
}

function computeVirtuals(slots = []) {
  return {
    totalSlots: slots.length,
    availableSlotsCount: slots.filter((s) => s.isAvailable && s.currentBookings < s.maxBookings).length,
  };
}

function shapeDailySlots(row) {
  if (!row) return null;
  const slots = (row.slots || []).map(shapeSlot);

  const doc = {
    _id: row.id,
    id: row.id,
    date: row.date,
    slots,
    createdBy: row.createdById,
    createdById: row.createdById,
    isActive: row.isActive,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...computeVirtuals(slots),
  };

  return wrapDailySlots(doc, { isNew: false });
}

function wrapDailySlots(doc, { isNew = false } = {}) {
  const state = { isNew };

  const api = {
    ...doc,

    toSafeObject() {
      return this.toObject();
    },

    getAvailableSlots() {
      return (this.slots || []).filter((s) => s.isAvailable && s.currentBookings < s.maxBookings);
    },

    getSlotById(slotId) {
      if (!slotId) return null;
      return (
        (this.slots || []).find(
          (s) => String(s.id) === String(slotId) || String(s._id) === String(slotId),
        ) || null
      );
    },

    async bookSlot(slotId) {
      const slot = this.getSlotById(slotId);
      if (!slot) throw new Error('Slot not found');
      if (!slot.isAvailable) throw new Error('Slot is not available');
      if (slot.currentBookings >= slot.maxBookings) throw new Error('Slot is fully booked');
      slot.currentBookings += 1;
      return this.save();
    },

    async cancelSlotBooking(slotId) {
      const slot = this.getSlotById(slotId);
      if (!slot) throw new Error('Slot not found');
      if (slot.currentBookings <= 0) throw new Error('No bookings to cancel');
      slot.currentBookings -= 1;
      return this.save();
    },

    async addSlot(slotData) {
      const newStart = toMinutes(slotData.startTime);
      const newEnd = toMinutes(slotData.endTime);

      for (const existingSlot of this.slots || []) {
        const existingStart = toMinutes(existingSlot.startTime);
        const existingEnd = toMinutes(existingSlot.endTime);
        if (newStart < existingEnd && newEnd > existingStart) {
          throw new Error(
            `New slot overlaps with existing slot ${existingSlot.startTime}-${existingSlot.endTime}`,
          );
        }
      }

      this.slots = [
        ...(this.slots || []),
        {
          startTime: slotData.startTime,
          endTime: slotData.endTime,
          maxBookings: slotData.maxBookings || 10,
          currentBookings: slotData.currentBookings || 0,
          isAvailable: slotData.isAvailable !== undefined ? slotData.isAvailable : true,
          notes: slotData.notes || null,
        },
      ];

      return this.save();
    },

    async removeSlot(slotId) {
      const slot = this.getSlotById(slotId);
      if (!slot) throw new Error('Slot not found');
      if (slot.currentBookings > 0) throw new Error('Cannot remove slot with existing bookings');

      this.slots = (this.slots || []).filter(
        (s) => String(s.id) !== String(slotId) && String(s._id) !== String(slotId),
      );

      return this.save();
    },

    async save() {
      const normalizedDate = normalizeDate(this.date);
      if (!normalizedDate) throw new Error('A valid date is required');

      for (const slot of this.slots || []) {
        const startMinutes = toMinutes(slot.startTime);
        const endMinutes = toMinutes(slot.endTime);
        if (endMinutes <= startMinutes) {
          throw new Error(`Slot ${slot.startTime}-${slot.endTime}: End time must be after start time`);
        }
        if ((slot.currentBookings || 0) > (slot.maxBookings || 0)) {
          throw new Error(
            `Slot ${slot.startTime}-${slot.endTime}: Current bookings cannot exceed maximum bookings`,
          );
        }
      }

      const dayData = {
        date: normalizedDate,
        isActive: this.isActive !== false,
        notes: this.notes ?? null,
        createdById: this.createdById ?? this.createdBy ?? null,
      };

      let dayId = this._id || this.id;

      if (state.isNew) {
        const created = await prisma.dailySlotDay.create({
          data: {
            ...dayData,
            slots: { create: (this.slots || []).map(toSlotRow) },
          },
          include: { slots: true },
        });

        const shaped = shapeDailySlots(created);
        Object.assign(this, shaped);
        state.isNew = false;
        return this;
      }

      await prisma.$transaction(async (tx) => {
        await tx.dailySlotDay.update({ where: { id: dayId }, data: dayData });

        const existing = await tx.dailySlotTime.findMany({ where: { dayId }, select: { id: true } });
        const existingIds = new Set(existing.map((s) => s.id));
        const keepIds = new Set();

        for (const slot of this.slots || []) {
          const sid = slot.id || slot._id;
          if (sid && existingIds.has(sid)) {
            keepIds.add(sid);
            await tx.dailySlotTime.update({ where: { id: sid }, data: toSlotRow(slot) });
          } else {
            const created = await tx.dailySlotTime.create({ data: { ...toSlotRow(slot), dayId } });
            keepIds.add(created.id);
          }
        }

        const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
        if (toDelete.length) {
          await tx.dailySlotTime.deleteMany({ where: { id: { in: toDelete } } });
        }
      });

      const row = await prisma.dailySlotDay.findUnique({ where: { id: dayId }, include: { slots: true } });
      const shaped = shapeDailySlots(row);
      Object.assign(this, shaped);
      return this;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.toSafeObject;
      delete obj.getAvailableSlots;
      delete obj.getSlotById;
      delete obj.bookSlot;
      delete obj.cancelSlotBooking;
      delete obj.addSlot;
      delete obj.removeSlot;
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

function DailySlotsConstructor(data = {}) {
  return wrapDailySlots(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      date: data.date,
      slots: Array.isArray(data.slots) ? data.slots.map((s) => ({ ...s })) : [],
      createdBy: data.createdBy ?? data.createdById ?? null,
      createdById: data.createdById ?? data.createdBy ?? null,
      isActive: data.isActive !== false,
      notes: data.notes ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

function sqlSafeFilter(filter = {}) {
  const safe = {};
  for (const [key, val] of Object.entries(filter)) {
    if (key === '_id') {
      safe.id = typeof val === 'object' && val !== null ? val : String(val);
      continue;
    }
    safe[key] = val;
  }
  return toPrismaWhere(safe, FIELD_MAP);
}

async function execFind(filter = {}, opts = {}) {
  const where = sqlSafeFilter(filter);
  const rows = await prisma.dailySlotDay.findMany({
    where,
    include: { slots: true },
    orderBy: toPrismaOrderBy(opts.sort) || [{ date: 'asc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeDailySlots(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapDailySlots(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const DailySlots = Object.assign(DailySlotsConstructor, {
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
    const doc = DailySlotsConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.dailySlotDay.count({ where: sqlSafeFilter(filter) });
  },

  async findByIdAndDelete(id) {
    try {
      const row = await prisma.dailySlotDay.delete({
        where: { id: String(id) },
        include: { slots: true },
      });
      return shapeDailySlots(row);
    } catch {
      return null;
    }
  },

  async findByDate(date) {
    const normalized = normalizeDate(date);
    if (!normalized) return null;
    const row = await prisma.dailySlotDay.findFirst({
      where: { date: normalized, isActive: true },
      include: { slots: true },
    });
    return shapeDailySlots(row);
  },

  async createSlotsForDate(date, slots, createdBy) {
    const existing = await DailySlots.findByDate(date);
    if (existing) {
      throw new Error('Slots already exist for this date');
    }

    const dailySlots = DailySlotsConstructor({
      date,
      slots: (slots || []).map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxBookings: slot.maxBookings || 10,
        isAvailable: slot.isAvailable !== undefined ? slot.isAvailable : true,
      })),
      createdBy,
    });

    return dailySlots.save();
  },

  async findAvailableSlotsForDate(date) {
    const dailySlots = await DailySlots.findByDate(date);
    if (!dailySlots) return [];
    return dailySlots.getAvailableSlots();
  },

  async aggregate(pipeline = []) {
    const rows = await prisma.dailySlotDay.findMany({ include: { slots: true } });
    const docs = rows.map((r) => shapeDailySlots(r).toObject());
    return runAggregate(docs, pipeline);
  },
});

export default DailySlots;
