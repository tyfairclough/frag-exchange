import Link from "next/link";
import { ExchangeKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  DISCOVER_CORAL_COLOURS,
  DISCOVER_CORAL_TYPES,
  discoverExchangeListings,
} from "@/lib/discover-listings";

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
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
  const exchangeId =
    exchangeIdParam && memberships.some((m) => m.exchangeId === exchangeIdParam)
      ? exchangeIdParam
      : (memberships[0]?.exchangeId ?? "");

  const selected = memberships.find((m) => m.exchangeId === exchangeId);
  const q = str(sp.q);
  const coralType = str(sp.coralType);
  const colour = str(sp.colour);
  const size = str(sp.size);
  const freeOnly = str(sp.free) === "1";
  const fulfilment = str(sp.fulfilment);
  const fulfilmentParsed =
    fulfilment === "POST" || fulfilment === "MEET" ? fulfilment : undefined;
  const maxKmRaw = str(sp.maxKm);
  const maxKm = maxKmRaw ? Number(maxKmRaw) : undefined;

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
          coralType: coralType || undefined,
          colour: colour || undefined,
          size: size || undefined,
          freeOnly: freeOnly || undefined,
          fulfilment: fulfilmentParsed,
          maxKm: maxKm != null && Number.isFinite(maxKm) ? maxKm : undefined,
        })
      : [];

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = {
      exchangeId: exchangeId || undefined,
      q: q || undefined,
      coralType: coralType || undefined,
      colour: colour || undefined,
      size: size || undefined,
      free: freeOnly ? "1" : undefined,
      fulfilment: fulfilmentParsed,
      maxKm: maxKmRaw || undefined,
      ...overrides,
    };
    Object.entries(next).forEach(([k, v]) => {
      if (v) {
        p.set(k, v);
      }
    });
    const qs = p.toString();
    return qs ? `/explore?${qs}` : "/explore";
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-base-content">Explore</h1>
        <p className="text-sm text-base-content/70">
          Search listings only on exchanges you have joined. Sellers are shown by alias; addresses stay private here.
        </p>
      </header>

      {memberships.length === 0 ? (
        <section className="card border border-base-content/10 bg-base-200/40 shadow-sm">
          <div className="card-body gap-2 p-5 text-sm text-base-content/80">
            <p>Join an exchange to see listings.</p>
            <Link href="/exchanges" className="btn btn-primary btn-sm min-h-10 w-fit rounded-xl">
              Browse exchanges
            </Link>
          </div>
        </section>
      ) : (
        <>
          <form method="get" className="card border border-base-content/10 bg-base-100 shadow-sm">
            <div className="card-body gap-3 p-4">
              <label className="form-control w-full">
                <span className="label py-1 text-xs text-base-content/65">Exchange</span>
                <select
                  name="exchangeId"
                  className="select select-bordered select-sm w-full rounded-xl"
                  defaultValue={exchangeId}
                  required
                >
                  {memberships.map((m) => (
                    <option key={m.id} value={m.exchangeId}>
                      {m.exchange.name} ({m.exchange.kind === ExchangeKind.GROUP ? "Group" : "Event"})
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="label py-1 text-xs text-base-content/65">Search</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Name or description"
                  className="input input-bordered input-sm w-full rounded-xl"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="form-control w-full">
                  <span className="label py-1 text-xs text-base-content/65">Type</span>
                  <select
                    name="coralType"
                    className="select select-bordered select-sm w-full rounded-xl"
                    defaultValue={coralType}
                  >
                    <option value="">Any</option>
                    {DISCOVER_CORAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-full">
                  <span className="label py-1 text-xs text-base-content/65">Colour</span>
                  <select
                    name="colour"
                    className="select select-bordered select-sm w-full rounded-xl"
                    defaultValue={colour}
                  >
                    <option value="">Any</option>
                    {DISCOVER_CORAL_COLOURS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="form-control w-full">
                <span className="label py-1 text-xs text-base-content/65">Size (contains)</span>
                <input
                  name="size"
                  defaultValue={size}
                  placeholder="e.g. frag, colony"
                  className="input input-bordered input-sm w-full rounded-xl"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-base-content/80">
                <input type="checkbox" name="free" value="1" defaultChecked={freeOnly} className="checkbox checkbox-sm" />
                Free to good home only
              </label>

              {selected?.exchange.kind === ExchangeKind.GROUP ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="form-control w-full">
                    <span className="label py-1 text-xs text-base-content/65">Handover</span>
                    <select
                      name="fulfilment"
                      className="select select-bordered select-sm w-full rounded-xl"
                      defaultValue={fulfilmentParsed ?? ""}
                    >
                      <option value="">Post or meet</option>
                      <option value="POST">Post</option>
                      <option value="MEET">Meet</option>
                    </select>
                  </label>
                  <label className="form-control w-full">
                    <span className="label py-1 text-xs text-base-content/65">Max distance (km)</span>
                    <input
                      name="maxKm"
                      type="number"
                      min={1}
                      step={1}
                      defaultValue={maxKmRaw}
                      placeholder={viewerLat != null ? "Town-centre" : "Set address first"}
                      disabled={viewerLat == null || viewerLon == null}
                      className="input input-bordered input-sm w-full rounded-xl disabled:opacity-60"
                    />
                  </label>
                </div>
              ) : null}

              {selected?.exchange.kind === ExchangeKind.GROUP && (viewerLat == null || viewerLon == null) ? (
                <p className="text-xs text-base-content/55">
                  Distance uses a geocoded town centre from your saved address. Complete onboarding with a town and
                  country, or wait a moment after saving — coordinates fill in automatically when geocoding succeeds.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" className="btn btn-primary btn-sm min-h-10 flex-1 rounded-xl">
                  Apply filters
                </button>
                <Link href={buildHref({ q: undefined, coralType: undefined, colour: undefined, size: undefined, free: undefined, fulfilment: undefined, maxKm: undefined })} className="btn btn-ghost btn-sm min-h-10 rounded-xl">
                  Clear
                </Link>
              </div>
            </div>
          </form>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/65">Results</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-base-content/70">No listings match these filters.</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((row) => (
                  <li key={row.listingId}>
                    <article className="card border border-base-content/10 bg-base-100 shadow-sm">
                      <div className="card-body gap-3 p-4">
                        <div className="flex gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200 text-2xl text-base-content/40">
                            {row.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- hobbyist URLs
                              <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span aria-hidden>🪸</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-base-content">{row.name}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-base-content/70">{row.description}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-base-content/60">
                              <span className="badge badge-ghost badge-sm">
                                {row.owner.avatarEmoji ? `${row.owner.avatarEmoji} ` : ""}
                                {row.owner.alias ?? "Member"}
                              </span>
                              {row.coralType ? <span className="badge badge-outline badge-sm">{row.coralType}</span> : null}
                              {row.colour ? <span className="badge badge-outline badge-sm">{row.colour}</span> : null}
                              {row.sizeLabel ? <span className="badge badge-outline badge-sm">{row.sizeLabel}</span> : null}
                              {row.freeToGoodHome ? (
                                <span className="badge badge-success badge-sm badge-outline">Free to good home</span>
                              ) : null}
                              {row.distanceKm != null ? (
                                <span className="badge badge-outline badge-sm">~{row.distanceKm.toFixed(0)} km (town)</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-base-content/10 pt-3">
                          <Link
                            href={`/exchanges/${encodeURIComponent(exchangeId)}/member/${encodeURIComponent(row.owner.id)}`}
                            className="btn btn-outline btn-sm min-h-10 rounded-xl"
                          >
                            Browse seller
                          </Link>
                          <Link
                            href={`/exchanges/${encodeURIComponent(exchangeId)}/trade?with=${encodeURIComponent(row.owner.id)}&focus=${encodeURIComponent(row.coralId)}`}
                            className="btn btn-primary btn-sm min-h-10 rounded-xl"
                          >
                            Start trade
                          </Link>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
