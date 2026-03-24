"use client";

import { useTransition } from "react";
import { deleteCoralAction } from "@/app/(main)/my-corals/actions";

export function DeleteCoralButton({ coralId }: { coralId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-outline btn-error btn-sm min-h-10 rounded-xl"
      disabled={pending}
      onClick={() => {
        if (typeof window !== "undefined" && window.confirm("Delete this coral from your inventory?")) {
          startTransition(() => {
            void deleteCoralAction(coralId);
          });
        }
      }}
    >
      {pending ? <span className="loading loading-spinner loading-sm" /> : null}
      Delete
    </button>
  );
}
