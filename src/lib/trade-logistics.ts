import type { CoralListingMode } from "@/generated/prisma/enums";
import { CoralListingMode as CoralListingModeEnum, TradeLineSide } from "@/generated/prisma/enums";

type TradeInventoryLineRow = {
  side: (typeof TradeLineSide)[keyof typeof TradeLineSide];
  inventoryItem: { name: string; listingMode: CoralListingMode };
};

function listingModeAllowsPost(mode: CoralListingMode): boolean {
  return mode === CoralListingModeEnum.POST || mode === CoralListingModeEnum.BOTH;
}

function listingModeIsMeetOnly(mode: CoralListingMode): boolean {
  return mode === CoralListingModeEnum.MEET;
}

/**
 * For an approved group trade, true when the initiator has at least one outgoing line that allows post,
 * so they can ship their outgoing items that allow post.
 */
export function groupTradeInitiatorNeedsShippingAddress(lines: TradeInventoryLineRow[]): boolean {
  return lines
    .filter((l) => l.side === TradeLineSide.INITIATOR)
    .some((l) => listingModeAllowsPost(l.inventoryItem.listingMode));
}

export function groupTradePeerNeedsShippingAddress(lines: TradeInventoryLineRow[]): boolean {
  return lines
    .filter((l) => l.side === TradeLineSide.PEER)
    .some((l) => listingModeAllowsPost(l.inventoryItem.listingMode));
}

export function groupTradeMeetEligibleItemNames(lines: TradeInventoryLineRow[]): string[] {
  return lines
    .filter(
      (l) =>
        listingModeIsMeetOnly(l.inventoryItem.listingMode) ||
        l.inventoryItem.listingMode === CoralListingModeEnum.BOTH,
    )
    .map((l) => l.inventoryItem.name);
}

export function groupTradePostInitiatorItemNames(lines: TradeInventoryLineRow[]): string[] {
  return lines
    .filter((l) => l.side === TradeLineSide.INITIATOR && listingModeAllowsPost(l.inventoryItem.listingMode))
    .map((l) => l.inventoryItem.name);
}

export function groupTradePostPeerItemNames(lines: TradeInventoryLineRow[]): string[] {
  return lines
    .filter((l) => l.side === TradeLineSide.PEER && listingModeAllowsPost(l.inventoryItem.listingMode))
    .map((l) => l.inventoryItem.name);
}

/** Names of items the viewer is sending that allow post (for counterparty address reveal). */
export function groupTradePostEligibleCoralNamesForViewer(
  viewerId: string,
  trade: { initiatorUserId: string; peerUserId: string },
  lines: TradeInventoryLineRow[],
): string[] {
  const side =
    viewerId === trade.initiatorUserId
      ? TradeLineSide.INITIATOR
      : viewerId === trade.peerUserId
        ? TradeLineSide.PEER
        : null;
  if (!side) return [];
  return lines
    .filter((l) => l.side === side && listingModeAllowsPost(l.inventoryItem.listingMode))
    .map((l) => l.inventoryItem.name);
}

export function groupTradeRevealCounterpartyPostalAddress(
  viewerId: string,
  trade: { initiatorUserId: string; peerUserId: string },
  lines: TradeInventoryLineRow[],
): boolean {
  return groupTradePostEligibleCoralNamesForViewer(viewerId, trade, lines).length > 0;
}

export function formatUserAddressLines(address: {
  line1: string;
  line2: string | null;
  town: string;
  region: string | null;
  postalCode: string;
  countryCode: string;
}): string[] {
  const lines: string[] = [address.line1.trim()];
  if (address.line2?.trim()) {
    lines.push(address.line2.trim());
  }
  const townParts = [address.town.trim(), address.region?.trim()].filter(Boolean);
  if (townParts.length) {
    lines.push(townParts.join(", "));
  }
  lines.push(`${address.postalCode.trim()} ${address.countryCode.trim()}`.trim());
  return lines;
}

/** @deprecated use groupTradeMeetEligibleItemNames */
export const groupTradeMeetEligibleCoralNames = groupTradeMeetEligibleItemNames;
