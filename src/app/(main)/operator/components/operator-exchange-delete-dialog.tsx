"use client";

import { useEffect, useRef, useState } from "react";
import { deleteExchangeAction } from "@/app/(main)/exchanges/actions";

export function OperatorExchangeDeleteDialog({
  exchangeId,
  exchangeName,
}: {
  exchangeId: string;
  exchangeName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center rounded-full border border-rose-300 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Delete exchange
      </button>
      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        onClose={() => setOpen(false)}
      >
        <div className="modal-box max-w-md space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Delete this exchange?</h2>
          <p className="text-sm text-slate-600">
            This will remove all memberships, invites, and listings for{" "}
            <span className="font-semibold text-slate-800">“{exchangeName}”</span>. This cannot be undone.
          </p>
          <div className="modal-action mt-0 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <form action={deleteExchangeAction}>
              <input type="hidden" name="exchangeId" value={exchangeId} />
              <button
                type="submit"
                className="btn rounded-full border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
              >
                Delete permanently
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
