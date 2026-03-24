import { withAsyncRetries } from "@/lib/retry-async";
import type { NotificationEventType } from "./types";

/**
 * Second channel: optional webhook (JSON POST) for queues/admin dashboards, or dev console.
 * Intended to still surface critical events when email is disabled or fails.
 */
export async function sendSecondaryNotification(params: {
  eventType: NotificationEventType;
  userId: string;
  headline: string;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; detail: string }> {
  const url = process.env.NOTIFY_WEBHOOK_URL?.trim();
  const secret = process.env.NOTIFY_WEBHOOK_SECRET?.trim();
  const body = JSON.stringify({
    eventType: params.eventType,
    userId: params.userId,
    headline: params.headline,
    ...params.payload,
    sentAt: new Date().toISOString(),
  });

  if (url) {
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        ...(secret ? { "x-frag-notify-secret": secret } : {}),
      };
      await withAsyncRetries(
        async () => {
          const res = await fetch(url, { method: "POST", headers, body });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            const err = new Error(`webhook ${res.status} ${text.slice(0, 200)}`);
            (err as Error & { status?: number }).status = res.status;
            throw err;
          }
        },
        {
          attempts: 3,
          delayMs: 500,
          retryIf: (e) => {
            const status = (e as Error & { status?: number }).status;
            if (typeof status === "number") {
              return status >= 500 || status === 429;
            }
            return true;
          },
        },
      );
      return { ok: true, detail: "webhook" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, detail: msg.slice(0, 220) };
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[notify:secondary] ${params.eventType} user=${params.userId} — ${params.headline}`, params.payload);
    return { ok: true, detail: "console" };
  }

  return { ok: true, detail: "noop" };
}
