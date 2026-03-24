"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "@/app/(main)/exchanges/actions";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

export function PrivateInviteForm({ exchangeId }: { exchangeId: string }) {
  const [pending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = String(fd.get("email") ?? "").trim();
        setError(null);
        setInviteUrl(null);
        startTransition(async () => {
          const res = await createInviteAction(exchangeId, email);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setInviteUrl(res.inviteUrl);
        });
      }}
    >
      <label className="form-control w-full gap-1">
        <span className="text-sm font-semibold text-slate-700">Invite by email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="hobbyist@example.com"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ color: MARKETING_LINK_BLUE }}
        disabled={pending}
      >
        {pending ? "Creating…" : "Create invite link"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {inviteUrl ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="font-semibold text-emerald-800" style={{ color: MARKETING_NAVY }}>
            Share this link with the invitee (expires in 14 days):
          </p>
          <p className="mt-2 break-all font-mono text-xs text-slate-700">{inviteUrl}</p>
          <p className="mt-2 text-xs text-slate-600">
            They must sign in with the same email. Production email delivery for invites can plug in later (Chunk 9).
          </p>
        </div>
      ) : null}
    </form>
  );
}
