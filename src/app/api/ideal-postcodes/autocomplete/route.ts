import { NextResponse } from "next/server";

type AutocompleteSuggestion = {
  id: string;
  suggestion: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function firstString(rec: Record<string, unknown> | null, keys: string[]): string {
  if (!rec) return "";
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extractHits(data: unknown): unknown[] {
  const root = asRecord(data);
  if (!root) return [];

  const result = asRecord(root.result);
  const candidate = (result?.hits ?? result?.suggestions ?? root.hits ?? root.suggestions) as unknown;
  return Array.isArray(candidate) ? candidate : [];
}

function parseQuery(req: Request): string {
  const url = new URL(req.url);
  return (url.searchParams.get("query") ?? url.searchParams.get("q") ?? "").trim();
}

export async function GET(req: Request) {
  const query = parseQuery(req);
  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.FRAG_IDEAL_POSTCODES_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "ideal-postcodes-missing-api-key" }, { status: 500 });
  }

  const idealUrl = new URL("https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses");
  idealUrl.searchParams.set("api_key", apiKey);
  idealUrl.searchParams.set("query", query);

  let res: Response;
  try {
    res = await fetch(idealUrl.toString(), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "ideal-postcodes-autocomplete-network-failed" }, { status: 500 });
  }

  if (!res.ok) {
    // Keep error details generic to avoid leaking upstream response bodies.
    return NextResponse.json({ error: "ideal-postcodes-autocomplete-failed" }, { status: res.status });
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const asArray = extractHits(data);

  const suggestions: AutocompleteSuggestion[] = asArray
    .map((h): AutocompleteSuggestion => {
      const rec = asRecord(h);
      const id = firstString(rec, ["id", "udprn"]);
      const suggestion = firstString(rec, ["suggestion", "address", "label"]);
      return { id, suggestion };
    })
    .filter((s) => s.id);

  return NextResponse.json({ suggestions });
}

