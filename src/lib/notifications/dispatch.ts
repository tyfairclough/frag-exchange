import { ContactPreference } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { sendMailtrapTransactional } from "@/lib/mailtrap-transport";
import { escapeHtml } from "./escape-html";
import { sendSecondaryNotification } from "./secondary-channel";
import type { ChannelAttemptResult, NotificationEventType } from "./types";

type UserNotifyRow = {
  id: string;
  email: string;
  alias: string | null;
  contactPreference: ContactPreference;
};

/**
 * Sends email (best effort) and always attempts the secondary channel for critical events.
 * Never throws — failures are logged and reflected in the returned attempts.
 */
export async function dispatchUserNotification(params: {
  user: UserNotifyRow;
  eventType: NotificationEventType;
  subject: string;
  textBody: string;
  htmlBody: string;
  secondaryPayload: Record<string, unknown>;
}): Promise<ChannelAttemptResult[]> {
  const attempts: ChannelAttemptResult[] = [];
  const headline = params.subject;

  const emailResult = await sendMailtrapTransactional({
    to: params.user.email,
    subject: params.subject,
    html: params.htmlBody,
    text: params.textBody,
  });

  if (emailResult.ok) {
    attempts.push({
      channel: "email",
      ok: true,
      detail: emailResult.via === "mailtrap" ? "sent" : emailResult.reason ?? "skipped",
    });
  } else {
    attempts.push({
      channel: "email",
      ok: false,
      detail: `${emailResult.status} ${emailResult.body.slice(0, 120)}`,
    });
    if (process.env.NODE_ENV === "development") {
      console.warn(`[notify:email] failed for ${params.user.id}:`, emailResult.body);
    }
  }

  const wantSecondary =
    params.user.contactPreference === ContactPreference.SMS ||
    !emailResult.ok ||
    emailResult.via === "skipped";

  if (wantSecondary) {
    const sec = await sendSecondaryNotification({
      eventType: params.eventType,
      userId: params.user.id,
      headline,
      payload: {
        email: params.user.email,
        emailChannelOk: emailResult.ok && emailResult.via === "mailtrap",
        ...params.secondaryPayload,
      },
    });
    attempts.push({
      channel: "secondary",
      ok: sec.ok,
      detail: sec.detail,
    });
  }

  return attempts;
}

export async function loadNotifyUsers(userIds: string[]): Promise<Map<string, UserNotifyRow>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (uniq.length === 0) {
    return new Map();
  }
  const rows = await getPrisma().user.findMany({
    where: { id: { in: uniq } },
    select: { id: true, email: true, alias: true, contactPreference: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

export function tradeDetailUrl(baseUrl: string, exchangeId: string, tradeId: string) {
  const b = baseUrl.replace(/\/$/, "");
  return `${b}/exchanges/${encodeURIComponent(exchangeId)}/trades/${encodeURIComponent(tradeId)}`;
}

export function eventPickupUrl(baseUrl: string, exchangeId: string) {
  const b = baseUrl.replace(/\/$/, "");
  return `${b}/exchanges/${encodeURIComponent(exchangeId)}/event-pickup`;
}

export function buildBodies(params: {
  title: string;
  lines: string[];
  actionUrl?: string;
  actionLabel?: string;
}) {
  const text = [
    params.title,
    "",
    ...params.lines,
    ...(params.actionUrl
      ? ["", `${params.actionLabel ?? "Open in REEFX"}:`, params.actionUrl]
      : []),
    "",
    "— REEFX",
  ].join("\n");

  const linkBlock =
    params.actionUrl && params.actionLabel
      ? `<p><a href="${escapeHtml(params.actionUrl)}">${escapeHtml(params.actionLabel)}</a></p>`
      : params.actionUrl
        ? `<p><a href="${escapeHtml(params.actionUrl)}">View in REEFX</a></p>`
        : "";

  const html = `
    <p>${escapeHtml(params.title)}</p>
    ${params.lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}
    ${linkBlock}
    <p style="font-size:12px;color:#666">REEFX notification</p>
  `.trim();

  return { text, html };
}

/**
 * Fire-and-forget wrapper for server actions: never blocks or throws to the client.
 */
export function scheduleNotification(task: () => Promise<void>): void {
  void task().catch((e) => {
    console.error("[notify] background task failed", e);
  });
}
