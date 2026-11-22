/**
 * Phase 0: verify Neon DATABASE_URL works via Prisma.
 * Usage: npm run db:ping
 */

import "dotenv/config";
import { connectPostgres, pingPostgres, disconnectPostgres } from "../platform/db/postgres.js";

async function main() {
  console.log("Connecting to Neon (DATABASE_URL)...");
  await connectPostgres();
  await pingPostgres();
  console.log("SELECT 1 OK — Neon PostgreSQL is reachable.");
}

main()
  .catch((err) => {
    console.error("Neon connection failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPostgres().catch(() => {});
  });
