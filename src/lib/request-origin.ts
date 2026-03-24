import { headers } from "next/headers";

/**
 * Canonical base URL for links generated during a request (magic link emails).
 * Prefer NEXT_PUBLIC_APP_URL on Hostinger so links match the public domain.
 */
export async function getRequestOrigin(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) {
    return envUrl;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }

  const port = process.env.PORT || "3111";
  return `http://localhost:${port}`;
}
