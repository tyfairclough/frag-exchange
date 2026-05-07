import { Suspense } from "react";
import Link from "next/link";
import { ExchangeKind, ExchangeVisibility, InventoryKind } from "@/generated/prisma/enums";
import type { ExploreShellModel } from "@/components/explore-shell-context";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import {
  DISCOVER_CORAL_COLOURS,
  DISCOVER_CORAL_TYPES,
  discoverExchangeListingsSlice,
  type DiscoverItemTab,
  EXPLORE_LISTINGS_PAGE_SIZE,
} from "@/lib/discover-listings";
import { resolveExploreListingsDiscoverContext } from "@/lib/explore-listings-request";
import { buildExploreSearchHref, exploreFiltersImplyScopedSearch, parseExploreFiltersFromSearchParams } from "@/lib/explore-search-href";
import { ExploreOwnerScopeNote, ExploreResultsGrid } from "./_components/explore-results-grid";
import { ExploreResultsInfinite } from "./_components/explore-results-infinite";
import { ExploreShellSync } from "./_components/explore-shell-sync";

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

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const urlParams = recordToURLSearchParams(sp);
  const ctx = user ? await resolveExploreListingsDiscoverContext(user, urlParams) : null;

  const guestExchangeId = !user ? (urlParams.get("exchangeId")?.trim() ?? "") : "";
  const guestExchange = !user && guestExchangeId
    ? await getPrisma().exchange.findFirst({
        where: { id: guestExchangeId, visibility: ExchangeVisibility.PUBLIC },
        select: {
          id: true,
          name: true,
          kind: true,
          allowCoral: true,
          allowFish: true,
          allowEquipment: true,
          allowItemsForSale: true,
        },
      })
    : null;
  const guestAllowedTabs: DiscoverItemTab[] = guestExchange
    ? [
        ...(guestExchange.allowCoral ? (["coral"] as const) : []),
        ...(guestExchange.allowFish ? (["fish"] as const) : []),
        ...(guestExchange.allowEquipment ? (["equipment"] as const) : []),
      ]
    : [];
  const guestTab = guestAllowedTabs.includes((urlParams.get("itemTab") as DiscoverItemTab) ?? "coral")
    ? ((urlParams.get("itemTab") as DiscoverItemTab) ?? "coral")
    : (guestAllowedTabs[0] ?? "coral");
  const guestDiscoverParams =
    !user && guestExchange
      ? {
          exchangeId: guestExchange.id,
          exchangeKind: guestExchange.kind,
          viewerUserId: "__guest__",
          viewerLat: null,
          viewerLon: null,
          searchActive: true,
          itemTab: guestTab,
          q: urlParams.get("q")?.trim() || undefined,
          coralTypes: urlParams.getAll("coralType"),
          colours: urlParams.getAll("colour"),
          freeOnly: urlParams.get("free") === "1" || undefined,
          saleOnly: urlParams.get("saleOnly") === "1" || undefined,
          excludeSale: urlParams.get("excludeSale") === "1" || undefined,
          fulfilment:
            guestExchange.kind === ExchangeKind.GROUP &&
            (urlParams.get("fulfilment") === "POST" || urlParams.get("fulfilment") === "MEET")
              ? (urlParams.get("fulfilment") as "POST" | "MEET")
              : undefined,
          maxKm: undefined,
          ownerUserId: urlParams.get("owner")?.trim() || undefined,
          speciesContains: urlParams.get("species")?.trim() || undefined,
          reefSafeOnly: urlParams.get("reefSafe") === "1" || undefined,
          equipmentCategories: urlParams.getAll("equipmentCategory"),
          equipmentConditions: urlParams.getAll("equipmentCondition"),
          allowedKinds: [
            ...(guestExchange.allowCoral ? [InventoryKind.CORAL] : []),
            ...(guestExchange.allowFish ? [InventoryKind.FISH] : []),
            ...(guestExchange.allowEquipment ? [InventoryKind.EQUIPMENT] : []),
          ],
          allowItemsForSale: guestExchange.allowItemsForSale,
          sort:
            urlParams.get("sort") === "recent" ||
            urlParams.get("sort") === "price_asc" ||
            urlParams.get("sort") === "price_desc"
              ? (urlParams.get("sort") as "recent" | "price_asc" | "price_desc")
              : undefined,
        }
      : null;
  const guestFilters = !user ? parseExploreFiltersFromSearchParams(urlParams) : null;
  const guestScopedByQuery = guestFilters ? exploreFiltersImplyScopedSearch(guestFilters) : false;

  const discoverParams = ctx?.discoverParams ?? guestDiscoverParams;
  const { rows: initialRows, total: listingTotal } = discoverParams
    ? await discoverExchangeListingsSlice(discoverParams, 0, EXPLORE_LISTINGS_PAGE_SIZE)
    : { rows: [], total: 0 };

  const buildHref = (overrides: { exchangeId?: string; owner?: string | null }) => {
    if (!ctx) {
      return "/explore";
    }
    const nextExchangeId = overrides.exchangeId ?? ctx.exchangeId;
    const owner = overrides.owner !== undefined ? overrides.owner : ctx.validatedOwnerUserId;
    return buildExploreSearchHref({
      exchangeId: nextExchangeId,
      ownerUserId: owner,
      filters: ctx.filters,
      markSearched: ctx.searchActive ? true : undefined,
    });
  };

  const shellModel: ExploreShellModel | null =
    ctx && ctx.memberships.length > 0 && ctx.selected && ctx.exchangeId
      ? {
          resultCount: listingTotal,
          memberships: ctx.memberships.map((m) => ({
            id: m.id,
            exchangeId: m.exchangeId,
            name: m.exchange.name,
            kind: m.exchange.kind === ExchangeKind.GROUP ? "GROUP" : "EVENT",
          })),
          exchangeId: ctx.exchangeId,
          scopedByQuery: ctx.scopedByQuery,
          exchangeKind: ctx.selected.exchange.kind === ExchangeKind.GROUP ? "GROUP" : "EVENT",
          viewerHasCoords: ctx.viewerLat != null && ctx.viewerLon != null,
          coralTypes: DISCOVER_CORAL_TYPES,
          coralColours: DISCOVER_CORAL_COLOURS,
          allowedItemTabs: ctx.allowedTabs,
          filters: { ...ctx.filters, itemTab: ctx.normalizedItemTab },
          ownerUserId: ctx.validatedOwnerUserId,
        }
      : guestExchange
        ? {
            resultCount: listingTotal,
            memberships: [
              {
                id: `guest-${guestExchange.id}`,
                exchangeId: guestExchange.id,
                name: guestExchange.name,
                kind: guestExchange.kind === ExchangeKind.GROUP ? "GROUP" : "EVENT",
              },
            ],
            exchangeId: guestExchange.id,
            scopedByQuery: guestScopedByQuery,
            exchangeKind: guestExchange.kind === ExchangeKind.GROUP ? "GROUP" : "EVENT",
            viewerHasCoords: false,
            coralTypes: DISCOVER_CORAL_TYPES,
            coralColours: DISCOVER_CORAL_COLOURS,
            allowedItemTabs: guestAllowedTabs,
            filters: {
              ...(guestFilters ?? parseExploreFiltersFromSearchParams(urlParams)),
              itemTab: guestTab,
            },
            ownerUserId: null,
          }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6">
      {shellModel ? <ExploreShellSync model={shellModel} /> : null}

      {ctx && ctx.memberships.length > 0 ? (
        <p className="text-sm font-semibold text-[#122B49]" aria-live="polite">
          {listingTotal} listing{listingTotal === 1 ? "" : "s"} found
        </p>
      ) : null}

      {!ctx && !guestExchange ? (
        <section className="card border border-slate-200/90 bg-white shadow-sm">
          <div className="card-body gap-2 p-5 text-sm text-slate-700">
            <p>Select a public exchange to explore current listings.</p>
            <Link href="/exchanges/browse?tab=groups" className="btn btn-primary btn-sm min-h-10 w-fit rounded-full border-0 bg-emerald-500 hover:bg-emerald-600">
              View exchanges
            </Link>
          </div>
        </section>
      ) : ctx && ctx.memberships.length === 0 ? (
        <section className="card border border-slate-200/90 bg-white shadow-sm">
          <div className="card-body gap-2 p-5 text-sm text-slate-700">
            <p>Join an exchange to list items and start trading.</p>
            <Link href="/exchanges/browse?tab=groups" className="btn btn-primary btn-sm min-h-10 w-fit rounded-full border-0 bg-emerald-500 hover:bg-emerald-600">
              View exchanges
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {ctx?.validatedOwnerUserId ? (
            <ExploreOwnerScopeNote
              ownerAlias={ctx?.ownerAlias ?? null}
              showAllReefersHref={buildHref({ owner: null })}
            />
          ) : null}

          <Suspense
            fallback={<ExploreResultsGrid rows={initialRows} exchangeId={ctx?.exchangeId ?? guestExchange?.id ?? ""} />}
          >
            <ExploreResultsInfinite
              initialRows={initialRows}
              totalCount={listingTotal}
              exchangeId={ctx?.exchangeId ?? guestExchange?.id ?? ""}
            />
          </Suspense>
        </section>
      )}
    </div>
  );
}
