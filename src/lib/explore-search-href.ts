/** URL builder for /explore — must stay aligned with explore page searchParams handling. */

export type ExploreFilterState = {
  q: string;
  coralTypes: string[];
  colours: string[];
  freeOnly: boolean;
  fulfilment: "" | "POST" | "MEET";
  maxKm: string;
};

function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Read repeated coralType / colour params; supports legacy single-value URLs. */
export function parseExploreFiltersFromSearchParams(
  sp: URLSearchParams,
): ExploreFilterState {
  const fulfilment = sp.get("fulfilment");
  const coralFromAll = sp.getAll("coralType").flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
  const colourFromAll = sp.getAll("colour").flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
  const coralTypes = uniqueTrimmed(coralFromAll.length > 0 ? coralFromAll : sp.get("coralType") ? [sp.get("coralType")!] : []);
  const colours = uniqueTrimmed(colourFromAll.length > 0 ? colourFromAll : sp.get("colour") ? [sp.get("colour")!] : []);

  return {
    q: sp.get("q")?.trim() ?? "",
    coralTypes,
    colours,
    freeOnly: sp.get("free") === "1",
    fulfilment: fulfilment === "POST" || fulfilment === "MEET" ? fulfilment : "",
    maxKm: sp.get("maxKm")?.trim() ?? "",
  };
}

export function buildExploreSearchHref(args: {
  exchangeId: string;
  ownerUserId: string | null;
  filters: ExploreFilterState;
}): string {
  const p = new URLSearchParams();
  if (args.exchangeId) {
    p.set("exchangeId", args.exchangeId);
  }
  if (args.ownerUserId) {
    p.set("owner", args.ownerUserId);
  }
  const f = args.filters;
  if (f.q.trim()) {
    p.set("q", f.q.trim());
  }
  for (const t of f.coralTypes) {
    p.append("coralType", t);
  }
  for (const c of f.colours) {
    p.append("colour", c);
  }
  if (f.freeOnly) {
    p.set("free", "1");
  }
  if (f.fulfilment === "POST" || f.fulfilment === "MEET") {
    p.set("fulfilment", f.fulfilment);
  }
  if (f.maxKm.trim()) {
    p.set("maxKm", f.maxKm.trim());
  }
  const qs = p.toString();
  return qs ? `/explore?${qs}` : "/explore";
}
