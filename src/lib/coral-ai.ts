/**
 * Coral / inventory AI enrichment — single boundary for photo + name → suggested fields.
 * Stub when no provider key; optional OpenAI JSON when OPENAI_API_KEY is set.
 */

import type { EquipmentCategory, EquipmentCondition, InventoryKind } from "@/generated/prisma/enums";
import {
  EquipmentCategory as EquipmentCategoryEnum,
  EquipmentCondition as EquipmentConditionEnum,
  InventoryKind as InventoryKindEnum,
} from "@/generated/prisma/enums";
import { coerceAiColours, coerceAiCoralType } from "@/lib/coral-options";

export type CoralAiEnrichmentInput = {
  name: string;
  /** Optional public URL; reserved for future vision / image understanding. */
  imageUrl?: string | null;
};

export type CoralAiEnrichmentResult = {
  description: string;
  /** Values aligned with inventory dropdowns when a match is found. */
  coralType: string | null;
  colours: string[];
  source: "openai" | "stub";
};

export type CoralAiVisionInput = {
  /** Raw base64 (no data: prefix). */
  imageBase64: string;
  mimeType: string;
};

export type CoralAiVisionResult = {
  colours: string[];
  source: "openai" | "stub";
};

function stubEnrichment(name: string): CoralAiEnrichmentResult {
  const trimmed = name.trim();
  const title = trimmed ? trimmed.slice(0, 1).toUpperCase() + trimmed.slice(1) : "Coral";
  return {
    description: `${title}: hobbyist coral listing on REEFX. Add care notes, origin, and what you are looking for in a swap.`,
    coralType: null,
    colours: [],
    source: "stub",
  };
}

