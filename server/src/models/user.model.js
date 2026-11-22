/**
 * User store — Prisma/Postgres (Phase 2).
 * Keeps a Mongoose-like API so existing controllers keep working.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
  pickUpdateData,
  parseSelect,
} from '../platform/stores/mongoCompat.js';

const FIELD_MAP = {
  isVerfied: 'isVerified',
  createdBy: 'createdById',
};

function shapeUser(row, { includePassword = false } = {}) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phoneNumber: row.phoneNumber,
    googleId: row.googleId,
    passwordChangedAt: row.passwordChangedAt,
    role: row.role,
    isVerfied: row.isVerified,
    isVerified: row.isVerified,
    isActive: row.isActive,
    createdBy: row.createdById,
    createdById: row.createdById,
    lastLoginAt: row.lastLoginAt,
    onboardingToken: row.onboardingToken,
    onboardingTokenExpiresAt: row.onboardingTokenExpiresAt,
    onboardingTokenUsed: row.onboardingTokenUsed,
    onboardingTokenInvalidated: row.onboardingTokenInvalidated,
    onboardingTokenCreatedAt: row.onboardingTokenCreatedAt,
    fcmToken: row.fcmToken,
    referralCode: row.referralCode ?? null,
    referredById: row.referredById ?? null,
    wmCoinBalance: row.wmCoinBalance ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (includePassword) {
    doc.password = row.password;
  }

  return wrapUser(doc, { passwordHash: row.password, isNew: false });
}

function wrapUser(doc, { passwordHash = null, isNew = false } = {}) {
  const state = {
    passwordHash,
    isNew,
    passwordDirty: false,
    rawPassword: null,
  };

  const api = {
    ...doc,

    async comparePassword(candidate) {
      const hash = state.passwordHash || this.password;
      if (!hash) return false;
      return bcrypt.compare(candidate, hash);
    },

    async save() {
      const data = {
        name: this.name,
        email: typeof this.email === 'string' && this.email.trim()
          ? this.email.toLowerCase().trim()
          : null,
        phoneNumber: this.phoneNumber ?? null,
        googleId: this.googleId ?? null,
        role: this.role || 'user',
        isVerified: this.isVerfied ?? this.isVerified ?? false,
        isActive: this.isActive !== false,
        createdById: this.createdById ?? this.createdBy ?? null,
        lastLoginAt: this.lastLoginAt ?? null,
        onboardingToken: this.onboardingToken ?? null,
        onboardingTokenExpiresAt: this.onboardingTokenExpiresAt ?? null,
        onboardingTokenUsed: this.onboardingTokenUsed ?? false,
        onboardingTokenInvalidated: this.onboardingTokenInvalidated ?? false,
        onboardingTokenCreatedAt: this.onboardingTokenCreatedAt ?? null,
        fcmToken: this.fcmToken ?? null,
        passwordChangedAt: this.passwordChangedAt ?? null,
      };

      if (state.passwordDirty && state.rawPassword) {
        data.password = await bcrypt.hash(state.rawPassword, 10);
        data.passwordChangedAt = new Date();
      } else if (state.isNew && this.password && !String(this.password).startsWith('$2')) {
        data.password = await bcrypt.hash(this.password, 10);
        data.passwordChangedAt = new Date();
      } else if (state.isNew && this.password) {
        data.password = this.password;
      }

      let row;
      if (state.isNew) {
        row = await prisma.user.create({ data });
      } else {
        row = await prisma.user.update({
          where: { id: this._id || this.id },
          data,
        });
      }

      const shaped = shapeUser(row, { includePassword: false });
      Object.assign(this, shaped);
      state.isNew = false;
      state.passwordDirty = false;
      state.rawPassword = null;
      state.passwordHash = row.password;
      return this;
    },

    toObject() {
      const obj = { ...this };
      delete obj.comparePassword;
      delete obj.save;
      delete obj.toObject;
      delete obj.toJSON;
      delete obj.toSafeObject;
      return obj;
    },

    toJSON() {
      const obj = this.toObject();
      delete obj.password;
      return obj;
    },

    toSafeObject() {
      return this.toJSON();
    },
  };

  Object.defineProperty(api, 'password', {
    enumerable: true,
    configurable: true,
    get() {
      return state.rawPassword ?? undefined;
    },
    set(value) {
      state.passwordDirty = true;
      state.rawPassword = value;
    },
  });

  // Expose hash for compare when not dirty
  if (passwordHash && !state.passwordDirty) {
    Object.defineProperty(api, 'password', {
      enumerable: true,
      configurable: true,
      get() {
        if (state.passwordDirty) return state.rawPassword;
        return passwordHash;
      },
      set(value) {
        state.passwordDirty = true;
        state.rawPassword = value;
      },
    });
  }

  return api;
}

function UserConstructor(data = {}) {
  const doc = {
    _id: data._id || data.id,
    id: data.id || data._id,
    name: data.name,
    email: data.email,
    phoneNumber: data.phoneNumber,
    googleId: data.googleId,
    role: data.role || 'user',
    isVerfied: data.isVerfied ?? data.isVerified ?? !!data.googleId,
    isVerified: data.isVerfied ?? data.isVerified ?? !!data.googleId,
    isActive: data.isActive !== false,
    createdBy: data.createdBy ?? data.createdById ?? null,
    createdById: data.createdById ?? data.createdBy ?? null,
    lastLoginAt: data.lastLoginAt ?? null,
    onboardingToken: data.onboardingToken ?? null,
    onboardingTokenExpiresAt: data.onboardingTokenExpiresAt ?? null,
    onboardingTokenUsed: data.onboardingTokenUsed ?? false,
    onboardingTokenInvalidated: data.onboardingTokenInvalidated ?? false,
    onboardingTokenCreatedAt: data.onboardingTokenCreatedAt ?? null,
    fcmToken: data.fcmToken ?? null,
    referralCode: data.referralCode ?? null,
    referredById: data.referredById ?? null,
    wmCoinBalance: data.wmCoinBalance ?? 0,
    passwordChangedAt: data.passwordChangedAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };

  const wrapped = wrapUser(doc, { isNew: true, passwordHash: null });
  if (data.password) wrapped.password = data.password;
  return wrapped;
}

async function execFind(filter, opts = {}) {
  const where = toPrismaWhere(filter, FIELD_MAP);
  const parsed = parseSelect(opts.select);
  const includePassword = !!parsed.forceIncludePassword;

  const rows = await prisma.user.findMany({
    where,
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeUser(row, { includePassword });
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    if (opts.lean) return plain;
    return wrapUser(
      { ...plain, password: includePassword ? row.password : undefined },
      { passwordHash: row.password, isNew: false },
    );
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

export const User = Object.assign(UserConstructor, {
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
    const doc = UserConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.user.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await execFindOne(filter, { select: '+password' });
    if (!existing) return null;

    const data = pickUpdateData(update);
    if (data.isVerfied !== undefined) {
      data.isVerified = data.isVerfied;
      delete data.isVerfied;
    }
    if (data.createdBy !== undefined) {
      data.createdById = data.createdBy;
      delete data.createdBy;
    }
    if (data._id) delete data._id;
    if (data.id) delete data.id;

    if (data.password && !String(data.password).startsWith('$2')) {
      data.password = await bcrypt.hash(data.password, 10);
      data.passwordChangedAt = new Date();
    }

    const row = await prisma.user.update({
      where: { id: existing._id },
      data,
    });

    const shaped = shapeUser(row, { includePassword: false });
    return options.lean ? shaped.toObject() : shaped;
  },

  findByIdAndUpdate(id, update, options = {}) {
    return new QueryChain(async (opts) => {
      const result = await User.findOneAndUpdate({ _id: String(id) }, update, {
        ...options,
        lean: opts.lean || options.lean,
      });
      return result;
    });
  },

  async findByIdAndDelete(id) {
    try {
      const row = await prisma.user.delete({ where: { id: String(id) } });
      return shapeUser(row);
    } catch {
      return null;
    }
  },
});

export default User;
