"use client";

import { useState } from "react";
import {
  createInviteAndSendEmailAction,
  type BulkInviteResultRow,
} from "@/app/(main)/exchanges/actions";
import { MAX_BULK_INVITES, parseBulkInviteEmails } from "@/lib/bulk-invite-parse";
import { INVITE_EMAIL_GAP_MS } from "@/lib/mail-invite-rate";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

function deliveryLabel(d: "sent" | "skipped" | "failed"): string {
  switch (d) {
    case "sent":
      return "Email sent";
    case "skipped":
      return "Email not configured (link shown below)";
    case "failed":
      return "Email failed — use the link below";
    default:
      return d;
  }
}

function DeliveryStatusBadge({ delivery }: { delivery: "sent" | "skipped" | "failed" }) {
  const label = deliveryLabel(delivery);
  if (delivery === "sent") {
    return (
      <span className="badge badge-primary badge-sm mt-1 font-semibold" role="status">
        {label}
      </span>
    );
  }
  if (delivery === "failed") {
    return (
      <span className="badge badge-error badge-sm mt-1 font-semibold" role="alert">
        {label}
      </span>
    );
  }
  return (
    <span className="badge badge-warning badge-sm mt-1 font-semibold" role="status">
      {label}
    </span>
  );
}

function inviteRowUsedMailApi(row: BulkInviteResultRow): boolean {
  return "inviteUrl" in row;
}

type InviteRow =
  | { kind: "queued"; email: string }
  | { kind: "sending"; email: string }
  | { kind: "done"; result: BulkInviteResultRow };

function syncRowsForActiveIndex(emails: string[], prev: InviteRow[], activeIndex: number): InviteRow[] {
  return emails.map((email, j) => {
    if (j < activeIndex) {
      const p = prev[j];
      if (p?.kind === "done") return p;
      return { kind: "done", result: { email: emails[j]!, error: "Not sent." } };
    }
    if (j === activeIndex) {
      return { kind: "sending", email };
    }
    return { kind: "queued", email };
  });
}

/** After invite `lastDoneIndex` succeeds, show the next row as sending while we wait for the rate-limit gap. */
function rowsWithNextSendingDuringGap(emails: string[], prev: InviteRow[], lastDoneIndex: number): InviteRow[] {
  return emails.map((email, j) => {
    if (j <= lastDoneIndex) {
      const p = prev[j];
      if (p?.kind === "done") return p;
      return { kind: "done", result: { email: emails[j]!, error: "Not sent." } };
    }
    if (j === lastDoneIndex + 1) {
      return { kind: "sending", email };
    }
    return { kind: "queued", email };
  });
}

function rowEmail(row: InviteRow): string {
  return row.kind === "done" ? row.result.email : row.email;
}

