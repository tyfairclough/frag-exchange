import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessAccountOwnership, ExchangeKind, ListingIntent, UserPostingRole } from "@/generated/prisma/enums";
import { hasRecentBusinessClaim } from "@/lib/business-claim";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canViewExchangeDirectory } from "@/lib/super-admin";
import { CoralListingCard } from "@/components/coral-listing-card";
import { discoverExchangeListings } from "@/lib/discover-listings";
import { BackLink } from "@/components/back-link";

type MemberIntentTabId = "swap" | "free" | "sale";

function parseRequestedIntentTab(raw: string | undefined): MemberIntentTabId | null {
  if (raw === "swap" || raw === "free" || raw === "sale") {
    return raw;
  }
  return null;
}

function pickInitialIntentTab(
  requested: MemberIntentTabId | null,
  counts: Record<MemberIntentTabId, number>,
): MemberIntentTabId {
  if (requested && counts[requested] > 0) {
    return requested;
  }
  if (counts.swap > 0) return "swap";
  if (counts.free > 0) return "free";
  if (counts.sale > 0) return "sale";
  return "swap";
}

export default async function ExchangeMemberListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; userId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await requireUser();
  const { id: exchangeId, userId: ownerUserId } = await params;
  const sp = await searchParams;

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
    select: {
      id: true,
      alias: true,
      avatarEmoji: true,
      postingRole: true,
      businessAccountOwnership: true,
    },
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
  const swapRows = rows.filter((row) => row.listingIntent === ListingIntent.SWAP);
  const freeRows = rows.filter((row) => row.listingIntent === ListingIntent.FREE);
  const saleRows = rows.filter((row) => row.listingIntent === ListingIntent.FOR_SALE);
  const tabCounts: Record<MemberIntentTabId, number> = {
    swap: swapRows.length,
    free: freeRows.length,
    sale: saleRows.length,
  };
  const requestedTab = parseRequestedIntentTab(sp.tab);
  const activeTab = pickInitialIntentTab(requestedTab, tabCounts);
  const activeRows = activeTab === "swap" ? swapRows : activeTab === "free" ? freeRows : saleRows;
  const tabHref = (tab: MemberIntentTabId) =>
    `/exchanges/${encodeURIComponent(exchangeId)}/member/${encodeURIComponent(ownerUserId)}?tab=${tab}`;

  const isCommercialTier =
    owner.postingRole === UserPostingRole.LFS || owner.postingRole === UserPostingRole.ONLINE_RETAILER;
  const showClaimBusinessCta =
    isSelf &&
    isCommercialTier &&
    owner.businessAccountOwnership === BusinessAccountOwnership.UNCLAIMED &&
    !(await hasRecentBusinessClaim(getPrisma(), ownerUserId));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink href={`/explore?exchangeId=${encodeURIComponent(exchangeId)}`} className="min-h-10">
        Back to explore
      </BackLink>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg leading-none text-white"
            aria-hidden
          >
            {owner.avatarEmoji ?? "🐠"}
          </span>
          <h1 className="text-xl font-semibold text-base-content">
            {owner.alias ?? "Member"}
            {isSelf ? " (you)" : ""}
          </h1>
        </div>
        <p className="text-sm text-base-content/70">
          Active listings on <span className="font-medium text-base-content">{exchange.name}</span>
          {exchange.kind === ExchangeKind.GROUP ? " · Distances are town-centre estimates." : ""}
        </p>
      </header>

      {showClaimBusinessCta ? (
        <Link
          href={`/exchanges/${encodeURIComponent(exchangeId)}/member/${encodeURIComponent(ownerUserId)}/claim`}
          className="btn btn-secondary btn-sm min-h-10 w-fit rounded-xl"
        >
          Claim my business
        </Link>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-base-content/70">No active listings from this member on this exchange.</p>
      ) : (
        <div className="space-y-4">
          <div
            role="tablist"
            aria-label="Member listing intents"
            className="tabs tabs-border tabs-md min-w-0 flex-nowrap overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {(
              [
                { id: "swap", label: "Swap" },
                { id: "free", label: "Free to good home" },
                { id: "sale", label: "For sale" },
              ] as const
            ).map((tab) => {
              const count = tabCounts[tab.id];
              const disabled = count === 0;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={disabled ? "#" : tabHref(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : isActive ? 0 : -1}
                  className={`tab shrink-0 whitespace-nowrap font-semibold${isActive ? " tab-active" : ""}${disabled ? " pointer-events-none opacity-45" : ""}`}
                >
                  {tab.label}
                  <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          {activeRows.length === 0 ? (
            <p className="text-sm text-base-content/70">
              {activeTab === "swap"
                ? "No swap listings from this member on this exchange."
                : activeTab === "free"
                  ? "No free-to-good-home listings from this member on this exchange."
                  : "No for-sale listings from this member on this exchange."}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-5">
              {activeRows.map((row) => (
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
      )}
    </div>
  );
}
