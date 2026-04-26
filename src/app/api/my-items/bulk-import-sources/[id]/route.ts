import { NextResponse } from "next/server";
import { InventoryKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { softDeleteBulkImportSource, updateBulkImportSource } from "@/lib/bulk-import-source-service";
import { canUseBulkItemFetch } from "@/lib/posting-role";

function parseKind(raw: unknown): InventoryKind | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (raw === InventoryKind.CORAL || raw === InventoryKind.FISH) return raw;
  if (raw === "CORAL") return InventoryKind.CORAL;
  if (raw === "FISH") return InventoryKind.FISH;
  return undefined;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    maxPages?: number;
    maxItems?: number | null;
    defaultKind?: unknown;
    defaultExchangeIds?: string[];
    autoRefreshEnabled?: boolean;
  } | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const defaultKind = parseKind(body.defaultKind);
  if (body.defaultKind !== undefined && body.defaultKind !== null && defaultKind === undefined) {
    return NextResponse.json({ ok: false, error: "invalid_default_kind" }, { status: 400 });
  }
  try {
    const source = await updateBulkImportSource({
      userId: user.id,
      sourceId: id,
      maxPages: body.maxPages,
      maxItems: body.maxItems,
      defaultKind: defaultKind === undefined ? undefined : defaultKind,
      defaultExchangeIds: body.defaultExchangeIds,
      autoRefreshEnabled: body.autoRefreshEnabled,
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
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update source.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    await softDeleteBulkImportSource(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not remove source.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
