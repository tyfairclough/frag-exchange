import { getPrisma } from "@/lib/db";
import { serializeDbError } from "@/lib/mysql-error-serialize";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import path from "node:path";
import * as mariadb from "mariadb";

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

async function probeDirectPool(
  label: "ipv4-pool",
  cfg: mariadb.ConnectionConfig | null,
): Promise<void> {
  if (!cfg) {
    console.error("[reefx][db-direct-pool-probe]", JSON.stringify({ label, skipped: "invalid-config" }));
    return;
  }
  const pool = mariadb.createPool({
    ...cfg,
    connectionLimit: 5,
    minimumIdle: 0,
    idleTimeout: 60_000,
    acquireTimeout: 3_500,
  });
  let conn: mariadb.PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.query("SELECT 1");
    console.error(
      "[reefx][db-direct-pool-probe]",
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
      "[reefx][db-direct-pool-probe]",
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
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch {
        // ignore close errors in diagnostics
      }
    }
    await pool.end().catch(() => {});
  }
}

async function probeAdapterResolvedMariadb(cfg: mariadb.ConnectionConfig | null): Promise<void> {
  if (!cfg) {
    console.error(
      "[reefx][db-adapter-resolved-probe]",
      JSON.stringify({ skipped: "invalid-config" }),
    );
    return;
  }
  const require = createRequire(import.meta.url);
  try {
    const adapterEntry = require.resolve("@prisma/adapter-mariadb");
    const adapterDir = path.dirname(adapterEntry);
    const mariadbPkgPath = require.resolve("mariadb/package.json", { paths: [adapterDir] });
    const mariadbPkg = require(mariadbPkgPath) as { version?: string };
    const mariadbResolvedPath = require.resolve("mariadb", { paths: [adapterDir] });
    const mariadbResolved = require(mariadbResolvedPath) as typeof import("mariadb");
    const pool = mariadbResolved.createPool({
      ...cfg,
      connectionLimit: 5,
      minimumIdle: 0,
      acquireTimeout: 3_500,
      connectTimeout: 3_500,
    });
    let conn: mariadb.PoolConnection | null = null;
    try {
      conn = await pool.getConnection();
      await conn.query("SELECT 1");
      console.error(
        "[reefx][db-adapter-resolved-probe]",
        JSON.stringify({
          ok: true,
          resolvedMariadbVersion: mariadbPkg.version ?? "unknown",
          resolvedPath: mariadbResolvedPath,
        }),
      );
      // #region agent log
      fetch("http://127.0.0.1:7293/ingest/14cea746-935d-454f-95b5-f436cb319937", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "7d140c" },
        body: JSON.stringify({
          sessionId: "7d140c",
          runId: "pre-fix",
          hypothesisId: "H1",
          location: "src/lib/db-startup-ping.ts:probeAdapterResolvedMariadb",
          message: "adapter-resolved-mariadb-ok",
          data: { resolvedMariadbVersion: mariadbPkg.version ?? "unknown" },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } finally {
      if (conn) conn.release();
      await pool.end().catch(() => {});
    }
  } catch (e) {
    console.error(
      "[reefx][db-adapter-resolved-probe]",
      JSON.stringify({ ok: false, error: serializeDbError(e) }),
    );
  }
}

/** Fire-and-forget: logs underlying errno/message if the pool cannot connect at boot. */
export function pingMysqlOptional(): void {
  void (async () => {
    const target = parseDbTarget();
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
      await probeDirectPool("ipv4-pool", ipv4Cfg);
      await probeAdapterResolvedMariadb(ipv4Cfg);
    }

    try {
      await getPrisma().$queryRaw`SELECT 1`;
      console.error(
        "[reefx][db-startup-ping-ok]",
        JSON.stringify({ ok: true, pid: process.pid }),
      );
    } catch (e) {
      console.error("[reefx][db-startup-ping]", JSON.stringify(serializeDbError(e)));
    }
  })();
}
