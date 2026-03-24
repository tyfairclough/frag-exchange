import Link from "next/link";
import { notFound } from "next/navigation";
import { ExchangeKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canViewExchangeDirectory } from "@/lib/super-admin";
import { discoverExchangeListings } from "@/lib/discover-listings";

export default async function ExchangeMemberListingsPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const viewer = await requireUser();
  const { id: exchangeId, userId: ownerUserId } = await params;

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: { in: [viewer.id, ownerUserId] } },
      },
    },
  });

  if (!exchange) {
    notFound();
  }

  const viewerMembership = exchange.memberships.find((m) => m.userId === viewer.id) ?? null;
  const ownerMembership = exchange.memberships.find((m) => m.userId === ownerUserId) ?? null;

  if (!canViewExchangeDirectory(exchange, viewerMembership, viewer) || !viewerMembership || !ownerMembership) {
    notFound();
  }

  const owner = await getPrisma().user.findUnique({
    where: { id: ownerUserId },
    select: { id: true, alias: true, avatarEmoji: true },
  });

  if (!owner) {
    notFound();
  }

  const viewerLat = viewer.address?.townLatitude ?? null;
  const viewerLon = viewer.address?.townLongitude ?? null;

  const rows = await discoverExchangeListings({
    exchangeId,
    exchangeKind: exchange.kind,
    viewerUserId: viewer.id,
    viewerLat,
    viewerLon,
    ownerUserId,
  });

  const isSelf = ownerUserId === viewer.id;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <Link href={`/explore?exchangeId=${encodeURIComponent(exchangeId)}`} className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl">
        Back to explore
      </Link>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-base-content">
          {owner.avatarEmoji ? `${owner.avatarEmoji} ` : ""}
          {owner.alias ?? "Member"}
          {isSelf ? " (you)" : ""}
        </h1>
        <p className="text-sm text-base-content/70">
          Active listings on <span className="font-medium text-base-content">{exchange.name}</span>
          {exchange.kind === ExchangeKind.GROUP ? " · Distances are town-centre estimates." : ""}
        </p>
      </header>

      {!isSelf ? (
        <Link
          href={`/exchanges/${encodeURIComponent(exchangeId)}/trade?with=${encodeURIComponent(ownerUserId)}`}
          className="btn btn-primary btn-sm min-h-10 w-fit rounded-xl"
        >
          Start trade
        </Link>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-base-content/70">No active listings from this member on this exchange.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.listingId}>
              <article className="card border border-base-content/10 bg-base-100 shadow-sm">
                <div className="card-body gap-3 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200 text-2xl text-base-content/40">
                      {row.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden>🪸</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-base-content">{row.name}</p>
                      <p className="mt-1 line-clamp-3 text-sm text-base-content/70">{row.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-base-content/60">
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
                  {!isSelf ? (
                    <div className="border-t border-base-content/10 pt-3">
                      <Link
                        href={`/exchanges/${encodeURIComponent(exchangeId)}/trade?with=${encodeURIComponent(ownerUserId)}&focus=${encodeURIComponent(row.coralId)}`}
                        className="btn btn-primary btn-sm min-h-10 rounded-xl"
                      >
                        Include in trade
                      </Link>
                    </div>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
