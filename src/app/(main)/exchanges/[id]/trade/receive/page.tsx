import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTradeInitiationDraft } from "@/lib/trade-initiation-draft";
import { loadTradeInitiationContext, tradeInitiationErrors } from "@/lib/trade-initiation-data";
import { InventoryItemCard } from "@/components/inventory-item-card";

export default async function ExchangeTradeReceivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ with?: string; focus?: string; error?: string }>;
}) {
  const viewer = await requireUser();
  const { id: exchangeId } = await params;
  const sp = await searchParams;
  const peerUserId = sp.with?.trim();
  const focusItemId = sp.focus?.trim();

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

  const { exchange, peer, myRows, theirRows } = await loadTradeInitiationContext(exchangeId, viewer, peerUserId);
  const draft = await getTradeInitiationDraft(exchangeId, viewer.id, peerUserId);

  const validPeerItemIds = new Set(theirRows.map((row) => row.inventoryItemId));
  let receiveItemIds = draft.receiveItemIds.filter((id) => validPeerItemIds.has(id));
  if (receiveItemIds.length === 0 && focusItemId && validPeerItemIds.has(focusItemId)) {
    receiveItemIds = [focusItemId];
  } else if (receiveItemIds.length !== draft.receiveItemIds.length) {
    // Keep UI state aligned to currently valid peer items without mutating cookies in render.
  }

  const receiveRows = theirRows.filter((row) => receiveItemIds.includes(row.inventoryItemId));
  const err = sp.error ? tradeInitiationErrors[sp.error] ?? "Something went wrong." : null;
  const offerHref = `/exchanges/${encodeURIComponent(exchangeId)}/trade/offer?with=${encodeURIComponent(peerUserId)}`;
  const selectHref = `/exchanges/${encodeURIComponent(exchangeId)}/trade/receive/select?with=${encodeURIComponent(peerUserId)}`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <Link href={`/explore?exchangeId=${encodeURIComponent(exchangeId)}`} className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl">
        Back to explore
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Step 1 of 3</p>
        <h1 className="text-xl font-semibold text-base-content">You receive</h1>
        <p className="text-sm text-base-content/70">
          Trade with{" "}
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

      {myRows.length === 0 || theirRows.length === 0 ? (
        <div className="card border border-base-content/10 bg-base-200/40 shadow-sm">
          <div className="card-body gap-2 p-5 text-sm text-base-content/80">
            {myRows.length === 0 ? (
              <p>List at least one item on this exchange before you can propose a swap.</p>
            ) : (
              <p>They do not have any active listings on this exchange right now.</p>
            )}
            <Link href={`/exchanges/${encodeURIComponent(exchangeId)}`} className="btn btn-outline btn-sm min-h-10 w-fit rounded-xl">
              Manage listings
            </Link>
          </div>
        </div>
      ) : (
        <>
          {receiveRows.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {receiveRows.map((row) => (
                <li key={row.id}>
                  <InventoryItemCard item={row.inventoryItem} titleHeading="h3" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-base-content/15 bg-base-200/35 p-4 text-sm text-base-content/75">
              Choose at least one item you would like to receive.
            </div>
          )}

          <Link href={selectHref} className="btn btn-outline min-h-11 rounded-xl">
            Add more from this user
          </Link>

          <Link
            href={offerHref}
            className={`btn min-h-11 rounded-xl ${receiveRows.length > 0 ? "btn-primary" : "btn-disabled"}`}
            aria-disabled={receiveRows.length < 1}
          >
            Continue to you offer
          </Link>
        </>
      )}
    </div>
  );
}
