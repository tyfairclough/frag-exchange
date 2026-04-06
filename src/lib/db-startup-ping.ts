import { getPrisma } from "@/lib/db";
import { serializeDbError } from "@/lib/mysql-error-serialize";
import { Socket } from "node:net";

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

async function probeMariadbDirect() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const { default: mariadb } = await import("mariadb");
    const u = new URL(raw);
    const conn = await mariadb.createConnection({
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      connectTimeout: 5000,
    });
    await conn.query("SELECT 1");
    await conn.end();
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
      name: e instanceof Error ? e.name : "unknown",
    };
  }
}

/** Fire-and-forget: logs underlying errno/message if the pool cannot connect at boot. */
export function pingMysqlOptional(): void {
  void (async () => {
    const target = parseDbTarget();
    // #region agent log
    fetch("http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "04b090" },
      body: JSON.stringify({
        sessionId: "04b090",
        runId: "pre-fix",
        hypothesisId: "H6",
        location: "src/lib/db-startup-ping.ts:parseDbTarget",
        message: "Startup parsed DATABASE_URL target",
        data: { nodeEnv: process.env.NODE_ENV, host: target.host, port: target.port, valid: target.valid },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error(
      "[reefx][db-target]",
      JSON.stringify({
        hypothesisId: "H6",
        nodeEnv: process.env.NODE_ENV,
        host: target.host,
        port: target.port,
        valid: target.valid,
      }),
    );

    if (target.valid && target.host) {
      const tcp = await probeTcp(target.host, target.port);
      // #region agent log
      fetch("http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "04b090" },
        body: JSON.stringify({
          sessionId: "04b090",
          runId: "pre-fix",
          hypothesisId: "H7",
          location: "src/lib/db-startup-ping.ts:probeTcp",
          message: "Startup TCP probe to DB endpoint completed",
          data: { host: target.host, port: target.port, ok: tcp.ok, error: tcp.error },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      console.error(
        "[reefx][db-tcp-probe]",
        JSON.stringify({
          hypothesisId: "H7",
          host: target.host,
          port: target.port,
          ok: tcp.ok,
          error: tcp.error,
        }),
      );
    }

    const direct = await probeMariadbDirect();
    // #region agent log
    fetch("http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "04b090" },
      body: JSON.stringify({
        sessionId: "04b090",
        runId: "pre-fix",
        hypothesisId: "H9",
        location: "src/lib/db-startup-ping.ts:probeMariadbDirect",
        message: "Direct mariadb driver probe result",
        data: { ok: direct.ok, error: direct.ok ? undefined : direct.error, name: direct.ok ? undefined : direct.name },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error(
      "[reefx][db-direct-probe]",
      JSON.stringify({
        hypothesisId: "H9",
        ok: direct.ok,
        error: direct.ok ? undefined : direct.error,
        name: direct.ok ? undefined : direct.name,
      }),
    );

    try {
      await getPrisma().$queryRaw`SELECT 1`;
      // #region agent log
      fetch("http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "04b090" },
        body: JSON.stringify({
          sessionId: "04b090",
          runId: "pre-fix",
          hypothesisId: "H5",
          location: "src/lib/db-startup-ping.ts:pingMysqlOptional",
          message: "Startup DB ping succeeded",
          data: { nodeEnv: process.env.NODE_ENV, pid: process.pid },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } catch (e) {
      // #region agent log
      fetch("http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "04b090" },
        body: JSON.stringify({
          sessionId: "04b090",
          runId: "pre-fix",
          hypothesisId: "H5",
          location: "src/lib/db-startup-ping.ts:pingMysqlOptional",
          message: "Startup DB ping failed",
          data: { error: e instanceof Error ? e.message : String(e) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      console.error("[reefx][db-startup-ping]", JSON.stringify(serializeDbError(e)));
    }
  })();
}
