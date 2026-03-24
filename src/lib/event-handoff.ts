import { TradeCoralSide } from "@/generated/prisma/enums";

export function recipientUserIdForHandoff(
  side: TradeCoralSide,
  trade: { initiatorUserId: string; peerUserId: string },
): string {
  return side === TradeCoralSide.INITIATOR ? trade.peerUserId : trade.initiatorUserId;
}

/** Member who physically brings this coral to the event desk (pre handoff). */
export function bringsCoralUserId(
  side: TradeCoralSide,
  trade: { initiatorUserId: string; peerUserId: string },
): string {
  return side === TradeCoralSide.INITIATOR ? trade.initiatorUserId : trade.peerUserId;
}
