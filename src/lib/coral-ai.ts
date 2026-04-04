/**
 * Coral AI enrichment — single boundary for photo + name → suggested fields.
 * Stub when no provider key; optional OpenAI JSON when OPENAI_API_KEY is set.
 * Vision from imageUrl is not wired yet; the contract accepts it for a future provider.
 */

import { coerceAiColour, coerceAiCoralType } from "@/lib/coral-options";

export type CoralAiEnrichmentInput = {
  name: string;
  /** Optional public URL; reserved for future vision / image understanding. */
  imageUrl?: string | null;
};

export type CoralAiEnrichmentResult = {
  description: string;
  /** Values aligned with inventory dropdowns when a match is found. */
  coralType: string | null;
  colour: string | null;
  source: "openai" | "stub";
};

export type CoralAiVisionInput = {
  /** Raw base64 (no data: prefix). */
  imageBase64: string;
  mimeType: string;
};

export type CoralAiVisionResult = {
  name: string | null;
  description: string;
  coralType: string | null;
  colour: string | null;
  source: "openai" | "stub";
};

function stubEnrichment(name: string): CoralAiEnrichmentResult {
  const trimmed = name.trim();
  const title = trimmed ? trimmed.slice(0, 1).toUpperCase() + trimmed.slice(1) : "Coral";
  return {
    description: `${title}: hobbyist coral listing on REEFX. Add care notes, origin, and what you are looking for in a swap.`,
    coralType: null,
    colour: null,
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
            "You help reef hobbyists describe corals for a swap site. Reply with JSON only: {\"description\": string (2-4 sentences, practical), \"coralType\": string|null (Soft, LPS, or SPS when inferable), \"colour\": string|null (a short colour phrase: base colour, metallic, rainbow, multi-colour, etc.)}. Use null when unsure.",
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
    colour: coerceAiColour(typeof parsed.colour === "string" ? parsed.colour.trim() || null : null),
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
    name: null,
    description: "",
    coralType: null,
    colour: null,
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
            "You identify reef aquarium corals from photos for a hobbyist swap site. Reply with JSON only: {\"name\": string|null (short common name, e.g. species or trade name; null if unsure), \"description\": string (2-4 practical sentences: appearance, care hints, swap context), \"coralType\": string|null (exactly one of: Soft, LPS, SPS when inferable), \"colour\": string|null (short phrase: base colour, metallic, rainbow, multi-colour, etc.)}. Use null when unsure.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify this coral from the image and fill the JSON fields.",
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
    name?: string | null;
    description?: string;
    coralType?: string | null;
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

  const nameRaw = typeof parsed.name === "string" ? parsed.name.trim() || null : null;

  return {
    name: nameRaw && nameRaw.length > 120 ? nameRaw.slice(0, 120) : nameRaw,
    description,
    coralType: coerceAiCoralType(
      typeof parsed.coralType === "string" ? parsed.coralType.trim() || null : null,
    ),
    colour: coerceAiColour(typeof parsed.colour === "string" ? parsed.colour.trim() || null : null),
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
