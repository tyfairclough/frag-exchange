import { MailtrapClient } from "mailtrap";
import { withAsyncRetries } from "@/lib/retry-async";

export type MailtrapSendResult =
  | { ok: true; via: "mailtrap" }
  | { ok: true; via: "skipped"; reason: "missing_config" }
  | { ok: false; via: "mailtrap"; status: number; body: string };

export function parseEmailFrom(from: string): { name: string; email: string } | null {
  const trimmed = from.trim();
  if (!trimmed) return null;
  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    return { name: angle[1].trim(), email: angle[2].trim() };
  }
  if (trimmed.includes("@")) {
    return { name: "REEFX", email: trimmed };
  }
  return null;
}

/** Mailtrap docs: stray spaces in API tokens often cause 401 Unauthorized. */
function getMailtrapApiKey(): string | undefined {
  const raw = process.env.MAILTRAP_API_KEY;
  if (raw == null) return undefined;
  const t = raw.trim();
  return t === "" ? undefined : t;
}

export function mailtrapErrorDetails(err: unknown): { status: number; body: string } {
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

function createClient(): MailtrapClient | null {
  const apiKey = getMailtrapApiKey();
  const fromRaw = process.env.EMAIL_FROM;
  const fromParsed = fromRaw ? parseEmailFrom(fromRaw) : null;
  if (!apiKey || !fromParsed) {
    return null;
  }
  const useSandbox = process.env.MAILTRAP_USE_SANDBOX?.trim() === "true";
  const inboxIdRaw = process.env.MAILTRAP_INBOX_ID?.trim();
  const testInboxId = inboxIdRaw ? Number(inboxIdRaw) : undefined;
  if (useSandbox && (!inboxIdRaw || Number.isNaN(testInboxId))) {
    return null;
  }
  return new MailtrapClient({
    token: apiKey,
    sandbox: useSandbox,
    testInboxId: useSandbox ? testInboxId : undefined,
  });
}

/**
 * Sends transactional email via Mailtrap when configured; otherwise returns skipped.
 * Callers should not throw on failure — inspect `ok`.
 */
export async function sendMailtrapTransactional(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailtrapSendResult> {
  const client = createClient();
  const fromRaw = process.env.EMAIL_FROM;
  const fromParsed = fromRaw ? parseEmailFrom(fromRaw) : null;

  if (!client || !fromParsed) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[email] MAILTRAP not configured — skipped. To: ${params.to} Subject: ${params.subject}`,
      );
    }
    return { ok: true, via: "skipped", reason: "missing_config" };
  }

  try {
    await withAsyncRetries(
      async () => {
        await client.send({
          from: { name: fromParsed.name, email: fromParsed.email },
          to: [{ email: params.to }],
          subject: params.subject,
          html: params.html,
          text: params.text,
        });
      },
      {
        attempts: 3,
        delayMs: 450,
        retryIf: (err) => {
          const { status } = mailtrapErrorDetails(err);
          return status >= 500 || status === 429;
        },
      },
    );
    return { ok: true, via: "mailtrap" };
  } catch (err: unknown) {
    const { status, body } = mailtrapErrorDetails(err);
    return { ok: false, via: "mailtrap", status, body };
  }
}
