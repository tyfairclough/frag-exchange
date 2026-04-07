import { EquipmentCategory, EquipmentCondition } from "@/generated/prisma/enums";

export const EQUIPMENT_CATEGORY_VALUES = Object.values(EquipmentCategory) as EquipmentCategory[];
export const EQUIPMENT_CONDITION_VALUES = Object.values(EquipmentCondition) as EquipmentCondition[];

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  LIGHTS: "Lights",
  PUMPS: "Pumps",
  MONITORS_CONTROLLERS: "Monitors & Controllers",
  FILTRATION: "Filtration",
  DOSING: "Dosing",
  OTHER: "Other",
};

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  LIKE_NEW: "Like new",
  GOOD_CONDITION: "Good condition",
  WORKING: "Working",
  SPARES_REPAIRS: "Spares & Repairs",
};

const CATEGORY_BY_LOWER = new Map(
  EQUIPMENT_CATEGORY_VALUES.map((k) => [k.toLowerCase(), k]),
);
const CONDITION_BY_LOWER = new Map(
  EQUIPMENT_CONDITION_VALUES.map((k) => [k.toLowerCase(), k]),
);

/** Strict parse for form/API: empty → null, unknown → null. */
export function parseEquipmentCategoryFromForm(raw: string): EquipmentCategory | null {
  const t = raw.trim();
  if (!t) return null;
  return CATEGORY_BY_LOWER.get(t.toLowerCase()) ?? null;
}

export function parseEquipmentConditionFromForm(raw: string): EquipmentCondition | null {
  const t = raw.trim();
  if (!t) return null;
  return CONDITION_BY_LOWER.get(t.toLowerCase()) ?? null;
}

export function equipmentCategoryToFormValue(stored: EquipmentCategory | null | undefined): string {
  return stored ?? "";
}

export function equipmentConditionToFormValue(stored: EquipmentCondition | null | undefined): string {
  return stored ?? "";
}
