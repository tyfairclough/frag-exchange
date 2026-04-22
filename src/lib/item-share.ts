import { InventoryKind } from "@/generated/prisma/enums";

export function buildSharedItemPath(exchangeId: string, itemId: string): string {
  return `/shared/exchanges/${encodeURIComponent(exchangeId)}/items/${encodeURIComponent(itemId)}`;
}

export function getShareItemTypeLabel(kind: InventoryKind): string {
  switch (kind) {
    case InventoryKind.CORAL:
      return "coral";
    case InventoryKind.FISH:
      return "marine fish";
    default:
      return "aquarium gear";
  }
}

export function buildShareMessage(params: {
  kind: InventoryKind;
  itemName: string;
  exchangeName: string;
  description?: string | null;
}): string {
  const description = params.description?.trim();
  const messageLines = [
    `I am sharing this ${getShareItemTypeLabel(params.kind)} on the swap site REEFxCHANGE, check it out 🐠`,
    `${params.itemName} on the ${params.exchangeName} exchange`,
    ...(description ? [description] : []),
    "www.reefx.net",
  ];
  return messageLines.join("\n");
}

export function buildShareLinks(params: {
  message: string;
  absoluteUrl: string;
}): { whatsapp: string; facebook: string; band: string } {
  const text = `${params.message} ${params.absoluteUrl}`.trim();
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(params.absoluteUrl);
  return {
    whatsapp: `https://wa.me/?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(params.message)}`,
    band: `https://band.us/plugin/share?body=${encodedText}&route=${encodedUrl}`,
  };
}
