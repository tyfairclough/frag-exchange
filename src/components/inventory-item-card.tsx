import type { ReactNode } from "react";
import { CoralListingMode, CoralProfileStatus, InventoryKind, ListingIntent } from "@/generated/prisma/enums";
export type InventoryItemCardItem = {
  id: string;
  kind: InventoryKind;
  name: string;
  description: string | null;
  imageUrl: string | null;
  listingMode: CoralListingMode;
  coralType: string | null;
  colours: string[];
  listingIntent: ListingIntent;
  salePriceMinor?: number | null;
  saleCurrencyCode?: string | null;
  profileStatus: CoralProfileStatus;
  remainingQuantity?: number;
};

function priceLabel(minor: number | null | undefined, currency: string | null | undefined) {
  if (minor == null) return "For sale";
  const c = currency ?? "GBP";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: c }).format(minor / 100);
}

function listingModeLabel(mode: CoralListingMode) {
  switch (mode) {
    case CoralListingMode.POST:
      return "Post";
    case CoralListingMode.MEET:
      return "Meet";
    default:
      return "Post or meet";
  }
}

export type InventoryItemCardProps = {
  item: InventoryItemCardItem;
  /** Footer row (e.g. Edit / Delete). Omit to hide the action bar. */
  actions?: ReactNode;
  /**
   * When true, show Traded when the item is traded.
   * When false (e.g. trade picker), the badge is hidden.
   */
  showListingStatusBadge?: boolean;
  /** When true, show x[count] when remaining quantity is greater than 1. */
  showQuantityBadge?: boolean;
  /** Extra line under the meta row (e.g. exchange listing copy). */
  extraMeta?: ReactNode;
  /** Use h3 when nested under a page section heading (e.g. Start a trade). */
  titleHeading?: "h2" | "h3";
  /** Checkbox-driven selection; whole card is clickable, border shows checked state. */
  selection?: {
    inputName: string;
    value: string;
    defaultChecked?: boolean;
  };
};

export function InventoryItemCard({
  item,
  actions,
  showListingStatusBadge = false,
  showQuantityBadge = false,
  extraMeta,
  titleHeading = "h2",
  selection,
}: InventoryItemCardProps) {
  const TitleTag = titleHeading;

  const inner = (
    <article
      className={
        selection
          ? "card border-2 border-base-content/10 bg-base-100 shadow-sm transition-[border-color,box-shadow] peer-checked:border-primary peer-checked:shadow-md peer-focus-visible:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30"
          : "card border border-base-content/10 bg-base-100 shadow-sm"
      }
    >
      <div className="card-body gap-3 p-4">
        <div className="flex gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200 text-2xl text-base-content/40">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary hobbyist image URLs
              <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>🪸</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <TitleTag className="min-w-0 flex-1 truncate font-semibold text-base-content">{item.name}</TitleTag>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {showListingStatusBadge && item.profileStatus === CoralProfileStatus.TRADED ? (
                  <span className="badge badge-neutral badge-sm">Traded</span>
                ) : null}
                {showQuantityBadge && item.remainingQuantity != null && item.remainingQuantity > 1 ? (
                  <span className="badge badge-ghost badge-sm">x{item.remainingQuantity}</span>
                ) : null}
                {item.listingIntent === ListingIntent.FREE ? (
                  <span className="badge badge-success badge-sm badge-outline">Free to good home</span>
                ) : null}
                {item.listingIntent === ListingIntent.FOR_SALE ? (
                  <span className="badge badge-info badge-sm badge-outline">
                    {priceLabel(item.salePriceMinor, item.saleCurrencyCode)}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-base-content/70">{item.description || "No description yet."}</p>
            <p className="mt-2 text-xs text-base-content/60">{listingModeLabel(item.listingMode)}</p>
            {extraMeta}
          </div>
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 border-t border-base-content/10 pt-3">{actions}</div>
        ) : null}
      </div>
    </article>
  );

  if (!selection) {
    return inner;
  }

  return (
    <label className="block cursor-pointer">
      <input
        type="checkbox"
        name={selection.inputName}
        value={selection.value}
        defaultChecked={selection.defaultChecked}
        className="peer sr-only"
      />
      {inner}
    </label>
  );
}
