import { TradeStatus } from "@/generated/prisma/enums";
import type { getPrisma } from "@/lib/db";
import { expireDueTradesAndNotify } from "@/lib/trade-expire-notify";
import { scheduleTradeNotifications } from "@/lib/notifications/trade-events";

type Db = ReturnType<typeof getPrisma>;

/**
 * Cancels pending (OFFER/COUNTERED) trades on an exchange that include this inventory item
 * on the acting user's side, then notifies the other party. Does not modify approved trades.
 */
export async function cancelPendingTradesForItemOnListingRemoval(
  db: Db,
  params: {
    baseUrl: string;
    now: Date;
    exchangeId: string;
    inventoryItemId: string;
    actorUserId: string;
  },
): Promise<{ cancelledCount: number }> {
  await expireDueTradesAndNotify(db, {
    baseUrl: params.baseUrl,
    now: params.now,
    exchangeId: params.exchangeId,
  });

  const trades = await db.trade.findMany({
    where: {
      exchangeId: params.exchangeId,
      status: { in: [TradeStatus.OFFER, TradeStatus.COUNTERED] },
      expiresAt: { gt: params.now },
      inventoryLines: {
        some: {
          inventoryItemId: params.inventoryItemId,
          inventoryItem: { userId: params.actorUserId },
        },
      },
    },
    select: {
      id: true,
      version: true,
      initiatorUserId: true,
      peerUserId: true,
      exchange: { select: { name: true } },
    },
  });

  let cancelledCount = 0;
  for (const t of trades) {
    const updated = await db.trade.updateMany({
      where: {
        id: t.id,
        version: t.version,
        status: { in: [TradeStatus.OFFER, TradeStatus.COUNTERED] },
        expiresAt: { gt: params.now },
      },
      data: {
        status: TradeStatus.REJECTED,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      continue;
    }
    cancelledCount += 1;
    const otherUserId =
      t.initiatorUserId === params.actorUserId ? t.peerUserId : t.initiatorUserId;
    scheduleTradeNotifications({
      baseUrl: params.baseUrl,
      kind: "listing_removed",
      exchangeId: params.exchangeId,
      exchangeName: t.exchange.name,
      tradeId: t.id,
      actorUserId: params.actorUserId,
      initiatorUserId: t.initiatorUserId,
      peerUserId: t.peerUserId,
      listingRemovedRecipientUserId: otherUserId,
    });
  }

  return { cancelledCount };
}
