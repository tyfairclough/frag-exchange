import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  canSubmitTradeSelection,
  getTradeInitiationDraft,
  requiresOfferItems,
} from "@/lib/trade-initiation-draft";
import { loadTradeInitiationContext, tradeInitiationErrors } from "@/lib/trade-initiation-data";
import { ListingIntent } from "@/generated/prisma/enums";
import { InventoryItemCard } from "@/components/inventory-item-card";
import { updateTradeOfferSelectionAction } from "@/app/(main)/exchanges/trade-actions";

export default async function ExchangeTradeOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ with?: string; error?: string }>;
}) {
  const viewer = await requireUser();
  const { id: exchangeId } = await params;
  const sp = await searchParams;
  const peerUserId = sp.with?.trim();

  if (!peerUserId) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        <Link href={`/explore?exchangeId=${encodeURIComponent(exchangeId)}`} className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl">
          Back to explore
        </Link>
        <p className="text-sm text-base-content/70">Open this page from a listing to choose a trade partner.</p>
      </div>
    );
  }

  const { myRows, theirRows } = await loadTradeInitiationContext(exchangeId, viewer, peerUserId);
  const draft = await getTradeInitiationDraft(exchangeId, viewer.id, peerUserId);
  const selectedReceiveIds = new Set(draft.receiveItemIds);
  const receiveRows = theirRows.filter((row) => selectedReceiveIds.has(row.inventoryItemId));
  if (receiveRows.length < 1) {
    redirect(`/exchanges/${encodeURIComponent(exchangeId)}/trade/receive?with=${encodeURIComponent(peerUserId)}&error=receive-required`);
  }
  const receiveAllFreeToGoodHome =
    receiveRows.length > 0 && receiveRows.every((row) => row.inventoryItem.listingIntent === ListingIntent.FREE);
  const offerRequired = requiresOfferItems(receiveAllFreeToGoodHome);
  const selectedOfferSet = new Set(draft.offerItemIds);
  const err = sp.error ? tradeInitiationErrors[sp.error] ?? "Something went wrong." : null;
  const canContinue = canSubmitTradeSelection({
    receiveCount: receiveRows.length,
    offerCount: draft.offerItemIds.length,
    receiveAllFreeToGoodHome,
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <Link
        href={`/exchanges/${encodeURIComponent(exchangeId)}/trade/receive?with=${encodeURIComponent(peerUserId)}`}
        className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl"
      >
        Back to you receive
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Step 2 of 3</p>
        <h1 className="text-xl font-semibold text-base-content">You offer</h1>
        <p className="text-sm text-base-content/70">
          {offerRequired
            ? "Choose at least one of your items to offer."
            : "Everything you receive is free to good home, so offering items is optional."}
        </p>
      </header>

      {err ? (
        <div role="alert" className="alert alert-error text-sm">
          {err}
        </div>
      ) : null}

      <form action={updateTradeOfferSelectionAction} className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-5 p-5">
          <input type="hidden" name="exchangeId" value={exchangeId} />
          <input type="hidden" name="peerUserId" value={peerUserId} />
          <ul className="flex flex-col gap-3">
            {myRows.map((row) => (
              <li key={row.id}>
                <InventoryItemCard
                  item={row.inventoryItem}
                  titleHeading="h3"
                  selection={{
                    inputName: "offerItemIds",
                    value: row.inventoryItemId,
                    defaultChecked: selectedOfferSet.has(row.inventoryItemId),
                  }}
                />
              </li>
            ))}
          </ul>

          <button type="submit" className="btn btn-primary min-h-11 w-full rounded-xl">
            Continue to confirm
          </button>
          {!canContinue ? (
            <p className="text-xs text-base-content/60">Add at least one offer item before continuing.</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
