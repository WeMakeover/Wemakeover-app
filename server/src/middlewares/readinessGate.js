/**
 * Blocks /api/* if PostgreSQL (Neon) is not ready; returns 503 with code DB_UNREACHABLE.
 */

import { prisma } from '../platform/db/postgres.js';

const CONNECT_TIMEOUT_MS = 15000;

let postgresReady = false;

async function ensurePostgres() {
  if (postgresReady) return;
  await prisma.$queryRaw`SELECT 1`;
  postgresReady = true;
}

export async function readinessGate(req, res, next) {
  try {
    await Promise.race([
      ensurePostgres(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Postgres connection timeout')), CONNECT_TIMEOUT_MS)
      ),
    ]);
    return next();
  } catch (err) {
    if (req.log) {
      req.log.error('db_unreachable', {
        message: err.message,
        name: err.name,
      });
    } else {
      console.error('API request blocked: database not connected', err.message);
    }
    return res.status(503).json({
      success: false,
      code: 'DB_UNREACHABLE',
      message: 'Service temporarily unavailable',
      requestId: req.id || undefined,
    });
  }
}
