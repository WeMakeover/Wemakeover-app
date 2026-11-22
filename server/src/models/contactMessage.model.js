/**
 * ContactMessage store — Prisma/Postgres (Phase 5).
 * Mongoose-like API for existing controllers.
 */

import { prisma } from '../platform/db/postgres.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
} from '../platform/stores/mongoCompat.js';

function shapeContactMessage(row) {
  if (!row) return null;

  const doc = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phoneNumber: row.phoneNumber,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapContactMessage(doc, { isNew: false });
}

function wrapContactMessage(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      const data = {
        name: this.name != null ? String(this.name).trim() : this.name,
        email:
          this.email != null
            ? String(this.email).trim().toLowerCase()
            : this.email,
        phoneNumber:
          this.phoneNumber != null
            ? String(this.phoneNumber).trim()
            : null,
        message: this.message != null ? String(this.message).trim() : this.message,
        status: this.status || 'pending',
      };

      const row = state.isNew
        ? await prisma.contactMessage.create({ data })
        : await prisma.contactMessage.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeContactMessage(row);
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

function ContactMessageConstructor(data = {}) {
  return wrapContactMessage(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber ?? null,
      message: data.message,
      status: data.status || 'pending',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.contactMessage.findMany({
    where: toPrismaWhere(filter),
    orderBy: toPrismaOrderBy(opts.sort) || [{ createdAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeContactMessage(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapContactMessage(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const ContactMessage = Object.assign(ContactMessageConstructor, {
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
    const doc = ContactMessageConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.contactMessage.count({ where: toPrismaWhere(filter) });
  },
});

export default ContactMessage;
