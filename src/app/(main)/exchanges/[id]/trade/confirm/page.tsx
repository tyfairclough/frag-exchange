import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canSubmitTradeSelection, getTradeInitiationDraft } from "@/lib/trade-initiation-draft";
import { loadTradeInitiationContext, tradeInitiationErrors } from "@/lib/trade-initiation-data";
import { InventoryItemCard } from "@/components/inventory-item-card";
import { submitTradeInitiationAction } from "@/app/(main)/exchanges/trade-actions";

export default async function ExchangeTradeConfirmPage({
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
    redirect(`/explore?exchangeId=${encodeURIComponent(exchangeId)}`);
  }

  const { exchange, peer, myRows, theirRows } = await loadTradeInitiationContext(exchangeId, viewer, peerUserId);
  const draft = await getTradeInitiationDraft(exchangeId, viewer.id, peerUserId);
  const receiveSet = new Set(draft.receiveItemIds);
  const offerSet = new Set(draft.offerItemIds);
  const receiveRows = theirRows.filter((row) => receiveSet.has(row.inventoryItemId));
  const offerRows = myRows.filter((row) => offerSet.has(row.inventoryItemId));
  const receiveAllFreeToGoodHome = receiveRows.length > 0 && receiveRows.every((row) => row.inventoryItem.freeToGoodHome);
  const valid = canSubmitTradeSelection({
    receiveCount: receiveRows.length,
    offerCount: offerRows.length,
    receiveAllFreeToGoodHome,
  });
  const err = sp.error ? tradeInitiationErrors[sp.error] ?? "Something went wrong." : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <Link
        href={`/exchanges/${encodeURIComponent(exchangeId)}/trade/offer?with=${encodeURIComponent(peerUserId)}`}
        className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl"
      >
        Back to you offer
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Step 3 of 3</p>
        <h1 className="text-xl font-semibold text-base-content">Confirm trade offer</h1>
        <p className="text-sm text-base-content/70">
          Review the final offer to{" "}
          <span className="font-medium text-base-content">
            {peer.avatarEmoji ? `${peer.avatarEmoji} ` : ""}
            {peer.alias ?? "Member"}
          </span>{" "}
          on {exchange.name}.
        </p>
      </header>

      {err ? (
        <div role="alert" className="alert alert-error text-sm">
          {err}
        </div>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-base-content">You receive</h2>
          <Link
            href={`/exchanges/${encodeURIComponent(exchangeId)}/trade/receive/select?with=${encodeURIComponent(peerUserId)}`}
            className="btn btn-ghost btn-xs"
          >
            Add / edit
          </Link>
        </div>
        <ul className="flex flex-col gap-3">
          {receiveRows.map((row) => (
            <li key={row.id}>
              <InventoryItemCard item={row.inventoryItem} titleHeading="h3" />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-base-content">You offer</h2>
          <Link
            href={`/exchanges/${encodeURIComponent(exchangeId)}/trade/offer?with=${encodeURIComponent(peerUserId)}`}
            className="btn btn-ghost btn-xs"
          >
            Add / edit
          </Link>
        </div>
        {offerRows.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {offerRows.map((row) => (
              <li key={row.id}>
                <InventoryItemCard item={row.inventoryItem} titleHeading="h3" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-base-content/15 bg-base-200/35 p-4 text-sm text-base-content/75">
            {receiveAllFreeToGoodHome
              ? "No offer items selected. This is allowed because all receive items are free to good home."
              : "Add at least one offer item to continue."}
          </div>
        )}
      </section>

      <form action={submitTradeInitiationAction}>
        <input type="hidden" name="exchangeId" value={exchangeId} />
        <input type="hidden" name="peerUserId" value={peerUserId} />
        {draft.receiveItemIds.map((id) => (
          <input key={`r-${id}`} type="hidden" name="peerItemIds" value={id} />
        ))}
        {draft.offerItemIds.map((id) => (
          <input key={`o-${id}`} type="hidden" name="initiatorItemIds" value={id} />
        ))}
        <button type="submit" className={`btn min-h-11 w-full rounded-xl ${valid ? "btn-primary" : "btn-disabled"}`} disabled={!valid}>
          Submit trade offer
        </button>
      </form>
    </div>
  );
}
