/** Stable names for logs, webhooks, and future digests. */
export type NotificationEventType =
  | "trade.offered"
  | "trade.countered"
  | "trade.approved"
  | "trade.rejected"
  | "trade.expired"
  | "event.coral_checked_in";

export type ChannelAttemptResult =
  | { channel: "email"; ok: true; detail: string }
  | { channel: "email"; ok: false; detail: string }
  | { channel: "secondary"; ok: true; detail: string }
  | { channel: "secondary"; ok: false; detail: string };
