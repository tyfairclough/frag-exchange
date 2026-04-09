import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoralProfileStatus,
  ExchangeKind,
  TradeLineSide,
  TradeStatus,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canAccessOperatorDashboard,
  canIssuePrivateInvite,
  canManageEventDesk,
  canViewExchangeDirectory,
} from "@/lib/super-admin";
import { OperatorExchangeTabs } from "@/app/(main)/operator/components/operator-exchange-tabs";
import {
  acceptTradeAction,
  counterTradeAction,
  rejectTradeAction,
} from "@/app/(main)/exchanges/trade-actions";
import { getRequestOrigin } from "@/lib/request-origin";
import { expireDueTradesAndNotify } from "@/lib/trade-expire-notify";
import { isTradePending, tradeResponderUserId } from "@/lib/trade-state";
import {
  formatUserAddressLines,
  groupTradeMeetEligibleItemNames,
  groupTradePostEligibleCoralNamesForViewer,
  groupTradeRevealCounterpartyPostalAddress,
} from "@/lib/trade-logistics";

const detailErrors: Record<string, string> = {
  race: "This trade was already updated — refresh the page.",
  expired: "This trade has expired.",
  "not-your-turn": "It is not your turn to respond to this trade.",
  "not-pending": "This trade is no longer open.",
  stale: "This page was out of date — try again.",
  "coral-missing": "An item in this trade no longer exists.",
  "coral-unavailable": "An item is no longer available for trade.",
  "listing-gone": "Something in this offer is no longer listed — ask them to refresh or counter.",
  approved: "Trade approved. Items are marked traded and removed from all exchanges.",
  rejected: "You declined this trade.",
  countered: "Counter-offer sent.",
  "counter-invalid": "Pick at least one item on each side.",
  coral: "One or more items are not available.",
  listing: "Those items are not actively listed on this exchange.",
  "trade-kind": "One or more items are not enabled for this exchange.",
};

