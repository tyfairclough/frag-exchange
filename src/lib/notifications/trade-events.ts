import type { NotificationEventType } from "./types";
import {
  buildBodies,
  dispatchUserNotification,
  loadNotifyUsers,
  scheduleNotification,
  tradeDetailUrl,
} from "./dispatch";

export type TradeNotifyKind = "offered" | "countered" | "approved" | "rejected" | "expired";

function eventTypeForKind(kind: TradeNotifyKind): NotificationEventType {
  switch (kind) {
    case "offered":
      return "trade.offered";
    case "countered":
      return "trade.countered";
    case "approved":
      return "trade.approved";
    case "rejected":
      return "trade.rejected";
    case "expired":
      return "trade.expired";
  }
}

function recipientUserIds(kind: TradeNotifyKind, initiatorUserId: string, peerUserId: string): string[] {
  switch (kind) {
    case "offered":
      return [peerUserId];
    case "approved":
      return [initiatorUserId, peerUserId];
    case "rejected":
      return [initiatorUserId];
    case "expired":
      return [initiatorUserId, peerUserId];
    default:
      return [];
  }
}

/** Peer counters (OFFER→COUNTERED): notify initiator. Initiator counters (COUNTERED→OFFER): notify peer. */
export function recipientUserIdsAfterCounter(
  previousStatus: "OFFER" | "COUNTERED",
  initiatorUserId: string,
  peerUserId: string,
): string[] {
  return previousStatus === "OFFER" ? [initiatorUserId] : [peerUserId];
}

function messageForKind(
  kind: TradeNotifyKind,
  params: {
    exchangeName: string;
    actorDisplay: string;
    tradeUrl: string;
  },
): { subject: string; title: string; lines: string[]; actionLabel: string } {
  const ex = params.exchangeName;
  switch (kind) {
    case "offered":
      return {
        subject: `New trade offer — ${ex}`,
        title: "You have a new trade offer",
        lines: [`${params.actorDisplay} sent you an offer on ${ex}.`, "Open the trade to accept, counter, or decline."],
        actionLabel: "View trade",
      };
    case "countered":
      return {
        subject: `Counter-offer — ${ex}`,
        title: "Trade counter-offer",
        lines: [`${params.actorDisplay} sent a counter-offer on ${ex}.`, "Review the items and respond when you can."],
        actionLabel: "View trade",
      };
    case "approved":
      return {
        subject: `Trade approved — ${ex}`,
        title: "Trade approved",
        lines: [
          `${params.actorDisplay} completed the approval step on ${ex}.`,
          "Items are marked traded and removed from listings.",
        ],
        actionLabel: "View trade",
      };
    case "rejected":
      return {
        subject: `Trade declined — ${ex}`,
        title: "Trade declined",
        lines: [`${params.actorDisplay} declined the trade on ${ex}.`],
        actionLabel: "View trade",
      };
    case "expired":
      return {
        subject: `Trade expired — ${ex}`,
        title: "Trade expired",
        lines: [`A trade on ${ex} expired before it was completed.`],
        actionLabel: "View trade",
      };
  }
}

export function scheduleTradeNotifications(params: {
  baseUrl: string;
  kind: TradeNotifyKind;
  exchangeId: string;
  exchangeName: string;
  tradeId: string;
  /** User who performed the action (offer, counter, accept, reject). Omitted for `expired`. */
  actorUserId?: string;
  initiatorUserId: string;
  peerUserId: string;
  /** Required when kind is `countered` (depends on prior trade status). */
  counterRecipients?: string[];
}): void {
  scheduleNotification(async () => {
    const recipients =
      params.kind === "countered"
        ? (params.counterRecipients ?? [])
        : recipientUserIds(params.kind, params.initiatorUserId, params.peerUserId);

    if (recipients.length === 0) {
      return;
    }

    const tradeUrl = tradeDetailUrl(params.baseUrl, params.exchangeId, params.tradeId);
    const users = await loadNotifyUsers([...recipients, params.actorUserId].filter(Boolean) as string[]);
    const actor =
      params.actorUserId != null ? users.get(params.actorUserId) : undefined;
    const actorDisplay = actor ? actor.alias?.trim() || actor.email : "Someone";

    const { subject, title, lines, actionLabel } = messageForKind(params.kind, {
      exchangeName: params.exchangeName,
      actorDisplay,
      tradeUrl,
    });

    const { text, html } = buildBodies({
      title,
      lines,
      actionUrl: tradeUrl,
      actionLabel,
    });

    const eventType = eventTypeForKind(params.kind);

    for (const userId of recipients) {
      const user = users.get(userId);
      if (!user) continue;
      if (params.kind !== "expired" && userId === params.actorUserId) {
        continue;
      }
      await dispatchUserNotification({
        user,
        eventType,
        subject,
        textBody: text,
        htmlBody: html,
        secondaryPayload: {
          tradeId: params.tradeId,
          exchangeId: params.exchangeId,
          exchangeName: params.exchangeName,
          kind: params.kind,
        },
      });
    }
  });
}