export function PrivateInviteForm({ exchangeId }: { exchangeId: string }) {
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<InviteRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const raw = String(fd.get("emails") ?? "");
        setError(null);
        setResults(null);
        void (async () => {
          const emails = parseBulkInviteEmails(raw);
          if (emails.length === 0) {
            setError("Enter at least one email address.");
            return;
          }
          if (emails.length > MAX_BULK_INVITES) {
            setError(`Too many addresses at once (maximum ${MAX_BULK_INVITES}).`);
            return;
          }

          setIsSending(true);
          try {
            setResults(
              emails.map((email, j) =>
                j === 0 ? { kind: "sending" as const, email } : { kind: "queued" as const, email },
              ),
            );

            for (let i = 0; i < emails.length; i++) {
              setResults((prev) => {
                if (!prev) return prev;
                return syncRowsForActiveIndex(emails, prev, i);
              });

              const res = await createInviteAndSendEmailAction(exchangeId, emails[i]!);
              if (!res.ok) {
                setError(res.error);
                setResults((prev) => {
                  if (!prev) return prev;
                  return prev.map((row, j) => {
                    if (j === i) {
                      return { kind: "done", result: { email: emails[i]!, error: res.error } };
                    }
                    if (row.kind !== "done") {
                      return { kind: "done", result: { email: row.email, error: "Not sent." } };
                    }
                    return row;
                  });
                });
                break;
              }

              setResults((prev) => {
                if (!prev) return prev;
                const next = [...prev];
                next[i] = { kind: "done", result: res.row };
                return next;
              });

              const mailed = inviteRowUsedMailApi(res.row);
              if (mailed && i < emails.length - 1) {
                setResults((prev) => {
                  if (!prev) return prev;
                  return rowsWithNextSendingDuringGap(emails, prev, i);
                });
                await new Promise((r) => setTimeout(r, INVITE_EMAIL_GAP_MS));
              }
            }
          } finally {
            setIsSending(false);
          }
        })();
      }}
    >
      <label className="form-control w-full gap-1">
        <span className="text-sm font-semibold text-slate-700">Invite by email (comma-separated)</span>
        <textarea
          name="emails"
          required
          rows={4}
          autoComplete="off"
          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="reefer1@example.com, reefer2@example.com"
        />
        <span className="text-xs text-slate-500">
          Separate addresses with commas or new lines. Links expire in 14 days. When email delivery is enabled, the app
          waits {INVITE_EMAIL_GAP_MS / 1000} seconds after each sent message before sending the next (provider rate
          limit).
        </span>
      </label>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ color: MARKETING_LINK_BLUE }}
        disabled={isSending}
      >
        {isSending ? "Sending…" : "Send invites"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {results && results.length > 0 ? (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm"
          aria-live={isSending ? "polite" : "off"}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-800" style={{ color: MARKETING_NAVY }}>
              Results
            </p>
            {(() => {
              const total = results.length;
              const doneCount = results.filter((r) => r.kind === "done").length;
              const sendingIdx = results.findIndex((r) => r.kind === "sending");
              const waitingBetween =
                isSending && doneCount > 0 && doneCount < total && sendingIdx < 0;
              let statusLine = "";
              if (doneCount === total) {
                statusLine = `${doneCount} of ${total} complete`;
              } else if (sendingIdx >= 0) {
                statusLine = `Sending invite ${sendingIdx + 1} of ${total}…`;
              } else if (waitingBetween) {
                statusLine = `${doneCount} of ${total} complete — waiting before next send…`;
              } else {
                statusLine = `${doneCount} of ${total} complete`;
              }
              const progressPct = total > 0 ? (doneCount / total) * 100 : 0;
              return (
                <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:max-w-xs" role="status">
                  <p className="text-xs font-medium text-slate-600">{statusLine}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
          <ul className="mt-3 space-y-3">
            {results.map((row, i) => (
              <li
                key={`${rowEmail(row)}-${i}`}
                className={`rounded-lg border border-slate-200 bg-white p-3 transition-shadow duration-300 ${
                  row.kind === "sending" ? "animate-pulse ring-2 ring-primary/25" : ""
                }`}
              >
                <p className="font-medium text-slate-900">{rowEmail(row)}</p>
                {row.kind === "queued" ? (
                  <div className="mt-1">
                    <span className="badge badge-neutral badge-sm font-semibold">Queued</span>
                  </div>
                ) : null}
                {row.kind === "sending" ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="loading loading-spinner loading-xs text-primary" aria-hidden />
                    <span className="badge badge-info badge-sm font-semibold">Sending</span>
                  </div>
                ) : null}
                {row.kind === "done" ? (
                  <>
                    {"error" in row.result ? (
                      <p className="mt-1 text-xs text-rose-700">{row.result.error}</p>
                    ) : (
                      <>
                        <div className="mt-1">
                          <DeliveryStatusBadge delivery={row.result.emailDelivery} />
                        </div>
                        <p className="mt-2 break-all font-mono text-xs text-slate-700">{row.result.inviteUrl}</p>
                      </>
                    )}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
