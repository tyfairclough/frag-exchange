import { MailtrapClient } from "mailtrap";

const LEGAL_VERSION = "2026-03-20";

type SendResult =
  | { ok: true; via: "mailtrap" }
  | { ok: true; via: "skipped"; reason: "missing_config" }
  | { ok: false; via: "mailtrap"; status: number; body: string };

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseEmailFrom(from: string): { name: string; email: string } | null {
  const trimmed = from.trim();
  if (!trimmed) return null;
  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    return { name: angle[1].trim(), email: angle[2].trim() };
  }
  if (trimmed.includes("@")) {
    return { name: "Frag Exchange", email: trimmed };
  }
  return null;
}

function mailtrapErrorDetails(err: unknown): { status: number; body: string } {
  if (err instanceof Error) {
    let status = 500;
    let body = err.message;
    const cause = err.cause;
    if (cause && typeof cause === "object" && "response" in cause) {
      const response = (cause as { response?: { status?: number; data?: unknown } }).response;
      if (response?.status != null) status = response.status;
      if (response?.data !== undefined) {
        body = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      }
    }
    return { status, body };
  }
  return { status: 500, body: String(err) };
}

/**
 * Sends the sign-in link when Mailtrap is configured; otherwise logs once in development.
 * Core sign-in still works via the check-email debug link in non-production.
 */
export async function sendMagicLinkEmail(params: {
  to: string;
  verifyUrl: string;
}): Promise<SendResult> {
  const apiKey = process.env.MAILTRAP_API_KEY;
  const fromRaw = process.env.EMAIL_FROM;
  const fromParsed = fromRaw ? parseEmailFrom(fromRaw) : null;

  const useSandbox = process.env.MAILTRAP_USE_SANDBOX === "true";
  const inboxIdRaw = process.env.MAILTRAP_INBOX_ID;
  const testInboxId = inboxIdRaw ? Number(inboxIdRaw) : undefined;

  if (useSandbox && (!inboxIdRaw || Number.isNaN(testInboxId))) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[magic-link] MAILTRAP_USE_SANDBOX is true but MAILTRAP_INBOX_ID is missing or invalid — email not sent. Link: ${params.verifyUrl}`,
      );
    }
    return { ok: true, via: "skipped", reason: "missing_config" };
  }

  if (!apiKey || !fromParsed) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[magic-link] MAILTRAP_API_KEY / EMAIL_FROM not set or invalid — email not sent. Link: ${params.verifyUrl}`,
      );
    }
    return { ok: true, via: "skipped", reason: "missing_config" };
  }

  const client = new MailtrapClient({
    token: apiKey,
    sandbox: useSandbox,
    testInboxId: useSandbox ? testInboxId : undefined,
  });

  const subject = "Your Frag Exchange sign-in link";
  const html = `
    <p>Hi,</p>
    <p>Use this link to sign in to Frag Exchange (expires in 20 minutes):</p>
    <p><a href="${escapeHtml(params.verifyUrl)}">Sign in</a></p>
    <p>If you did not request this, you can ignore this email.</p>
    <p style="font-size:12px;color:#666">Privacy notice version ${LEGAL_VERSION} applies to account data.</p>
  `.trim();

  const text = [
    "Hi,",
    "",
    "Use this link to sign in to Frag Exchange (expires in 20 minutes):",
    params.verifyUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    `Privacy notice version ${LEGAL_VERSION} applies to account data.`,
  ].join("\n");

  try {
    await client.send({
      from: { name: fromParsed.name, email: fromParsed.email },
      to: [{ email: params.to }],
      subject,
      html,
      text,
    });
    return { ok: true, via: "mailtrap" };
  } catch (err: unknown) {
    const { status, body } = mailtrapErrorDetails(err);
    return { ok: false, via: "mailtrap", status, body };
  }
}
