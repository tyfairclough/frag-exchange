import { Suspense } from "react";
import Link from "next/link";
import { ExchangeKind } from "@/generated/prisma/enums";
import type { ExploreShellModel } from "@/components/explore-shell-context";
import { requireUser } from "@/lib/auth";
import {
  DISCOVER_CORAL_COLOURS,
  DISCOVER_CORAL_TYPES,
  discoverExchangeListingsSlice,
  EXPLORE_LISTINGS_PAGE_SIZE,
} from "@/lib/discover-listings";
import { resolveExploreListingsDiscoverContext } from "@/lib/explore-listings-request";
import { buildExploreSearchHref } from "@/lib/explore-search-href";
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
  const user = await requireUser();
  const sp = await searchParams;
  const ctx = await resolveExploreListingsDiscoverContext(user, recordToURLSearchParams(sp));

  const { rows: initialRows, total: listingTotal } = ctx.discoverParams
    ? await discoverExchangeListingsSlice(ctx.discoverParams, 0, EXPLORE_LISTINGS_PAGE_SIZE)
    : { rows: [], total: 0 };

  const buildHref = (overrides: { exchangeId?: string; owner?: string | null }) => {
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
    ctx.memberships.length > 0 && ctx.selected && ctx.exchangeId
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
      : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6">
      {shellModel ? <ExploreShellSync model={shellModel} /> : null}

      {ctx.memberships.length > 0 ? (
        <p className="text-sm font-semibold text-[#122B49]" aria-live="polite">
          {listingTotal} listing{listingTotal === 1 ? "" : "s"} found
        </p>
      ) : null}

      {ctx.memberships.length === 0 ? (
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
          {ctx.validatedOwnerUserId ? (
            <ExploreOwnerScopeNote
              ownerAlias={ctx.ownerAlias}
              showAllReefersHref={buildHref({ owner: null })}
            />
          ) : null}

          <Suspense
            fallback={<ExploreResultsGrid rows={initialRows} exchangeId={ctx.exchangeId} />}
          >
            <ExploreResultsInfinite
              initialRows={initialRows}
              totalCount={listingTotal}
              exchangeId={ctx.exchangeId}
            />
          </Suspense>
        </section>
      )}
    </div>
  );
}
