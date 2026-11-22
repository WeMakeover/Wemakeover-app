/**
 * Cart store — Prisma/Postgres (Phase 3).
 * Keeps Mongoose-like API + instance methods used by cart controllers.
 */

import { prisma } from '../platform/db/postgres.js';
import { normalizeCartServiceId } from '../utils/cartServiceId.utils.js';
import { calculateOrderPricing } from '../utils/pricing.utils.js';
import {
  QueryChain,
  toPrismaWhere,
  toPrismaOrderBy,
  applySelectToObject,
} from '../platform/stores/mongoCompat.js';

const FIELD_MAP = {
  user: 'userId',
};

const DEFAULT_SUMMARY = {
  totalServices: 0,
  totalItems: 0,
  subtotal: 0,
  taxAmount: 0,
  platformFee: 0,
  total: 0,
};

function findCartLineIndex(items, serviceId) {
  const target = normalizeCartServiceId(serviceId);
  return items.findIndex((line) => normalizeCartServiceId(line.serviceId) === target);
}

function computeSummary(items = []) {
  const totalServices = items.length;
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const pricing = calculateOrderPricing(subtotal);
  return {
    totalServices,
    totalItems,
    subtotal,
    platformFee: pricing.platformFee,
    taxAmount: pricing.taxAmount,
    total: pricing.totalAmount,
  };
}

function shapeItem(row) {
  return {
    serviceId: row.serviceId,
    cardHeader: row.cardHeader,
    description: row.description,
    price: row.price,
    img: row.img,
    duration: row.duration,
    taxIncluded: row.taxIncluded,
    category: row.category,
    serviceType: row.serviceType,
    optionLabel: row.optionLabel,
    optionIndex: row.optionIndex,
    quantity: row.quantity,
    subtotal: row.subtotal,
    addedAt: row.addedAt,
    lastModified: row.lastModified,
  };
}

function shapeCart(row, { populatedUser } = {}) {
  if (!row) return null;

  const items = (row.items || []).map(shapeItem);
  const summary = row.summary && typeof row.summary === 'object'
    ? { ...DEFAULT_SUMMARY, ...row.summary }
    : computeSummary(items);

  const doc = {
    _id: row.id,
    id: row.id,
    user: populatedUser || row.userId,
    userId: row.userId,
    items,
    summary,
    isActive: row.isActive,
    lastUpdated: row.lastUpdated,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isExpired: row.expiresAt ? new Date() > new Date(row.expiresAt) : false,
  };

  return wrapCart(doc);
}

function defaultExpiresAt() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

async function persistCart(cartDoc) {
  const userId = String(cartDoc.user || cartDoc.userId);
  const items = Array.isArray(cartDoc.items) ? cartDoc.items : [];
  const summary = computeSummary(items);
  const lastUpdated = new Date();
  const expiresAt = cartDoc.expiresAt || defaultExpiresAt();

  const itemRows = items.map((item) => ({
    serviceId: normalizeCartServiceId(item.serviceId),
    cardHeader: item.cardHeader,
    description: item.description ?? null,
    price: Number(item.price) || 0,
    img: item.img ?? null,
    duration: item.duration ?? null,
    taxIncluded: item.taxIncluded !== false,
    category: item.category ?? null,
    serviceType: item.serviceType ?? 'Standard',
    optionLabel: item.optionLabel ?? null,
    optionIndex: item.optionIndex ?? null,
    quantity: Math.min(2, Math.max(1, Number(item.quantity) || 1)),
    subtotal: Number(item.subtotal) || Number(item.price) * (Number(item.quantity) || 1),
    addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
    lastModified: item.lastModified ? new Date(item.lastModified) : new Date(),
  }));

  let cartId = cartDoc._id || cartDoc.id;

  if (!cartId) {
    const created = await prisma.cart.create({
      data: {
        userId,
        isActive: cartDoc.isActive !== false,
        lastUpdated,
        expiresAt,
        summary,
        items: { create: itemRows },
      },
      include: { items: true },
    });
    return shapeCart(created);
  }

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { cartId } });
    await tx.cart.update({
      where: { id: cartId },
      data: {
        isActive: cartDoc.isActive !== false,
        lastUpdated,
        expiresAt,
        summary,
        items: { create: itemRows },
      },
    });
  });

  const fresh = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true },
  });
  return shapeCart(fresh);
}

