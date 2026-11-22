// Prisma CLI config (migrations / generate).
// Runtime app connection uses pooled DATABASE_URL via src/platform/db/postgres.js
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prefer direct (non-pooler) URL for migrate; fall back to pooled if unset
    url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL,
  },
});
