/**
 * Address store — Prisma/Postgres (Phase 2).
 * Mongoose-like API for existing controllers/middleware.
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
  user: 'userId',
};

function fullAddressString(row) {
  return [
    row.houseFlatNumber,
    row.streetAreaName,
    row.completeAddress,
    row.landmark,
    row.city,
    row.state,
    row.pincode,
    row.country,
    row.phone ? `Phone: ${row.phone}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

function shapeAddress(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    user: row.userId,
    userId: row.userId,
    houseFlatNumber: row.houseFlatNumber,
    streetAreaName: row.streetAreaName,
    completeAddress: row.completeAddress,
    landmark: row.landmark,
    pincode: row.pincode,
    city: row.city,
    state: row.state,
    country: row.country,
    phone: row.phone,
    isDefault: row.isDefault,
    addressType: row.addressType,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    fullAddress: fullAddressString(row),
  };

  return wrapAddress(doc, { isNew: false });
}

function wrapAddress(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      if (this.isDefault) {
        await prisma.address.updateMany({
          where: {
            userId: this.user || this.userId,
            isActive: true,
            ...(state.isNew ? {} : { id: { not: this._id || this.id } }),
          },
          data: { isDefault: false },
        });
      }

      const data = {
        userId: this.user || this.userId,
        houseFlatNumber: this.houseFlatNumber,
        streetAreaName: this.streetAreaName,
        completeAddress: this.completeAddress,
        landmark: this.landmark ?? null,
        pincode: this.pincode,
        city: this.city ?? null,
        state: this.state ?? 'Bihar',
        country: this.country ?? 'India',
        phone: this.phone,
        isDefault: !!this.isDefault,
        addressType: this.addressType || 'home',
        isActive: this.isActive !== false,
      };

      const row = state.isNew
        ? await prisma.address.create({ data })
        : await prisma.address.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeAddress(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.toObject;
      delete obj.toJSON;
      delete obj.toSafeObject;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },

    toSafeObject() {
      return this.toObject();
    },
  };
}

function AddressConstructor(data = {}) {
  return wrapAddress(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      user: data.user || data.userId,
      userId: data.userId || data.user,
      houseFlatNumber: data.houseFlatNumber,
      streetAreaName: data.streetAreaName,
      completeAddress: data.completeAddress,
      landmark: data.landmark,
      pincode: data.pincode,
      city: data.city,
      state: data.state,
      country: data.country,
      phone: data.phone,
      isDefault: !!data.isDefault,
      addressType: data.addressType || 'home',
      isActive: data.isActive !== false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.address.findMany({
    where: toPrismaWhere(filter, FIELD_MAP),
    orderBy: toPrismaOrderBy(opts.sort) || [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeAddress(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapAddress(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

async function clearOtherDefaults(userId, exceptId) {
  await prisma.address.updateMany({
    where: {
      userId: String(userId),
      isActive: true,
      ...(exceptId ? { id: { not: String(exceptId) } } : {}),
    },
    data: { isDefault: false },
  });
}

const Address = Object.assign(AddressConstructor, {
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

  async countDocuments(filter = {}) {
    return prisma.address.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  async findByUser(userId, includeInactive = false) {
    const filter = { user: userId };
    if (!includeInactive) filter.isActive = true;
    return execFind(filter, { sort: { isDefault: -1, createdAt: -1 } });
  },

  async findDefaultByUser(userId) {
    return execFindOne({ user: userId, isDefault: true, isActive: true });
  },

  async setDefaultAddress(userId, addressId) {
    const address = await prisma.address.findFirst({
      where: { id: String(addressId), userId: String(userId), isActive: true },
    });
    if (!address) {
      throw new Error('Address not found or does not belong to user');
    }
    await clearOtherDefaults(userId, addressId);
    await prisma.address.update({
      where: { id: String(addressId) },
      data: { isDefault: true },
    });
  },

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await execFindOne(filter);
    if (!existing) return null;

    const data = pickUpdateData(update);
    if (data.user !== undefined) {
      data.userId = data.user;
      delete data.user;
    }
    delete data._id;
    delete data.id;

    if (data.isDefault === true) {
      await clearOtherDefaults(existing.user || existing.userId, existing._id);
    }

    const row = await prisma.address.update({
      where: { id: existing._id },
      data,
    });

    const shaped = shapeAddress(row);
    return options.new === false ? existing : options.lean ? shaped.toObject() : shaped;
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) =>
      Address.findOneAndUpdate({ _id: String(id) }, update, {
        ...options,
        lean: opts.lean || options.lean,
      }),
    );
  },

  async findByIdAndDelete(id) {
    try {
      const row = await prisma.address.delete({ where: { id: String(id) } });
      return shapeAddress(row);
    } catch {
      return null;
    }
  },

  async updateMany(filter, update) {
    const data = pickUpdateData(update);
    if (data.user !== undefined) {
      data.userId = data.user;
      delete data.user;
    }
    const result = await prisma.address.updateMany({
      where: toPrismaWhere(filter, FIELD_MAP),
      data,
    });
    return { modifiedCount: result.count, matchedCount: result.count };
  },
});

export default Address;