function wrapCart(doc) {
  return {
    ...doc,

    async save() {
      const saved = await persistCart(this);
      Object.assign(this, saved);
      return this;
    },

    async addItem(itemData) {
      const normalizedIncomingId = normalizeCartServiceId(itemData.serviceId);
      itemData.serviceId = normalizedIncomingId;

      const existingItemIndex = findCartLineIndex(this.items, normalizedIncomingId);

      if (existingItemIndex !== -1) {
        if (this.items[existingItemIndex].quantity < 2) {
          this.items[existingItemIndex].quantity += 1;
        }
        this.items[existingItemIndex].subtotal =
          this.items[existingItemIndex].price * this.items[existingItemIndex].quantity;
        this.items[existingItemIndex].lastModified = new Date();
      } else {
        this.items.push({
          ...itemData,
          quantity: 1,
          subtotal: itemData.price * 1,
          addedAt: new Date(),
          lastModified: new Date(),
        });
      }

      return this.save();
    },

    async updateItemQuantity(serviceId, quantity) {
      const targetId = normalizeCartServiceId(serviceId);
      const itemIndex = findCartLineIndex(this.items, targetId);

      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      const item = this.items[itemIndex];
      item.serviceId = targetId;

      if (quantity <= 0) {
        this.items = this.items.filter(
          (line) => normalizeCartServiceId(line.serviceId) !== targetId,
        );
      } else {
        item.quantity = quantity;
        item.subtotal = item.price * quantity;
        item.lastModified = new Date();
      }

      return this.save();
    },

    async removeItem(serviceId) {
      const targetId = normalizeCartServiceId(serviceId);
      this.items = this.items.filter(
        (line) => normalizeCartServiceId(line.serviceId) !== targetId,
      );
      return this.save();
    },

    async clearCart() {
      this.items = [];
      return this.save();
    },

    isEmpty() {
      return !this.items || this.items.length === 0;
    },

    toObject() {
      const obj = { ...this };
      delete obj.save;
      delete obj.addItem;
      delete obj.updateItemQuantity;
      delete obj.removeItem;
      delete obj.clearCart;
      delete obj.isEmpty;
      delete obj.toObject;
      delete obj.toJSON;
      return obj;
    },

    toJSON() {
      return this.toObject();
    },
  };
}

function CartConstructor(data = {}) {
  return wrapCart({
    _id: data._id || data.id,
    id: data.id || data._id,
    user: data.user || data.userId,
    userId: data.userId || data.user,
    items: Array.isArray(data.items) ? data.items.map((i) => ({ ...i })) : [],
    summary: data.summary ? { ...DEFAULT_SUMMARY, ...data.summary } : { ...DEFAULT_SUMMARY },
    isActive: data.isActive !== false,
    lastUpdated: data.lastUpdated || new Date(),
    expiresAt: data.expiresAt || defaultExpiresAt(),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    isExpired: false,
  });
}

async function execFind(filter, opts = {}) {
  const where = toPrismaWhere(filter, FIELD_MAP);
  const rows = await prisma.cart.findMany({
    where,
    include: { items: true },
    orderBy: toPrismaOrderBy(opts.sort) || [{ lastUpdated: 'desc' }],
    skip: opts.skip || 0,
    take: opts.limit ?? undefined,
  });

  let populatedUsers = {};
  if (opts.populates?.some((p) => p.path === 'user')) {
    const ids = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
    if (ids.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, email: true },
      });
      populatedUsers = Object.fromEntries(
        users.map((u) => [
          u.id,
          { _id: u.id, id: u.id, name: u.name, username: u.name, email: u.email },
        ]),
      );
    }
  }

  return rows.map((row) => {
    const shaped = shapeCart(row, { populatedUser: populatedUsers[row.userId] });
    const plain = applySelectToObject(shaped.toObject(), opts.select);
    return opts.lean ? plain : wrapCart(plain);
  });
}

async function execFindOne(filter, opts = {}) {
  const results = await execFind(filter, { ...opts, limit: 1 });
  return results[0] || null;
}

const Cart = Object.assign(CartConstructor, {
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

  async findByUser(userId) {
    return execFindOne({ user: String(userId), isActive: true });
  },

  findActiveCarts() {
    return Cart.find({ isActive: true });
  },

  async countDocuments(filter = {}) {
    return prisma.cart.count({ where: toPrismaWhere(filter, FIELD_MAP) });
  },

  async create(data) {
    const doc = CartConstructor(data);
    await doc.save();
    return doc;
  },

  /** Lightweight stand-in for the admin cart stats aggregation. */
  async aggregate(pipeline = []) {
    const group = pipeline.find((stage) => stage.$group);
    if (!group) return [];

    const carts = await prisma.cart.findMany({ select: { isActive: true, summary: true } });
    let totalCarts = 0;
    let activeCarts = 0;
    let totalItems = 0;
    let totalValue = 0;

    for (const cart of carts) {
      totalCarts += 1;
      if (cart.isActive) activeCarts += 1;
      const summary = cart.summary && typeof cart.summary === 'object' ? cart.summary : {};
      totalItems += Number(summary.totalItems) || 0;
      totalValue += Number(summary.total) || 0;
    }

    return [
      {
        _id: null,
        totalCarts,
        activeCarts,
        totalItems,
        totalValue,
        averageCartValue: totalCarts ? totalValue / totalCarts : 0,
      },
    ];
  },
});

export default Cart;
