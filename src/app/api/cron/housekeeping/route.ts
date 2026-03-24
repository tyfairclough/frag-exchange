import { NextResponse } from "next/server";
import { expireDueTradesAndNotify } from "@/lib/trade-expire-notify";
import { getPrisma } from "@/lib/db";
import { removeExpiredExchangeListings } from "@/lib/listing-expiry-job";

function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

function housekeepingBaseUrl(): string | null {
  const a = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (a) return a;
  const b = process.env.APP_BASE_URL?.replace(/\/$/, "").trim();
  return b || null;
}

/**
 * POST (or GET for simple panel cron) — secured with CRON_SECRET.
 * Runs: expired listing cleanup, global trade expiry + one-time notify per trade.
 */
export async function POST(req: Request) {
  return runHousekeeping(req);
}

export async function GET(req: Request) {
  return runHousekeeping(req);
}

async function runHousekeeping(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const baseUrl = housekeepingBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Set NEXT_PUBLIC_APP_URL or APP_BASE_URL so trade expiry emails use correct links.",
      },
      { status: 500 },
    );
  }

  const now = new Date();
  const db = getPrisma();

  const { removed } = await removeExpiredExchangeListings(db, now);
  const { expiredTradeCount } = await expireDueTradesAndNotify(db, { baseUrl, now });

  return NextResponse.json({
    ok: true,
    at: now.toISOString(),
    listingsRemoved: removed,
    tradesExpired: expiredTradeCount,
  });
}
