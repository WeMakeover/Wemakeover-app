/**
 * Sequence counters — Prisma/Postgres.
 */

import { prisma } from '../platform/db/postgres.js';

/**
 * Atomically increment a named counter and return the new seq.
 */
export async function nextSeq(id, { seedFromCount } = {}) {
  const existing = await prisma.counter.findUnique({ where: { id } });
  if (!existing) {
    const seed = typeof seedFromCount === 'function' ? await seedFromCount() : 0;
    await prisma.counter.upsert({
      where: { id },
      create: { id, seq: seed },
      update: {},
    });
  }
  const result = await prisma.counter.update({
    where: { id },
    data: { seq: { increment: 1 } },
  });
  return result.seq;
}

/**
 * Atomically get next sequence for order numbers (e.g. "ORD000014").
 */
export const getNextOrderNumber = async () => {
  const seq = await nextSeq('orderNumber', {
    seedFromCount: () => prisma.order.count(),
  });
  return `ORD${String(seq).padStart(6, '0')}`;
};

export const getNextEnquiryNumber = async () => {
  const seq = await nextSeq('enquiryNumber', {
    seedFromCount: () => prisma.enquiry.count(),
  });
  return `ENQ${String(seq).padStart(6, '0')}`;
};

export const getNextCityRequestNumber = async () => {
  const seq = await nextSeq('cityRequestNumber', {
    seedFromCount: () => prisma.cityRequest.count(),
  });
  return `CReq${String(seq).padStart(6, '0')}`;
};

const Counter = {
  async findById(id) {
    const row = await prisma.counter.findUnique({ where: { id: String(id) } });
    return row ? { _id: row.id, id: row.id, seq: row.seq } : null;
  },
};

export default Counter;
