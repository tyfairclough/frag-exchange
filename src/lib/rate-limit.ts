import { headers } from "next/headers";

type WindowBucket = { count: number; resetAt: number };

const store = new Map<string, WindowBucket>();

const MAX_KEYS = 5000;

function pruneIfNeeded() {
  if (store.size <= MAX_KEYS) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
    if (store.size <= MAX_KEYS * 0.8) break;
  }
}

/**
 * Fixed-window limiter (in-process). Suitable for single-instance hosts (e.g. Hostinger Node).
 * For horizontal scale, replace with Redis/edge limiter.
 */
export function consumeRateLimitToken(key: string, max: number, windowMs: number): boolean {
  pruneIfNeeded();
  const now = Date.now();
  const b = store.get(key);
  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) {
    return false;
  }
  b.count += 1;
  return true;
}

export async function getRequestIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip")?.trim() ?? "unknown";
}
