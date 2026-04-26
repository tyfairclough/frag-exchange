/** Normalize product URLs so crawl output matches stored inventory `saleExternalUrl`. */
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "_ga",
  "mc_cid",
  "mc_eid",
]);

export function normalizeProductUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  u.hash = "";
  const params = u.searchParams;
  for (const p of [...params.keys()]) {
    if (TRACKING_PARAMS.has(p.toLowerCase())) {
      params.delete(p);
    }
  }
  u.search = params.toString() ? `?${params.toString()}` : "";
  let path = u.pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
    u.pathname = path;
  }
  return u.href;
}
