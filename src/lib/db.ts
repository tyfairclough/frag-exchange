import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const DEBUG_ENDPOINT = "http://127.0.0.1:7293/ingest/14cea746-935d-454f-95b5-f436cb319937";
const DEBUG_SESSION_ID = "7d140c";

function postDebugLog(
  runId: string,
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
): void {
  void fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

/**
 * Shared MySQL (e.g. Hostinger): the `mariadb` driver defaults `connectionLimit` to 10 and
 * `minimumIdle` to the same value, so it opens many connections eagerly. That often exceeds
 * `max_user_connections` → `pool timeout … active=0 idle=0`.
 *
 * - **Production:** if the URL omits pool params, we default `connectionLimit=5` and
 *   `minimumIdle=0` (lazy pool). Override with query params on `DATABASE_URL` or
 *   `DATABASE_POOL_CONNECTION_LIMIT` / `DATABASE_POOL_MINIMUM_IDLE`.
 * - **Development:** unchanged unless those env vars are set.
 */
function withMysqlPoolParams(url: string): string {
  try {
    const u = new URL(url);
    const isProd = process.env.NODE_ENV === "production";
    const limitEnv = process.env.DATABASE_POOL_CONNECTION_LIMIT?.trim();
    const minIdleEnv = process.env.DATABASE_POOL_MINIMUM_IDLE?.trim() ?? "";
    const minIdleSetInEnv = Object.prototype.hasOwnProperty.call(
      process.env,
      "DATABASE_POOL_MINIMUM_IDLE",
    );

    if (!u.searchParams.has("connectionLimit")) {
      const limit = limitEnv ?? (isProd ? "5" : "");
      if (limit) u.searchParams.set("connectionLimit", limit);
    }

    if (!u.searchParams.has("minimumIdle")) {
      if (minIdleSetInEnv && minIdleEnv !== "") {
        u.searchParams.set("minimumIdle", minIdleEnv);
      } else if (isProd) {
        u.searchParams.set("minimumIdle", "0");
      } else if (limitEnv) {
        u.searchParams.set("minimumIdle", "0");
      }
    }

    return u.toString();
  } catch {
    return url;
  }
}

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

/**
 * Some hosts resolve `localhost` to IPv6 first while MySQL listens only on IPv4.
 * Normalizing to 127.0.0.1 avoids empty-pool timeouts caused by unreachable ::1.
 */
function withMysqlLoopbackIpv4(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
      return u.toString();
    }
    return url;
  } catch {
    return url;
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

  const poolUrl = withMysqlPoolParams(url);
  const ipv4LoopbackUrl = withMysqlLoopbackIpv4(poolUrl);
  const rsaFix = withMysqlAllowPublicKeyRetrieval(ipv4LoopbackUrl);
  let normalizedHost = "";
  let normalizedPort = 3306;
  let connectionLimit = "";
  let minimumIdle = "";
  let allowPublicKeyRetrieval = "";
  let sslMode = "";
  try {
    const parsed = new URL(rsaFix.url);
    normalizedHost = parsed.hostname;
    normalizedPort = parsed.port ? Number(parsed.port) : 3306;
    connectionLimit = parsed.searchParams.get("connectionLimit") ?? "";
    minimumIdle = parsed.searchParams.get("minimumIdle") ?? "";
    allowPublicKeyRetrieval = parsed.searchParams.get("allowPublicKeyRetrieval") ?? "";
    sslMode = parsed.searchParams.get("ssl") ?? parsed.searchParams.get("tls") ?? "";
  } catch {
    normalizedHost = "INVALID_URL";
  }
  // #region agent log
  postDebugLog("pre-fix", "H1", "src/lib/db.ts:createPrismaClient", "normalized-db-url-ready", {
    nodeEnv: process.env.NODE_ENV ?? "",
    host: normalizedHost,
    port: normalizedPort,
    connectionLimit,
    minimumIdle,
    allowPublicKeyRetrieval,
    sslMode,
    urlMutatedForRsa: rsaFix.changed,
  });
  // #endregion

  // #region agent log
  postDebugLog("pre-fix", "H2", "src/lib/db.ts:createPrismaClient", "creating-prisma-adapter", {
    hasGlobalClient: Boolean(globalForPrisma.prisma),
  });
  // #endregion
  const adapter = new PrismaMariaDb(rsaFix.url);

  // #region agent log
  postDebugLog("pre-fix", "H3", "src/lib/db.ts:createPrismaClient", "creating-prisma-client", {
    logLevel: process.env.NODE_ENV === "development" ? "error,warn" : "error",
  });
  // #endregion
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
    // #region agent log
    postDebugLog("pre-fix", "H4", "src/lib/db.ts:getPrisma", "returning-global-prisma", {
      reused: true,
    });
    // #endregion
    return globalForPrisma.prisma;
  }

  // #region agent log
  postDebugLog("pre-fix", "H4", "src/lib/db.ts:getPrisma", "creating-global-prisma", {
    reused: false,
  });
  // #endregion
  globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * MariaDB pool timed out with zero connections — the driver could not keep/create pool sockets.
 * Common on shared hosting: `max_user_connections` / default eager pool (`minimumIdle` = `connectionLimit`).
 * Check `error.cause` in logs for the underlying errno (e.g. 1040 too many connections).
 */
export function assertMysqlReachable(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const emptyPool =
    msg.includes("pool timeout") && msg.includes("active=0") && msg.includes("idle=0");
  if (emptyPool) {
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? ` Underlying: ${err.cause.message}`
        : "";
    throw new Error(
      `MySQL pool could not open connections (shared limits or wrong DATABASE_URL).${cause} Production defaults to a small lazy pool in code; if this persists, add connectionLimit=3&minimumIdle=0 to DATABASE_URL, reduce traffic, disable other apps using the same DB user, or upgrade hosting. Account "fork: Resource temporarily unavailable" means process limit is exhausted — restart Node from hPanel and reduce concurrent work (cron, Joomla in public_html, SSH scripts).`,
    );
  }
}

export function throwIfMysqlPoolUnreachable(err: unknown): never {
  assertMysqlReachable(err);
  const msg = err instanceof Error ? err.message : String(err);
  throw err instanceof Error ? err : new Error(msg);
}
