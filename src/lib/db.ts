import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { agentDebugLog } from "@/lib/agent-debug-log";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function withMysqlAllowPublicKeyRetrieval(url: string) {
  try {
    const u = new URL(url);
    const hasAllow = u.searchParams.has("allowPublicKeyRetrieval");
    const hasCacheKey = u.searchParams.has("cachingRsaPublicKey");

    // Prisma adapter passes DATABASE_URL through to the underlying MySQL driver.
    // The driver error suggests enabling public key retrieval.
    if (!hasAllow && !hasCacheKey) {
      u.searchParams.set("allowPublicKeyRetrieval", "true");
      return { url: u.toString(), changed: true, hasAllow: true, hasCacheKey: false };
    }

    return { url: u.toString(), changed: false, hasAllow, hasCacheKey };
  } catch {
    // If DATABASE_URL is not parseable as a URL, fall back to original.
    return { url, changed: false, hasAllow: false, hasCacheKey: false };
  }
}

/** Reject Postgres / Prisma Postgres URLs — this app targets MySQL only. */
function assertMysqlOnlyDatabaseUrl(url: string) {
  const lower = url.trim().toLowerCase();
  if (
    lower.startsWith("postgresql://") ||
    lower.startsWith("postgres://") ||
    lower.startsWith("prisma+postgres://")
  ) {
    throw new Error(
      "REEFX uses MySQL only. Set DATABASE_URL to mysql://… (see .env.example). PostgreSQL and prisma+postgres URLs are not supported.",
    );
  }
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env locally and in the Hostinger Node.js environment before running the app.",
    );
  }

  assertMysqlOnlyDatabaseUrl(url);

  const rsaFix = withMysqlAllowPublicKeyRetrieval(url);

  const adapter = new PrismaMariaDb(rsaFix.url);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Lazy singleton: avoids touching DATABASE_URL during `next build` / static analysis
 * when no route actually runs DB code. Hostinger often omits env vars during build.
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // #region agent log
  agentDebugLog(
    "db.ts:getPrisma",
    "creating_prisma_client",
    { hasDatabaseUrl: Boolean(process.env.DATABASE_URL), nodeEnv: process.env.NODE_ENV ?? "" },
    "H2",
  );
  // #endregion
  try {
    globalForPrisma.prisma = createPrismaClient();
  } catch (e) {
    // #region agent log
    agentDebugLog(
      "db.ts:getPrisma",
      "createPrismaClient_threw",
      { errKind: e instanceof Error ? e.constructor.name : typeof e },
      "H2",
    );
    // #endregion
    throw e;
  }
  return globalForPrisma.prisma;
}

/**
 * MariaDB pool could not open any connection (wrong host/port, server stopped, firewall).
 * Surfaces a short actionable message instead of only "pool timeout … active=0 idle=0".
 */
export function assertMysqlReachable(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const emptyPool =
    msg.includes("pool timeout") && msg.includes("active=0") && msg.includes("idle=0");
  if (emptyPool) {
    throw new Error(
      "MySQL is not reachable with your DATABASE_URL (no connection could be opened). Start MariaDB/MySQL or Docker on that host and port, set a real user/password/database in .env, then run migrations from the web folder: npm run db:migrate:dev",
    );
  }
}

export function throwIfMysqlPoolUnreachable(err: unknown): never {
  assertMysqlReachable(err);
  const msg = err instanceof Error ? err.message : String(err);
  throw err instanceof Error ? err : new Error(msg);
}
