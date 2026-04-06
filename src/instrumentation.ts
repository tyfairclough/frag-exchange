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
