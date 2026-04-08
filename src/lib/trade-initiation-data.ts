import { notFound } from "next/navigation";
import { CoralProfileStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { canViewExchangeDirectory } from "@/lib/super-admin";

export const tradeInitiationErrors: Record<string, string> = {
  "receive-required": "Choose at least one item in You receive.",
  "offer-required": "Add at least one item in You offer unless everything you receive is free to good home.",
  self: "You cannot trade with yourself.",
  membership: "Both people must be members of this exchange.",
  coral: "One or more items are no longer available.",
  listing: "One or more items are no longer actively listed.",
};

export async function loadTradeInitiationContext(
  exchangeId: string,
  viewer: { id: string; [k: string]: unknown },
  peerUserId: string,
) {
  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: { in: [viewer.id, peerUserId] } },
      },
    },
  });
  if (!exchange) {
    notFound();
  }
  const viewerMembership = exchange.memberships.find((m) => m.userId === viewer.id) ?? null;
  const peerMembership = exchange.memberships.find((m) => m.userId === peerUserId) ?? null;
  if (!canViewExchangeDirectory(exchange, viewerMembership, viewer as never) || !viewerMembership || !peerMembership) {
    notFound();
  }

  const peer = await getPrisma().user.findUnique({
    where: { id: peerUserId },
    select: { id: true, alias: true, avatarEmoji: true },
  });
  if (!peer) {
    notFound();
  }

  const now = new Date();
  const [myRows, theirRows] = await Promise.all([
    getPrisma().exchangeListing.findMany({
      where: {
        exchangeId,
        expiresAt: { gt: now },
        inventoryItem: { userId: viewer.id, profileStatus: CoralProfileStatus.UNLISTED },
      },
      include: { inventoryItem: true },
      orderBy: { listedAt: "desc" },
    }),
    getPrisma().exchangeListing.findMany({
      where: {
        exchangeId,
        expiresAt: { gt: now },
        inventoryItem: { userId: peerUserId, profileStatus: CoralProfileStatus.UNLISTED },
      },
      include: { inventoryItem: true },
      orderBy: { listedAt: "desc" },
    }),
  ]);

  return { exchange, peer, myRows, theirRows };
}
