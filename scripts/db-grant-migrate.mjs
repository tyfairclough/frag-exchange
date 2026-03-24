/**
 * Applies docker/mysql SQL for existing volumes (init scripts run only on first MySQL data dir).
 * Creates `prisma_shadow` and grants `frag` CREATE/DROP for optional fallback.
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

// #region agent log
{
  const wsRoot = path.resolve(webRoot, "..");
  const logPath = path.join(wsRoot, ".cursor", "debug-677650.log");
  const line =
    JSON.stringify({
      sessionId: "677650",
      runId: "shadow-db-fix",
      hypothesisId: "H4",
      location: "scripts/db-grant-migrate.mjs",
      message: "bootstrap sql via docker compose exec",
      data: { exitCode: r.status ?? String(r.signal), sqlFile: "99-prisma-migrate-grants.sql" },
      timestamp: Date.now(),
    }) + "\n";
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, line, "utf8");
  } catch {
    /* optional */
  }
}
// #endregion

process.exit(r.status === 0 ? 0 : 1);
