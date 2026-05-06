import {
  CoralListingMode,
  CoralProfileStatus,
  EquipmentCategory,
  EquipmentCondition,
  ExchangeKind,
  InventoryKind,
  ListingIntent,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { haversineKm } from "@/lib/distance";
import { Prisma } from "@/generated/prisma/client";
import {
  CORAL_COLOURS,
  CORAL_TYPES,
  parseCoralColourFromForm,
  parseCoralTypeFromForm,
} from "@/lib/coral-options";
import {
  parseEquipmentCategoryFromForm,
  parseEquipmentConditionFromForm,
} from "@/lib/equipment-options";

export { EXPLORE_LISTINGS_PAGE_SIZE } from "@/lib/discover-listings-constants";

export type DiscoverItemTab = "coral" | "fish" | "equipment";

/** URL `sort=` values for explore listing order (see explore-search-href). */
export type DiscoverSortMode = "recent" | "price_asc" | "price_desc";

export type DiscoverRow = {
  listingId: string;
  itemId: string;
  remainingQuantity: number;
  kind: InventoryKind;
  name: string;
  description: string;
  imageUrl: string | null;
  coralType: string | null;
  colours: string[];
  species: string | null;
  reefSafe: boolean | null;
  equipmentCategory: EquipmentCategory | null;
  equipmentCondition: EquipmentCondition | null;
  listingMode: CoralListingMode;
  listingIntent: ListingIntent;
  salePriceMinor: number | null;
  saleCurrencyCode: string | null;
  saleExternalUrl: string | null;
  listedAt: Date;
  expiresAt: Date;
  owner: {
    id: string;
    alias: string | null;
    avatarEmoji: string | null;
    town: string | null;
  };
  distanceKm: number | null;
};

export type DiscoverParams = {
  exchangeId: string;
  exchangeKind: ExchangeKind;
  viewerUserId: string;
  viewerLat: number | null;
  viewerLon: number | null;
  /** When false (default), return all inventory kinds with only shared filters until the user runs a scoped search. */
  searchActive?: boolean;
  /** Active filter tab when search is applied (also used for kind scoping). Default coral. */
  itemTab?: DiscoverItemTab;
  q?: string;
  coralTypes?: string[];
  colours?: string[];
  freeOnly?: boolean;
  saleOnly?: boolean;
  excludeSale?: boolean;
  fulfilment?: "POST" | "MEET";
  maxKm?: number;
  ownerUserId?: string;
  /** Fish tab */
  speciesContains?: string;
  reefSafeOnly?: boolean;
  /** Equipment tab */
  equipmentCategories?: string[];
  equipmentConditions?: string[];
  allowedKinds?: InventoryKind[];
  allowItemsForSale?: boolean;
  sort?: DiscoverSortMode;
};

/**
 * Deterministic hash for stable pseudo-random ordering.
 * This keeps pagination offsets consistent across API requests.
 */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function listingModeFilter(
  fulfilment: "POST" | "MEET",
): Prisma.InventoryItemWhereInput {
  if (fulfilment === "POST") {
    return { listingMode: { in: [CoralListingMode.POST, CoralListingMode.BOTH] } };
  }
  return { listingMode: { in: [CoralListingMode.MEET, CoralListingMode.BOTH] } };
}

function parseStoredTypes(raw: string[] | undefined): string[] {
  if (!raw?.length) {
    return [];
  }
  const seen = new Set<string>();
  for (const t of raw) {
    const v = parseCoralTypeFromForm(t);
    if (v) {
      seen.add(v);
    }
  }
  return [...seen];
}

function parseStoredColours(raw: string[] | undefined): string[] {
  if (!raw?.length) {
    return [];
  }
  const seen = new Set<string>();
  for (const c of raw) {
    const v = parseCoralColourFromForm(c);
    if (v) {
      seen.add(v);
    }
  }
  return [...seen];
}

function parseStoredEquipmentCategories(raw: string[] | undefined): EquipmentCategory[] {
  if (!raw?.length) return [];
  const seen = new Set<EquipmentCategory>();
  for (const t of raw) {
    const v = parseEquipmentCategoryFromForm(t);
    if (v) seen.add(v);
  }
  return [...seen];
}

function parseStoredEquipmentConditions(raw: string[] | undefined): EquipmentCondition[] {
  if (!raw?.length) return [];
  const seen = new Set<EquipmentCondition>();
  for (const t of raw) {
    const v = parseEquipmentConditionFromForm(t);
    if (v) seen.add(v);
  }
  return [...seen];
}

function tabToKind(tab: DiscoverItemTab): InventoryKind {
  if (tab === "fish") return InventoryKind.FISH;
  if (tab === "equipment") return InventoryKind.EQUIPMENT;
  return InventoryKind.CORAL;
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function inferCoralTaxonomy(coralType: string | null, name: string, description: string): string | null {
  const parseCanonical = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const parsed = parseCoralTypeFromForm(raw);
    return parsed ?? null;
  };
  const canonical = parseCanonical(coralType);
  if (canonical) {
    return canonical;
  }
  const text = `${coralType ?? ""} ${name} ${description}`.toLowerCase();
  const hasAny = (keywords: readonly string[]) => keywords.some((keyword) => text.includes(keyword));
  if (
    hasAny([
      "acropora",
      "montipora",
      "birdsnest",
      "stylophora",
      "pocillopora",
      "seriatopora",
      "sps",
    ])
  ) {
    return "SPS";
  }
  if (
    hasAny([
      "torch",
      "hammer",
      "frogspawn",
      "acan",
      "acanthastrea",
      "euphyllia",
      "duncan",
      "chalice",
      "favia",
      "blastomussa",
      "candy cane",
      "lps",
    ])
  ) {
    return "LPS";
  }
  if (
    hasAny([
      "zoa",
      "zoanthid",
      "mushroom",
      "ricordea",
      "xenia",
      "kenya tree",
      "gsp",
      "green star polyp",
      "leather",
      "soft coral",
      "soft",
    ])
  ) {
    return "Soft";
  }
  return null;
}

function matchesAnyColourCaseInsensitive(rowColours: readonly string[], selectedColours: readonly string[]): boolean {
  if (selectedColours.length < 1) return true;
  const selected = new Set(selectedColours.map((c) => c.toLowerCase()));
  return rowColours.some((colour) => selected.has(colour.toLowerCase()));
}

async function computeSortedDiscoverRows(params: DiscoverParams): Promise<DiscoverRow[]> {
  const now = new Date();
  const q = params.q?.trim();
  const typesIn = parseStoredTypes(params.coralTypes);
  const coloursIn = parseStoredColours(params.colours);
  const equipCats = parseStoredEquipmentCategories(params.equipmentCategories);
  const equipConds = parseStoredEquipmentConditions(params.equipmentConditions);

  const fulfilment =
    params.exchangeKind === ExchangeKind.GROUP ? params.fulfilment : undefined;

  const searchActive = params.searchActive ?? false;
  const itemTab = params.itemTab ?? "coral";
  const kindScope = searchActive ? tabToKind(itemTab) : undefined;
  const allowedKinds = params.allowedKinds;
  if (allowedKinds && allowedKinds.length < 1) {
    return [];
  }

  const speciesTrim = params.speciesContains?.trim();

  const itemParts: Prisma.InventoryItemWhereInput[] = [
    { profileStatus: CoralProfileStatus.UNLISTED },
    { remainingQuantity: { gt: 0 } },
    params.ownerUserId
      ? { userId: params.ownerUserId }
      : { userId: { not: params.viewerUserId } },
  ];

  if (params.freeOnly) {
    itemParts.push({ listingIntent: ListingIntent.FREE });
  }
  if (params.saleOnly) {
    itemParts.push({ listingIntent: ListingIntent.FOR_SALE });
  }
  if (params.excludeSale) {
    itemParts.push({ listingIntent: { not: ListingIntent.FOR_SALE } });
  }
  if (fulfilment) {
    itemParts.push(listingModeFilter(fulfilment));
  }
  if (kindScope) {
    if (allowedKinds && !allowedKinds.includes(kindScope)) {
      return [];
    }
    itemParts.push({ kind: kindScope });
  } else if (allowedKinds) {
    itemParts.push({ kind: { in: allowedKinds } });
  }

  if (searchActive) {
    if (kindScope === InventoryKind.CORAL) {
      // coral taxonomy / colour can be stored in mixed legacy formats; filter after fetch.
    } else if (kindScope === InventoryKind.FISH) {
      // fish colour can be stored with inconsistent casing; filter after fetch.
      if (params.reefSafeOnly) itemParts.push({ reefSafe: true });
      if (speciesTrim) itemParts.push({ species: { contains: speciesTrim } });
    } else if (kindScope === InventoryKind.EQUIPMENT) {
      if (equipCats.length) itemParts.push({ equipmentCategory: { in: equipCats } });
      if (equipConds.length) itemParts.push({ equipmentCondition: { in: equipConds } });
    }
  }

  const qTokens = q ? normalizeTokens(q) : [];
  if (qTokens.length > 0) {
    itemParts.push({
      AND: qTokens.map((token) => ({
        OR: [
          { name: { contains: token, mode: "insensitive" as const } },
          { description: { contains: token, mode: "insensitive" as const } },
          { coralType: { contains: token, mode: "insensitive" as const } },
        ],
      })),
    });
  }

  const raw = await getPrisma().exchangeListing.findMany({
    where: {
      exchangeId: params.exchangeId,
      expiresAt: { gt: now },
      inventoryItem: { AND: itemParts },
    },
    include: {
      inventoryItem: {
        include: {
          user: {
            select: {
              id: true,
              alias: true,
              avatarEmoji: true,
              address: {
                select: {
                  townLatitude: true,
                  townLongitude: true,
                  town: true,
                  countryCode: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ listedAt: "desc" }],
  });

  const rowsBeforeSearchRefinement: DiscoverRow[] = raw.map((row) => {
    const item = row.inventoryItem;
    const owner = item.user;
    const lat = owner.address?.townLatitude ?? null;
    const lon = owner.address?.townLongitude ?? null;
    let distanceKm: number | null = null;
    if (
      params.exchangeKind === ExchangeKind.GROUP &&
      params.viewerLat != null &&
      params.viewerLon != null &&
      lat != null &&
      lon != null
    ) {
      distanceKm = haversineKm(params.viewerLat, params.viewerLon, lat, lon);
    }
    return {
      listingId: row.id,
      itemId: item.id,
      remainingQuantity: item.remainingQuantity,
      kind: item.kind,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      coralType: item.coralType,
      colours: item.colours,
      species: item.species,
      reefSafe: item.reefSafe,
      equipmentCategory: item.equipmentCategory,
      equipmentCondition: item.equipmentCondition,
      listingMode: item.listingMode,
      listingIntent: item.listingIntent,
      salePriceMinor: item.salePriceMinor,
      saleCurrencyCode: item.saleCurrencyCode,
      saleExternalUrl: item.saleExternalUrl,
      listedAt: row.listedAt,
      expiresAt: row.expiresAt,
      owner: {
        id: owner.id,
        alias: owner.alias,
        avatarEmoji: owner.avatarEmoji,
        town: owner.address?.town ?? null,
      },
      distanceKm,
    };
  });

  const rows = rowsBeforeSearchRefinement.filter((row) => {
    if (!searchActive) {
      return true;
    }
    if (kindScope === InventoryKind.CORAL) {
      const taxonomy = inferCoralTaxonomy(row.coralType, row.name, row.description);
      if (typesIn.length > 0 && (!taxonomy || !typesIn.includes(taxonomy))) {
        return false;
      }
      if (!matchesAnyColourCaseInsensitive(row.colours, coloursIn)) {
        return false;
      }
      return true;
    }
    if (kindScope === InventoryKind.FISH) {
      return matchesAnyColourCaseInsensitive(row.colours, coloursIn);
    }
    return true;
  });

  const saleEligibleRows = rows.filter((row) => {
    if (row.listingIntent !== ListingIntent.FOR_SALE) {
      return true;
    }
    if (!params.allowItemsForSale) {
      return false;
    }
    return row.kind === InventoryKind.CORAL || row.kind === InventoryKind.FISH;
  });

  const sortMode = params.sort;
  const defaultRandomizedOrder =
    params.ownerUserId == null
      ? (a: DiscoverRow, b: DiscoverRow) => {
          const ar = hashString(`${params.exchangeId}:${a.listingId}`);
          const br = hashString(`${params.exchangeId}:${b.listingId}`);
          if (ar !== br) return ar - br;
          return a.listingId.localeCompare(b.listingId);
        }
      : null;

  const defaultIntentThenRecency = (a: DiscoverRow, b: DiscoverRow) => {
    const tieListing = a.listingId.localeCompare(b.listingId);
    const rank = (intent: ListingIntent) =>
      intent === ListingIntent.SWAP ? 0 : intent === ListingIntent.FREE ? 1 : 2;
    const byIntent = rank(a.listingIntent) - rank(b.listingIntent);
    if (byIntent !== 0) return byIntent;
    const byTime = b.listedAt.getTime() - a.listedAt.getTime();
    return byTime !== 0 ? byTime : tieListing;
  };

  saleEligibleRows.sort((a, b) => {
    const tieListing = a.listingId.localeCompare(b.listingId);

    if (sortMode === "recent") {
      const byTime = b.listedAt.getTime() - a.listedAt.getTime();
      return byTime !== 0 ? byTime : tieListing;
    }

    if (sortMode === "price_asc" || sortMode === "price_desc") {
      const pa = a.salePriceMinor;
      const pb = b.salePriceMinor;
      const aNull = pa == null;
      const bNull = pb == null;
      if (aNull && bNull) {
        return defaultIntentThenRecency(a, b);
      }
      if (aNull) {
        return 1;
      }
      if (bNull) {
        return -1;
      }
      if (pa !== pb) {
        return sortMode === "price_asc" ? pa - pb : pb - pa;
      }
      return tieListing;
    }

    if (defaultRandomizedOrder) {
      return defaultRandomizedOrder(a, b);
    }
    return defaultIntentThenRecency(a, b);
  });

  const maxKm = params.maxKm;
  if (params.exchangeKind === ExchangeKind.GROUP && maxKm != null && Number.isFinite(maxKm) && maxKm > 0) {
    const filtered = saleEligibleRows.filter((r) => r.distanceKm != null && r.distanceKm <= maxKm);
    return filtered;
  }

  return saleEligibleRows;
}

export async function discoverExchangeListings(params: DiscoverParams): Promise<DiscoverRow[]> {
  return computeSortedDiscoverRows(params);
}

export async function discoverExchangeListingsSlice(
  params: DiscoverParams,
  offset: number,
  limit: number,
): Promise<{ total: number; rows: DiscoverRow[] }> {
  const all = await computeSortedDiscoverRows(params);
  return { total: all.length, rows: all.slice(offset, offset + limit) };
}

export const DISCOVER_CORAL_TYPES = CORAL_TYPES;
export const DISCOVER_CORAL_COLOURS = CORAL_COLOURS;
