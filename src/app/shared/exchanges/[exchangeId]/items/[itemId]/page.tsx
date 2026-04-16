import type { Metadata } from "next";
import Link from "next/link";
import { ExchangeVisibility } from "@/generated/prisma/enums";
import { InventoryItemCard } from "@/components/inventory-item-card";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { ensureDatabaseReady } from "@/lib/db-warm";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { canViewExchangeDirectory } from "@/lib/super-admin";
import { buildSharedItemPath, getShareItemTypeLabel } from "@/lib/item-share";
import { joinExchangeAndStartTradeAction } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exchangeId: string; itemId: string }>;
}): Promise<Metadata> {
  const { exchangeId, itemId } = await params;
  await ensureDatabaseReady();
  const listing = await getPrisma().exchangeListing.findUnique({
    where: { exchangeId_inventoryItemId: { exchangeId, inventoryItemId: itemId } },
    include: { exchange: true, inventoryItem: true },
  });
  if (!listing) {
    return { title: "Listing unavailable" };
  }
  const title = `${listing.inventoryItem.name} on the ${listing.exchange.name} exchange`;
  const intro = `I am sharing this ${getShareItemTypeLabel(listing.inventoryItem.kind)} on the swap site REEFX, check it out 🐠`;
  const itemDescription = listing.inventoryItem.description?.trim();
  const description = [intro, itemDescription || `Listed on ${listing.exchange.name}.`].join(" ");
  const url = buildSharedItemPath(exchangeId, itemId);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: listing.inventoryItem.imageUrl ? [{ url: listing.inventoryItem.imageUrl }] : undefined,
    },
  };
}

export default async function SharedExchangeItemPage({
  params,
}: {
  params: Promise<{ exchangeId: string; itemId: string }>;
}) {
  const { exchangeId, itemId } = await params;
  const [user, listing] = await Promise.all([
    getCurrentUser(),
    getPrisma().exchangeListing.findUnique({
      where: { exchangeId_inventoryItemId: { exchangeId, inventoryItemId: itemId } },
      include: {
        exchange: true,
        inventoryItem: true,
      },
    }),
  ]);

  if (!listing) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold" style={{ color: MARKETING_NAVY }}>
            Listing unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-600">This listing does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const membership = user
    ? await getPrisma().exchangeMembership.findFirst({
        where: { exchangeId: listing.exchangeId, userId: user.id },
      })
    : null;
  const canView = user ? canViewExchangeDirectory(listing.exchange, membership, user) : listing.exchange.visibility === ExchangeVisibility.PUBLIC;
  const isMember = membership !== null;
  const isPrivate = listing.exchange.visibility === ExchangeVisibility.PRIVATE;
  const sharedPath = buildSharedItemPath(listing.exchangeId, listing.inventoryItemId);
  const loginHref = `/auth/login?next=${encodeURIComponent(sharedPath)}`;
  const tradeHref = `/exchanges/${encodeURIComponent(listing.exchangeId)}/trade?with=${encodeURIComponent(listing.inventoryItem.userId)}&focus=${encodeURIComponent(listing.inventoryItemId)}`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {listing.exchange.logo80Url ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary exchange logos / uploaded URLs
              <img src={listing.exchange.logo80Url} alt="" aria-hidden className="h-10 w-10 rounded-md object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- static public brand asset
              <img src="/reefx_logo.svg" alt="" aria-hidden className="h-10 w-10 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
                {listing.exchange.name}
              </h1>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                {isPrivate ? "Private exchange" : "Public exchange"}
              </p>
            </div>
          </div>
          <Link
            href={`/exchanges/${encodeURIComponent(listing.exchangeId)}`}
            className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
          >
            View exchange
          </Link>
        </div>
        {listing.exchange.description ? <p className="mt-3 text-sm leading-relaxed text-slate-600">{listing.exchange.description}</p> : null}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Listed item</h2>
        <InventoryItemCard
          item={{
            id: listing.inventoryItem.id,
            kind: listing.inventoryItem.kind,
            name: listing.inventoryItem.name,
            description: listing.inventoryItem.description,
            imageUrl: listing.inventoryItem.imageUrl,
            listingMode: listing.inventoryItem.listingMode,
            coralType: listing.inventoryItem.coralType,
            colours: listing.inventoryItem.colours,
            freeToGoodHome: listing.inventoryItem.freeToGoodHome,
            profileStatus: listing.inventoryItem.profileStatus,
          }}
          extraMeta={
            <p className="mt-2 text-xs text-slate-500">
              Listed until <time dateTime={listing.expiresAt.toISOString()}>{listing.expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })}</time>
            </p>
          }
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Next step</h2>
        {user ? (
          canView && isMember ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-700">You can start a trade request for this item.</p>
              <Link
                href={tradeHref}
                className="inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: MARKETING_CTA_GREEN }}
              >
                Exchange item
              </Link>
            </div>
          ) : !isPrivate ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-700">Join this public exchange first, then start a trade.</p>
              <form action={joinExchangeAndStartTradeAction}>
                <input type="hidden" name="exchangeId" value={listing.exchangeId} />
                <input type="hidden" name="itemId" value={listing.inventoryItemId} />
                <input type="hidden" name="ownerUserId" value={listing.inventoryItem.userId} />
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ backgroundColor: MARKETING_CTA_GREEN }}
                >
                  Join exchange
                </button>
              </form>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-700">Invitation needed. This exchange is private and requires an invite link.</p>
          )
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-700">
              Sign in to access this exchange. You will return to this item after authentication or onboarding.
            </p>
            <Link
              href={loginHref}
              className="inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-95"
              style={{ backgroundColor: MARKETING_LINK_BLUE }}
            >
              Access exchange
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
