import { CoralListingMode, CoralProfileStatus, ExchangeKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { haversineKm } from "@/lib/distance";
import { CORAL_COLOURS, CORAL_TYPES, parseCoralColourFromForm, parseCoralTypeFromForm } from "@/lib/coral-options";

export type DiscoverRow = {
  listingId: string;
  coralId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  coralType: string | null;
  colour: string | null;
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
  q?: string;
  coralTypes?: string[];
  colours?: string[];
  freeOnly?: boolean;
  fulfilment?: "POST" | "MEET";
  maxKm?: number;
  ownerUserId?: string;
};

function listingModeFilter(fulfilment: "POST" | "MEET" | undefined) {
  if (!fulfilment) {
    return {};
  }
  if (fulfilment === "POST") {
    return { listingMode: { in: [CoralListingMode.POST, CoralListingMode.BOTH] as CoralListingMode[] } };
  }
  return { listingMode: { in: [CoralListingMode.MEET, CoralListingMode.BOTH] as CoralListingMode[] } };
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

export async function discoverExchangeListings(params: DiscoverParams): Promise<DiscoverRow[]> {
  const now = new Date();
  const q = params.q?.trim();
  const typesIn = parseStoredTypes(params.coralTypes);
  const coloursIn = parseStoredColours(params.colours);

  const fulfilment =
    params.exchangeKind === ExchangeKind.GROUP ? params.fulfilment : undefined;

  const raw = await getPrisma().exchangeListing.findMany({
    where: {
      exchangeId: params.exchangeId,
      expiresAt: { gt: now },
      coral: {
        profileStatus: CoralProfileStatus.UNLISTED,
        userId: params.ownerUserId ?? { not: params.viewerUserId },
        ...(typesIn.length ? { coralType: { in: typesIn } } : {}),
        ...(coloursIn.length ? { colour: { in: coloursIn } } : {}),
        ...(params.freeOnly ? { freeToGoodHome: true } : {}),
        ...(fulfilment ? listingModeFilter(fulfilment) : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {}),
      },
    },
    include: {
      coral: {
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
    const owner = row.coral.user;
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
      coralId: row.coral.id,
      name: row.coral.name,
      description: row.coral.description,
      imageUrl: row.coral.imageUrl,
      coralType: row.coral.coralType,
      colour: row.coral.colour,
      listingMode: row.coral.listingMode,
      freeToGoodHome: row.coral.freeToGoodHome,
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
