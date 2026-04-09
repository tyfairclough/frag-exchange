import {
  CoralListingMode,
  CoralProfileStatus,
  EquipmentCategory,
  EquipmentCondition,
  ExchangeKind,
  InventoryKind,
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

export type DiscoverItemTab = "coral" | "fish" | "equipment";

export type DiscoverRow = {
  listingId: string;
  itemId: string;
  kind: InventoryKind;
  name: string;
  description: string;
  imageUrl: string | null;
  coralType: string | null;
  colour: string | null;
  species: string | null;
  reefSafe: boolean | null;
  equipmentCategory: EquipmentCategory | null;
  equipmentCondition: EquipmentCondition | null;
  listingMode: CoralListingMode;
  freeToGoodHome: boolean;
  listedAt: Date;
  expiresAt: Date;
  owner: {
    id: string;
    alias: string | null;
    avatarEmoji: string | null;
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
};

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

export async function discoverExchangeListings(params: DiscoverParams): Promise<DiscoverRow[]> {
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
    params.ownerUserId
      ? { userId: params.ownerUserId }
      : { userId: { not: params.viewerUserId } },
  ];

  if (params.freeOnly) {
    itemParts.push({ freeToGoodHome: true });
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
      if (typesIn.length) itemParts.push({ coralType: { in: typesIn } });
      if (coloursIn.length) itemParts.push({ colour: { in: coloursIn } });
    } else if (kindScope === InventoryKind.FISH) {
      if (coloursIn.length) itemParts.push({ colour: { in: coloursIn } });
      if (params.reefSafeOnly) itemParts.push({ reefSafe: true });
      if (speciesTrim) itemParts.push({ species: { contains: speciesTrim } });
    } else if (kindScope === InventoryKind.EQUIPMENT) {
      if (equipCats.length) itemParts.push({ equipmentCategory: { in: equipCats } });
      if (equipConds.length) itemParts.push({ equipmentCondition: { in: equipConds } });
    }
  }

  if (q) {
    itemParts.push({
      OR: [{ name: { contains: q } }, { description: { contains: q } }],
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

  const rows: DiscoverRow[] = raw.map((row) => {
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
      kind: item.kind,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      coralType: item.coralType,
      colour: item.colour,
      species: item.species,
      reefSafe: item.reefSafe,
      equipmentCategory: item.equipmentCategory,
      equipmentCondition: item.equipmentCondition,
      listingMode: item.listingMode,
      freeToGoodHome: item.freeToGoodHome,
      listedAt: row.listedAt,
      expiresAt: row.expiresAt,
      owner: {
        id: owner.id,
        alias: owner.alias,
        avatarEmoji: owner.avatarEmoji,
      },
      distanceKm,
    };
  });

  const maxKm = params.maxKm;
  if (params.exchangeKind === ExchangeKind.GROUP && maxKm != null && Number.isFinite(maxKm) && maxKm > 0) {
    return rows.filter((r) => r.distanceKm != null && r.distanceKm <= maxKm);
  }

  return rows;
}

export const DISCOVER_CORAL_TYPES = CORAL_TYPES;
export const DISCOVER_CORAL_COLOURS = CORAL_COLOURS;
