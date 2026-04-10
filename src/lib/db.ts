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
    return globalForPrisma.prisma;
  }

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
