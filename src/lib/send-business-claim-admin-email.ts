import type { PrismaClient } from "@/generated/prisma/client";
import { UserGlobalRole } from "@/generated/prisma/enums";
import { sendMailtrapTransactional } from "@/lib/mailtrap-transport";
import { parseSuperAdminEmails } from "@/lib/super-admin";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function collectBusinessClaimAdminRecipientEmails(db: PrismaClient): Promise<string[]> {
  const fromEnv = parseSuperAdminEmails().map((e) => e.trim().toLowerCase()).filter(Boolean);
  const rows = await db.user.findMany({
    where: { globalRole: UserGlobalRole.SUPER_ADMIN },
    select: { email: true },
  });
  const set = new Set<string>([...fromEnv, ...rows.map((r) => r.email.trim().toLowerCase())]);
  return [...set];
}

export type BusinessClaimAdminEmailPayload = {
  fullName: string;
  businessEmail: string;
  accountLabel: string;
  exchangeLabel: string | null;
  adminClaimsUrl: string;
};

function buildEmail(params: BusinessClaimAdminEmailPayload) {
  const subject = "New business claim on REEFX";
  let logoSrc = "";
  try {
    logoSrc = `${new URL(params.adminClaimsUrl).origin}/reefx_logo.svg`;
  } catch {
    logoSrc = "";
  }
  const headerBlock = logoSrc
    ? `<div style="margin:0 0 28px 0;padding:0 0 24px 0;text-align:center;border-bottom:1px solid #e5e7eb">
    <img src="${escapeHtml(logoSrc)}" alt="REEFX" width="140" height="42" style="display:inline-block;height:42px;width:auto;max-width:200px;border:0;outline:none;text-decoration:none" />
  </div>`
    : "";
  const claimsHref = escapeHtml(params.adminClaimsUrl);
  const exchangeLine =
    params.exchangeLabel != null
      ? `<p style="margin:0 0 8px 0"><strong>Exchange context:</strong> ${escapeHtml(params.exchangeLabel)}</p>`
      : "";

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827">
    ${headerBlock}
    <p style="margin:0 0 16px 0">Someone submitted a <strong>Claim my business</strong> request.</p>
    <p style="margin:0 0 8px 0"><strong>Full name:</strong> ${escapeHtml(params.fullName)}</p>
    <p style="margin:0 0 8px 0"><strong>Business email:</strong> ${escapeHtml(params.businessEmail)}</p>
    <p style="margin:0 0 8px 0"><strong>Account claimed:</strong> ${escapeHtml(params.accountLabel)}</p>
    ${exchangeLine}
    <p style="margin:16px 0 0 0"><a href="${claimsHref}" style="color:#1d4ed8;text-decoration:underline">View business claims in admin</a></p>
    </div>
  `.trim();

  const text = [
    "Someone submitted a Claim my business request on REEFX.",
    "",
    `Full name: ${params.fullName}`,
    `Business email: ${params.businessEmail}`,
    `Account claimed: ${params.accountLabel}`,
    ...(params.exchangeLabel ? [`Exchange context: ${params.exchangeLabel}`] : []),
    "",
    `Admin claims: ${params.adminClaimsUrl}`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Notifies super-admin recipients (env list + SUPER_ADMIN users). Best-effort per address.
 */
export async function sendBusinessClaimAdminNotifications(
  db: PrismaClient,
  params: BusinessClaimAdminEmailPayload,
): Promise<void> {
  const recipients = await collectBusinessClaimAdminRecipientEmails(db);
  if (recipients.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[business-claim] no admin recipient emails configured");
    }
    return;
  }
  const { subject, html, text } = buildEmail(params);
  for (const to of recipients) {
    const r = await sendMailtrapTransactional({ to, subject, html, text });
    if (!r.ok) {
      console.warn(`[business-claim] admin email failed for ${to}:`, r.body);
    }
  }
}
