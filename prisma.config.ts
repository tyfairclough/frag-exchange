// Prisma config — REEFX uses MySQL only (`prisma/schema.prisma` datasource).
// DATABASE_URL: local dev uses `.env.development` (Docker); production comes from the host (e.g. Hostinger panel).
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env" });
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.development" });
}
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env["DATABASE_URL"];
const shadowDatabaseUrl = process.env["PRISMA_SHADOW_DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