async function openAiEnrichment(name: string): Promise<CoralAiEnrichmentResult | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const model = process.env.CORAL_AI_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You help reef hobbyists describe corals for a swap site. Reply with JSON only: {"description": string (2-4 sentences, practical), "coralType": string|null (Soft, LPS, or SPS when inferable), "colours": string[] (every distinct visible body/mouth/tip/skeleton colour you can name—use plain words like green, orange, purple; include metallic or rainbow when appropriate; empty array if unsure), "colour": string|null (optional legacy single summary—omit if you use colours)}. Prefer filling "colours" over "colour".',
        },
        {
          role: "user",
          content: `Coral name or label: ${name.trim() || "(unnamed)"}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  let parsed: {
    description?: string;
    coralType?: string | null;
    colours?: unknown;
    colour?: string | null;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }

  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
  if (!description) {
    return null;
  }

  return {
    description,
    coralType: coerceAiCoralType(
      typeof parsed.coralType === "string" ? parsed.coralType.trim() || null : null,
    ),
    colours: coerceAiColours(
      parsed.colours,
      typeof parsed.colour === "string" ? parsed.colour.trim() || null : null,
    ),
    source: "openai",
  };
}

export async function enrichCoralFields(input: CoralAiEnrichmentInput): Promise<CoralAiEnrichmentResult> {
  const name = input.name.trim();
  if (!name) {
    return stubEnrichment("");
  }

  const fromOpenAi = await openAiEnrichment(name);
  if (fromOpenAi) {
    return fromOpenAi;
  }

  return stubEnrichment(name);
}

function stubVision(): CoralAiVisionResult {
  return {
    colours: [],
    source: "stub",
  };
}

async function openAiVisionEnrichment(input: CoralAiVisionInput): Promise<CoralAiVisionResult | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const model = process.env.CORAL_AI_MODEL?.trim() || "gpt-4o-mini";
  const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You describe visible colours in reef aquarium coral photos for a hobbyist swap site. Do not identify species, strain, or coral type. Reply with JSON only: {"colours": string[] (every distinct visible colour region: polyps, tips, base, mouth, skeleton—plain words like green, orange, purple; include metallic or rainbow when appropriate; empty array if unsure), "colour": string|null (optional legacy single summary—omit if you use colours)}.',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "List the distinct visible colours in this photo.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  let parsed: {
    colours?: unknown;
    colour?: string | null;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }

  return {
    colours: coerceAiColours(
      parsed.colours,
      typeof parsed.colour === "string" ? parsed.colour.trim() || null : null,
    ),
    source: "openai",
  };
}

export async function enrichCoralFromImage(input: CoralAiVisionInput): Promise<CoralAiVisionResult> {
  const fromOpenAi = await openAiVisionEnrichment(input);
  if (fromOpenAi) {
    return fromOpenAi;
  }
  return stubVision();
}

// --- Multi-kind inventory vision (corals, fish, equipment) ---

export type InventoryAiVisionResult = {
  itemKind: InventoryKind | null;
  name: string | null;
  description: string;
  coralType: string | null;
  colours: string[];
  species: string | null;
  reefSafe: boolean | null;
  equipmentCategory: EquipmentCategory | null;
  equipmentCondition: EquipmentCondition | null;
  source: "openai" | "stub";
};

function coerceAiInventoryKind(raw: string | null | undefined): InventoryKind | null {
  if (!raw?.trim()) return null;
  const u = raw.trim().toUpperCase();
  if (u === "CORAL" || u === "FISH" || u === "EQUIPMENT") {
    return u as InventoryKind;
  }
  const lower = raw.trim().toLowerCase();
  if (lower.includes("coral")) return InventoryKindEnum.CORAL;
  if (lower.includes("fish")) return InventoryKindEnum.FISH;
  if (lower.includes("pump") || lower.includes("light") || lower.includes("equipment") || lower.includes("filter")) {
    return InventoryKindEnum.EQUIPMENT;
  }
  return null;
}

function coerceAiEquipmentCategory(raw: string | null | undefined): EquipmentCategory | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toLowerCase();
  if (/\blight/.test(t)) return EquipmentCategoryEnum.LIGHTS;
  if (/\bpump/.test(t)) return EquipmentCategoryEnum.PUMPS;
  if (/monitor|controller|apex|dos/i.test(t)) return EquipmentCategoryEnum.MONITORS_CONTROLLERS;
  if (/filter|skimmer|reactor|sump/i.test(t)) return EquipmentCategoryEnum.FILTRATION;
  if (/\bdos/i.test(t) || /dosing/.test(t)) return EquipmentCategoryEnum.DOSING;
  if (/other|misc|parts/i.test(t)) return EquipmentCategoryEnum.OTHER;
  return null;
}

function coerceAiEquipmentCondition(raw: string | null | undefined): EquipmentCondition | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toLowerCase();
  if (/like new|mint|excellent/i.test(t)) return EquipmentConditionEnum.LIKE_NEW;
  if (/good|great/i.test(t)) return EquipmentConditionEnum.GOOD_CONDITION;
  if (/work|functional|running/i.test(t)) return EquipmentConditionEnum.WORKING;
  if (/spare|repair|parts|as-?is/i.test(t)) return EquipmentConditionEnum.SPARES_REPAIRS;
  return null;
}

function stubInventoryVision(): InventoryAiVisionResult {
  return {
    itemKind: null,
    name: null,
    description: "",
    coralType: null,
    colours: [],
    species: null,
    reefSafe: null,
    equipmentCategory: null,
    equipmentCondition: null,
    source: "stub",
  };
}

async function openAiInventoryVision(input: CoralAiVisionInput): Promise<InventoryAiVisionResult | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const model = process.env.CORAL_AI_MODEL?.trim() || "gpt-4o-mini";
  const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You classify reef-hobby listings from photos. Reply JSON only: {"itemKind":"CORAL"|"FISH"|"EQUIPMENT"|null, "name":string|null, "description":string, "coralType":string|null, "colours":string[], "colour":string|null, "species":string|null, "reefSafe":boolean|null, "equipmentCategory":string|null, "equipmentCondition":string|null}. Rules: For CORAL only—do not guess species, strain, or Soft/LPS/SPS; set name, description, and coralType to null; list every distinct visible colour region (polyps, tips, base, mouth, skeleton) in "colours" using plain words; empty array if unsure. For FISH—name is a common hobby listing title (max 120 chars); description 2-4 sentences; "colours" for body/fin/tip/marking colours; species binomial when confident; reefSafe when inferable. For EQUIPMENT—short product-style name; description 2-4 sentences; equipmentCategory and equipmentCondition; "colours" empty. Prefer "colours" over legacy "colour" for CORAL and FISH.',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Classify this listing photo for a swap marketplace.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  let parsed: {
    itemKind?: string | null;
    name?: string | null;
    description?: string;
    coralType?: string | null;
    colours?: unknown;
    colour?: string | null;
    species?: string | null;
    reefSafe?: boolean | null;
    equipmentCategory?: string | null;
    equipmentCondition?: string | null;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }

  const itemKind = coerceAiInventoryKind(
    typeof parsed.itemKind === "string" ? parsed.itemKind : null,
  );

  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
  if (itemKind !== InventoryKindEnum.CORAL && !description) {
    return null;
  }

  const nameRaw = typeof parsed.name === "string" ? parsed.name.trim() || null : null;

  const reefSafe: boolean | null =
    typeof parsed.reefSafe === "boolean"
      ? parsed.reefSafe
      : null;

  const colours = coerceAiColours(
    parsed.colours,
    typeof parsed.colour === "string" ? parsed.colour.trim() || null : null,
  );

  if (itemKind === InventoryKindEnum.CORAL) {
    return {
      itemKind,
      name: null,
      description: "",
      coralType: null,
      colours,
      species: null,
      reefSafe: null,
      equipmentCategory: null,
      equipmentCondition: null,
      source: "openai",
    };
  }

  return {
    itemKind,
    name: nameRaw && nameRaw.length > 120 ? nameRaw.slice(0, 120) : nameRaw,
    description,
    coralType: coerceAiCoralType(
      typeof parsed.coralType === "string" ? parsed.coralType.trim() || null : null,
    ),
    colours,
    species:
      typeof parsed.species === "string"
        ? parsed.species.trim().slice(0, 200) || null
        : null,
    reefSafe,
    equipmentCategory:
      coerceAiEquipmentCategory(
        typeof parsed.equipmentCategory === "string" ? parsed.equipmentCategory : null,
      ) ?? null,
    equipmentCondition:
      coerceAiEquipmentCondition(
        typeof parsed.equipmentCondition === "string" ? parsed.equipmentCondition : null,
      ) ?? null,
    source: "openai",
  };
}

export async function enrichInventoryFromImage(input: CoralAiVisionInput): Promise<InventoryAiVisionResult> {
  const fromOpenAi = await openAiInventoryVision(input);
  if (fromOpenAi) {
    return fromOpenAi;
  }
  return stubInventoryVision();
}
