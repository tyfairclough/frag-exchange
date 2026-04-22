/**
 * Defaults and DB-backed overrides for OpenAI system prompts (inventory import + coral listing AI).
 * NDJSON prompts may include {{FIELDS_HINT}}; it is replaced at runtime with NDJSON_FIELDS_HINT.
 */

import { getPrisma } from "@/lib/db";

/** Canonical JSON-shape hint for NDJSON inventory lines (must stay aligned with ParsedCandidate). */
export const NDJSON_FIELDS_HINT =
  '{"title":string,"snippet":string,"kind":"CORAL"|"FISH"|"IGNORE","confidence":number,"name":string,"description":string,"imageUrl":string|null,"coralType":string|null,"colours":string[],"species":string|null,"reefSafe":boolean|null,"salePriceMinor":number|null,"saleCurrencyCode":string|null,"saleExternalUrl":string|null}';

export const AI_SYSTEM_PROMPT_KEYS = [
  "inventory_discover_detail_links",
  "inventory_parse_listing_json",
  "inventory_parse_detail_json",
  "inventory_stream_listing_ndjson",
  "inventory_stream_detail_ndjson",
  "coral_enrichment_from_name",
  "coral_photo_colours",
  "inventory_listing_vision",
] as const;

export type AiSystemPromptKey = (typeof AI_SYSTEM_PROMPT_KEYS)[number];

export const AI_SYSTEM_PROMPT_MAX_CHARS = 64_000;

const INVENTORY_NDJSON_KEYS = new Set<AiSystemPromptKey>([
  "inventory_stream_listing_ndjson",
  "inventory_stream_detail_ndjson",
]);

export const AI_SYSTEM_PROMPT_DEFAULTS: Record<AiSystemPromptKey, string> = {
  inventory_discover_detail_links:
    'You are analysing a retail directory/listing page from an aquarium shop. From ANCHOR_CANDIDATES, return only the hrefs that link to an individual product detail page for one fish or one coral species/frag. Exclude category, navigation, pagination, filter, tag, account, cart, search, blog, and policy links. Output JSON only: {"detailUrls":string[]}. Each entry MUST be copied verbatim from ANCHOR_CANDIDATES — never invent, modify, or append parameters. Return an empty array if nothing looks like a product detail link.',

  inventory_parse_listing_json:
    'Extract retail listing items from page text. If IMAGE_URLS_FOUND_IN_HTML is present, each item imageUrl must be copied exactly from that list (the best match for that row\'s product image) or null — do not invent URLs. For each grid/listing row, set saleExternalUrl to the product detail page URL when clearly present in the row/snippet, otherwise null. Return JSON only: {"items":[{"title":string,"snippet":string,"kind":"CORAL"|"FISH"|"IGNORE","confidence":number,"name":string,"description":string,"imageUrl":string|null,"coralType":string|null,"colours":string[],"species":string|null,"reefSafe":boolean|null,"salePriceMinor":number|null,"saleCurrencyCode":string|null,"saleExternalUrl":string|null}]}. Include only likely individual listing rows/cards from this page.',

  inventory_parse_detail_json:
    'This is a single product detail page. Extract at most one primary retail item. If IMAGE_URLS_FOUND_IN_HTML is present, imageUrl must be copied exactly from that list or null. Set saleExternalUrl to this page URL. Return JSON only: {"items":[{"title":string,"snippet":string,"kind":"CORAL"|"FISH"|"IGNORE","confidence":number,"name":string,"description":string,"imageUrl":string|null,"coralType":string|null,"colours":string[],"species":string|null,"reefSafe":boolean|null,"salePriceMinor":number|null,"saleCurrencyCode":string|null,"saleExternalUrl":string|null}]} — use an empty items array if there is no clear product.',

  inventory_stream_listing_ndjson: `Extract retail listing items from page text. If IMAGE_URLS_FOUND_IN_HTML is present, each item imageUrl must be copied exactly from that list (the best match for that row's product image) or null — do not invent URLs. For each grid/listing row, set saleExternalUrl to the product detail page URL when clearly present in the row/snippet, otherwise null.

Output format: JSON Lines (NDJSON). Emit exactly one {{FIELDS_HINT}} object per line. Each line must be one complete JSON object. Do not wrap in an array or outer object. No markdown code fences or commentary. Include only likely individual listing rows/cards from this page.`,

  inventory_stream_detail_ndjson: `This is a single product detail page. Extract at most one primary retail item. If IMAGE_URLS_FOUND_IN_HTML is present, imageUrl must be copied exactly from that list or null. Set saleExternalUrl to this page URL.

Output format: JSON Lines (NDJSON). Emit at most one line: a single {{FIELDS_HINT}} object. If there is no clear product, output zero lines (empty response). No markdown code fences.`,

  coral_enrichment_from_name:
    'You help reef hobbyists describe corals for a swap site. Reply with JSON only: {"description": string (2-4 sentences, practical), "coralType": string|null (Soft, LPS, or SPS when inferable), "colours": string[] (every distinct visible body/mouth/tip/skeleton colour you can name—use plain words like green, orange, purple; include metallic or rainbow when appropriate; empty array if unsure), "colour": string|null (optional legacy single summary—omit if you use colours)}. Prefer filling "colours" over "colour".',

  coral_photo_colours:
    'You describe visible colours in reef aquarium coral photos for a hobbyist swap site. Do not identify species, strain, or coral type. Reply with JSON only: {"colours": string[] (every distinct visible colour region: polyps, tips, base, mouth, skeleton—plain words like green, orange, purple; include metallic or rainbow when appropriate; empty array if unsure), "colour": string|null (optional legacy single summary—omit if you use colours)}.',

  inventory_listing_vision:
    'You classify reef-hobby listings from photos. Reply JSON only: {"itemKind":"CORAL"|"FISH"|"EQUIPMENT"|null, "name":string|null, "description":string, "coralType":string|null, "colours":string[], "colour":string|null, "species":string|null, "reefSafe":boolean|null, "equipmentCategory":string|null, "equipmentCondition":string|null}. Rules: For CORAL only—do not guess species, strain, or Soft/LPS/SPS; set name, description, and coralType to null; list every distinct visible colour region (polyps, tips, base, mouth, skeleton) in "colours" using plain words; empty array if unsure. For FISH—name is a common hobby listing title (max 120 chars); description 2-4 sentences; "colours" for body/fin/tip/marking colours; species binomial when confident; reefSafe when inferable. For EQUIPMENT—short product-style name; description 2-4 sentences; equipmentCategory and equipmentCondition; "colours" empty. Prefer "colours" over legacy "colour" for CORAL and FISH.',
};

