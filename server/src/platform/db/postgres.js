/**
 * PostgreSQL (Neon) via Prisma 7 + @prisma/adapter-pg.
 * Primary application database (Mongo removed in Phase 6).
 *
 * Connection rules (Phase 7):
 * - DATABASE_URL        → pooled Neon host (*-pooler.*) for the running API
 * - DATABASE_URL_DIRECT → non-pooler host for Prisma migrate / pg_dump
 *
 * Prisma 7 generates TypeScript clients — run Node with
 * --experimental-strip-types (see npm scripts).
 */

import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";
import logger from "../logging/logger.js";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString?.trim()) {
  logger.fatal("config_error", {
    message: "DATABASE_URL is not defined in environment variables",
  });
  throw new Error("DATABASE_URL is not defined in the environment variables");
}

/** Ensure TLS is requested; Neon requires SSL. */
export function ensureSslMode(url) {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "15");
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function isPooledConnectionString(url = connectionString) {
  try {
    return new URL(url).hostname.includes("-pooler.");
  } catch {
    return /pooler/i.test(String(url || ""));
  }
}

const globalForPrisma = globalThis;

function createPool() {
  const max = Number(process.env.PG_POOL_MAX) || 10;
  const idleTimeoutMillis = Number(process.env.PG_IDLE_TIMEOUT_MS) || 30_000;
  const connectionTimeoutMillis = Number(process.env.PG_CONNECT_TIMEOUT_MS) || 15_000;

  return new Pool({
    connectionString: ensureSslMode(connectionString),
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    allowExitOnIdle: true,
  });
}

function createPrismaClient() {
  const pool = globalForPrisma.__wemakeoverPgPool ?? createPool();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__wemakeoverPgPool = pool;
  }

  pool.on("error", (err) => {
    logger.error("postgres_pool_error", { message: err.message });
  });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  client.__pool = pool;
  return client;
}

export const prisma = globalForPrisma.__wemakeoverPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__wemakeoverPrisma = prisma;
}

export async function connectPostgres() {
  await prisma.$connect();
  logger.info("postgres_connected", {
    message: "PostgreSQL (Neon) connected successfully",
    pooled: isPooledConnectionString(),
    poolMax: Number(process.env.PG_POOL_MAX) || 10,
  });

  if (!isPooledConnectionString() && process.env.NODE_ENV === "production") {
    logger.warn("postgres_pool_config", {
      message:
        "DATABASE_URL does not look pooled (-pooler). Prefer Neon pooled URL for the API runtime.",
    });
  }

  return prisma;
}

export async function pingPostgres() {
  await prisma.$queryRaw`SELECT 1 AS ok`;
  return true;
}

export async function getPostgresHealth() {
  const started = Date.now();
  await pingPostgres();
  return {
    ok: true,
    latencyMs: Date.now() - started,
    pooled: isPooledConnectionString(),
    hasDirectUrl: Boolean(process.env.DATABASE_URL_DIRECT?.trim()),
  };
}

export async function disconnectPostgres() {
  try {
    await prisma.$disconnect();
  } finally {
    const pool = prisma.__pool || globalForPrisma.__wemakeoverPgPool;
    if (pool) {
      await pool.end().catch(() => {});
      globalForPrisma.__wemakeoverPgPool = undefined;
    }
  }
}

export default prisma;
