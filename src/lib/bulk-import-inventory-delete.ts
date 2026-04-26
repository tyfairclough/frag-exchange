import { TradeStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";

const BLOCKING_TRADE_STATUSES: TradeStatus[] = [
  TradeStatus.OFFER,
  TradeStatus.COUNTERED,
  TradeStatus.APPROVED,
];

/**
 * Deletes an inventory row created/managed by bulk import automation.
 * Skips when the item participates in a non-terminal trade (same risk model as user delete).
 */
export async function deleteInventoryItemForBulkImportSystem(params: {
  inventoryItemId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { inventoryItemId, userId } = params;
  const db = getPrisma();

  const item = await db.inventoryItem.findFirst({
    where: { id: inventoryItemId, userId },
    select: { id: true },
  });
  if (!item) {
    return { ok: false, reason: "not_found" };
  }

  const blocking = await db.trade.count({
    where: {
      status: { in: BLOCKING_TRADE_STATUSES },
      inventoryLines: { some: { inventoryItemId } },
    },
  });
  if (blocking > 0) {
    return { ok: false, reason: "active_trade" };
  }

  await db.$transaction(async (tx) => {
    await tx.exchangeListing.deleteMany({ where: { inventoryItemId } });
    await tx.trade.deleteMany({
      where: {
        inventoryLines: {
          some: { inventoryItemId },
        },
      },
    });
    await tx.inventoryItem.delete({ where: { id: inventoryItemId } });
  });

  return { ok: true };
}
