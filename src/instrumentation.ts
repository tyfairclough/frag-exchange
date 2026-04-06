import type { Instrumentation } from "next";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    void import("@/lib/db-startup-ping").then((m) => m.pingMysqlOptional());
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, req, ctx) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes("pool timeout") && !msg.includes("DriverAdapterError")) {
    return;
  }
  // #region agent log
  fetch("http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "04b090" },
    body: JSON.stringify({
      sessionId: "04b090",
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "src/instrumentation.ts:onRequestError",
      message: "Captured runtime DB driver error on request",
      data: {
        path: req.path,
        method: req.method,
        routePath: ctx.routePath,
        routeType: ctx.routeType,
        errorMessage: msg,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const { serializeDbError } = await import("@/lib/mysql-error-serialize");
  console.error(
    "[reefx][db-pool-request-error]",
    JSON.stringify({
      path: req.path,
      method: req.method,
      routePath: ctx.routePath,
      routeType: ctx.routeType,
      error: serializeDbError(err),
    }),
  );
};
