import { InventoryKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import type { DiscoverItemTab, DiscoverParams } from "@/lib/discover-listings";
import {
  exploreFiltersImplyScopedSearch,
  parseExploreFiltersFromSearchParams,
  type ExploreFilterState,
} from "@/lib/explore-search-href";

/** Minimal user shape for explore listing resolution (matches session user + address). */
export type ExploreListingsUser = {
  id: string;
  address: {
    townLatitude: number | null;
    townLongitude: number | null;
  } | null;
};

function strFromSearchParams(sp: URLSearchParams, key: string) {
  return sp.get(key)?.trim() ?? "";
}

function allowedTabsForExchange(exchange: {
  allowCoral: boolean;
  allowFish: boolean;
  allowEquipment: boolean;
}): DiscoverItemTab[] {
  const tabs: DiscoverItemTab[] = [];
  if (exchange.allowCoral) tabs.push("coral");
  if (exchange.allowFish) tabs.push("fish");
  if (exchange.allowEquipment) tabs.push("equipment");
  return tabs;
}

async function loadMemberships(userId: string) {
  return getPrisma().exchangeMembership.findMany({
    where: { userId: userId },
    include: { exchange: true },
    orderBy: { joinedAt: "desc" },
  });
}

export type ResolvedExploreListingsContext = {
  memberships: Awaited<ReturnType<typeof loadMemberships>>;
  /** Present when the user can load listings for an exchange; otherwise listing queries are skipped. */
  discoverParams: DiscoverParams | null;
  exchangeId: string;
  scopedByQuery: boolean;
  selected: Awaited<ReturnType<typeof loadMemberships>>[number] | null;
  filters: ExploreFilterState;
  normalizedItemTab: DiscoverItemTab;
  allowedTabs: DiscoverItemTab[];
  searchActive: boolean;
  validatedOwnerUserId: string | null;
  ownerAlias: string | null;
  viewerLat: number | null;
  viewerLon: number | null;
};

/**
 * Resolves explore URL search params + membership into `DiscoverParams` for listing queries.
 * Mirrors validation in the explore page — keep aligned when filters or exchange selection change.
 */
export async function resolveExploreListingsDiscoverContext(
  user: ExploreListingsUser,
  urlSearchParams: URLSearchParams,
): Promise<ResolvedExploreListingsContext> {
  const filters = parseExploreFiltersFromSearchParams(urlSearchParams);
  const memberships = await loadMemberships(user.id);

  const exchangeIdParam = strFromSearchParams(urlSearchParams, "exchangeId");
  const exchangeIdFromTrustedParam =
    exchangeIdParam && memberships.some((m) => m.exchangeId === exchangeIdParam) ? exchangeIdParam : null;
  const scopedByQuery = exchangeIdFromTrustedParam != null;
  const exchangeId = exchangeIdFromTrustedParam ?? (memberships[0]?.exchangeId ?? "");

  const selected = memberships.find((m) => m.exchangeId === exchangeId) ?? null;
  const allowedTabs = selected ? allowedTabsForExchange(selected.exchange) : [];
  const normalizedItemTab = allowedTabs.includes(filters.itemTab)
    ? filters.itemTab
    : (allowedTabs[0] ?? "coral");
  const allowedKinds = selected
    ? [
        ...(selected.exchange.allowCoral ? [InventoryKind.CORAL] : []),
        ...(selected.exchange.allowFish ? [InventoryKind.FISH] : []),
        ...(selected.exchange.allowEquipment ? [InventoryKind.EQUIPMENT] : []),
      ]
    : [];

  const ownerParam = strFromSearchParams(urlSearchParams, "owner");
  const fulfilmentParsed =
    filters.fulfilment === "POST" || filters.fulfilment === "MEET" ? filters.fulfilment : undefined;
  const maxKmRaw = filters.maxKm;
  const maxKm = maxKmRaw ? Number(maxKmRaw) : undefined;

  const searchActive =
    strFromSearchParams(urlSearchParams, "searched") === "1" || exploreFiltersImplyScopedSearch(filters);

  let validatedOwnerUserId: string | null = null;
  if (ownerParam && exchangeId) {
    const ownerMembership = await getPrisma().exchangeMembership.findFirst({
      where: { exchangeId, userId: ownerParam },
      select: { id: true },
    });
    if (ownerMembership) {
      validatedOwnerUserId = ownerParam;
    }
  }

  const ownerAlias =
    validatedOwnerUserId != null
      ? (
          await getPrisma().user.findUnique({
            where: { id: validatedOwnerUserId },
            select: { alias: true },
          })
        )?.alias ?? null
      : null;

  const viewerLat = user.address?.townLatitude ?? null;
  const viewerLon = user.address?.townLongitude ?? null;

  const discoverParams: DiscoverParams | null =
    selected && exchangeId
      ? {
          exchangeId,
          exchangeKind: selected.exchange.kind,
          viewerUserId: user.id,
          viewerLat,
          viewerLon,
          searchActive,
          itemTab: normalizedItemTab,
          q: filters.q.trim() || undefined,
          coralTypes: filters.coralTypes.length ? filters.coralTypes : undefined,
          colours: filters.colours.length ? filters.colours : undefined,
          freeOnly: filters.freeOnly || undefined,
          saleOnly: filters.saleOnly || undefined,
          excludeSale: filters.excludeSale || undefined,
          fulfilment: fulfilmentParsed,
          maxKm: maxKm != null && Number.isFinite(maxKm) ? maxKm : undefined,
          ownerUserId: validatedOwnerUserId ?? undefined,
          speciesContains: filters.species.trim() || undefined,
          reefSafeOnly: filters.reefSafeOnly || undefined,
          equipmentCategories: filters.equipmentCategories.length ? filters.equipmentCategories : undefined,
          equipmentConditions: filters.equipmentConditions.length ? filters.equipmentConditions : undefined,
          allowedKinds,
          allowItemsForSale: selected.exchange.allowItemsForSale,
          sort: filters.sort,
        }
      : null;

  return {
    memberships,
    discoverParams,
    exchangeId,
    scopedByQuery,
    selected,
    filters,
    normalizedItemTab,
    allowedTabs,
    searchActive,
    validatedOwnerUserId,
    ownerAlias,
    viewerLat,
    viewerLon,
  };
}
