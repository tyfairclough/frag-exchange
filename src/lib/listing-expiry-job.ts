import type { getPrisma } from "@/lib/db";

type Db = ReturnType<typeof getPrisma>;

/**
 * Removes exchange listing rows past `expiresAt`. Idempotent; discovery already hides them.
 */
export async function removeExpiredExchangeListings(db: Db, now: Date): Promise<{ removed: number }> {
  const result = await db.exchangeListing.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return { removed: result.count };
}
