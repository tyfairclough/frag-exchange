import { ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";

/** Recent listings on any public exchange (non-expired). */
export async function getRecentPublicExchangeListings(limit = 8) {
  const now = new Date();
  return getPrisma().exchangeListing.findMany({
    where: {
      expiresAt: { gt: now },
      exchange: { visibility: ExchangeVisibility.PUBLIC },
    },
    orderBy: { listedAt: "desc" },
    take: limit,
    include: {
      coral: {
        select: {
          id: true,
          name: true,
          coralType: true,
          imageUrl: true,
          colour: true,
        },
      },
      exchange: { select: { id: true, name: true } },
    },
  });
}

export type PublicMarketingListingRow = Awaited<ReturnType<typeof getRecentPublicExchangeListings>>[number];
