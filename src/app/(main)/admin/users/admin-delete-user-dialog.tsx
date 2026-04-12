"use client";

import { useEffect, useRef, useState } from "react";
import { deleteUserAction } from "@/app/(main)/admin/users/actions";

export function AdminDeleteUserDialog({
  userId,
  email,
  disabled,
}: {
  userId: string;
  email: string;
  disabled?: boolean;
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

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-60"
        title="You cannot delete this account."
      >
        Delete
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Delete
      </button>
      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        onClose={() => setOpen(false)}
      >
        <div className="modal-box max-w-md space-y-4 text-left">
          <h2 className="text-lg font-bold text-slate-900">Delete user?</h2>
          <p className="text-sm text-slate-600">
            This will permanently remove{" "}
            <span className="font-semibold text-slate-800">“{email}”</span> from REEFX. All of their items will be
            removed from every exchange. Any confirmed trades they were part of will be cancelled. Other members with
            affected trades may be notified by email. This cannot be undone.
          </p>
          <div className="modal-action mt-0 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <form action={deleteUserAction}>
              <input type="hidden" name="userId" value={userId} />
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
