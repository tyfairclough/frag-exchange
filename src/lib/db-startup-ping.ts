import { getPrisma } from "@/lib/db";
import { serializeDbError } from "@/lib/mysql-error-serialize";
import { Socket } from "node:net";
import * as mariadb from "mariadb";

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

function parseDbTarget(): { host: string; port: number; valid: boolean } {
  try {
    const raw = process.env.DATABASE_URL ?? "";
    const u = new URL(raw);
    return { host: u.hostname, port: u.port ? Number(u.port) : 3306, valid: true };
  } catch {
    return { host: "", port: 3306, valid: false };
  }
}

function probeTcp(host: string, port: number): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;
    const done = (out: { ok: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(out);
    };
    socket.setTimeout(2500);
    socket.once("connect", () => done({ ok: true }));
    socket.once("timeout", () => done({ ok: false, error: "ETIMEDOUT" }));
    socket.once("error", (e) => done({ ok: false, error: e.message }));
    socket.connect(port, host);
  });
}

function parseDirectConnectionConfig(overrideHost?: string): mariadb.ConnectionConfig | null {
  try {
    const raw = process.env.DATABASE_URL ?? "";
    const u = new URL(raw);
    const dbName = u.pathname.replace(/^\//, "");
    if (!u.username || !dbName) {
      return null;
    }
    return {
      host: overrideHost ?? u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: dbName,
      connectTimeout: 3500,
    };
  } catch {
    return null;
  }
}

async function probeDirectDriver(
  label: "raw-host" | "ipv4-loopback",
  cfg: mariadb.ConnectionConfig | null,
): Promise<void> {
  if (!cfg) {
    console.error("[reefx][db-direct-driver-probe]", JSON.stringify({ label, skipped: "invalid-config" }));
    return;
  }
  let conn: mariadb.Connection | null = null;
  try {
    conn = await mariadb.createConnection(cfg);
    await conn.query("SELECT 1");
    console.error(
      "[reefx][db-direct-driver-probe]",
      JSON.stringify({
        label,
        ok: true,
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        database: cfg.database,
      }),
    );
  } catch (e) {
    const serialized = serializeDbError(e);
    console.error(
      "[reefx][db-direct-driver-probe]",
      JSON.stringify({
        label,
        ok: false,
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        database: cfg.database,
        error: serialized,
      }),
    );
    // #region agent log
    postDebugLog("pre-fix", "H6", "src/lib/db-startup-ping.ts:probeDirectDriver", "direct-driver-probe-failed", {
      label,
      host: cfg.host ?? "",
      port: cfg.port ?? 3306,
      errorName: serialized.name ?? "",
      errorCode: serialized.code ?? "",
      errorErrno: serialized.errno ?? "",
      errorSqlState: serialized.sqlState ?? "",
      errorMessage: serialized.message ?? "",
    });
    // #endregion
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
        // ignore close errors in diagnostics
      }
    }
  }
}

/** Fire-and-forget: logs underlying errno/message if the pool cannot connect at boot. */
export function pingMysqlOptional(): void {
  void (async () => {
    const target = parseDbTarget();
    // #region agent log
    postDebugLog("pre-fix", "H1", "src/lib/db-startup-ping.ts:pingMysqlOptional", "startup-target-parsed", {
      nodeEnv: process.env.NODE_ENV ?? "",
      host: target.host,
      port: target.port,
      valid: target.valid,
    });
    // #endregion
    console.error(
      "[reefx][db-target]",
      JSON.stringify({
        nodeEnv: process.env.NODE_ENV,
        host: target.host,
        port: target.port,
        valid: target.valid,
      }),
    );

    if (target.valid && target.host) {
      const tcp = await probeTcp(target.host, target.port);
      // #region agent log
      postDebugLog(
        "pre-fix",
        "H2",
        "src/lib/db-startup-ping.ts:pingMysqlOptional",
        "startup-tcp-probe-result",
        {
          host: target.host,
          port: target.port,
          ok: tcp.ok,
          error: tcp.error ?? "",
        },
      );
      // #endregion
      console.error(
        "[reefx][db-tcp-probe]",
        JSON.stringify({
          host: target.host,
          port: target.port,
          ok: tcp.ok,
          error: tcp.error,
        }),
      );
    }

    const rawCfg = parseDirectConnectionConfig();
    await probeDirectDriver("raw-host", rawCfg);
    const ipv4Cfg =
      rawCfg && typeof rawCfg.host === "string" && rawCfg.host === "localhost"
        ? parseDirectConnectionConfig("127.0.0.1")
        : null;
    if (ipv4Cfg) {
      await probeDirectDriver("ipv4-loopback", ipv4Cfg);
    }

    try {
      await getPrisma().$queryRaw`SELECT 1`;
      // #region agent log
      postDebugLog("pre-fix", "H3", "src/lib/db-startup-ping.ts:pingMysqlOptional", "startup-query-ok", {
        query: "SELECT 1",
      });
      // #endregion
    } catch (e) {
      const serialized = serializeDbError(e);
      // #region agent log
      postDebugLog(
        "pre-fix",
        "H3",
        "src/lib/db-startup-ping.ts:pingMysqlOptional",
        "startup-query-failed",
        {
          errorName: serialized.name ?? "",
          errorCode: serialized.code ?? "",
          message: serialized.message ?? "",
          causeCode:
            typeof serialized.cause === "object" &&
            serialized.cause !== null &&
            "code" in serialized.cause
              ? Number((serialized.cause as { code?: number }).code ?? 0)
              : 0,
          causeMessage:
            typeof serialized.cause === "object" &&
            serialized.cause !== null &&
            "message" in serialized.cause
              ? String((serialized.cause as { message?: string }).message ?? "")
              : "",
        },
      );
      // #endregion
      console.error("[reefx][db-startup-ping]", JSON.stringify(serializeDbError(e)));
    }
  })();
}
