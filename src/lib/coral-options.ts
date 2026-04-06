/** Allowed coral taxonomy and colour values (inventory form + server validation). */

export const CORAL_TYPES = ["Soft", "LPS", "SPS"] as const;
export type CoralTypeOption = (typeof CORAL_TYPES)[number];

/** Colours shown in explore filters and the add/edit coral form. */
export const CORAL_COLOURS = [
  "Rainbow",
  "Multi-colour",
  "Black",
  "Blue",
  "Brown",
  "Cream",
  "Gold",
  "Green",
  "Grey",
  "Orange",
  "Pink",
  "Purple",
  "Red",
  "Tan",
  "White",
  "Yellow",
] as const;
export type CoralColourOption = (typeof CORAL_COLOURS)[number];

/**
 * Legacy palette values still accepted when reading stored listings / URLs.
 * Do not add new UI for these.
 */
export const DEPRECATED_CORAL_COLOURS = [
  "Metallic blue",
  "Metallic bronze",
  "Metallic copper",
  "Metallic gold",
  "Metallic green",
  "Metallic orange",
  "Metallic pink",
  "Metallic purple",
  "Metallic red",
  "Metallic silver",
  "Metallic yellow",
] as const;

const KNOWN_CORAL_COLOURS = [...CORAL_COLOURS, ...DEPRECATED_CORAL_COLOURS] as const;

const TYPE_BY_LOWER = new Map(CORAL_TYPES.map((t) => [t.toLowerCase(), t]));
const COLOUR_BY_LOWER = new Map(KNOWN_CORAL_COLOURS.map((c) => [c.toLowerCase(), c]));

export function isActiveCoralColour(value: string): boolean {
  return (CORAL_COLOURS as readonly string[]).includes(value);
}

/** Strict parse for form/API: empty → null, unknown → null. */
export function parseCoralTypeFromForm(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return TYPE_BY_LOWER.get(t.toLowerCase()) ?? null;
}

export function parseCoralColourFromForm(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return COLOUR_BY_LOWER.get(t.toLowerCase()) ?? null;
}

/** Map stored DB text to a select value; legacy free text → "". */
export function coralTypeToFormValue(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  return parseCoralTypeFromForm(stored) ?? "";
}

export function coralColourToFormValue(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  return parseCoralColourFromForm(stored) ?? "";
}

function fuzzyCoralType(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  const exact = parseCoralTypeFromForm(text);
  if (exact) return exact;
  const lower = text.toLowerCase();
  if (/\bsoft\b/.test(lower) || /soft\s*coral/.test(lower)) return "Soft";
  if (/\blps\b/.test(lower)) return "LPS";
  if (/\bsps\b/.test(lower)) return "SPS";
  return "";
}

function fuzzyColour(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  const exact = parseCoralColourFromForm(text);
  if (exact) return exact;
  const lower = text.toLowerCase();
  if (lower.includes("rainbow")) return "Rainbow";
  if (
    lower.includes("multi-colour") ||
    lower.includes("multicolour") ||
    lower.includes("multi-color") ||
    lower.includes("multicolor") ||
    (lower.includes("multi") && lower.includes("color"))
  ) {
    return "Multi-colour";
  }
  const sorted = [...KNOWN_CORAL_COLOURS].sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    if (lower.includes(c.toLowerCase())) return c;
  }
  return "";
}

/** Best-effort map from AI or legacy text to a single allowed type. */
export function coerceAiCoralType(coralType: string | null | undefined): string | null {
  const v = fuzzyCoralType(coralType);
  return v || null;
}

export function coerceAiColour(colour: string | null | undefined): string | null {
  const v = fuzzyColour(colour);
  return v || null;
}
