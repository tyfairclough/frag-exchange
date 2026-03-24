import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExchangeKind, TradeCoralEventHandoffStatus, TradeStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { checkOutTradeCoralFormAction } from "@/app/(main)/exchanges/event-handoff-actions";
import { handoffErrors } from "@/lib/event-handoff-errors";
import { bringsCoralUserId, recipientUserIdForHandoff } from "@/lib/event-handoff";

function displayName(alias: string | null, fallback: string) {
  return alias?.trim() || fallback;
}

export default async function EventPickupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; checkedOut?: string }>;
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

  if (!membership) {
    redirect(`/exchanges/${exchangeId}?error=forbidden`);
  }

  const lines = await db.tradeCoral.findMany({
    where: {
      eventHandoffStatus: { not: null },
      trade: {
        exchangeId,
        status: TradeStatus.APPROVED,
        OR: [{ initiatorUserId: user.id }, { peerUserId: user.id }],
      },
    },
    include: {
      coral: true,
      trade: {
        include: {
          initiator: { select: { id: true, alias: true } },
          peer: { select: { id: true, alias: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const myBring = lines.filter(
    (l) =>
      bringsCoralUserId(l.side, l.trade) === user.id &&
      l.eventHandoffStatus === TradeCoralEventHandoffStatus.AWAITING_CHECKIN,
  );

  const myCollect = lines.filter((l) => recipientUserIdForHandoff(l.side, l.trade) === user.id);

  const err = sp.error ? handoffErrors[sp.error] ?? "Something went wrong." : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
      <Link href={`/exchanges/${exchangeId}`} className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl">
        Back to exchange
      </Link>

      {sp.checkedOut === "1" ? (
        <div role="status" className="alert alert-success text-sm">
          Checked out — you&apos;ve confirmed you collected that coral.
        </div>
      ) : null}

      {err ? (
        <div role="alert" className="alert alert-error text-sm">
          {err}
        </div>
      ) : null}

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-base-content">Event pickup</h1>
        <p className="text-sm text-base-content/70">
          Approved trades for this event. Bring your outgoing corals to the desk; confirm when you&apos;ve collected what
          you&apos;re receiving.
        </p>
      </header>

      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-3 p-5">
          <h2 className="text-sm font-semibold text-base-content">Bring to the desk</h2>
          <p className="text-xs text-base-content/60">These are your corals that still need a manager check-in.</p>
          {myBring.length === 0 ? (
            <p className="text-sm text-base-content/70">Nothing waiting from you at the desk.</p>
          ) : (
            <ul className="space-y-2">
              {myBring.map((row) => (
                <li key={row.id} className="rounded-xl border border-base-content/10 bg-base-200/30 p-3 text-sm">
                  <span className="font-medium text-base-content">{row.coral.name}</span>
                  <p className="text-xs text-base-content/60">Take this coral to the event manager check-in desk.</p>
                  <Link href={`/exchanges/${exchangeId}/trades/${row.tradeId}`} className="link link-primary text-xs">
                    View trade
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <h2 className="text-sm font-semibold text-base-content">Collecting (your incoming corals)</h2>
          <p className="text-xs text-base-content/60">
            After the desk checks a coral in, confirm here once you physically have it.
          </p>
          {myCollect.length === 0 ? (
            <p className="text-sm text-base-content/70">You have no incoming corals on approved event trades.</p>
          ) : (
            <ul className="space-y-3">
              {myCollect.map((row) => {
                const other =
                  row.trade.initiatorUserId === user.id
                    ? displayName(row.trade.peer.alias, "Trading partner")
                    : displayName(row.trade.initiator.alias, "Trading partner");
                const status = row.eventHandoffStatus;
                const canCheckOut = status === TradeCoralEventHandoffStatus.CHECKED_IN;
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 rounded-xl border border-base-content/10 bg-base-200/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-base-content">{row.coral.name}</p>
                      <p className="text-xs text-base-content/60">From {other}</p>
                      {status === TradeCoralEventHandoffStatus.AWAITING_CHECKIN ? (
                        <p className="mt-1 text-xs text-warning">Waiting for check-in at the desk</p>
                      ) : null}
                      {status === TradeCoralEventHandoffStatus.CHECKED_IN ? (
                        <p className="mt-1 text-xs text-success">Checked in — pick up from the desk, then confirm below</p>
                      ) : null}
                      {status === TradeCoralEventHandoffStatus.CHECKED_OUT ? (
                        <p className="mt-1 text-xs text-base-content/55">You checked out — collected</p>
                      ) : null}
                      <Link href={`/exchanges/${exchangeId}/trades/${row.tradeId}`} className="link link-primary text-xs">
                        View trade
                      </Link>
                    </div>
                    {canCheckOut ? (
                      <form action={checkOutTradeCoralFormAction}>
                        <input type="hidden" name="exchangeId" value={exchangeId} />
                        <input type="hidden" name="tradeCoralId" value={row.id} />
                        <button type="submit" className="btn btn-primary btn-sm min-h-10 rounded-xl">
                          Check out collected
                        </button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
