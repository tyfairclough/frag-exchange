"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InventoryKind } from "@/generated/prisma/enums";
import {
  addExchangeListingForItemAction,
  removeExchangeListingsForItemAction,
  type ListingActionError,
} from "@/app/(main)/exchanges/listing-actions";
import { isKindAllowedOnExchange } from "@/lib/listing-eligibility";

export type ManageItemListingsExchange = {
  id: string;
  name: string;
  allowCoral: boolean;
  allowFish: boolean;
  allowEquipment: boolean;
};

function errorMessage(error: ListingActionError): string {
  switch (error) {
    case "address":
      return "Add your address to list on group exchanges.";
    case "forbidden":
      return "Join that exchange before listing there.";
    case "item":
      return "This item cannot be listed right now.";
    case "kind":
      return "That item type is not enabled on this exchange.";
    case "rate_limit":
      return "Too many actions — wait a moment and try again.";
    case "invalid":
    case "missing":
    default:
      return "Something went wrong. Try again.";
  }
}

export type ManageItemListingsPanelProps = {
  itemId: string;
  itemKind: InventoryKind;
  remainingQuantity: number;
  exchanges: ManageItemListingsExchange[];
  listedExchangeIds: string[];
  onDismiss: () => void;
  /** Label for the primary dismiss control on the manage step (dialog: "Close", post-create page: "Done"). */
  dismissButtonLabel?: string;
};

/**
 * Shared UI for choosing which exchanges an item is listed on — same toggles and copy as the my-items modal.
 */
