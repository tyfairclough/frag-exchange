/**
 * Applies docker/mysql SQL for existing volumes (init scripts run only on first DB data dir).
 * Creates `prisma_shadow` and grants `frag` CREATE/DROP for optional fallback.
 * Works with local Docker MariaDB (Compose service `mysql`).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const sqlPath = path.join(webRoot, "docker", "mysql", "99-prisma-migrate-grants.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const r = spawnSync(
  "docker",
  ["compose", "exec", "-T", "mysql", "mysql", "-uroot", "-pfragrootlocaldev"],
  { input: sql, cwd: webRoot, stdio: ["pipe", "inherit", "inherit"] },
);

process.exit(r.status === 0 ? 0 : 1);
