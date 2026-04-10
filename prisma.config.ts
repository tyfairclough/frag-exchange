// Prisma config — REEFX uses PostgreSQL (Neon) via `prisma/schema.prisma`.
// DATABASE_URL: pooled runtime URL. DIRECT_URL: direct URL for migrations/introspection.
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env" });
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.development" });
}
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env["DATABASE_URL"];
const directUrl = process.env["DIRECT_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
    ...(directUrl ? { directUrl } : {}),
  },
});
