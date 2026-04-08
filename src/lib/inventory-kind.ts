import { InventoryKind } from "@/generated/prisma/enums";

const KIND_VALUES: InventoryKind[] = ["CORAL", "FISH", "EQUIPMENT"];

export function parseInventoryKind(raw: string | null | undefined): InventoryKind | null {
  const t = (raw ?? "").trim().toUpperCase();
  if (!t) return null;
  return (KIND_VALUES as string[]).includes(t) ? (t as InventoryKind) : null;
}
