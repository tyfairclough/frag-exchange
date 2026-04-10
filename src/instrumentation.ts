import type { Instrumentation } from "next";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.error(
      "[reefx][build-marker]",
      JSON.stringify({
        marker: "dbg-2026-04-09-2135",
        nodeEnv: process.env.NODE_ENV ?? "",
        pid: process.pid,
        node: process.version,
      }),
    );
    void import("@/lib/db-startup-ping").then((m) => m.pingDatabaseOptional());
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, req, ctx) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes("Prisma") && !msg.toLowerCase().includes("database")) {
    return;
  }
  const { serializeDbError } = await import("@/lib/db-error-serialize");
  const serialized = serializeDbError(err);
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
