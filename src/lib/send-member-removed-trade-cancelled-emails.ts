import { INVITE_EMAIL_GAP_MS } from "@/lib/mail-invite-rate";
import { sendMailtrapTransactional } from "@/lib/mailtrap-transport";
import type { TradeCancelNotifyRecipient } from "@/lib/admin-delete-user";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExchangeList(names: string[]): string {
  if (names.length === 0) {
    return "an exchange";
  }
  if (names.length === 1) {
    return `“${names[0]!}”`;
  }
  if (names.length === 2) {
    return `“${names[0]!}” and “${names[1]!}”`;
  }
  const head = names.slice(0, -1).map((n) => `“${n}”`).join(", ");
  const tail = names[names.length - 1]!;
  return `${head}, and “${tail}”`;
}

/**
 * One email per recipient; waits INVITE_EMAIL_GAP_MS after each successful Mailtrap send.
 */
export async function sendMemberRemovedTradeCancelledEmailsThrottled(
  recipients: TradeCancelNotifyRecipient[],
  siteUrl: string,
): Promise<void> {
  const base = siteUrl.replace(/\/$/, "");
  const exchangesHref = `${base}/exchanges`;

  for (let i = 0; i < recipients.length; i++) {
    const rec = recipients[i]!;
    const subject = "Trades cancelled on REEFX";
    const exchangesPhrase =
      rec.exchangeNames.length === 1
        ? `the exchange ${formatExchangeList(rec.exchangeNames)}`
        : `these exchanges: ${formatExchangeList(rec.exchangeNames)}`;

    const text = [
      "Hello,",
      "",
      `A member was removed from REEFX. Any trades you had with them on ${exchangesPhrase} have been cancelled.`,
      "",
      "We're sorry for the inconvenience this may cause.",
      "",
      `Browse exchanges: ${exchangesHref}`,
      "",
      "— REEFX",
    ].join("\n");

    const namesHtml = rec.exchangeNames.map((n) => `“${escapeHtml(n)}”`).join(", ");
    const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827">
      <p style="margin:0 0 16px 0">Hello,</p>
      <p style="margin:0 0 16px 0">A member was removed from REEFX. All trades involving them with you on ${rec.exchangeNames.length === 1 ? "the exchange " : "these exchanges: "}${namesHtml} have been cancelled.</p>
      <p style="margin:0 0 16px 0">We're sorry for the inconvenience this may cause.</p>
      <p style="margin:0 0 16px 0"><a href="${escapeHtml(exchangesHref)}" style="color:#1d4ed8;text-decoration:underline">Open exchanges</a></p>
      <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280">REEFX notification</p>
    </div>
    `.trim();

    const r = await sendMailtrapTransactional({
      to: rec.email,
      subject,
      html,
      text,
    });

    if (!r.ok && process.env.NODE_ENV === "development") {
      console.warn(`[admin-delete-user:email] failed for ${rec.email}:`, r.body);
    }

    const mailed = r.ok && r.via === "mailtrap";
    if (mailed && i < recipients.length - 1) {
      await sleep(INVITE_EMAIL_GAP_MS);
    }
  }
}
