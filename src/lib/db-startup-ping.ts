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

    try {
      await getPrisma().$queryRaw`SELECT 1`;
    } catch (e) {
      console.error("[reefx][db-startup-ping]", JSON.stringify(serializeDbError(e)));
    }
  })();
}
