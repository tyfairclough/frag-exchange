import type { ReactNode } from "react";
import Link from "next/link";
import type { CoralListingMode } from "@/generated/prisma/enums";
import { CoralListingMode as CoralListingModeEnum, InventoryKind, ListingIntent } from "@/generated/prisma/enums";
import type { ExchangeListing, InventoryItem } from "@/generated/prisma/client";
import {
  addExchangeListingFormAction,
  removeExchangeListingFormAction,
} from "@/app/(main)/exchanges/listing-actions";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE } from "@/components/marketing/marketing-chrome";
import { getRequestOrigin } from "@/lib/request-origin";
import { buildShareLinks, buildShareMessage, buildSharedItemPath } from "@/lib/item-share";
import { ItemShareActions } from "@/components/item-share-actions";
import { formatColoursLabelSuffix } from "@/lib/coral-options";
import {
  ExchangeMemberListingsTabs,
  type ListingsTabId,
} from "@/app/(main)/exchanges/components/exchange-member-listings-tabs";
import { isKindAllowedOnExchange } from "@/lib/listing-eligibility";

function initialListingsTab(sp: { tab?: string; unlisted?: string }): ListingsTabId {
  if (sp.tab === "unlisted") return "unlisted";
  if (sp.unlisted === "1") return "unlisted";
  return "listings";
}

function listingModeLabel(mode: CoralListingMode) {
  switch (mode) {
    case CoralListingModeEnum.POST:
      return "Post";
    case CoralListingModeEnum.MEET:
      return "Meet";
    default:
      return "Post or meet";
  }
}

function remainingQuantityBadge(remainingQuantity: number): ReactNode {
  if (remainingQuantity <= 1) return null;
  return <span className="badge badge-ghost badge-sm">x{remainingQuantity}</span>;
}

function salePriceBadge(priceMinor: number | null, currencyCode: string | null): ReactNode {
  if (priceMinor == null) return <span className="badge badge-info badge-sm badge-outline">For sale</span>;
  return (
    <span className="badge badge-info badge-sm badge-outline">
      {new Intl.NumberFormat("en-GB", { style: "currency", currency: currencyCode ?? "GBP" }).format(priceMinor / 100)}
    </span>
  );
}

type ListingRow = ExchangeListing & { inventoryItem: InventoryItem };

type ExchangePick = {
  id: string;
  name: string;
  allowCoral: boolean;
  allowFish: boolean;
  allowEquipment: boolean;
  allowItemsForSale: boolean;
};

