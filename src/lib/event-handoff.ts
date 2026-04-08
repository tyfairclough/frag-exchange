import { TradeLineSide } from "@/generated/prisma/enums";

export function recipientUserIdForHandoff(
  side: TradeLineSide,
  trade: { initiatorUserId: string; peerUserId: string },
): string {
  return side === TradeLineSide.INITIATOR ? trade.peerUserId : trade.initiatorUserId;
}

/** Member who physically brings this item to the event desk (pre handoff). */
export function bringsItemUserId(
  side: TradeLineSide,
  trade: { initiatorUserId: string; peerUserId: string },
): string {
  return side === TradeLineSide.INITIATOR ? trade.initiatorUserId : trade.peerUserId;
}

/** @deprecated use bringsItemUserId */
export const bringsCoralUserId = bringsItemUserId;
