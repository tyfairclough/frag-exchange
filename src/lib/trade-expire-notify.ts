import { TradeStatus } from "@/generated/prisma/enums";
import type { getPrisma } from "@/lib/db";
import { scheduleTradeNotifications } from "@/lib/notifications/trade-events";

type Db = ReturnType<typeof getPrisma>;

/**
 * Marks overdue pending trades expired and notifies each party at most once (see `expiredNotifiedAt`).
 */
export async function expireDueTradesAndNotify(
  db: Db,
  params: {
    baseUrl: string;
    now: Date;
    exchangeId?: string;
    tradeIds?: string[];
  },
): Promise<{ expiredTradeCount: number }> {
  const whereBase = {
    status: { in: [TradeStatus.OFFER, TradeStatus.COUNTERED] },
    expiresAt: { lte: params.now },
    ...(params.exchangeId ? { exchangeId: params.exchangeId } : {}),
    ...(params.tradeIds?.length ? { id: { in: params.tradeIds } } : {}),
  };

  const due = await db.trade.findMany({
    where: whereBase,
    select: {
      id: true,
      exchangeId: true,
      initiatorUserId: true,
      peerUserId: true,
      exchange: { select: { name: true } },
    },
  });

  if (due.length === 0) {
    return { expiredTradeCount: 0 };
  }

  await db.trade.updateMany({
    where: { id: { in: due.map((t) => t.id) } },
    data: { status: TradeStatus.EXPIRED },
  });

  const now = params.now;
  for (const t of due) {
    const stamped = await db.trade.updateMany({
      where: { id: t.id, expiredNotifiedAt: null },
      data: { expiredNotifiedAt: now },
    });
    if (stamped.count !== 1) {
      continue;
    }
    scheduleTradeNotifications({
      baseUrl: params.baseUrl,
      kind: "expired",
      exchangeId: t.exchangeId,
      exchangeName: t.exchange.name,
      tradeId: t.id,
      initiatorUserId: t.initiatorUserId,
      peerUserId: t.peerUserId,
    });
  }

  return { expiredTradeCount: due.length };
}

/** After a single trade is set to EXPIRED (e.g. in a server action), record notify once. */
export async function stampExpiredAndNotifyIfNeeded(
  db: Db,
  params: { baseUrl: string; tradeId: string; now: Date },
): Promise<void> {
  const t = await db.trade.findUnique({
    where: { id: params.tradeId },
    select: {
      id: true,
      status: true,
      exchangeId: true,
      initiatorUserId: true,
      peerUserId: true,
      expiredNotifiedAt: true,
      exchange: { select: { name: true } },
    },
  });

  if (!t || t.status !== TradeStatus.EXPIRED || t.expiredNotifiedAt) {
    return;
  }

  const stamped = await db.trade.updateMany({
    where: { id: t.id, expiredNotifiedAt: null },
    data: { expiredNotifiedAt: params.now },
  });

  if (stamped.count !== 1) {
    return;
  }

  scheduleTradeNotifications({
    baseUrl: params.baseUrl,
    kind: "expired",
    exchangeId: t.exchangeId,
    exchangeName: t.exchange.name,
    tradeId: t.id,
    initiatorUserId: t.initiatorUserId,
    peerUserId: t.peerUserId,
  });
}
