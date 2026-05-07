import { NextResponse } from "next/server";
import { ExchangeKind, ExchangeVisibility, InventoryKind } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { discoverExchangeListingsSlice, EXPLORE_LISTINGS_PAGE_SIZE } from "@/lib/discover-listings";
import { resolveExploreListingsDiscoverContext } from "@/lib/explore-listings-request";
import { getPrisma } from "@/lib/db";

const MAX_LISTINGS_OFFSET = 10_000;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const offsetRaw = url.searchParams.get("offset");
  let offset = 0;
  if (offsetRaw != null && offsetRaw !== "") {
    const n = Number.parseInt(offsetRaw, 10);
    if (!Number.isFinite(n) || n < 0 || n > MAX_LISTINGS_OFFSET) {
      return NextResponse.json({ error: "invalid-offset" }, { status: 400 });
    }
    offset = n;
  }

  url.searchParams.delete("offset");
  const ctx = user ? await resolveExploreListingsDiscoverContext(user, url.searchParams) : null;
  const guestExchangeId = !user ? (url.searchParams.get("exchangeId")?.trim() ?? "") : "";
  const guestExchange =
    !user && guestExchangeId
      ? await getPrisma().exchange.findFirst({
          where: { id: guestExchangeId, visibility: ExchangeVisibility.PUBLIC },
          select: {
            id: true,
            kind: true,
            allowCoral: true,
            allowFish: true,
            allowEquipment: true,
            allowItemsForSale: true,
          },
        })
      : null;
  const discoverParams =
    ctx?.discoverParams ??
    (!guestExchange
      ? null
      : {
          exchangeId: guestExchange.id,
          exchangeKind: guestExchange.kind,
          viewerUserId: "__guest__",
          viewerLat: null,
          viewerLon: null,
          searchActive: true,
          itemTab:
            url.searchParams.get("itemTab") === "fish" || url.searchParams.get("itemTab") === "equipment"
              ? (url.searchParams.get("itemTab") as "fish" | "equipment")
              : "coral",
          q: url.searchParams.get("q")?.trim() || undefined,
          coralTypes: url.searchParams.getAll("coralType"),
          colours: url.searchParams.getAll("colour"),
          freeOnly: url.searchParams.get("free") === "1" || undefined,
          saleOnly: url.searchParams.get("saleOnly") === "1" || undefined,
          excludeSale: url.searchParams.get("excludeSale") === "1" || undefined,
          fulfilment:
            guestExchange.kind === ExchangeKind.GROUP &&
            (url.searchParams.get("fulfilment") === "POST" || url.searchParams.get("fulfilment") === "MEET")
              ? (url.searchParams.get("fulfilment") as "POST" | "MEET")
              : undefined,
          maxKm: undefined,
          ownerUserId: url.searchParams.get("owner")?.trim() || undefined,
          speciesContains: url.searchParams.get("species")?.trim() || undefined,
          reefSafeOnly: url.searchParams.get("reefSafe") === "1" || undefined,
          equipmentCategories: url.searchParams.getAll("equipmentCategory"),
          equipmentConditions: url.searchParams.getAll("equipmentCondition"),
          allowedKinds: [
            ...(guestExchange.allowCoral ? [InventoryKind.CORAL] : []),
            ...(guestExchange.allowFish ? [InventoryKind.FISH] : []),
            ...(guestExchange.allowEquipment ? [InventoryKind.EQUIPMENT] : []),
          ],
          allowItemsForSale: guestExchange.allowItemsForSale,
          sort:
            url.searchParams.get("sort") === "recent" ||
            url.searchParams.get("sort") === "price_asc" ||
            url.searchParams.get("sort") === "price_desc"
              ? (url.searchParams.get("sort") as "recent" | "price_asc" | "price_desc")
              : undefined,
        });

  if (!discoverParams) {
    return NextResponse.json({
      total: 0,
      listings: [],
      pageSize: EXPLORE_LISTINGS_PAGE_SIZE,
    });
  }

  const { total, rows } = await discoverExchangeListingsSlice(
    discoverParams,
    offset,
    EXPLORE_LISTINGS_PAGE_SIZE,
  );

  return NextResponse.json({
    total,
    listings: rows,
    pageSize: EXPLORE_LISTINGS_PAGE_SIZE,
  });
}
