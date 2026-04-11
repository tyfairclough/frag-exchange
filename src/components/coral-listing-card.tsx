import { AppLink } from "@/components/app-link";
import { InventoryKind } from "@/generated/prisma/enums";
import type { DiscoverRow } from "@/lib/discover-listings";
import { EQUIPMENT_CATEGORY_LABELS } from "@/lib/equipment-options";

export type CoralListingCardProps = {
  row: DiscoverRow;
  exchangeId: string;
  /** Used in sr-only description id; defaults to "coral". */
  idPrefix?: string;
  /** Full-card link to start trade with this listing focused. */
  tradeEnabled?: boolean;
  /** Wrap owner in a link to their member profile; set false when viewing your own listings. */
  sellerLinkEnabled?: boolean;
};

export function CoralListingCard({
  row,
  exchangeId,
  idPrefix = "coral",
  tradeEnabled = true,
  sellerLinkEnabled = true,
}: CoralListingCardProps) {
  const tradeHref = `/exchanges/${encodeURIComponent(exchangeId)}/trade?with=${encodeURIComponent(row.owner.id)}&focus=${encodeURIComponent(row.itemId)}`;
  const sellerHref = `/exchanges/${encodeURIComponent(exchangeId)}/member/${encodeURIComponent(row.owner.id)}`;
  const descId = `${idPrefix}-desc-${row.listingId}`;
  const hasDescription = Boolean(row.description?.trim());

  const ownerPillClass =
    "inline-flex max-w-full min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-3 text-xs font-medium text-slate-800 shadow-sm";

  const ownerPillInner = (
    <>
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-base leading-none text-white"
        aria-hidden
      >
        {row.owner.avatarEmoji ?? "🐠"}
      </span>
      <span className="min-w-0 truncate">{row.owner.alias ?? "Member"}</span>
    </>
  );

  return (
    <article className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      {hasDescription ? (
        <span id={descId} className="sr-only">
          {row.description}
        </span>
      ) : null}
      {tradeEnabled ? (
        <AppLink
          href={tradeHref}
          className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          aria-label={`Start trade for ${row.name} from ${row.owner.alias ?? "member"}`}
          aria-describedby={hasDescription ? descId : undefined}
        />
      ) : null}
      <div className={`relative z-[1] flex flex-1 flex-col ${tradeEnabled ? "pointer-events-none" : ""}`}>
        <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- hobbyist URLs
            <img
              src={row.imageUrl}
              alt={tradeEnabled ? "" : row.name}
              className="h-full w-full object-cover"
              aria-hidden={tradeEnabled}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl text-slate-300" aria-hidden>
              🪸
            </div>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm">
            {row.kind === InventoryKind.CORAL
              ? row.coralType?.trim() || "Coral"
              : row.kind === InventoryKind.FISH
                ? row.species?.trim() || "Fish"
                : row.equipmentCategory
                  ? EQUIPMENT_CATEGORY_LABELS[row.equipmentCategory]
                  : "Equipment"}
          </span>
          {row.remainingQuantity > 1 ? (
            <span className="absolute left-2 top-2 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              {row.remainingQuantity} available
            </span>
          ) : null}
          {row.freeToGoodHome ? (
            <span className="absolute bottom-2 left-2 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              Free to a good home
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-3">
          <div className="min-w-0 space-y-3">
            <h3 className="line-clamp-2 text-base font-semibold text-[#122B49]" title={row.name}>
              {row.name}
            </h3>
            {sellerLinkEnabled ? (
              <AppLink
                href={sellerHref}
                className={`${ownerPillClass} transition-colors hover:border-slate-300 hover:bg-slate-50${tradeEnabled ? " pointer-events-auto" : ""}`}
              >
                {ownerPillInner}
              </AppLink>
            ) : (
              <span className={ownerPillClass}>{ownerPillInner}</span>
            )}
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5">
            {row.colours.map((c) => (
              <span
                key={c}
                className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600"
              >
                {c}
              </span>
            ))}
            {row.distanceKm != null ? (
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                ~{row.distanceKm.toFixed(0)} km
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
