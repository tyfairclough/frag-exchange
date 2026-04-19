import { InventoryKind, ListingIntent } from "@/generated/prisma/enums";

export function isKindAllowedOnExchange(
  kind: InventoryKind,
  allowed: { allowCoral: boolean; allowFish: boolean; allowEquipment: boolean; allowItemsForSale?: boolean },
  listingIntent?: ListingIntent,
) {
  if (listingIntent === ListingIntent.FOR_SALE) {
    if (!allowed.allowItemsForSale) return false;
    if (kind === InventoryKind.EQUIPMENT) return false;
  }
  if (kind === InventoryKind.CORAL) return allowed.allowCoral;
  if (kind === InventoryKind.FISH) return allowed.allowFish;
  return allowed.allowEquipment;
}
