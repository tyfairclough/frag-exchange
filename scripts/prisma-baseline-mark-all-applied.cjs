/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS CLI */
/**
 * One-time: mark every folder in prisma/migrations as applied without running SQL.
 * Run ONLY when the DB already matches schema.prisma (e.g. after db push / import)
 * and _prisma_migrations is missing or incomplete — fixes P3005 on migrate deploy.
 * Skips migrations already recorded (P3008) so the script is safe to re-run.
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
const { spawnSync } = require("child_process");

function isAlreadyAppliedError(text) {
  return (
    /P3008/.test(text) ||
    /already recorded as applied/i.test(text)
  );
}

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
  const r = spawnSync(
    "npx",
    ["prisma", "migrate", "resolve", "--applied", name],
    {
      encoding: "utf8",
      env: process.env,
      shell: true,
      stdio: ["inherit", "inherit", "pipe"],
    },
  );
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status === 0) continue;
  const errText = `${r.stderr || ""}${r.stdout || ""}${r.error?.message || ""}`;
  if (isAlreadyAppliedError(errText)) {
    console.error(`[baseline] skip ${name} (already applied)`);
    continue;
  }
  process.exit(r.status ?? 1);
}

console.error("[baseline] Done. Run: npm run db:migrate");
