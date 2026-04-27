import { NextResponse } from "next/server";
import { pingDatabaseOnce } from "@/lib/db-warm";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    await pingDatabaseOnce();
    return NextResponse.json({ ok: true, database: "up" }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      { ok: false, database: "down" },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
