import type { ReactNode } from "react";
import { CoralListingMode, CoralProfileStatus, InventoryKind } from "@/generated/prisma/enums";
import { formatColoursLabelSuffix } from "@/lib/coral-options";

export type InventoryItemCardItem = {
  id: string;
  kind: InventoryKind;
  name: string;
  description: string | null;
  imageUrl: string | null;
  listingMode: CoralListingMode;
  coralType: string | null;
  colours: string[];
  freeToGoodHome: boolean;
  profileStatus: CoralProfileStatus;
  remainingQuantity?: number;
};

function kindLabel(kind: InventoryKind) {
  switch (kind) {
    case InventoryKind.CORAL:
      return "Coral";
    case InventoryKind.FISH:
      return "Fish";
    default:
      return "Equipment";
  }
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
   * When true, show Traded / Unlisted like My items.
   * When false (e.g. trade picker), those badges are hidden.
   */
  showListingStatusBadge?: boolean;
  /** When true, show quantity badge in the format x[count]. */
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-ghost badge-sm">{kindLabel(item.kind)}</span>
              <TitleTag className="font-semibold text-base-content">{item.name}</TitleTag>
              {showListingStatusBadge ? (
                item.profileStatus === CoralProfileStatus.TRADED ? (
                  <span className="badge badge-neutral badge-sm">Traded</span>
                ) : (
                  <span className="badge badge-ghost badge-sm">Unlisted</span>
                )
              ) : null}
              {showQuantityBadge && item.remainingQuantity != null ? (
                <span className="badge badge-ghost badge-sm">x{item.remainingQuantity}</span>
              ) : null}
              {item.freeToGoodHome ? (
                <span className="badge badge-success badge-sm badge-outline">Free to good home</span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-base-content/70">{item.description || "No description yet."}</p>
            <p className="mt-2 text-xs text-base-content/60">
              {listingModeLabel(item.listingMode)}
              {item.kind === InventoryKind.CORAL && item.coralType ? ` · ${item.coralType}` : ""}
              {(item.kind === InventoryKind.CORAL || item.kind === InventoryKind.FISH) &&
              item.colours.length > 0
                ? formatColoursLabelSuffix(item.colours)
                : ""}
            </p>
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
