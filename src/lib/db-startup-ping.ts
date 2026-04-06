import { getPrisma } from "@/lib/db";
import { serializeDbError } from "@/lib/mysql-error-serialize";

/** Fire-and-forget: logs underlying errno/message if the pool cannot connect at boot. */
export function pingMysqlOptional(): void {
  void (async () => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      // #region agent log
      fetch("http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2b931e" },
        body: JSON.stringify({
          sessionId: "2b931e",
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
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2b931e" },
        body: JSON.stringify({
          sessionId: "2b931e",
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
