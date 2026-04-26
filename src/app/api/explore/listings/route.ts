import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { discoverExchangeListingsSlice, EXPLORE_LISTINGS_PAGE_SIZE } from "@/lib/discover-listings";
import { resolveExploreListingsDiscoverContext } from "@/lib/explore-listings-request";

const MAX_LISTINGS_OFFSET = 10_000;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
  const ctx = await resolveExploreListingsDiscoverContext(user, url.searchParams);

  if (!ctx.discoverParams) {
    return NextResponse.json({
      total: 0,
      listings: [],
      pageSize: EXPLORE_LISTINGS_PAGE_SIZE,
    });
  }

  const { total, rows } = await discoverExchangeListingsSlice(
    ctx.discoverParams,
    offset,
    EXPLORE_LISTINGS_PAGE_SIZE,
  );

  return NextResponse.json({
    total,
    listings: rows,
    pageSize: EXPLORE_LISTINGS_PAGE_SIZE,
  });
}