export function ManageItemListingsPanel({
  itemId,
  itemKind,
  remainingQuantity,
  exchanges,
  listedExchangeIds,
  onDismiss,
  dismissButtonLabel = "Close",
}: ManageItemListingsPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<"manage" | "confirm">("manage");
  const [pendingRemovalIds, setPendingRemovalIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  /** Set while listing on a single exchange or all eligible (server action + refresh). */
  const [pendingListOn, setPendingListOn] = useState<
    { kind: "one"; exchangeId: string } | { kind: "all" } | null
  >(null);

  const listedIds = useMemo(() => new Set(listedExchangeIds), [listedExchangeIds]);

  const eligibleRows = useMemo(() => {
    return exchanges.map((ex) => ({
      exchange: ex,
      eligible: isKindAllowedOnExchange(itemKind, ex),
    }));
  }, [exchanges, itemKind]);

  const eligibleExchangeIds = useMemo(
    () => eligibleRows.filter((r) => r.eligible).map((r) => r.exchange.id),
    [eligibleRows],
  );

  const listedEligibleIds = useMemo(
    () => eligibleExchangeIds.filter((id) => listedIds.has(id)),
    [eligibleExchangeIds, listedIds],
  );

  const allEligibleListed =
    eligibleExchangeIds.length > 0 && listedEligibleIds.length === eligibleExchangeIds.length;
  const noneListedAmongEligible = listedEligibleIds.length === 0;

  const masterToggleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = masterToggleRef.current;
    if (!el) {
      return;
    }
    el.indeterminate = !allEligibleListed && !noneListedAmongEligible && eligibleExchangeIds.length > 0;
  }, [allEligibleListed, noneListedAmongEligible, eligibleExchangeIds.length]);

  const openRemovalConfirm = (exchangeIds: string[]) => {
    const toRemove = exchangeIds.filter((id) => listedIds.has(id));
    if (toRemove.length === 0) {
      return;
    }
    setPendingRemovalIds(toRemove);
    setStep("confirm");
    setError(null);
  };

  const handlePerExchangeToggle = (exchangeId: string, eligible: boolean, nextOn: boolean) => {
    if (!eligible || isPending || pendingListOn) {
      return;
    }
    if (nextOn) {
      startTransition(async () => {
        setPendingListOn({ kind: "one", exchangeId });
        setError(null);
        try {
          const res = await addExchangeListingForItemAction({ inventoryItemId: itemId, exchangeId });
          if (!res.ok) {
            setError(errorMessage(res.error));
            return;
          }
          router.refresh();
        } finally {
          setPendingListOn(null);
        }
      });
      return;
    }
    openRemovalConfirm([exchangeId]);
  };

  const handleMasterToggle = (nextOn: boolean) => {
    if (isPending || pendingListOn || eligibleExchangeIds.length === 0) {
      return;
    }
    if (nextOn) {
      const toAdd = eligibleExchangeIds.filter((id) => !listedIds.has(id));
      if (toAdd.length === 0) {
        return;
      }
      startTransition(async () => {
        setPendingListOn({ kind: "all" });
        setError(null);
        try {
          for (const exchangeId of toAdd) {
            const res = await addExchangeListingForItemAction({ inventoryItemId: itemId, exchangeId });
            if (!res.ok) {
              setError(errorMessage(res.error));
              router.refresh();
              return;
            }
          }
          router.refresh();
        } finally {
          setPendingListOn(null);
        }
      });
      return;
    }
    openRemovalConfirm(listedEligibleIds);
  };

  const confirmRemove = () => {
    if (pendingRemovalIds.length === 0) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await removeExchangeListingsForItemAction({
        inventoryItemId: itemId,
        exchangeIds: pendingRemovalIds,
      });
      if (!res.ok) {
        setError(errorMessage(res.error));
        return;
      }
      setStep("manage");
      setPendingRemovalIds([]);
      onDismiss();
      router.refresh();
    });
  };

  if (exchanges.length === 0 || remainingQuantity <= 0) {
    return null;
  }

  const pendingNames = pendingRemovalIds
    .map((id) => exchanges.find((e) => e.id === id)?.name ?? id)
    .join(", ");

  return (
    <div className="max-w-md space-y-4">
      {step === "manage" ? (
        <>
          <h2 className="text-lg font-bold text-base-content">List on exchanges</h2>
          <p className="text-sm text-base-content/70">
            Choose which of your exchanges this item appears on. Turning off a listing can cancel open offers
            involving this item on that exchange.
          </p>
          {error ? (
            <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          ) : null}

          {exchanges.length > 1 && eligibleExchangeIds.length > 0 ? (
            <div className="flex items-center justify-between gap-3 border-b border-base-content/10 pb-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-base-content">All exchanges</p>
                <p className="text-xs text-base-content/60">Eligible exchanges only</p>
              </div>
              {pendingListOn?.kind === "all" ? (
                <span className="loading loading-spinner loading-md shrink-0 text-primary" aria-hidden />
              ) : (
                <input
                  ref={masterToggleRef}
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={allEligibleListed}
                  disabled={isPending || Boolean(pendingListOn)}
                  onChange={(e) => handleMasterToggle(e.target.checked)}
                  aria-label="Toggle all eligible exchanges"
                />
              )}
            </div>
          ) : null}

          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {eligibleRows.map(({ exchange, eligible }) => {
              const on = listedIds.has(exchange.id);
              const rowListingOn = pendingListOn?.kind === "one" && pendingListOn.exchangeId === exchange.id;
              return (
                <li
                  key={exchange.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-base-content/10 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-base-content">{exchange.name}</p>
                    {!eligible ? (
                      <p className="text-xs text-base-content/50">This exchange does not accept this item type.</p>
                    ) : null}
                  </div>
                  {rowListingOn ? (
                    <span
                      className="loading loading-spinner loading-sm shrink-0 text-primary"
                      aria-label="Listing on this exchange…"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm shrink-0"
                      checked={eligible && on}
                      disabled={!eligible || isPending || Boolean(pendingListOn)}
                      onChange={(e) => handlePerExchangeToggle(exchange.id, eligible, e.target.checked)}
                      aria-label={`List on ${exchange.name}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="modal-action mt-0">
            <button type="button" className="btn btn-ghost rounded-xl" onClick={onDismiss}>
              {dismissButtonLabel}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-bold text-base-content">Remove listing?</h2>
          <p className="text-sm text-base-content/70">
            Any open offers or counter-offers that include this item on{" "}
            {pendingRemovalIds.length > 1 ? "these exchanges" : "this exchange"} will be cancelled. Approved trades
            are not affected.
          </p>
          {pendingRemovalIds.length > 0 ? (
            <p className="text-sm font-medium text-base-content">{pendingNames}</p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          ) : null}
          <div className="modal-action mt-0 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost rounded-xl"
              disabled={isPending}
              onClick={() => {
                setStep("manage");
                setPendingRemovalIds([]);
                setError(null);
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-error btn-outline rounded-xl"
              disabled={isPending}
              onClick={confirmRemove}
            >
              {isPending ? <span className="loading loading-spinner loading-sm" /> : null}
              Remove listing
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ManageItemListingsDialog({
  itemId,
  itemKind,
  remainingQuantity,
  exchanges,
  listedExchangeIds,
}: {
  itemId: string;
  itemKind: InventoryKind;
  remainingQuantity: number;
  exchanges: ManageItemListingsExchange[];
  listedExchangeIds: string[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) {
      return;
    }
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  const closeDialog = () => {
    setOpen(false);
  };

  if (exchanges.length === 0 || remainingQuantity <= 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSession((s) => s + 1);
          setOpen(true);
        }}
        className="btn btn-ghost btn-sm !h-9 !min-h-9 shrink-0 rounded-xl"
      >
        Manage listings
      </button>
      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        onClose={() => {
          setOpen(false);
        }}
      >
        <div className="modal-box max-w-md">
          <ManageItemListingsPanel
            key={session}
            itemId={itemId}
            itemKind={itemKind}
            remainingQuantity={remainingQuantity}
            exchanges={exchanges}
            listedExchangeIds={listedExchangeIds}
            onDismiss={closeDialog}
          />
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" className="cursor-default">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
