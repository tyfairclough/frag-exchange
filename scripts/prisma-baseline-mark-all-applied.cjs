/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS CLI */
/**
 * One-time: mark every folder in prisma/migrations as applied without running SQL.
 * Run ONLY when the DB already matches schema.prisma (e.g. after db push / import)
 * and _prisma_migrations is missing — fixes P3005 on migrate deploy.
 *
 * Pre-check: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code --script`
 * must exit 0 with an empty script (see "-- This is an empty migration.").
 */
require("dotenv").config({ path: ".env" });
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.development" });
}
require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const names = fs
  .readdirSync(migrationsDir)
  .filter((name) =>
    fs.statSync(path.join(migrationsDir, name)).isDirectory(),
  )
  .sort();

console.error(
  `[baseline] Marking ${names.length} migrations as applied (in order)...`,
);

for (const name of names) {
  console.error(`[baseline] resolve --applied ${name}`);
  execSync(`npx prisma migrate resolve --applied "${name}"`, {
    stdio: "inherit",
    env: process.env,
  });
}

console.error("[baseline] Done. Run: npm run db:migrate");
