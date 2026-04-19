import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { createInventoryImportJob, runInventoryImportWorker } from "@/lib/inventory-import";
import { canUseBulkItemFetch } from "@/lib/posting-role";

function parseIntOr(raw: unknown, fallbackValue: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : fallbackValue;
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { sourceUrl?: string; maxPages?: number; maxDepth?: number }
    | null;
  const sourceUrl = body?.sourceUrl?.trim() || "";
  if (!sourceUrl) {
    return NextResponse.json({ ok: false, error: "source_url_required" }, { status: 400 });
  }

  try {
    const created = await createInventoryImportJob({
      userId: user.id,
      sourceUrl,
      maxPages: parseIntOr(body?.maxPages, 20),
      maxDepth: parseIntOr(body?.maxDepth, 2),
    });
    void runInventoryImportWorker(1);
    return NextResponse.json({ ok: true, jobId: created.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create import job.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const jobs = await getPrisma().inventoryImportJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      sourceUrl: true,
      status: true,
      pagesVisited: true,
      candidatesReady: true,
      createdAt: true,
      finishedAt: true,
    },
  });
  return NextResponse.json({ ok: true, jobs });
}
