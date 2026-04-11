"use client";

import { useRouter } from "next/navigation";
import type { InventoryKind } from "@/generated/prisma/enums";
import {
  ManageItemListingsPanel,
  type ManageItemListingsExchange,
} from "@/components/manage-item-listings-dialog";

export function PostSaveItemListings({
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
  const router = useRouter();

  return (
    <div className="card border border-base-content/10 bg-base-200/45 shadow-sm">
      <div className="card-body p-5">
        <ManageItemListingsPanel
          itemId={itemId}
          itemKind={itemKind}
          remainingQuantity={remainingQuantity}
          exchanges={exchanges}
          listedExchangeIds={listedExchangeIds}
          onDismiss={() => router.push("/my-items")}
          dismissButtonLabel="Done"
        />
      </div>
    </div>
  );
}
