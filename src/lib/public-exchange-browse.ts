import { ExchangeKind, ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";

export type PublicBrowseEventRow = {
  id: string;
  name: string;
  location: string;
  eventDate: Date | null;
};

export type PublicBrowseGroupRow = {
  id: string;
  name: string;
  memberCount: number;
  activeListingCount: number;
};

function locationFromDescription(description: string | null | undefined): string {
  const t = description?.trim();
  return t && t.length > 0 ? t : "—";
}

export async function getPublicBrowseEvents(): Promise<PublicBrowseEventRow[]> {
  const rows = await getPrisma().exchange.findMany({
    where: { visibility: ExchangeVisibility.PUBLIC, kind: ExchangeKind.EVENT },
    select: {
      id: true,
      name: true,
      description: true,
      eventDate: true,
    },
  });

  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      location: locationFromDescription(r.description),
      eventDate: r.eventDate,
    }))
    .sort((a, b) => {
      const ta = a.eventDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const tb = b.eventDate?.getTime() ?? Number.POSITIVE_INFINITY;
      if (ta !== tb) {
        return ta - tb;
      }
      return a.name.localeCompare(b.name);
    });
}

export async function getPublicBrowseGroups(): Promise<PublicBrowseGroupRow[]> {
  const now = new Date();
  const rows = await getPrisma().exchange.findMany({
    where: { visibility: ExchangeVisibility.PUBLIC, kind: ExchangeKind.GROUP },
    select: {
      id: true,
      name: true,
      _count: { select: { memberships: true } },
    },
  });

  const ids = rows.map((r) => r.id);
  const listingAgg =
    ids.length === 0
      ? []
      : await getPrisma().exchangeListing.groupBy({
          by: ["exchangeId"],
          where: {
            exchangeId: { in: ids },
            expiresAt: { gt: now },
          },
          _count: { _all: true },
        });

  const listingByExchange = new Map(listingAgg.map((g) => [g.exchangeId, g._count._all]));

  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      memberCount: r._count.memberships,
      activeListingCount: listingByExchange.get(r.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
