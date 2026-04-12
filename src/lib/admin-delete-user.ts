import { CoralProfileStatus, TradeStatus } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";
import { listingExpiresAtFrom } from "@/lib/listing-duration";

export type TradeCancelNotifyRecipient = {
  email: string;
  exchangeNames: string[];
};

/**
 * Super-admin user deletion: reassigns Restrict FKs, reverses approved-trade inventory
 * for counterparties, deletes trades involving the target, then deletes the user.
 * Returns recipients who should be emailed about cancelled trades (deduped per user).
 */
export async function adminDeleteUserAndCollectNotifyRecipients(
  db: PrismaClient,
  params: { targetUserId: string; actorUserId: string },
): Promise<TradeCancelNotifyRecipient[]> {
  const { targetUserId, actorUserId } = params;
  const now = new Date();

  return db.$transaction(async (tx) => {
    await tx.exchange.updateMany({
      where: { createdById: targetUserId },
      data: { createdById: actorUserId },
    });

    await tx.exchangeInvite.updateMany({
      where: { invitedById: targetUserId },
      data: { invitedById: actorUserId },
    });

    const trades = await tx.trade.findMany({
      where: {
        OR: [{ initiatorUserId: targetUserId }, { peerUserId: targetUserId }],
      },
      select: {
        id: true,
        status: true,
        initiatorUserId: true,
        peerUserId: true,
        exchangeId: true,
        exchange: { select: { name: true } },
        inventoryLines: {
          select: {
            inventoryItem: {
              select: {
                id: true,
                userId: true,
                remainingQuantity: true,
                profileStatus: true,
              },
            },
          },
        },
      },
    });

    const notifyByUser = new Map<string, Set<string>>();
    for (const t of trades) {
      const other =
        t.initiatorUserId === targetUserId ? t.peerUserId : t.initiatorUserId;
      let set = notifyByUser.get(other);
      if (!set) {
        set = new Set();
        notifyByUser.set(other, set);
      }
      set.add(t.exchange.name);
    }

    for (const t of trades) {
      if (t.status !== TradeStatus.APPROVED) {
        continue;
      }
      for (const line of t.inventoryLines) {
        const item = line.inventoryItem;
        if (item.userId === targetUserId) {
          continue;
        }

        const newQty = item.remainingQuantity + 1;
        const newStatus =
          item.profileStatus === CoralProfileStatus.TRADED && newQty > 0
            ? CoralProfileStatus.UNLISTED
            : item.profileStatus;

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            remainingQuantity: newQty,
            profileStatus: newStatus,
          },
        });

        if (newStatus === CoralProfileStatus.UNLISTED && newQty > 0) {
          const existing = await tx.exchangeListing.findUnique({
            where: {
              exchangeId_inventoryItemId: {
                exchangeId: t.exchangeId,
                inventoryItemId: item.id,
              },
            },
          });
          if (!existing) {
            await tx.exchangeListing.create({
              data: {
                exchangeId: t.exchangeId,
                inventoryItemId: item.id,
                listedAt: now,
                expiresAt: listingExpiresAtFrom(now),
              },
            });
          }
        }
      }
    }

    await tx.trade.deleteMany({
      where: {
        OR: [{ initiatorUserId: targetUserId }, { peerUserId: targetUserId }],
      },
    });

    await tx.user.delete({ where: { id: targetUserId } });

    const otherIds = [...notifyByUser.keys()];
    if (otherIds.length === 0) {
      return [];
    }

    const users = await tx.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    const out: TradeCancelNotifyRecipient[] = [];
    for (const [userId, names] of notifyByUser) {
      const email = emailById.get(userId);
      if (!email) {
        continue;
      }
      out.push({
        email,
        exchangeNames: [...names].sort((a, b) => a.localeCompare(b)),
      });
    }
    out.sort((a, b) => a.email.localeCompare(b.email));
    return out;
  });
}
