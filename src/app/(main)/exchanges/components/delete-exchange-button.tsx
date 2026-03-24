"use client";

import { useRef } from "react";
import { deleteExchangeAction } from "@/app/(main)/exchanges/actions";

export function DeleteExchangeButton({
  exchangeId,
  exchangeName,
}: {
  exchangeId: string;
  exchangeName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteExchangeAction}>
      <input type="hidden" name="exchangeId" value={exchangeId} />
      <button
        type="button"
        className="inline-flex min-h-10 items-center rounded-full border border-rose-300 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
        onClick={() => {
          if (
            confirm(
              `Delete “${exchangeName}”? This removes all memberships, invites, and listings for this exchange.`,
            )
          ) {
            formRef.current?.requestSubmit();
          }
        }}
      >
        Delete exchange
      </button>
    </form>
  );
}
