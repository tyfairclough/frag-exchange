import { sendMailtrapTransactional } from "@/lib/mailtrap-transport";

/** Matches primary CTA on auth (`MARKETING_CTA_GREEN` in marketing-chrome). */
const CTA_BUTTON_BG = "#22B41C";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type SendResult =
  | { ok: true; via: "mailtrap" }
  | { ok: true; via: "skipped"; reason: "missing_config" }
  | { ok: false; via: "mailtrap"; status: number; body: string };

/**
 * Sends the access link when Mailtrap is configured; otherwise logs once in development.
 * In development, magic-link email is only sent when `REEFX_DEV_MAGIC_LINK_VIA_EMAIL=true`;
 * otherwise `requestMagicLinkAction` skips calling this and uses the check-email debug link.
 */
export async function sendMagicLinkEmail(params: {
  to: string;
  verifyUrl: string;
}): Promise<SendResult> {
  let logoSrc = "";
  let siteUrl = "";
  try {
    const origin = new URL(params.verifyUrl).origin;
    logoSrc = `${origin}/reefx_logo.svg`;
    siteUrl = `${origin}/`;
  } catch {
    /* verifyUrl is always a full URL from auth flow; leave header/footer links out if malformed */
  }

  const subject = "Your REEFxCHANGE access link";
  const headerBlock = logoSrc
    ? `<div style="margin:0 0 28px 0;padding:0 0 24px 0;text-align:center;border-bottom:1px solid #e5e7eb">
    <img src="${escapeHtml(logoSrc)}" alt="REEFxCHANGE" width="140" height="42" style="display:inline-block;height:42px;width:auto;max-width:200px;border:0;outline:none;text-decoration:none" />
  </div>`
    : "";

  const footerHtml = siteUrl
    ? `<p style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">Sent from <a href="${escapeHtml(siteUrl)}" style="color:#374151;text-decoration:underline">REEFxCHANGE</a></p>`
    : `<p style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">Sent from REEFxCHANGE</p>`;

  const verifyHref = escapeHtml(params.verifyUrl);
  const buttonFont =
    "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
  const accessButtonBlock = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;border-collapse:collapse">
      <tr>
        <td style="border-radius:9999px;background-color:${CTA_BUTTON_BG}">
          <a href="${verifyHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-family:${buttonFont};font-size:14px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:9999px">Access REEFxCHANGE</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px 0;font-size:13px;line-height:1.45;color:#64748b">
      <a href="${verifyHref}" style="color:#1d4ed8;text-decoration:underline;word-break:break-all">${verifyHref}</a>
    </p>`;

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827">
    ${headerBlock}
    <p style="margin:0 0 16px 0">Use this link to access REEFxCHANGE (expires in 20 minutes):</p>
    ${accessButtonBlock}
    <p style="margin:0">If you did not request this, you can ignore this email.</p>
    ${footerHtml}
    </div>
  `.trim();

  const text = [
    "Use this link to access REEFxCHANGE (expires in 20 minutes):",
    params.verifyUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    siteUrl ? `Sent from REEFxCHANGE — ${siteUrl}` : "Sent from REEFxCHANGE",
  ].join("\n");

  const r = await sendMailtrapTransactional({
    to: params.to,
    subject,
    html,
    text,
  });

  if (r.ok) {
    if (r.via === "skipped") {
      return { ok: true, via: "skipped", reason: "missing_config" };
    }
    return { ok: true, via: "mailtrap" };
  }
  return { ok: false, via: "mailtrap", status: r.status, body: r.body };
}
