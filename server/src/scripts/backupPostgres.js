/**
 * Phase 7 backup helper for Neon Postgres.
 *
 * Prefer Neon dashboard PITR / scheduled backups in production.
 * This script prints (or runs) a local pg_dump against DATABASE_URL_DIRECT.
 *
 * Run: npm run db:backup
 *      npm run db:backup -- --run   (requires pg_dump on PATH)
 */

import "dotenv/config";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const directUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

if (!directUrl?.trim()) {
  console.error("❌ Set DATABASE_URL_DIRECT (preferred) or DATABASE_URL");
  process.exit(1);
}

if (String(directUrl).includes("-pooler.")) {
  console.warn(
    "⚠️  Using a pooled URL for dump — prefer DATABASE_URL_DIRECT (non-pooler).",
  );
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve("backups");
const outFile = path.join(outDir, `wemakeover-neon-${stamp}.sql`);

const dumpArgs = [
  "--dbname",
  directUrl,
  "--no-owner",
  "--no-acl",
  "--format=plain",
  `--file=${outFile}`,
];

const shouldRun = process.argv.includes("--run");

console.log("── Phase 7 backup ──\n");
console.log("Neon (recommended): Project → Backup & Restore / PITR in the console.\n");
console.log("Local pg_dump command:");
console.log(`  pg_dump ${dumpArgs.map((a) => (a.includes("://") ? '"$DATABASE_URL_DIRECT"' : a)).join(" ")}`);
console.log(`\nOutput path: ${outFile}`);

if (!shouldRun) {
  console.log("\nDry run only. Pass --run to execute pg_dump now.");
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });

const result = spawnSync("pg_dump", dumpArgs, {
  encoding: "utf8",
  shell: false,
});

if (result.error) {
  console.error("❌ pg_dump failed to start:", result.error.message);
  console.error("   Install PostgreSQL client tools, or use Neon console export.");
  process.exit(1);
}

if (result.status !== 0) {
  console.error("❌ pg_dump exited with", result.status);
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

const size = fs.statSync(outFile).size;
console.log(`✅ Backup written (${size} bytes): ${outFile}`);