export default async function ExchangeTradeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; tradeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await requireUser();
  const { id: exchangeId, tradeId } = await params;
  const sp = await searchParams;

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
  await expireDueTradesAndNotify(getPrisma(), {
    baseUrl,
    now,
    exchangeId,
    tradeIds: [tradeId],
  });

  const trade = await getPrisma().trade.findFirst({
    where: {
      id: tradeId,
      exchangeId,
      OR: [{ initiatorUserId: viewer.id }, { peerUserId: viewer.id }],
    },
    include: {
      initiator: { select: { id: true, alias: true, avatarEmoji: true } },
      peer: { select: { id: true, alias: true, avatarEmoji: true } },
      inventoryLines: { include: { inventoryItem: true } },
    },
  });

  if (!trade) {
    notFound();
  }

  const counterpartyIdForPostal =
    trade.status === TradeStatus.APPROVED &&
    exchange.kind === ExchangeKind.GROUP &&
    groupTradeRevealCounterpartyPostalAddress(viewer.id, trade, trade.inventoryLines)
      ? viewer.id === trade.initiatorUserId
        ? trade.peerUserId
        : trade.initiatorUserId
      : null;

  const counterpartyAddressRow =
    counterpartyIdForPostal != null
      ? await getPrisma().user.findUnique({
          where: { id: counterpartyIdForPostal },
          select: { address: true },
        })
      : null;

  const initiatorItems = trade.inventoryLines
    .filter((c) => c.side === TradeLineSide.INITIATOR)
    .map((c) => c.inventoryItem);
  const peerItems = trade.inventoryLines
    .filter((c) => c.side === TradeLineSide.PEER)
    .map((c) => c.inventoryItem);

  const pending = isTradePending(trade);
  const responder = pending ? tradeResponderUserId(trade) : null;
  const yourTurn = responder === viewer.id;

  const feedback = sp.error ? detailErrors[sp.error] ?? "Something went wrong." : null;
  const feedbackTone =
    sp.error === "approved" || sp.error === "rejected" || sp.error === "countered" ? "success" : "warning";

  const showGroupLogistics =
    trade.status === TradeStatus.APPROVED && exchange.kind === ExchangeKind.GROUP;
  const meetCoralNames = showGroupLogistics ? groupTradeMeetEligibleItemNames(trade.inventoryLines) : [];
  const viewerPostCoralNames = showGroupLogistics
    ? groupTradePostEligibleCoralNamesForViewer(viewer.id, trade, trade.inventoryLines)
    : [];
  const counterpartyLabel =
    viewer.id === trade.initiatorUserId
      ? (trade.peer.alias ?? "Your trading partner")
      : (trade.initiator.alias ?? "Your trading partner");

  const [initiatorListingRows, peerListingRows] = pending
    ? await Promise.all([
        getPrisma().exchangeListing.findMany({
          where: {
            exchangeId,
            expiresAt: { gt: now },
            inventoryItem: { userId: trade.initiatorUserId, profileStatus: CoralProfileStatus.UNLISTED },
          },
          include: { inventoryItem: true },
          orderBy: { listedAt: "desc" },
        }),
        getPrisma().exchangeListing.findMany({
          where: {
            exchangeId,
            expiresAt: { gt: now },
            inventoryItem: { userId: trade.peerUserId, profileStatus: CoralProfileStatus.UNLISTED },
          },
          include: { inventoryItem: true },
          orderBy: { listedAt: "desc" },
        }),
      ])
    : [[], []];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {operatorTabs ? null : (
        <Link
          href={`/exchanges/${encodeURIComponent(exchangeId)}/trades`}
          className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl"
        >
          All trades on this exchange
        </Link>
      )}

      {operatorTabs}

      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-base-content">Trade</h1>
        <p className="text-sm text-base-content/70">
          {exchange.name} ·{" "}
          <span className="badge badge-outline badge-sm">{trade.status}</span>
        </p>
        <p className="text-xs text-base-content/55">
          Expires{" "}
          <time dateTime={trade.expiresAt.toISOString()}>{trade.expiresAt.toLocaleString()}</time>
          {" — "}
          {pending ? "30 days from the last move, or the event date end, whichever is sooner." : "Closed."}
        </p>
      </header>

      {feedback ? (
        <div
          role="status"
          className={`alert text-sm ${feedbackTone === "success" ? "alert-success" : "alert-warning"}`}
        >
          {feedback}
        </div>
      ) : null}

      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                {trade.initiator.avatarEmoji ? `${trade.initiator.avatarEmoji} ` : ""}
                {trade.initiator.alias ?? "Initiator"} gives
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-base-content/85">
                {initiatorItems.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                {trade.peer.avatarEmoji ? `${trade.peer.avatarEmoji} ` : ""}
                {trade.peer.alias ?? "Member"} gives
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-base-content/85">
                {peerItems.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {trade.status === TradeStatus.APPROVED && exchange.kind === ExchangeKind.EVENT ? (
        <section className="card border border-base-content/10 bg-base-100 shadow-sm">
          <div className="card-body gap-2 p-5">
            <h2 className="text-sm font-semibold text-base-content">Event handoff</h2>
            <p className="text-sm text-base-content/75">
              This trade is on an event exchange. Use event pickup to check in what you bring and collect what you
              receive — postal addresses stay private here.
            </p>
            <Link
              href={`/exchanges/${encodeURIComponent(exchangeId)}/event-pickup`}
              className="btn btn-outline btn-sm min-h-10 w-fit rounded-xl"
            >
              Open event pickup
            </Link>
          </div>
        </section>
      ) : null}

      {showGroupLogistics ? (
        <section className="card border border-base-content/10 bg-base-100 shadow-sm">
          <div className="card-body gap-4 p-5">
            <h2 className="text-sm font-semibold text-base-content">Logistics (group exchange)</h2>
            <p className="text-xs text-base-content/60">
              Shown only after this trade is approved. Postal details are never used on public discovery — only here when
              you are sending corals listed for post (or post-or-meet).
            </p>

            {viewerPostCoralNames.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                  Shipping your corals
                </h3>
                <p className="text-sm text-base-content/80">
                  You listed these for post or post-or-meet:{" "}
                  <span className="font-medium text-base-content">{viewerPostCoralNames.join(", ")}</span>. Send them to{" "}
                  <span className="font-medium text-base-content">{counterpartyLabel}</span>
                  {counterpartyAddressRow?.address ? (
                    <>
                      {" "}
                      at:
                    </>
                  ) : (
                    <> — they have not saved a full postal address yet; coordinate with them using your usual contact</>
                  )}
                </p>
                {counterpartyAddressRow?.address ? (
                  <address className="not-italic rounded-xl border border-base-content/15 bg-base-200/40 px-4 py-3 text-sm leading-relaxed text-base-content">
                    {formatUserAddressLines(counterpartyAddressRow.address).map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-base-content/75">
                You are not sending post-eligible corals in this trade, so we do not show the other member&apos;s postal
                address here.
              </p>
            )}

            {meetCoralNames.length > 0 ? (
              <div className="space-y-2 border-t border-base-content/10 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                  Face-to-face or flexible handoff
                </h3>
                <p className="text-sm text-base-content/80">
                  Some corals in this trade allow meet-up or post-or-meet ({meetCoralNames.join(", ")}). Agree with{" "}
                  <span className="font-medium text-base-content">{counterpartyLabel}</span> whether you will meet in
                  person or post. This app does not include chat yet — use email or another channel you already share
                  with your club or exchange.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {pending && yourTurn ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <form action={acceptTradeAction}>
              <input type="hidden" name="exchangeId" value={exchangeId} />
              <input type="hidden" name="tradeId" value={tradeId} />
              <input type="hidden" name="version" value={String(trade.version)} />
              <button type="submit" className="btn btn-primary min-h-11 rounded-xl">
                Accept trade
              </button>
            </form>
            <form action={rejectTradeAction}>
              <input type="hidden" name="exchangeId" value={exchangeId} />
              <input type="hidden" name="tradeId" value={tradeId} />
              <input type="hidden" name="version" value={String(trade.version)} />
              <button type="submit" className="btn btn-outline min-h-11 rounded-xl">
                Decline
              </button>
            </form>
          </div>

          {initiatorListingRows.length > 0 && peerListingRows.length > 0 ? (
            <form action={counterTradeAction} className="card border border-base-content/10 bg-base-200/30 shadow-sm">
              <div className="card-body gap-4 p-5">
                <h2 className="text-sm font-semibold text-base-content">Counter-offer</h2>
                <p className="text-xs text-base-content/65">
                  Choose a different mix from what is still listed on this exchange. Sending a counter advances the turn
                  and resets the expiry clock.
                </p>
                <input type="hidden" name="exchangeId" value={exchangeId} />
                <input type="hidden" name="tradeId" value={tradeId} />
                <input type="hidden" name="version" value={String(trade.version)} />

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-base-content/70">
                    {trade.initiator.alias ?? "Initiator"} offers
                  </h3>
                  <ul className="space-y-2">
                    {initiatorListingRows.map((row) => (
                      <li key={row.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-base-content/10 bg-base-100 p-3">
                          <input
                            type="checkbox"
                            name="initiatorItemIds"
                            value={row.inventoryItemId}
                            className="checkbox checkbox-sm mt-0.5"
                          />
                          <span className="min-w-0 text-sm">
                            <span className="font-medium text-base-content">{row.inventoryItem.name}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-base-content/70">{trade.peer.alias ?? "They"} offer</h3>
                  <ul className="space-y-2">
                    {peerListingRows.map((row) => (
                      <li key={row.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-base-content/10 bg-base-100 p-3">
                          <input
                            type="checkbox"
                            name="peerItemIds"
                            value={row.inventoryItemId}
                            className="checkbox checkbox-sm mt-0.5"
                          />
                          <span className="min-w-0 text-sm">
                            <span className="font-medium text-base-content">{row.inventoryItem.name}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>

                <button type="submit" className="btn btn-secondary min-h-11 w-full rounded-xl">
                  Send counter-offer
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-base-content/70">
              Counter-offer needs at least one active listing on each side. Add listings or wait for them to list again.
            </p>
          )}
        </div>
      ) : pending ? (
        <p className="text-sm text-base-content/70">Waiting for the other member to respond.</p>
      ) : null}
    </div>
  );
}
