import { NextResponse } from "next/server";
import { InventoryKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canUseBulkItemFetch } from "@/lib/posting-role";

export async function PATCH(req: Request, ctx: { params: Promise<{ jobId: string; candidateId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { jobId, candidateId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | {
        kind?: InventoryKind | null;
        name?: string;
        description?: string;
        coralType?: string | null;
        species?: string | null;
        reefSafe?: boolean | null;
        quantity?: number;
        salePriceMinor?: number;
        saleCurrencyCode?: string;
        saleExternalUrl?: string;
        selectedExchangeIds?: string[];
        approved?: boolean;
      }
    | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const candidate = await getPrisma().inventoryImportCandidate.findFirst({
    where: { id: candidateId, jobId, userId: user.id },
    select: { id: true },
  });
  if (!candidate) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const update = {
    kind: body.kind === InventoryKind.CORAL || body.kind === InventoryKind.FISH ? body.kind : undefined,
    name: typeof body.name === "string" ? body.name.trim().slice(0, 120) : undefined,
    description: typeof body.description === "string" ? body.description.trim().slice(0, 8000) : undefined,
    coralType: typeof body.coralType === "string" ? body.coralType.trim().slice(0, 120) : body.coralType === null ? null : undefined,
    species: typeof body.species === "string" ? body.species.trim().slice(0, 200) : body.species === null ? null : undefined,
    reefSafe: typeof body.reefSafe === "boolean" ? body.reefSafe : body.reefSafe === null ? null : undefined,
    quantity: Number.isInteger(body.quantity) ? Math.max(1, Number(body.quantity)) : undefined,
    salePriceMinor: Number.isInteger(body.salePriceMinor) ? Math.max(1, Number(body.salePriceMinor)) : undefined,
    saleCurrencyCode:
      typeof body.saleCurrencyCode === "string" && body.saleCurrencyCode.trim().length === 3
        ? body.saleCurrencyCode.trim().toUpperCase()
        : undefined,
    saleExternalUrl: typeof body.saleExternalUrl === "string" ? body.saleExternalUrl.trim().slice(0, 2048) : undefined,
    selectedExchangeIds: Array.isArray(body.selectedExchangeIds) ? [...new Set(body.selectedExchangeIds.filter(Boolean))] : undefined,
    approvedAt: body.approved === true ? new Date() : body.approved === false ? null : undefined,
    rejectedAt: body.approved === false ? new Date() : body.approved === true ? null : undefined,
  };
  const updated = await getPrisma().inventoryImportCandidate.update({
    where: { id: candidateId },
    data: update,
  });
  return NextResponse.json({ ok: true, candidate: updated });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ jobId: string; candidateId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { jobId, candidateId } = await ctx.params;
  const deleted = await getPrisma().inventoryImportCandidate.deleteMany({
    where: { id: candidateId, jobId, userId: user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
