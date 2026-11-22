/**
 * Newsletter store — Prisma/Postgres (Phase 5).
 * Mongoose-like API for existing controllers/services.
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

const DEFAULT_PREFERENCES = {
  beautyTips: true,
  newServices: true,
  offers: true,
  all: true,
};

function shapeNewsletter(row) {
  if (!row) return null;

  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...(row.preferences && typeof row.preferences === 'object' ? row.preferences : {}),
  };

  const subscribedAt = row.subscribedAt;
  const unsubscribedAt = row.unsubscribedAt;
  const endDate = unsubscribedAt || new Date();
  const subscriptionDuration = subscribedAt
    ? Math.floor((endDate - subscribedAt) / (1000 * 60 * 60 * 24))
    : 0;

  const doc = {
    _id: row.id,
    id: row.id,
    email: row.email,
    status: row.status,
    subscribedAt,
    unsubscribedAt,
    unsubscribeToken: row.unsubscribeToken,
    preferences,
    source: row.source,
    metadata: row.metadata || {},
    emailsSent: row.emailsSent ?? 0,
    lastEmailSentAt: row.lastEmailSentAt,
    subscriptionDuration,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return wrapNewsletter(doc, { isNew: false });
}

function wrapNewsletter(doc, { isNew = false } = {}) {
  const state = { isNew };

  return {
    ...doc,

    async save() {
      if (state.isNew && !this.unsubscribeToken) {
        this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
      }

      const data = {
        email:
          this.email != null
            ? String(this.email).trim().toLowerCase()
            : this.email,
        status: this.status || 'active',
        subscribedAt: this.subscribedAt || new Date(),
        unsubscribedAt: this.unsubscribedAt ?? null,
        unsubscribeToken: this.unsubscribeToken ?? null,
        preferences: this.preferences || { ...DEFAULT_PREFERENCES },
        source: this.source || 'other',
        metadata: this.metadata || {},
        emailsSent: this.emailsSent ?? 0,
        lastEmailSentAt: this.lastEmailSentAt ?? null,
      };

      const row = state.isNew
        ? await prisma.newsletter.create({ data })
        : await prisma.newsletter.update({
            where: { id: this._id || this.id },
            data,
          });

      const shaped = shapeNewsletter(row);
      Object.assign(this, shaped);
      state.isNew = false;
      return this;
    },

    async unsubscribe() {
      this.status = 'unsubscribed';
      this.unsubscribedAt = new Date();
      return this.save();
    },

    async resubscribe() {
      this.status = 'active';
      this.unsubscribedAt = null;
      this.subscribedAt = new Date();
      return this.save();
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.unsubscribe;
      delete obj.resubscribe;
      delete obj.toObject;
      delete obj.toJSON;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },
  };
}

function NewsletterConstructor(data = {}) {
  return wrapNewsletter(
    {
      _id: data._id || data.id,
      id: data.id || data._id,
      email: data.email,
      status: data.status || 'active',
      subscribedAt: data.subscribedAt || new Date(),
      unsubscribedAt: data.unsubscribedAt ?? null,
      unsubscribeToken: data.unsubscribeToken ?? null,
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(data.preferences && typeof data.preferences === 'object'
          ? data.preferences
          : {}),
      },
      source: data.source || 'other',
      metadata: data.metadata || {},
      emailsSent: data.emailsSent ?? 0,
      lastEmailSentAt: data.lastEmailSentAt ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    { isNew: true },
  );
}

async function execFind(filter, opts = {}) {
  const rows = await prisma.newsletter.findMany({
    where: toPrismaWhere(filter),
    orderBy: toPrismaOrderBy(opts.sort) || [{ subscribedAt: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  return rows.map((row) => {
    const shaped = shapeNewsletter(row);
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapNewsletter(plain, { isNew: false });
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Newsletter = Object.assign(NewsletterConstructor, {
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
    const doc = NewsletterConstructor(data);
    await doc.save();
    return doc;
  },

  async countDocuments(filter = {}) {
    return prisma.newsletter.count({ where: toPrismaWhere(filter) });
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

    const setData = pickUpdateData(update);
    delete setData._id;
    delete setData.id;
    Object.assign(data, setData);

    const row = await prisma.newsletter.update({
      where: { id: existing._id },
      data,
    });

    const shaped = shapeNewsletter(row);
    return options.new === false
      ? existing
      : options.lean
        ? shaped.toObject()
        : shaped;
  },

  getActiveSubscribers(filters = {}) {
    return Newsletter.find({ status: 'active', ...filters });
  },

  async getStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalSubscribers, activeSubscribers, unsubscribed, recentSubs] =
      await Promise.all([
        prisma.newsletter.count(),
        prisma.newsletter.count({ where: { status: 'active' } }),
        prisma.newsletter.count({ where: { status: 'unsubscribed' } }),
        prisma.newsletter.count({
          where: { subscribedAt: { gte: thirtyDaysAgo } },
        }),
      ]);

    return {
      total: totalSubscribers,
      active: activeSubscribers,
      unsubscribed,
      recentSubscriptions: recentSubs,
      retentionRate:
        totalSubscribers > 0
          ? ((activeSubscribers / totalSubscribers) * 100).toFixed(2)
          : 0,
    };
  },
});

export default Newsletter;
