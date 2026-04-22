import type { PrismaClient } from "@/generated/prisma/client";

/** Re-submitting a claim within this window is blocked (days). */
export const RECENT_BUSINESS_CLAIM_COOLDOWN_DAYS = 30;

export async function hasRecentBusinessClaim(db: PrismaClient, userId: string): Promise<boolean> {
  const cutoff = new Date(
    Date.now() - RECENT_BUSINESS_CLAIM_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  );
  const count = await db.businessClaim.count({
    where: { userId, createdAt: { gte: cutoff } },
  });
  return count > 0;
}
