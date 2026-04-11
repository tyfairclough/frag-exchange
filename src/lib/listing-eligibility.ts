import { InventoryKind } from "@/generated/prisma/enums";

export function isKindAllowedOnExchange(
  kind: InventoryKind,
  allowed: { allowCoral: boolean; allowFish: boolean; allowEquipment: boolean },
) {
  if (kind === InventoryKind.CORAL) return allowed.allowCoral;
  if (kind === InventoryKind.FISH) return allowed.allowFish;
  return allowed.allowEquipment;
}
