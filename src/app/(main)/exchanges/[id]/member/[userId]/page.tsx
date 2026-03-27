import Link from "next/link";
import { notFound } from "next/navigation";
import { ExchangeKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canViewExchangeDirectory } from "@/lib/super-admin";
import { CoralListingCard } from "@/components/coral-listing-card";
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
        <ul className="grid grid-cols-1 gap-5">
          {rows.map((row) => (
            <li key={row.listingId}>
              <CoralListingCard
                row={row}
                exchangeId={exchangeId}
                idPrefix="member"
                tradeEnabled={!isSelf}
                sellerLinkEnabled={!isSelf}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
