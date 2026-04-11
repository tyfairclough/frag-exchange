import { unstable_cache } from "next/cache";
import { ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";

/** Cache tag for `revalidateTag` when listings affecting the public homepage strip change. */
export const MARKETING_LISTINGS_CACHE_TAG = "marketing-listings";

function getMarketingListingsRevalidateSeconds(): number {
  const raw = process.env.REEFX_MARKETING_LISTINGS_REVALIDATE_SECONDS;
  if (!raw) {
    return 900;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 900;
}

async function fetchRecentPublicExchangeListingsUncached(limit = 8) {
  const now = new Date();
  return getPrisma().exchangeListing.findMany({
    where: {
      expiresAt: { gt: now },
      exchange: { visibility: ExchangeVisibility.PUBLIC },
    },
    orderBy: { listedAt: "desc" },
    take: limit,
    include: {
      inventoryItem: {
        select: {
          id: true,
          name: true,
          kind: true,
          coralType: true,
          imageUrl: true,
          colours: true,
        },
      },
      exchange: { select: { id: true, name: true } },
    },
  });
}

/** Recent listings on any public exchange (non-expired). Cached across requests to reduce DB load. */
export const getRecentPublicExchangeListings = unstable_cache(
  fetchRecentPublicExchangeListingsUncached,
  ["marketing", "recent-public-exchange-listings"],
  {
    revalidate: getMarketingListingsRevalidateSeconds(),
    tags: [MARKETING_LISTINGS_CACHE_TAG],
  },
);

export type PublicMarketingListingRow = Awaited<ReturnType<typeof getRecentPublicExchangeListings>>[number];
