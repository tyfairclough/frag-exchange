import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExchangeKind, TradeCoralEventHandoffStatus, TradeStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canIssuePrivateInvite, canManageEventDesk } from "@/lib/super-admin";
import { OperatorExchangeTabs } from "@/app/(main)/operator/components/operator-exchange-tabs";
import { checkInTradeCoralsFormAction } from "@/app/(main)/exchanges/event-handoff-actions";
import { handoffErrors } from "@/lib/event-handoff-errors";
import { bringsCoralUserId, recipientUserIdForHandoff } from "@/lib/event-handoff";

function displayName(alias: string | null, fallback: string) {
  return alias?.trim() || fallback;
}

export default async function EventOpsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; checkedIn?: string }>;
}) {
  const user = await requireUser();
  const { id: exchangeId } = await params;
  const sp = await searchParams;

  const db = getPrisma();
  const [exchange, membership] = await Promise.all([
    db.exchange.findUnique({ where: { id: exchangeId } }),
    db.exchangeMembership.findFirst({ where: { exchangeId, userId: user.id } }),
  ]);

  if (!exchange) {
    notFound();
  }

  if (exchange.kind !== ExchangeKind.EVENT) {
    redirect(`/exchanges/${exchangeId}`);
  }

  if (!canManageEventDesk(exchange, membership, user)) {
    redirect(`/exchanges/${exchangeId}?error=forbidden`);
  }

  const operatorTabs = (
    <OperatorExchangeTabs
      exchangeId={exchangeId}
      active="event-desk"
      exchangeKind={exchange.kind}
      showEventPickup={membership != null}
      showEventDesk
      showPrivateInvites={canIssuePrivateInvite(exchange, membership, user)}
    />
  );

  const lines = await db.tradeCoral.findMany({
    where: {
      eventHandoffStatus: { not: null },
      trade: { exchangeId, status: TradeStatus.APPROVED },
    },
    include: {
      coral: { include: { user: { select: { id: true, alias: true, email: true } } } },
      trade: {
        include: {
          initiator: { select: { id: true, alias: true } },
          peer: { select: { id: true, alias: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const awaiting = lines.filter((l) => l.eventHandoffStatus === TradeCoralEventHandoffStatus.AWAITING_CHECKIN);
  const checkedIn = lines.filter((l) => l.eventHandoffStatus === TradeCoralEventHandoffStatus.CHECKED_IN);
  const done = lines.filter((l) => l.eventHandoffStatus === TradeCoralEventHandoffStatus.CHECKED_OUT);

  const orphans = lines.filter(
    (l) =>
      l.eventHandoffStatus === TradeCoralEventHandoffStatus.AWAITING_CHECKIN ||
      l.eventHandoffStatus === TradeCoralEventHandoffStatus.CHECKED_IN,
  );

  const err = sp.error ? handoffErrors[sp.error] ?? "Something went wrong." : null;
  const checkedInN = sp.checkedIn ? Number(sp.checkedIn) : NaN;
  const checkedInOk = Number.isFinite(checkedInN) && checkedInN > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {operatorTabs}

      {checkedInOk ? (
        <div role="status" className="alert alert-success text-sm">
          Marked {checkedInN} coral{checkedInN === 1 ? "" : "s"} checked in.
        </div>
      ) : null}

      {err ? (
        <div role="alert" className="alert alert-error text-sm">
          {err}
        </div>
      ) : null}

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-base-content">Event desk</h1>
        <p className="text-sm text-base-content/70">
          Check in corals as they arrive. Members confirm collection on{" "}
          <Link href={`/exchanges/${exchangeId}/event-pickup`} className="link link-primary">
            Event pickup
          </Link>
          .
        </p>
      </header>

      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <h2 className="text-sm font-semibold text-base-content">Check in (subset)</h2>
          <p className="text-xs text-base-content/60">
            Select corals that have reached the desk, then submit. Status flows: awaiting check-in → checked in → member
            checks out when they leave with the coral.
          </p>
          {awaiting.length === 0 ? (
            <p className="text-sm text-base-content/70">No corals waiting at the desk right now.</p>
          ) : (
            <form action={checkInTradeCoralsFormAction} className="space-y-3">
              <input type="hidden" name="exchangeId" value={exchangeId} />
              <ul className="space-y-2">
                {awaiting.map((row) => {
                  const bringer = bringsCoralUserId(row.side, row.trade);
                  const recipient = recipientUserIdForHandoff(row.side, row.trade);
                  const bringerName =
                    bringer === row.trade.initiatorUserId
                      ? displayName(row.trade.initiator.alias, "Member")
                      : displayName(row.trade.peer.alias, "Member");
                  const recipientName =
                    recipient === row.trade.initiatorUserId
                      ? displayName(row.trade.initiator.alias, "Member")
                      : displayName(row.trade.peer.alias, "Member");
                  return (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-start gap-3 rounded-xl border border-base-content/10 bg-base-200/30 p-3"
                    >
                      <label className="flex cursor-pointer items-start gap-2">
                        <input type="checkbox" name="tradeCoralId" value={row.id} className="checkbox checkbox-sm mt-0.5" />
                        <span className="min-w-0">
                          <span className="font-medium text-base-content">{row.coral.name}</span>
                          <span className="mt-0.5 block text-xs text-base-content/60">
                            Brought by {bringerName} · Collecting: {recipientName}
                          </span>
                          <Link
                            href={`/exchanges/${exchangeId}/trades/${row.tradeId}`}
                            className="link link-primary text-xs"
                          >
                            View trade
                          </Link>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <button type="submit" className="btn btn-primary min-h-10 w-full rounded-xl sm:w-auto">
                Check in selected
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="card border border-warning/30 bg-base-100 shadow-sm">
        <div className="card-body gap-3 p-5">
          <h2 className="text-sm font-semibold text-base-content">Reconciliation — follow up</h2>
          <p className="text-xs text-base-content/60">
            Outstanding handoffs: not yet checked in, or checked in but the collecting member has not checked out. Use
            this list to chase people before you close the desk.
          </p>
          {orphans.length === 0 ? (
            <p className="text-sm text-base-content/70">Nothing outstanding — all event lines are checked out.</p>
          ) : (
            <ul className="space-y-2">
              {orphans.map((row) => {
                const bringer = bringsCoralUserId(row.side, row.trade);
                const recipient = recipientUserIdForHandoff(row.side, row.trade);
                const bringerName =
                  bringer === row.trade.initiatorUserId
                    ? displayName(row.trade.initiator.alias, "Member")
                    : displayName(row.trade.peer.alias, "Member");
                const recipientName =
                  recipient === row.trade.initiatorUserId
                    ? displayName(row.trade.initiator.alias, "Member")
                    : displayName(row.trade.peer.alias, "Member");
                const stuck =
                  row.eventHandoffStatus === TradeCoralEventHandoffStatus.AWAITING_CHECKIN
                    ? "Not checked in yet (bringer / desk)"
                    : "Checked in — collector has not checked out";
                return (
                  <li key={row.id} className="rounded-xl border border-base-content/10 bg-base-200/20 p-3 text-sm">
                    <p className="font-medium text-base-content">{row.coral.name}</p>
                    <p className="text-xs text-base-content/65">{stuck}</p>
                    <p className="text-xs text-base-content/55">
                      Bring: {bringerName} · Collect: {recipientName}
                    </p>
                    <Link href={`/exchanges/${exchangeId}/trades/${row.tradeId}`} className="link link-primary text-xs">
                      Trade
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-base-content/55">Checked in (awaiting pickup)</h2>
        {checkedIn.length === 0 ? (
          <p className="text-sm text-base-content/70">No corals sitting at the desk.</p>
        ) : (
          <ul className="space-y-2">
            {checkedIn.map((row) => {
              const recipient = recipientUserIdForHandoff(row.side, row.trade);
              const recipientName =
                recipient === row.trade.initiatorUserId
                  ? displayName(row.trade.initiator.alias, "Member")
                  : displayName(row.trade.peer.alias, "Member");
              return (
                <li key={row.id} className="rounded-xl border border-base-content/10 bg-base-100 p-3 text-sm">
                  <span className="font-medium text-base-content">{row.coral.name}</span>
                  <span className="mt-0.5 block text-xs text-base-content/60">Waiting for {recipientName} to check out</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-base-content/55">Completed today</h2>
        {done.length === 0 ? (
          <p className="text-sm text-base-content/70">No completed handoffs yet.</p>
        ) : (
          <ul className="space-y-1">
            {done.map((row) => (
              <li key={row.id} className="text-sm text-base-content/80">
                {row.coral.name} — checked out
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
