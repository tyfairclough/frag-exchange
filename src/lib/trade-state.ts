import { TradeStatus } from "@/generated/prisma/enums";

/** After initiator proposes: peer acts. After peer counters: initiator acts. */
export function tradeResponderUserId(trade: {
  status: TradeStatus;
  initiatorUserId: string;
  peerUserId: string;
}): string | null {
  if (trade.status === TradeStatus.OFFER) {
    return trade.peerUserId;
  }
  if (trade.status === TradeStatus.COUNTERED) {
    return trade.initiatorUserId;
  }
  return null;
}

export function isTradePending(trade: { status: TradeStatus }): boolean {
  return trade.status === TradeStatus.OFFER || trade.status === TradeStatus.COUNTERED;
}

export function nextStatusAfterCounter(current: TradeStatus): TradeStatus {
  return current === TradeStatus.OFFER ? TradeStatus.COUNTERED : TradeStatus.OFFER;
}
