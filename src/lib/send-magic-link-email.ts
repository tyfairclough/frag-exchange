import { sendMailtrapTransactional } from "@/lib/mailtrap-transport";

const LEGAL_VERSION = "2026-03-20";

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
 * Sends the sign-in link when Mailtrap is configured; otherwise logs once in development.
 * Core sign-in still works via the check-email debug link in non-production.
 */
export async function sendMagicLinkEmail(params: {
  to: string;
  verifyUrl: string;
}): Promise<SendResult> {
  const subject = "Your REEFX sign-in link";
  const html = `
    <p>Hi,</p>
    <p>Use this link to sign in to REEFX (expires in 20 minutes):</p>
    <p><a href="${escapeHtml(params.verifyUrl)}">Sign in</a></p>
    <p>If you did not request this, you can ignore this email.</p>
    <p style="font-size:12px;color:#666">Privacy notice version ${LEGAL_VERSION} applies to account data.</p>
  `.trim();

  const text = [
    "Hi,",
    "",
    "Use this link to sign in to REEFX (expires in 20 minutes):",
    params.verifyUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    `Privacy notice version ${LEGAL_VERSION} applies to account data.`,
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
