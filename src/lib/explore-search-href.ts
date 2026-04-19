/** URL builder for /explore — must stay aligned with explore page searchParams handling. */

import type { DiscoverItemTab } from "@/lib/discover-listings";

export type ExploreFilterState = {
  q: string;
  itemTab: DiscoverItemTab;
  coralTypes: string[];
  colours: string[];
  freeOnly: boolean;
  saleOnly: boolean;
  excludeSale: boolean;
  fulfilment: "" | "POST" | "MEET";
  maxKm: string;
  species: string;
  reefSafeOnly: boolean;
  equipmentCategories: string[];
  equipmentConditions: string[];
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

function parseItemTab(sp: URLSearchParams): DiscoverItemTab {
  const v = sp.get("itemTab")?.trim().toLowerCase();
  if (v === "fish" || v === "equipment") return v;
  return "coral";
}

/** Read repeated coralType / colour / equipment params; supports legacy single-value URLs. */
export function parseExploreFiltersFromSearchParams(sp: URLSearchParams): ExploreFilterState {
  const fulfilment = sp.get("fulfilment");
  const coralFromAll = sp.getAll("coralType").flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
  const colourFromAll = sp.getAll("colour").flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
  const coralTypes = uniqueTrimmed(coralFromAll.length > 0 ? coralFromAll : sp.get("coralType") ? [sp.get("coralType")!] : []);
  const colours = uniqueTrimmed(colourFromAll.length > 0 ? colourFromAll : sp.get("colour") ? [sp.get("colour")!] : []);
  const equipCatAll = sp
    .getAll("equipmentCategory")
    .flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
  const equipCondAll = sp
    .getAll("equipmentCondition")
    .flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));

  return {
    q: sp.get("q")?.trim() ?? "",
    itemTab: parseItemTab(sp),
    coralTypes,
    colours,
    freeOnly: sp.get("free") === "1",
    saleOnly: sp.get("saleOnly") === "1",
    excludeSale: sp.get("excludeSale") === "1",
    fulfilment: fulfilment === "POST" || fulfilment === "MEET" ? fulfilment : "",
    maxKm: sp.get("maxKm")?.trim() ?? "",
    species: sp.get("species")?.trim() ?? "",
    reefSafeOnly: sp.get("reefSafe") === "1",
    equipmentCategories: uniqueTrimmed(equipCatAll),
    equipmentConditions: uniqueTrimmed(equipCondAll),
  };
}

export function buildExploreSearchHref(args: {
  exchangeId: string;
  ownerUserId: string | null;
  filters: ExploreFilterState;
  /** When true, marks that a scoped search was explicitly applied (mixed feed until then). */
  markSearched?: boolean;
}): string {
  const p = new URLSearchParams();
  if (args.exchangeId) {
    p.set("exchangeId", args.exchangeId);
  }
  if (args.ownerUserId) {
    p.set("owner", args.ownerUserId);
  }
  const f = args.filters;
  if (f.itemTab && f.itemTab !== "coral") {
    p.set("itemTab", f.itemTab);
  }
  if (args.markSearched) {
    p.set("searched", "1");
  }
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
  if (f.saleOnly) {
    p.set("saleOnly", "1");
  }
  if (f.excludeSale) {
    p.set("excludeSale", "1");
  }
  if (f.fulfilment === "POST" || f.fulfilment === "MEET") {
    p.set("fulfilment", f.fulfilment);
  }
  if (f.maxKm.trim()) {
    p.set("maxKm", f.maxKm.trim());
  }
  if (f.species.trim()) {
    p.set("species", f.species.trim());
  }
  if (f.reefSafeOnly) {
    p.set("reefSafe", "1");
  }
  for (const c of f.equipmentCategories) {
    p.append("equipmentCategory", c);
  }
  for (const c of f.equipmentConditions) {
    p.append("equipmentCondition", c);
  }
  const qs = p.toString();
  return qs ? `/explore?${qs}` : "/explore";
}
