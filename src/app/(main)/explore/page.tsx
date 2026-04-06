import Link from "next/link";
import { ExchangeKind } from "@/generated/prisma/enums";
import type { ExploreShellModel } from "@/components/explore-shell-context";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  DISCOVER_CORAL_COLOURS,
  DISCOVER_CORAL_TYPES,
  discoverExchangeListings,
} from "@/lib/discover-listings";
import { ExploreOwnerScopeNote, ExploreResultsGrid } from "./_components/explore-results-grid";
import { ExploreShellSync } from "./_components/explore-shell-sync";

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

function paramStringList(
  key: string,
  sp: Record<string, string | string[] | undefined>,
): string[] {
  const v = sp[key];
  if (v == null) {
    return [];
  }
  const parts = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    for (const piece of p.split(",")) {
      const t = piece.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const memberships = await getPrisma().exchangeMembership.findMany({
    where: { userId: user.id },
    include: { exchange: true },
    orderBy: { joinedAt: "desc" },
  });

  const exchangeIdParam = str(sp.exchangeId);
  const exchangeIdFromTrustedParam =
    exchangeIdParam && memberships.some((m) => m.exchangeId === exchangeIdParam)
      ? exchangeIdParam
      : null;
  const scopedByQuery = exchangeIdFromTrustedParam != null;
  const exchangeId = exchangeIdFromTrustedParam ?? (memberships[0]?.exchangeId ?? "");

  const selected = memberships.find((m) => m.exchangeId === exchangeId);
  const q = str(sp.q);
  const coralTypes = paramStringList("coralType", sp);
  const colours = paramStringList("colour", sp);
  const freeOnly = str(sp.free) === "1";
  const fulfilment = str(sp.fulfilment);
  const fulfilmentParsed =
    fulfilment === "POST" || fulfilment === "MEET" ? fulfilment : undefined;
  const maxKmRaw = str(sp.maxKm);
  const maxKm = maxKmRaw ? Number(maxKmRaw) : undefined;
  const ownerParam = str(sp.owner);

  let validatedOwnerUserId: string | null = null;
  if (ownerParam && exchangeId) {
    const ownerMembership = await getPrisma().exchangeMembership.findFirst({
      where: { exchangeId, userId: ownerParam },
      select: { id: true },
    });
    if (ownerMembership) {
      validatedOwnerUserId = ownerParam;
    }
  }

  const ownerAlias =
    validatedOwnerUserId != null
      ? (
          await getPrisma().user.findUnique({
            where: { id: validatedOwnerUserId },
            select: { alias: true },
          })
        )?.alias ?? null
      : null;

  const viewerLat = user.address?.townLatitude ?? null;
  const viewerLon = user.address?.townLongitude ?? null;

  const rows =
    selected && exchangeId
      ? await discoverExchangeListings({
          exchangeId,
          exchangeKind: selected.exchange.kind,
          viewerUserId: user.id,
          viewerLat,
          viewerLon,
          q: q || undefined,
          coralTypes: coralTypes.length ? coralTypes : undefined,
          colours: colours.length ? colours : undefined,
          freeOnly: freeOnly || undefined,
          fulfilment: fulfilmentParsed,
          maxKm: maxKm != null && Number.isFinite(maxKm) ? maxKm : undefined,
          ownerUserId: validatedOwnerUserId ?? undefined,
        })
      : [];

  const buildHref = (overrides: {
    exchangeId?: string;
    q?: string;
    coralTypes?: string[];
    colours?: string[];
    free?: string;
    fulfilment?: string;
    maxKm?: string;
    owner?: string;
  }) => {
    const p = new URLSearchParams();
    const next = {
      exchangeId: exchangeId || undefined,
      q: q || undefined,
      coralTypes: coralTypes.length ? coralTypes : undefined,
      colours: colours.length ? colours : undefined,
      free: freeOnly ? "1" : undefined,
      fulfilment: fulfilmentParsed,
      maxKm: maxKmRaw || undefined,
      owner: validatedOwnerUserId ?? undefined,
      ...overrides,
    };
    if (next.exchangeId) {
      p.set("exchangeId", next.exchangeId);
    }
    if (next.owner) {
      p.set("owner", next.owner);
    }
    if (next.q) {
      p.set("q", next.q);
    }
    for (const t of next.coralTypes ?? []) {
      p.append("coralType", t);
    }
    for (const c of next.colours ?? []) {
      p.append("colour", c);
    }
    if (next.free) {
      p.set("free", next.free);
    }
    if (next.fulfilment) {
      p.set("fulfilment", next.fulfilment);
    }
    if (next.maxKm) {
      p.set("maxKm", next.maxKm);
    }
    const qs = p.toString();
    return qs ? `/explore?${qs}` : "/explore";
  };

  const shellModel: ExploreShellModel | null =
    memberships.length > 0 && selected && exchangeId
      ? {
          resultCount: rows.length,
          memberships: memberships.map((m) => ({
            id: m.id,
            exchangeId: m.exchangeId,
            name: m.exchange.name,
            kind: m.exchange.kind === ExchangeKind.GROUP ? "GROUP" : "EVENT",
          })),
          exchangeId,
          scopedByQuery,
          exchangeKind: selected.exchange.kind === ExchangeKind.GROUP ? "GROUP" : "EVENT",
          viewerHasCoords: viewerLat != null && viewerLon != null,
          coralTypes: DISCOVER_CORAL_TYPES,
          coralColours: DISCOVER_CORAL_COLOURS,
          filters: {
            q,
            coralTypes,
            colours,
            freeOnly,
            fulfilment: fulfilmentParsed ?? "",
            maxKm: maxKmRaw,
          },
          ownerUserId: validatedOwnerUserId,
        }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6">
      {shellModel ? <ExploreShellSync model={shellModel} /> : null}

      {memberships.length > 0 ? (
        <p className="text-sm font-semibold text-[#122B49]" aria-live="polite">
          {rows.length} Coral{rows.length === 1 ? "" : "s"} found
        </p>
      ) : null}

      {memberships.length === 0 ? (
        <section className="card border border-slate-200/90 bg-white shadow-sm">
          <div className="card-body gap-2 p-5 text-sm text-slate-700">
            <p>Join an exchange to see listings.</p>
            <Link href="/exchanges" className="btn btn-primary btn-sm min-h-10 w-fit rounded-full border-0 bg-emerald-500 hover:bg-emerald-600">
              Browse exchanges
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {validatedOwnerUserId ? (
            <ExploreOwnerScopeNote
              ownerAlias={ownerAlias}
              showAllReefersHref={buildHref({ owner: undefined })}
            />
          ) : null}

          <ExploreResultsGrid rows={rows} exchangeId={exchangeId} />
        </section>
      )}
    </div>
  );
}
