/**
 * Resolve a coarse town-centre point via Nominatim (OpenStreetMap).
 * Call sparingly; store results on `user_addresses`. Do not expose exact home coordinates in discovery APIs.
 */

import { getPrisma } from "@/lib/db";

type NominatimHit = { lat: string; lon: string };

function buildQuery(town: string, region: string | null | undefined, countryCode: string) {
  const parts = [town.trim(), region?.trim(), countryCode.trim().toUpperCase()].filter(Boolean);
  return parts.join(", ");
}

export async function geocodeTownCenter(input: {
  town: string;
  region?: string | null;
  countryCode: string;
}): Promise<{ lat: number; lon: number } | null> {
  const q = buildQuery(input.town, input.region, input.countryCode);
  if (!q || !input.town.trim()) {
    return null;
  }

  const ua =
    process.env.REEFX_NOMINATIM_USER_AGENT?.trim() ||
    "REEFxCHANGE/0.1 (contact: support@reefx.net)";

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": ua },
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as NominatimHit[];
    const hit = data[0];
    if (!hit?.lat || !hit?.lon) {
      return null;
    }
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    return { lat, lon };
  } catch {
    return null;
  }
}

export async function refreshTownCenterForUserAddress(userId: string): Promise<void> {
  const addr = await getPrisma().userAddress.findUnique({ where: { userId } });
  if (!addr) {
    return;
  }
  const coords = await geocodeTownCenter({
    town: addr.town,
    region: addr.region,
    countryCode: addr.countryCode,
  });
  if (!coords) {
    return;
  }
  await getPrisma().userAddress.update({
    where: { userId },
    data: { townLatitude: coords.lat, townLongitude: coords.lon },
  });
}
