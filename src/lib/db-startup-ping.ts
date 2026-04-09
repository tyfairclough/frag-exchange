import { getPrisma } from "@/lib/db";
import { serializeDbError } from "@/lib/mysql-error-serialize";
import { Socket } from "node:net";

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