export function expandInventoryNdjsonSystemPrompt(template: string): string {
  return template.replaceAll("{{FIELDS_HINT}}", NDJSON_FIELDS_HINT);
}

function resolveStoredContent(key: AiSystemPromptKey, raw: string): string {
  if (INVENTORY_NDJSON_KEYS.has(key)) {
    return expandInventoryNdjsonSystemPrompt(raw);
  }
  return raw;
}

/**
 * Effective system prompt for one key (DB override or code default; NDJSON keys expand {{FIELDS_HINT}}).
 */
export async function getAiSystemPrompt(key: AiSystemPromptKey): Promise<string> {
  const row = await getPrisma().aiSystemPrompt.findUnique({
    where: { key },
    select: { content: true },
  });
  const raw = row?.content ?? AI_SYSTEM_PROMPT_DEFAULTS[key];
  return resolveStoredContent(key, raw);
}

/**
 * Batch-load prompts in one query (e.g. per import job).
 */
export async function getAiSystemPrompts<K extends AiSystemPromptKey>(
  keys: readonly K[],
): Promise<Record<K, string>> {
  if (keys.length === 0) {
    return {} as Record<K, string>;
  }
  const rows = await getPrisma().aiSystemPrompt.findMany({
    where: { key: { in: [...keys] } },
    select: { key: true, content: true },
  });
  const byKey = new Map(rows.map((r) => [r.key as AiSystemPromptKey, r.content]));
  const out = {} as Record<K, string>;
  for (const k of keys) {
    const raw = byKey.get(k) ?? AI_SYSTEM_PROMPT_DEFAULTS[k];
    out[k] = resolveStoredContent(k, raw);
  }
  return out;
}

/** Code default only (for “reset” copy / labels). */
export function getAiSystemPromptDefault(key: AiSystemPromptKey): string {
  return AI_SYSTEM_PROMPT_DEFAULTS[key];
}

/** Stored override or code default for editing in admin (NDJSON templates keep {{FIELDS_HINT}}). */
export async function getAiSystemPromptStoredOrDefault(key: AiSystemPromptKey): Promise<string> {
  const row = await getPrisma().aiSystemPrompt.findUnique({
    where: { key },
    select: { content: true },
  });
  return row?.content ?? AI_SYSTEM_PROMPT_DEFAULTS[key];
}

export function labelForAiSystemPromptKey(key: AiSystemPromptKey): string {
  switch (key) {
    case "inventory_discover_detail_links":
      return "Discover product detail links (anchor picker)";
    case "inventory_parse_listing_json":
      return "Parse listing page (JSON)";
    case "inventory_parse_detail_json":
      return "Parse product detail page (JSON)";
    case "inventory_stream_listing_ndjson":
      return "Stream listing page (NDJSON)";
    case "inventory_stream_detail_ndjson":
      return "Stream product detail page (NDJSON)";
    case "coral_enrichment_from_name":
      return "Coral description from name";
    case "coral_photo_colours":
      return "Coral photo colours";
    case "inventory_listing_vision":
      return "Listing photo classification";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
