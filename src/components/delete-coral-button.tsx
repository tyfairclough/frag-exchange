"use client";

import { useTransition } from "react";
import { deleteInventoryItemAction } from "@/app/(main)/my-items/actions";

export function DeleteCoralButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-error btn-sm min-h-9 rounded-xl"
      disabled={pending}
      onClick={() => {
        if (typeof window !== "undefined" && window.confirm("Delete this item from your inventory?")) {
          startTransition(() => {
            void deleteInventoryItemAction(itemId);
          });
        }
      }}
    >
      {pending ? <span className="loading loading-spinner loading-sm" /> : null}
      Delete
    </button>
  );
}
