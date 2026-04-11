"use client";

import { useTransition } from "react";
import { deleteInventoryItemAction } from "@/app/(main)/my-items/actions";

export function DeleteCoralButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full border border-rose-300 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:pointer-events-none disabled:opacity-50"
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
