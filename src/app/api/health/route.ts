import { NextResponse } from "next/server";
import { pingDatabaseOnce } from "@/lib/db-warm";

export async function GET() {
  try {
    await pingDatabaseOnce();
    return NextResponse.json({ ok: true, database: "up" });
  } catch {
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
