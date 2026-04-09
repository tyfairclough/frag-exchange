import type { Instrumentation } from "next";

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
  const { serializeDbError } = await import("@/lib/mysql-error-serialize");
  const serialized = serializeDbError(err);
  // #region agent log
  postDebugLog("pre-fix", "H5", "src/instrumentation.ts:onRequestError", "pool-request-error-captured", {
    path: req.path,
    method: req.method,
    routePath: ctx.routePath ?? "",
    routeType: ctx.routeType ?? "",
    errorName: serialized.name ?? "",
    errorCode: serialized.code ?? "",
    causeCode:
      typeof serialized.cause === "object" &&
      serialized.cause !== null &&
      "code" in serialized.cause
        ? Number((serialized.cause as { code?: number }).code ?? 0)
        : 0,
  });
  // #endregion
  console.error(
    "[reefx][db-pool-request-error]",
    JSON.stringify({
      path: req.path,
      method: req.method,
      routePath: ctx.routePath,
      routeType: ctx.routeType,
      error: serialized,
    }),
  );
};
