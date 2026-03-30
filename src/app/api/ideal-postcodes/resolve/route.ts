import { NextResponse } from "next/server";

type ResolvedAddress = {
  line1: string;
  line2: string;
  town: string;
  region: string;
  postalCode: string;
  countryCode: string;
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

function getResultObject(data: unknown): Record<string, unknown> | null {
  const root = asRecord(data);
  if (!root) return null;
  const result = asRecord(root.result);
  return result ?? root;
}

function getParam(req: Request, ...names: string[]): string {
  const url = new URL(req.url);
  for (const name of names) {
    const v = url.searchParams.get(name);
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export async function GET(req: Request) {
  const id = getParam(req, "id", "addressId");
  if (!id) {
    return NextResponse.json({ error: "missing-id" }, { status: 400 });
  }

  const apiKey = process.env.FRAG_IDEAL_POSTCODES_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "ideal-postcodes-missing-api-key" }, { status: 500 });
  }

  // UK format resolve endpoint.
  const idealUrl = new URL(`https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses/${encodeURIComponent(id)}/gbr`);
  idealUrl.searchParams.set("api_key", apiKey);

  const res = await fetch(idealUrl.toString(), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });

  if (!res.ok) {
    return NextResponse.json({ error: "ideal-postcodes-resolve-failed" }, { status: res.status });
  }

  const data = (await res.json().catch(() => null)) as unknown;
  const addr = getResultObject(data);

  const line1 = firstString(addr, ["line_1", "line1"]);
  const line2Part1 = firstString(addr, ["line_2", "line2"]);
  const line2Part2 = firstString(addr, ["line_3", "line3"]);
  const line2 = [line2Part1, line2Part2].filter(Boolean).join(", ");

  const town = firstString(addr, ["post_town", "postTown"]);

  const region = firstString(addr, ["county", "administrative_county", "traditional_county", "postal_county"]);

  const postalCode = firstString(addr, ["postcode", "post_code"]);

  // Prefer the 2-letter ISO code; fallback to GB to satisfy your validation check.
  const countryCodeRaw = firstString(addr, ["country_iso_2", "country_iso", "countryISO2"]);
  const countryCode = countryCodeRaw.length === 2 ? countryCodeRaw.toUpperCase() : "GB";

  const resolved: ResolvedAddress = { line1, line2, town, region, postalCode, countryCode };
  return NextResponse.json({ address: resolved });
}

