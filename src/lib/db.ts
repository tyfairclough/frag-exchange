import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure the Neon pooled URL in environment variables before running the app.",
    );
  }
  const parsed = new URL(url);
  console.error(
    "[reefx][db-client-init]",
    JSON.stringify({
      pid: process.pid,
      nodeEnv: process.env.NODE_ENV,
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\//, ""),
      usesPooledUrl: true,
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
    }),
  );
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Lazy singleton: avoids touching DATABASE_URL during `next build` / static analysis
 * when no route actually runs DB code. Hostinger often omits env vars during build.
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    console.error(
      "[reefx][db-client-reuse]",
      JSON.stringify({ pid: process.pid, reused: true }),
    );
    return globalForPrisma.prisma;
  }

  console.error(
    "[reefx][db-client-reuse]",
    JSON.stringify({ pid: process.pid, reused: false }),
  );
  globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

export function assertDatabaseReachable(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg) throw new Error("Database connection failed.");
}

export function throwIfDatabaseUnreachable(err: unknown): never {
  assertDatabaseReachable(err);
  const msg = err instanceof Error ? err.message : String(err);
  throw err instanceof Error ? err : new Error(msg);
}
