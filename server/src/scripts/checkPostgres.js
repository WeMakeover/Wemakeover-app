/**
 * Phase 7 DB health / index / config check.
 * Run: npm run db:check
 */

import "dotenv/config";
import {
  connectPostgres,
  disconnectPostgres,
  getPostgresHealth,
  isPooledConnectionString,
  prisma,
} from "../platform/db/postgres.js";

const KEY_TABLES = [
  "users",
  "services",
  "categories",
  "carts",
  "coupons",
  "bookings",
  "orders",
  "payments",
  "reviews",
  "notifications",
  "daily_slot_days",
  "working_days",
  "booking_configs",
  "serviceable_cities",
  "enquiries",
];

async function main() {
  const issues = [];

  console.log("── Phase 7 DB check ──\n");

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("❌ DATABASE_URL is missing");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL_DIRECT?.trim()) {
    issues.push("DATABASE_URL_DIRECT unset — set for migrations / pg_dump");
  }

  if (!isPooledConnectionString()) {
    issues.push("DATABASE_URL hostname has no -pooler — use Neon pooled URL for the API");
  } else {
    console.log("✅ DATABASE_URL looks pooled (-pooler)");
  }

  if (process.env.DATABASE_URL_DIRECT?.trim()) {
    if (isPooledConnectionString(process.env.DATABASE_URL_DIRECT)) {
      issues.push("DATABASE_URL_DIRECT looks pooled — use the non-pooler host for migrate/dump");
    } else {
      console.log("✅ DATABASE_URL_DIRECT looks direct (non-pooler)");
    }
  }

  await connectPostgres();
  const health = await getPostgresHealth();
  console.log(`✅ Ping OK (${health.latencyMs}ms)`);

  const indexRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM pg_indexes
    WHERE schemaname = 'public'
  `;
  console.log(`✅ Public indexes: ${indexRows[0]?.count ?? 0}`);

  console.log("\nTable row counts:");
  for (const table of KEY_TABLES) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM "${table}"`,
      );
      console.log(`  ${table.padEnd(22)} ${rows[0]?.count ?? 0}`);
    } catch (err) {
      issues.push(`table ${table}: ${err.message}`);
      console.log(`  ${table.padEnd(22)} ERROR`);
    }
  }

  const unusedMongo =
    Boolean(process.env.MONGODB_URI?.trim()) || Boolean(process.env.MONGO_URI?.trim());
  if (unusedMongo) {
    issues.push("MONGODB_URI/MONGO_URI still set — safe to remove after Phase 6 cutover");
  }

  console.log("\n── Summary ──");
  if (issues.length) {
    console.log("Warnings:");
    for (const issue of issues) console.log(`  ⚠️  ${issue}`);
  } else {
    console.log("✅ No warnings");
  }

  console.log("\nBackups: npm run db:backup");
  console.log("Neon console: enable PITR / daily backups on the project.");
}

main()
  .catch((err) => {
    console.error("❌ db:check failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPostgres().catch(() => {});
  });
