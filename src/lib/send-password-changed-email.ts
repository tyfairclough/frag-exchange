import { sendMailtrapTransactional } from "@/lib/mailtrap-transport";

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
 * Security notice after the account password is changed from the Me page.
 */
export async function sendPasswordChangedNoticeEmail(params: {
  to: string;
  siteUrl: string;
}): Promise<SendResult> {
  const base = params.siteUrl.replace(/\/$/, "");
  let logoSrc = "";
  try {
    logoSrc = `${new URL(base).origin}/reefx_logo.svg`;
  } catch {
    logoSrc = "";
  }

  const subject = "Your REEFX password was changed";
  const headerBlock = logoSrc
    ? `<div style="margin:0 0 28px 0;padding:0 0 24px 0;text-align:center;border-bottom:1px solid #e5e7eb">
    <img src="${escapeHtml(logoSrc)}" alt="REEFX" width="140" height="42" style="display:inline-block;height:42px;width:auto;max-width:200px;border:0;outline:none;text-decoration:none" />
  </div>`
    : "";

  const homeHref = escapeHtml(`${base}/`);
  const meHref = escapeHtml(`${base}/me`);
  const footerHtml = `<p style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">Sent from <a href="${homeHref}" style="color:#374151;text-decoration:underline">REEFX</a></p>`;

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827">
    ${headerBlock}
    <p style="margin:0 0 16px 0">The password for your REEFX account was just changed.</p>
    <p style="margin:0 0 16px 0">If you made this change, you can ignore this email.</p>
    <p style="margin:0 0 16px 0">If you did <strong>not</strong> change your password, secure your email inbox and reset your password from your <a href="${meHref}" style="color:#1d4ed8;text-decoration:underline">Me</a> page as soon as you can. If you need help, contact us using the details in our privacy notice.</p>
    ${footerHtml}
    </div>
  `.trim();

  const text = [
    "The password for your REEFX account was just changed.",
    "",
    "If you made this change, you can ignore this email.",
    "",
    "If you did not change your password, secure your email inbox and reset your password from your Me page as soon as you can:",
    `${base}/me`,
    "",
    "If you need help, contact us using the details in our privacy notice.",
    "",
    `Sent from REEFX — ${base}/`,
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
