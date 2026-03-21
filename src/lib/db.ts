import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Reject Postgres / Prisma Postgres URLs — this app targets MySQL only. */
function assertMysqlOnlyDatabaseUrl(url: string) {
  const lower = url.trim().toLowerCase();
  if (
    lower.startsWith("postgresql://") ||
    lower.startsWith("postgres://") ||
    lower.startsWith("prisma+postgres://")
  ) {
    throw new Error(
      "Frag Exchange uses MySQL only. Set DATABASE_URL to mysql://… (see .env.example). PostgreSQL and prisma+postgres URLs are not supported.",
    );
  }
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env locally and in the Hostinger Node.js environment before running the app.",
    );
  }

  assertMysqlOnlyDatabaseUrl(url);

  const adapter = new PrismaMariaDb(url);

  return new PrismaClient({
    adapter,
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