export async function ExchangeMemberListingsPanel({
  exchange,
  myListableItems,
  myListingsHere,
  searchParams,
}: {
  exchange: ExchangePick;
  myListableItems: InventoryItem[];
  myListingsHere: ListingRow[];
  searchParams: { listed?: string; unlisted?: string; item?: string; tab?: string };
}) {
  const now = new Date();
  const activeListingByItemId = new Map(
    myListingsHere.filter((l) => l.expiresAt > now).map((l) => [l.inventoryItemId, l]),
  );
  const listedItemId = searchParams.item?.trim() || "";
  const justListed =
    searchParams.listed === "1" && listedItemId ? activeListingByItemId.get(listedItemId) ?? null : null;
  const hasShareableListings = justListed !== null || activeListingByItemId.size > 0;
  const shareOrigin = hasShareableListings ? await getRequestOrigin() : null;
  const sharePath = justListed ? buildSharedItemPath(exchange.id, justListed.inventoryItemId) : null;
  const shareUrl = sharePath && shareOrigin ? `${shareOrigin}${sharePath}` : null;
  const shareMessage =
    justListed && shareUrl
      ? buildShareMessage({
          kind: justListed.inventoryItem.kind,
          itemName: justListed.inventoryItem.name,
          exchangeName: exchange.name,
          description: justListed.inventoryItem.description,
        })
      : null;
  const shareLinks = shareMessage && shareUrl ? buildShareLinks({ message: shareMessage, absoluteUrl: shareUrl }) : null;

  const myUnlistedItemsForExchange = myListableItems.filter((c) => {
    if (activeListingByItemId.has(c.id)) {
      return false;
    }
    return isKindAllowedOnExchange(c.kind, exchange, c.listingIntent);
  });

  const listingsCount = activeListingByItemId.size;
  const unlistedCount = myUnlistedItemsForExchange.length;

  const listingsPanel = (
    <div className="space-y-4">
      {searchParams.listed === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>Item listed on this exchange (90-day window). Others can find it in Explore.</p>
          {shareLinks && shareUrl ? (
            <>
              <p className="mt-2 text-xs text-emerald-900/80">Share this listing with friends:</p>
              <ItemShareActions
                whatsappUrl={shareLinks.whatsapp}
                facebookUrl={shareLinks.facebook}
                bandUrl={shareLinks.band}
                copyUrl={shareUrl}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Profile items can sit on multiple exchanges until a trade completes. Each listing expires after 90 days (renew by listing
        again).
      </p>

      {activeListingByItemId.size === 0 ? (
        <p className="text-sm text-slate-600">No active listings on this exchange yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...activeListingByItemId.values()].map((l) => {
            const cardSharePath = buildSharedItemPath(exchange.id, l.inventoryItemId);
            const cardShareUrl = shareOrigin ? `${shareOrigin}${cardSharePath}` : null;
            const cardShareMessage = cardShareUrl
              ? buildShareMessage({
                  kind: l.inventoryItem.kind,
                  itemName: l.inventoryItem.name,
                  exchangeName: exchange.name,
                  description: l.inventoryItem.description,
                })
              : null;
            const cardShareLinks =
              cardShareMessage && cardShareUrl
                ? buildShareLinks({ message: cardShareMessage, absoluteUrl: cardShareUrl })
                : null;
            return (
              <li key={l.id}>
                <article className="card border border-base-content/10 bg-base-100 shadow-sm">
                  <div className="card-body gap-3 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200 text-2xl text-base-content/40">
                        {l.inventoryItem.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- arbitrary hobbyist image URLs
                          <img src={l.inventoryItem.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span aria-hidden>🪸</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className="min-w-0 flex-1 truncate font-semibold text-base-content">{l.inventoryItem.name}</h3>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {remainingQuantityBadge(l.inventoryItem.remainingQuantity)}
                            {l.inventoryItem.listingIntent === ListingIntent.FREE ? (
                              <span className="badge badge-success badge-sm badge-outline">Free to good home</span>
                            ) : null}
                            {l.inventoryItem.listingIntent === ListingIntent.FOR_SALE
                              ? salePriceBadge(l.inventoryItem.salePriceMinor, l.inventoryItem.saleCurrencyCode)
                              : null}
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-base-content/60">
                          {listingModeLabel(l.inventoryItem.listingMode)}
                          {l.inventoryItem.kind === InventoryKind.CORAL && l.inventoryItem.coralType
                            ? ` · ${l.inventoryItem.coralType}`
                            : ""}
                          {(l.inventoryItem.kind === InventoryKind.CORAL || l.inventoryItem.kind === InventoryKind.FISH) &&
                          l.inventoryItem.colours.length > 0
                            ? formatColoursLabelSuffix(l.inventoryItem.colours)
                            : ""}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Listed until{" "}
                          <time dateTime={l.expiresAt.toISOString()}>
                            {l.expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                          </time>
                        </p>
                      </div>
                    </div>
                    <div className="flex h-fit flex-nowrap items-end justify-between gap-0 border-t border-base-content/10 pt-3">
                      {cardShareLinks && cardShareUrl ? (
                        <ItemShareActions
                          whatsappUrl={cardShareLinks.whatsapp}
                          facebookUrl={cardShareLinks.facebook}
                          bandUrl={cardShareLinks.band}
                          copyUrl={cardShareUrl}
                        />
                      ) : null}
                      <form action={removeExchangeListingFormAction} className="flex h-9 items-start justify-end">
                        <input type="hidden" name="exchangeId" value={exchange.id} />
                        <input type="hidden" name="inventoryItemId" value={l.inventoryItemId} />
                        <button
                          type="submit"
                          className="inline-flex min-h-9 items-center rounded-full border border-rose-300 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const unlistedPanel = (
    <div className="space-y-4">
      {searchParams.unlisted === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Coral removed from this exchange.
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Items below are not listed on this exchange yet (or the listing expired). List them here when you are ready.
      </p>

      {myListableItems.length === 0 ? (
        <p className="text-sm text-slate-600">
          Add items under{" "}
          <Link href="/my-items" className="font-semibold hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
            My items
          </Link>{" "}
          first.
        </p>
      ) : myUnlistedItemsForExchange.length === 0 ? (
        <p className="text-sm text-slate-600">All of your available items are already listed on this exchange.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {myUnlistedItemsForExchange.map((c) => (
            <li key={c.id}>
              <article className="card border border-base-content/10 bg-base-100 shadow-sm">
                <div className="card-body gap-3 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200 text-2xl text-base-content/40">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary hobbyist image URLs
                        <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden>🪸</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="min-w-0 flex-1 truncate font-semibold text-base-content">{c.name}</h3>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {remainingQuantityBadge(c.remainingQuantity)}
                          {c.listingIntent === ListingIntent.FREE ? (
                            <span className="badge badge-success badge-sm badge-outline">Free to good home</span>
                          ) : null}
                          {c.listingIntent === ListingIntent.FOR_SALE
                            ? salePriceBadge(c.salePriceMinor, c.saleCurrencyCode)
                            : null}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-base-content/60">
                        {listingModeLabel(c.listingMode)}
                        {c.kind === InventoryKind.CORAL && c.coralType ? ` · ${c.coralType}` : ""}
                        {(c.kind === InventoryKind.CORAL || c.kind === InventoryKind.FISH) && c.colours.length > 0
                          ? formatColoursLabelSuffix(c.colours)
                          : ""}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Not listed here, or listing expired - you can list again.
                      </p>
                    </div>
                  </div>
                  <div className="flex h-fit flex-nowrap items-end justify-between gap-0 border-t border-base-content/10 pt-3">
                    <form action={addExchangeListingFormAction} className="flex h-9 items-start justify-end">
                      <input type="hidden" name="exchangeId" value={exchange.id} />
                      <input type="hidden" name="inventoryItemId" value={c.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold text-white transition hover:opacity-95"
                        style={{ backgroundColor: MARKETING_CTA_GREEN }}
                      >
                        List here
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <ExchangeMemberListingsTabs
        initialTab={initialListingsTab(searchParams)}
        listingsCount={listingsCount}
        unlistedCount={unlistedCount}
        listingsPanel={listingsPanel}
        unlistedPanel={unlistedPanel}
      />
    </section>
  );
}
