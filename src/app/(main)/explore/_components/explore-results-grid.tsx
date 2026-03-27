import Link from "next/link";
import { CoralListingCard } from "@/components/coral-listing-card";
import type { DiscoverRow } from "@/lib/discover-listings";

export function ExploreResultsGrid({ rows, exchangeId }: { rows: DiscoverRow[]; exchangeId: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">No listings match these filters.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {rows.map((row) => (
        <li key={row.listingId}>
          <CoralListingCard row={row} exchangeId={exchangeId} idPrefix="explore" />
        </li>
      ))}
    </ul>
  );
}

export function ExploreOwnerScopeNote({
  ownerAlias,
  showAllReefersHref,
}: {
  ownerAlias: string | null;
  showAllReefersHref: string;
}) {
  return (
    <p className="text-xs text-slate-600">
      Showing listings from <span className="font-medium text-slate-900">{ownerAlias ?? "one reefer"}</span>.{" "}
      <Link href={showAllReefersHref} className="link font-medium text-emerald-600">
        Show all reefers
      </Link>
    </p>
  );
}
