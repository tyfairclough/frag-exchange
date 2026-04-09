import Link from "next/link";
import { ExchangeKind, InventoryKind } from "@/generated/prisma/enums";
import type { ExploreShellModel } from "@/components/explore-shell-context";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  DISCOVER_CORAL_COLOURS,
  DISCOVER_CORAL_TYPES,
  type DiscoverItemTab,
  discoverExchangeListings,
} from "@/lib/discover-listings";
import { buildExploreSearchHref, parseExploreFiltersFromSearchParams } from "@/lib/explore-search-href";
import { ExploreOwnerScopeNote, ExploreResultsGrid } from "./_components/explore-results-grid";
import { ExploreShellSync } from "./_components/explore-shell-sync";

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

function recordToURLSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const u = new URLSearchParams();
  for (const [k, val] of Object.entries(sp)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) u.append(k, String(v));
    } else {
      u.append(k, String(val));
    }
  }
  return u;
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

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = parseExploreFiltersFromSearchParams(recordToURLSearchParams(sp));

  const memberships = await getPrisma().exchangeMembership.findMany({
    where: { userId: user.id },
    include: { exchange: true },
    orderBy: { joinedAt: "desc" },
  });

  const exchangeIdParam = str(sp.exchangeId);
  const exchangeIdFromTrustedParam =
    exchangeIdParam && memberships.some((m) => m.exchangeId === exchangeIdParam)
      ? exchangeIdParam
      : null;
  const scopedByQuery = exchangeIdFromTrustedParam != null;
  const exchangeId = exchangeIdFromTrustedParam ?? (memberships[0]?.exchangeId ?? "");

  const selected = memberships.find((m) => m.exchangeId === exchangeId);
  const allowedTabs = selected ? allowedTabsForExchange(selected.exchange) : [];
  const normalizedItemTab = allowedTabs.includes(filters.itemTab) ? filters.itemTab : (allowedTabs[0] ?? "coral");
  const allowedKinds = selected
    ? [
        ...(selected.exchange.allowCoral ? [InventoryKind.CORAL] : []),
        ...(selected.exchange.allowFish ? [InventoryKind.FISH] : []),
        ...(selected.exchange.allowEquipment ? [InventoryKind.EQUIPMENT] : []),
      ]
    : [];
  const ownerParam = str(sp.owner);
  const fulfilmentParsed =
    filters.fulfilment === "POST" || filters.fulfilment === "MEET"
      ? filters.fulfilment
      : undefined;
  const maxKmRaw = filters.maxKm;
  const maxKm = maxKmRaw ? Number(maxKmRaw) : undefined;

  const searchActive =
    str(sp.searched) === "1" ||
    Boolean(filters.q.trim()) ||
    filters.coralTypes.length > 0 ||
    filters.colours.length > 0 ||
    filters.freeOnly ||
    fulfilmentParsed != null ||
    (maxKm != null && Number.isFinite(maxKm)) ||
    Boolean(filters.species.trim()) ||
    filters.reefSafeOnly ||
    filters.equipmentCategories.length > 0 ||
    filters.equipmentConditions.length > 0;

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

  const rows =
    selected && exchangeId
      ? await discoverExchangeListings({
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
          fulfilment: fulfilmentParsed,
          maxKm: maxKm != null && Number.isFinite(maxKm) ? maxKm : undefined,
          ownerUserId: validatedOwnerUserId ?? undefined,
          speciesContains: filters.species.trim() || undefined,
          reefSafeOnly: filters.reefSafeOnly || undefined,
          equipmentCategories: filters.equipmentCategories.length ? filters.equipmentCategories : undefined,
          equipmentConditions: filters.equipmentConditions.length ? filters.equipmentConditions : undefined,
          allowedKinds,
        })
      : [];

  const buildHref = (overrides: { exchangeId?: string; owner?: string | null }) => {
    const nextExchangeId = overrides.exchangeId ?? exchangeId;
    const owner = overrides.owner !== undefined ? overrides.owner : validatedOwnerUserId;
    return buildExploreSearchHref({
      exchangeId: nextExchangeId,
      ownerUserId: owner,
      filters,
      markSearched: searchActive ? true : undefined,
    });
  };

  const shellModel: ExploreShellModel | null =
    memberships.length > 0 && selected && exchangeId
      ? {
          resultCount: rows.length,
          memberships: memberships.map((m) => ({
            id: m.id,
            exchangeId: m.exchangeId,
            name: m.exchange.name,
            kind: m.exchange.kind === ExchangeKind.GROUP ? "GROUP" : "EVENT",
          })),
          exchangeId,
          scopedByQuery,
          exchangeKind: selected.exchange.kind === ExchangeKind.GROUP ? "GROUP" : "EVENT",
          viewerHasCoords: viewerLat != null && viewerLon != null,
          coralTypes: DISCOVER_CORAL_TYPES,
          coralColours: DISCOVER_CORAL_COLOURS,
          allowedItemTabs: allowedTabs,
          filters: { ...filters, itemTab: normalizedItemTab },
          ownerUserId: validatedOwnerUserId,
        }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6">
      {shellModel ? <ExploreShellSync model={shellModel} /> : null}

      {memberships.length > 0 ? (
        <p className="text-sm font-semibold text-[#122B49]" aria-live="polite">
          {rows.length} listing{rows.length === 1 ? "" : "s"} found
        </p>
      ) : null}

      {memberships.length === 0 ? (
        <section className="card border border-slate-200/90 bg-white shadow-sm">
          <div className="card-body gap-2 p-5 text-sm text-slate-700">
            <p>Join an exchange to see listings.</p>
            <Link href="/exchanges" className="btn btn-primary btn-sm min-h-10 w-fit rounded-full border-0 bg-emerald-500 hover:bg-emerald-600">
              Browse exchanges
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {validatedOwnerUserId ? (
            <ExploreOwnerScopeNote
              ownerAlias={ownerAlias}
              showAllReefersHref={buildHref({ owner: null })}
            />
          ) : null}

          <ExploreResultsGrid rows={rows} exchangeId={exchangeId} />
        </section>
      )}
    </div>
  );
}
