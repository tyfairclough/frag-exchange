import type { CoralListingMode } from "@/generated/prisma/enums";
import { CoralListingMode as CoralListingModeEnum, TradeCoralSide } from "@/generated/prisma/enums";

/** Listing modes that may require shipping (post leg). */
export function listingModeAllowsPost(mode: CoralListingMode): boolean {
  return mode === CoralListingModeEnum.POST || mode === CoralListingModeEnum.BOTH;
}

export function listingModeIsMeetOnly(mode: CoralListingMode): boolean {
  return mode === CoralListingModeEnum.MEET;
}

type TradeCoralLine = {
  side: (typeof TradeCoralSide)[keyof typeof TradeCoralSide];
  coral: { name: string; listingMode: CoralListingMode };
};

/**
 * Group exchange, approved trade: whether the viewer should see the counterparty's postal address
 * so they can ship their outgoing corals that allow post.
 */
export function groupTradeRevealCounterpartyPostalAddress(
  viewerId: string,
  trade: { initiatorUserId: string; peerUserId: string },
  lines: TradeCoralLine[],
): boolean {
  const initiatorGivesPost = lines
    .filter((l) => l.side === TradeCoralSide.INITIATOR)
    .some((l) => listingModeAllowsPost(l.coral.listingMode));

  const peerGivesPost = lines
    .filter((l) => l.side === TradeCoralSide.PEER)
    .some((l) => listingModeAllowsPost(l.coral.listingMode));

  if (viewerId === trade.initiatorUserId) {
    return initiatorGivesPost;
  }
  if (viewerId === trade.peerUserId) {
    return peerGivesPost;
  }
  return false;
}

export function groupTradeMeetEligibleCoralNames(lines: TradeCoralLine[]): string[] {
  return lines
    .filter((l) => listingModeIsMeetOnly(l.coral.listingMode) || l.coral.listingMode === CoralListingModeEnum.BOTH)
    .map((l) => l.coral.name);
}

export function groupTradePostEligibleCoralNamesForViewer(
  viewerId: string,
  trade: { initiatorUserId: string; peerUserId: string },
  lines: TradeCoralLine[],
): string[] {
  if (viewerId === trade.initiatorUserId) {
    return lines
      .filter((l) => l.side === TradeCoralSide.INITIATOR && listingModeAllowsPost(l.coral.listingMode))
      .map((l) => l.coral.name);
  }
  if (viewerId === trade.peerUserId) {
    return lines
      .filter((l) => l.side === TradeCoralSide.PEER && listingModeAllowsPost(l.coral.listingMode))
      .map((l) => l.coral.name);
  }
  return [];
}

export function formatUserAddressLines(addr: {
  line1: string;
  line2: string | null;
  town: string;
  region: string | null;
  postalCode: string;
  countryCode: string;
}): string[] {
  const lines = [addr.line1];
  if (addr.line2?.trim()) {
    lines.push(addr.line2.trim());
  }
  const townLine = [addr.town, addr.region].filter(Boolean).join(", ");
  lines.push(townLine);
  lines.push(`${addr.postalCode} ${addr.countryCode}`.trim());
  return lines;
}
