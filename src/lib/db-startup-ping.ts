import { getPrisma } from "@/lib/db";
import { serializeDbError } from "@/lib/db-error-serialize";

/** Fire-and-forget startup ping for Neon/Postgres connectivity. */
export function pingDatabaseOptional(): void {
  void (async () => {
    try {
      const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
      console.error(
        "[reefx][db-target]",
        JSON.stringify({
          nodeEnv: process.env.NODE_ENV,
          host: url?.hostname ?? "",
          database: url?.pathname.replace(/^\//, "") ?? "",
          hasDirectUrl: Boolean(process.env.DIRECT_URL),
        }),
      );
    } catch {
      console.error("[reefx][db-target]", JSON.stringify({ invalidDatabaseUrl: true }));
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
