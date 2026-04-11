import { cache } from "react";
import { DatabaseUnavailableError } from "@/lib/db-warm-errors";
import { getPrisma } from "@/lib/db";
import { withExponentialBackoffUntil } from "@/lib/retry-async";

export { DatabaseUnavailableError, isDatabaseUnavailableError } from "@/lib/db-warm-errors";

/** Prisma: can't reach server, timed out, etc. — safe to retry while Neon wakes. */
const TRANSIENT_PRISMA_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

export function isTransientDatabaseError(err: unknown): boolean {
  if (err == null || typeof err !== "object") {
    return false;
  }
  const any = err as { name?: string; code?: string; message?: string };
  if (any.name === "DriverAdapterError") {
    return true;
  }
  const code = any.code;
  if (typeof code === "string" && TRANSIENT_PRISMA_CODES.has(code)) {
    return true;
  }
  const msg = (any.message ?? "").toLowerCase();
  if (
    /econnrefused|econnreset|etimedout|enotfound|socket hang up|connection terminated|connection closed|network|timeout|control plane|fetch failed|getaddrinfo/i.test(
      msg,
    )
  ) {
    return true;
  }
  return false;
}

function parseEnvMs(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function getWarmConfig() {
  return {
    maxMs: parseEnvMs("REEFX_DB_WARM_MAX_MS", 55_000),
    backoffStartMs: parseEnvMs("REEFX_DB_WARM_BACKOFF_START_MS", 400),
    backoffCapMs: parseEnvMs("REEFX_DB_WARM_BACKOFF_CAP_MS", 8000),
  };
}

/** Single round-trip; use for `/api/health` probes (no retry loop). */
export async function pingDatabaseOnce(): Promise<void> {
  await getPrisma().$queryRaw`SELECT 1`;
}

/**
 * One warm sequence per React server request (RSC). Call at DB-backed layout/page entry.
 * Route handlers should import and await this once per request (cache still dedupes within the same invocation).
 */
export const ensureDatabaseReady = cache(async function ensureDatabaseReady(): Promise<void> {
  const { maxMs, backoffStartMs, backoffCapMs } = getWarmConfig();

  await withExponentialBackoffUntil(() => pingDatabaseOnce(), {
    maxMs,
    backoffStartMs,
    backoffCapMs,
    retryIf: isTransientDatabaseError,
    onGiveUp: (lastErr) => {
      throw new DatabaseUnavailableError(
        "The database did not become ready in time. It may still be starting, or it may be unavailable.",
        { cause: lastErr },
      );
    },
  });
});

/**
 * Same warm logic without React `cache` (e.g. instrumentation or scripts). Prefer `ensureDatabaseReady` in RSC.
 */
export async function ensureDatabaseReadyUncached(): Promise<void> {
  const { maxMs, backoffStartMs, backoffCapMs } = getWarmConfig();

  await withExponentialBackoffUntil(() => pingDatabaseOnce(), {
    maxMs,
    backoffStartMs,
    backoffCapMs,
    retryIf: isTransientDatabaseError,
    onGiveUp: (lastErr) => {
      throw new DatabaseUnavailableError(
        "The database did not become ready in time. It may still be starting, or it may be unavailable.",
        { cause: lastErr },
      );
    },
  });
}
