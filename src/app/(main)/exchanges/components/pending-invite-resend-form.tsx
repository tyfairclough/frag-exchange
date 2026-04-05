"use client";

import { useActionState } from "react";
import { resendExchangeInviteEmailAction } from "@/app/(main)/exchanges/actions";

export function PendingInviteResendForm({
  inviteId,
  exchangeId,
}: {
  inviteId: string;
  exchangeId: string;
}) {
  const [state, formAction, isPending] = useActionState(resendExchangeInviteEmailAction, null);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="inviteId" value={inviteId} />
      <input type="hidden" name="exchangeId" value={exchangeId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Resend invitation"}
      </button>
      {state?.ok === false ? (
        <span className="max-w-[14rem] text-xs text-rose-600">{state.message}</span>
      ) : null}
      {state?.ok === true ? (
        <span className="text-xs text-emerald-700">Invitation email sent.</span>
      ) : null}
    </form>
  );
}
