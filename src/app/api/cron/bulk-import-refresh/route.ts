import { NextResponse } from "next/server";
import { enqueueDueScheduledBulkImportSources } from "@/lib/bulk-import-source-service";
import { ensureDatabaseReadyUncached } from "@/lib/db-warm";
import { runInventoryImportWorker } from "@/lib/inventory-import";

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

/**
 * Weekly (or daily) secured cron: enqueue due `SCHEDULED_DELTA` jobs, then process one import at a time.
 * Configure the host scheduler to call at most once per day; sources only become due every 7 days.
 */
export async function POST(req: Request) {
  return runBulkImportRefresh(req);
}

export async function GET(req: Request) {
  return runBulkImportRefresh(req);
}

async function runBulkImportRefresh(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await ensureDatabaseReadyUncached();
  const now = new Date();
  const { enqueued } = await enqueueDueScheduledBulkImportSources(now);
  const { processed: importJobsProcessed } = await runInventoryImportWorker(1);
  return NextResponse.json({
    ok: true,
    at: now.toISOString(),
    bulkImportJobsEnqueued: enqueued,
    importJobsProcessed,
  });
}
