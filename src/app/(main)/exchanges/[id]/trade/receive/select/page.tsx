import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTradeInitiationDraft } from "@/lib/trade-initiation-draft";
import { loadTradeInitiationContext, tradeInitiationErrors } from "@/lib/trade-initiation-data";
import { InventoryItemCard } from "@/components/inventory-item-card";
import { updateTradeReceiveSelectionAction } from "@/app/(main)/exchanges/trade-actions";
import { BackLink } from "@/components/back-link";

export default async function ExchangeTradeReceiveSelectPage({
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
        <BackLink href={`/explore?exchangeId=${encodeURIComponent(exchangeId)}`} className="min-h-10">
          Back to explore
        </BackLink>
        <p className="text-sm text-base-content/70">Open this page from a listing to choose a trade partner.</p>
      </div>
    );
  }

  const { peer, theirRows } = await loadTradeInitiationContext(exchangeId, viewer, peerUserId);
  const draft = await getTradeInitiationDraft(exchangeId, viewer.id, peerUserId);
  const selectedSet = new Set(draft.receiveItemIds);
  const err = sp.error ? tradeInitiationErrors[sp.error] ?? "Something went wrong." : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <BackLink
        href={`/exchanges/${encodeURIComponent(exchangeId)}/trade/receive?with=${encodeURIComponent(peerUserId)}`}
        className="min-h-10"
      >
        Back to you receive
      </BackLink>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Step 1 of 3</p>
        <h1 className="text-xl font-semibold text-base-content">Add items you receive</h1>
        <p className="text-sm text-base-content/70">Pick from {peer.alias ?? "member"}&apos;s active listings.</p>
      </header>

      {err ? (
        <div role="alert" className="alert alert-error text-sm">
          {err}
        </div>
      ) : null}

      <form action={updateTradeReceiveSelectionAction} className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-5 p-5">
          <input type="hidden" name="exchangeId" value={exchangeId} />
          <input type="hidden" name="peerUserId" value={peerUserId} />
          <ul className="flex flex-col gap-3">
            {theirRows.map((row) => (
              <li key={row.id}>
                <InventoryItemCard
                  item={row.inventoryItem}
                  titleHeading="h3"
                  selection={{
                    inputName: "receiveItemIds",
                    value: row.inventoryItemId,
                    defaultChecked: selectedSet.has(row.inventoryItemId),
                  }}
                />
              </li>
            ))}
          </ul>
          <button type="submit" className="btn btn-primary min-h-11 w-full rounded-xl">
            Save receive list
          </button>
        </div>
      </form>
    </div>
  );
}
