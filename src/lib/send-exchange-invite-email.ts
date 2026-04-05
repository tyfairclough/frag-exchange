import { sendMailtrapTransactional } from "@/lib/mailtrap-transport";

const CTA_BUTTON_BG = "#22B41C";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ExchangeInviteEmailDelivery = "sent" | "skipped" | "failed";

/**
 * Sends a private exchange invite link when Mailtrap is configured; otherwise skips (dev / missing config).
 */
export async function sendExchangeInviteEmail(params: {
  to: string;
  inviteUrl: string;
  exchangeName: string;
}): Promise<ExchangeInviteEmailDelivery> {
  let logoSrc = "";
  let siteUrl = "";
  try {
    const origin = new URL(params.inviteUrl).origin;
    logoSrc = `${origin}/reefx_logo.svg`;
    siteUrl = `${origin}/`;
  } catch {
    /* malformed URL: omit branded header/footer links */
  }

  const subject = `Invitation: ${params.exchangeName}`;
  const exchangeNameEsc = escapeHtml(params.exchangeName);
  const headerBlock = logoSrc
    ? `<div style="margin:0 0 28px 0;padding:0 0 24px 0;text-align:center;border-bottom:1px solid #e5e7eb">
    <img src="${escapeHtml(logoSrc)}" alt="REEFX" width="140" height="42" style="display:inline-block;height:42px;width:auto;max-width:200px;border:0;outline:none;text-decoration:none" />
  </div>`
    : "";

  const footerHtml = siteUrl
    ? `<p style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">Sent from <a href="${escapeHtml(siteUrl)}" style="color:#374151;text-decoration:underline">REEFX</a></p>`
    : `<p style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">Sent from REEFX</p>`;

  const inviteHref = escapeHtml(params.inviteUrl);
  const buttonFont =
    "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
  const ctaBlock = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;border-collapse:collapse">
      <tr>
        <td style="border-radius:9999px;background-color:${CTA_BUTTON_BG}">
          <a href="${inviteHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-family:${buttonFont};font-size:14px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:9999px">Accept invitation</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px 0;font-size:13px;line-height:1.45;color:#64748b">
      <a href="${inviteHref}" style="color:#1d4ed8;text-decoration:underline;word-break:break-all">${inviteHref}</a>
    </p>`;

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827">
    ${headerBlock}
    <p style="margin:0 0 16px 0">You have been invited to join <strong>${exchangeNameEsc}</strong> on REEFX.</p>
    <p style="margin:0 0 16px 0">Use this link to accept (expires in 14 days). You must sign in with <strong>this email address</strong> (${escapeHtml(params.to)}):</p>
    ${ctaBlock}
    <p style="margin:0">If you were not expecting this, you can ignore this email.</p>
    ${footerHtml}
    </div>
  `.trim();

  const text = [
    `You have been invited to join "${params.exchangeName}" on REEFX.`,
    "",
    "Use this link to accept (expires in 14 days). You must sign in with this email address:",
    params.to,
    "",
    params.inviteUrl,
    "",
    "If you were not expecting this, you can ignore this email.",
    "",
    siteUrl ? `Sent from REEFX — ${siteUrl}` : "Sent from REEFX",
  ].join("\n");

  const r = await sendMailtrapTransactional({
    to: params.to,
    subject,
    html,
    text,
  });

  if (r.ok) {
    return r.via === "skipped" ? "skipped" : "sent";
  }
  return "failed";
}
