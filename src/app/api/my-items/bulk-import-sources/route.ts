import { NextResponse } from "next/server";
import { InventoryKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { createBulkImportSource, listBulkImportSourcesForUser } from "@/lib/bulk-import-source-service";
import { canUseBulkItemFetch } from "@/lib/posting-role";

function parseKind(raw: unknown): InventoryKind | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (raw === InventoryKind.CORAL || raw === InventoryKind.FISH) return raw;
  if (raw === "CORAL") return InventoryKind.CORAL;
  if (raw === "FISH") return InventoryKind.FISH;
  return undefined;
}

export async function GET() {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const rows = await listBulkImportSourcesForUser(user.id);
  return NextResponse.json({
    ok: true,
    sources: rows.map((s) => ({
      id: s.id,
      sourceUrl: s.sourceUrl,
      sourceHost: s.sourceHost,
      maxPages: s.maxPages,
      maxItems: s.maxItems,
      defaultKind: s.defaultKind,
      defaultExchangeIds: s.defaultExchangeIds,
      autoRefreshEnabled: s.autoRefreshEnabled,
      autoRefreshEnabledAt: s.autoRefreshEnabledAt?.toISOString() ?? null,
      lastScheduledRunAt: s.lastScheduledRunAt?.toISOString() ?? null,
      lastScheduledRunError: s.lastScheduledRunError,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      latestJob: s.importJobs[0]
        ? {
            id: s.importJobs[0].id,
            status: s.importJobs[0].status,
            runKind: s.importJobs[0].runKind,
            createdAt: s.importJobs[0].createdAt.toISOString(),
            finishedAt: s.importJobs[0].finishedAt?.toISOString() ?? null,
          }
        : null,
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as {
    sourceUrl?: string;
    maxPages?: number;
    maxItems?: number | null;
    defaultKind?: unknown;
    defaultExchangeIds?: string[];
    autoRefreshEnabled?: boolean;
    startFirstScan?: boolean;
  } | null;
  const startFirstScan =
    typeof body?.startFirstScan === "boolean" ? body.startFirstScan : undefined;
  const sourceUrl = body?.sourceUrl?.trim() || "";
  if (!sourceUrl) {
    return NextResponse.json({ ok: false, error: "source_url_required" }, { status: 400 });
  }
  const defaultKind = parseKind(body?.defaultKind);
  if (body?.defaultKind !== undefined && body?.defaultKind !== null && defaultKind === undefined) {
    return NextResponse.json({ ok: false, error: "invalid_default_kind" }, { status: 400 });
  }
  try {
    const { source, firstJobId } = await createBulkImportSource({
      userId: user.id,
      sourceUrl,
      maxPages: body?.maxPages,
      maxItems: body?.maxItems,
      defaultKind: defaultKind === undefined ? undefined : defaultKind,
      defaultExchangeIds: Array.isArray(body?.defaultExchangeIds) ? body.defaultExchangeIds : [],
      autoRefreshEnabled: body?.autoRefreshEnabled,
      startFirstScan,
    });
    return NextResponse.json({
      ok: true,
      source: {
        id: source.id,
        sourceUrl: source.sourceUrl,
        maxPages: source.maxPages,
        maxItems: source.maxItems,
        defaultKind: source.defaultKind,
        defaultExchangeIds: source.defaultExchangeIds,
        autoRefreshEnabled: source.autoRefreshEnabled,
      },
      jobId: firstJobId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create source.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
