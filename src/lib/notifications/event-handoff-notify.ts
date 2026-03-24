import {
  buildBodies,
  dispatchUserNotification,
  loadNotifyUsers,
  scheduleNotification,
  eventPickupUrl,
} from "./dispatch";

export function scheduleCoralCheckedInNotifications(params: {
  baseUrl: string;
  exchangeId: string;
  exchangeName: string;
  recipientUserIds: string[];
  count: number;
}): void {
  if (params.recipientUserIds.length === 0) {
    return;
  }
  scheduleNotification(async () => {
    const users = await loadNotifyUsers(params.recipientUserIds);
    const pickupUrl = eventPickupUrl(params.baseUrl, params.exchangeId);
    const n = params.count;
    const title = n === 1 ? "Your coral is checked in" : `${n} of your corals are checked in`;
    const subject = `${title} — ${params.exchangeName}`;
    const lines = [
      `Event desk checked in ${n === 1 ? "a coral" : `${n} corals`} for you at ${params.exchangeName}.`,
      "You can collect them from the event pickup page when ready.",
    ];
    const { text, html } = buildBodies({
      title,
      lines,
      actionUrl: pickupUrl,
      actionLabel: "Event pickup",
    });

    for (const userId of params.recipientUserIds) {
      const user = users.get(userId);
      if (!user) continue;
      await dispatchUserNotification({
        user,
        eventType: "event.coral_checked_in",
        subject,
        textBody: text,
        htmlBody: html,
        secondaryPayload: {
          exchangeId: params.exchangeId,
          exchangeName: params.exchangeName,
          checkedInCount: n,
        },
      });
    }
  });
}
