import Link from "next/link";
import { notFound } from "next/navigation";
import { ExchangeKind, TradeStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canAccessOperatorDashboard,
  canIssuePrivateInvite,
  canManageEventDesk,
  canViewExchangeDirectory,
} from "@/lib/super-admin";
import { OperatorExchangeTabs } from "@/app/(main)/operator/components/operator-exchange-tabs";
import { getRequestOrigin } from "@/lib/request-origin";
import { expireDueTradesAndNotify } from "@/lib/trade-expire-notify";
import { isTradePending, tradeResponderUserId } from "@/lib/trade-state";

function tradeListHint(
  trade: { status: TradeStatus; initiatorUserId: string; peerUserId: string },
  viewerId: string,
): string {
  if (!isTradePending(trade)) {
    if (trade.status === TradeStatus.APPROVED) {
      return "Completed — corals marked traded and removed from listings.";
    }
    if (trade.status === TradeStatus.REJECTED) {
      return "Declined.";
    }
    return "Past the expiry window.";
  }
  const turn = tradeResponderUserId(trade);
  if (turn === viewerId) {
    return trade.status === TradeStatus.OFFER ? "They sent an offer — your turn." : "They countered — your turn.";
  }
  return trade.status === TradeStatus.OFFER ? "Waiting for their answer." : "Waiting for their answer to your counter.";
}

export default async function ExchangeTradesListPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser();
  const { id: exchangeId } = await params;

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: viewer.id },
      },
    },
  });

  if (!exchange) {
    notFound();
  }

  const membership = exchange.memberships[0] ?? null;
  if (!canViewExchangeDirectory(exchange, membership, viewer) || !membership) {
    notFound();
  }

  const operatorTabs =
    canAccessOperatorDashboard(viewer, membership) ? (
      <OperatorExchangeTabs
        exchangeId={exchangeId}
        active="trades"
        exchangeKind={exchange.kind}
        showEventPickup={exchange.kind === ExchangeKind.EVENT}
        showEventDesk={canManageEventDesk(exchange, membership, viewer)}
        showPrivateInvites={canIssuePrivateInvite(exchange, membership, viewer)}
      />
    ) : null;

  const now = new Date();
  const baseUrl = await getRequestOrigin();
  await expireDueTradesAndNotify(getPrisma(), { baseUrl, now, exchangeId });

  const trades = await getPrisma().trade.findMany({
    where: {
      exchangeId,
      OR: [{ initiatorUserId: viewer.id }, { peerUserId: viewer.id }],
    },
    include: {
      initiator: { select: { id: true, alias: true, avatarEmoji: true } },
      peer: { select: { id: true, alias: true, avatarEmoji: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {operatorTabs}

      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-base-content">Trades</h1>
        <p className="text-sm text-base-content/70">
          {exchange.name} — offers and counter-offers with other members. Expiry is the sooner of 30 days or the event
          date (for event exchanges).
        </p>
      </header>

      {trades.length === 0 ? (
        <p className="text-sm text-base-content/70">No trades yet. Start one from Explore or a member profile.</p>
      ) : (
        <ul className="space-y-3">
          {trades.map((t) => {
            const other = t.initiatorUserId === viewer.id ? t.peer : t.initiator;
            return (
              <li key={t.id}>
                <Link
                  href={`/exchanges/${encodeURIComponent(exchangeId)}/trades/${encodeURIComponent(t.id)}`}
                  className="card border border-base-content/10 bg-base-100 shadow-sm transition-colors hover:border-primary/30"
                >
                  <div className="card-body gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-base-content">
                        {other.avatarEmoji ? `${other.avatarEmoji} ` : ""}
                        {other.alias ?? "Member"}
                      </span>
                      <span className="badge badge-outline badge-sm">{t.status}</span>
                    </div>
                    <p className="text-xs text-base-content/65">{tradeListHint(t, viewer.id)}</p>
                    <p className="text-xs text-base-content/50">
                      Expires{" "}
                      <time dateTime={t.expiresAt.toISOString()}>{t.expiresAt.toLocaleString()}</time>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
