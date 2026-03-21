// Prisma config — Frag Exchange uses MySQL only (`prisma/schema.prisma` datasource).
// DATABASE_URL must be a MySQL URL (mysql://…). See `.env.example`.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
