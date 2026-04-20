import { NextResponse } from "next/server";
import { InventoryKind, ListingIntent } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { isKindAllowedOnExchange } from "@/lib/listing-eligibility";
import { canUseBulkItemFetch } from "@/lib/posting-role";

type Body = {
  candidateIds?: unknown;
  approved?: unknown;
  exchangeMode?: unknown;
  selectedExchangeIds?: unknown;
  kind?: unknown;
  action?: unknown;
};

const MAX_BULK = 200;

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { jobId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !Array.isArray(body.candidateIds)) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const rawIds = body.candidateIds.filter((id): id is string => typeof id === "string" && id.length > 0);
  const candidateIds = [...new Set(rawIds)].slice(0, MAX_BULK);
  if (candidateIds.length === 0) {
    return NextResponse.json({ ok: false, error: "no_candidates" }, { status: 400 });
  }

  const hasApproved = typeof body.approved === "boolean";
  const hasExchanges =
    body.exchangeMode === "merge" || body.exchangeMode === "replace"
      ? Array.isArray(body.selectedExchangeIds)
      : false;
  const hasKind = body.kind === InventoryKind.CORAL || body.kind === InventoryKind.FISH;
  const isDelete = body.action === "delete";

  if (!hasApproved && !hasExchanges && !hasKind && !isDelete) {
    return NextResponse.json({ ok: false, error: "nothing_to_apply" }, { status: 400 });
  }

  const job = await getPrisma().inventoryImportJob.findFirst({
    where: { id: jobId, userId: user.id },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (isDelete) {
    const deleted = await getPrisma().inventoryImportCandidate.deleteMany({
      where: { id: { in: candidateIds }, jobId, userId: user.id },
    });
    return NextResponse.json({ ok: true, deletedCount: deleted.count });
  }

  const memberships = await getPrisma().exchangeMembership.findMany({
    where: { userId: user.id },
    select: {
      exchangeId: true,
      exchange: {
        select: { id: true, allowCoral: true, allowFish: true, allowEquipment: true, allowItemsForSale: true },
      },
    },
  });
  const exchangeById = new Map(memberships.map((m) => [m.exchangeId, m.exchange]));
  const allowedExchangeIdSet = new Set(memberships.map((m) => m.exchangeId));

  let requestedExchangeIds: string[] = [];
  if (hasExchanges) {
    requestedExchangeIds = [...new Set((body.selectedExchangeIds as unknown[]).filter((id): id is string => typeof id === "string" && id.length > 0))];
    for (const id of requestedExchangeIds) {
      if (!allowedExchangeIdSet.has(id)) {
        return NextResponse.json({ ok: false, error: "invalid_exchange" }, { status: 400 });
      }
    }
  }

  const candidates = await getPrisma().inventoryImportCandidate.findMany({
    where: { id: { in: candidateIds }, jobId, userId: user.id },
    select: {
      id: true,
      kind: true,
      selectedExchangeIds: true,
    },
  });
  if (candidates.length === 0) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  function filterForKind(kind: (typeof candidates)[0]["kind"], ids: string[]): string[] {
    if (!kind) return [];
    return ids.filter((exchangeId) => {
      const ex = exchangeById.get(exchangeId);
      return ex && isKindAllowedOnExchange(kind, ex, ListingIntent.FOR_SALE);
    });
  }

  const nextKind = hasKind ? (body.kind as InventoryKind) : null;

  await getPrisma().$transaction(
    candidates.map((c) => {
      const data: {
        approvedAt?: Date | null;
        rejectedAt?: Date | null;
        selectedExchangeIds?: string[];
        kind?: InventoryKind;
      } = {};
      if (hasApproved) {
        data.approvedAt = body.approved === true ? new Date() : null;
        data.rejectedAt = body.approved === false ? new Date() : null;
      }
      if (hasKind && nextKind) {
        data.kind = nextKind;
      }
      if (hasExchanges) {
        /** Filter against the new kind if we're changing it in the same call; otherwise the current kind. */
        const kindForExchangeFilter = hasKind ? nextKind : c.kind;
        const filtered = filterForKind(kindForExchangeFilter, requestedExchangeIds);
        if (body.exchangeMode === "merge") {
          data.selectedExchangeIds = [...new Set([...c.selectedExchangeIds, ...filtered])];
        } else {
          data.selectedExchangeIds = filtered;
        }
      }
      return getPrisma().inventoryImportCandidate.update({
        where: { id: c.id },
        data,
      });
    }),
  );

  return NextResponse.json({ ok: true, updatedCount: candidates.length });
}
