/**
 * Development-only: when `REEFX_DEV_MAGIC_LINK_VIA_EMAIL=true`, the magic-link journey
 * sends email via Mailtrap (if configured) like production and does not add the check-email
 * debug token. Otherwise (unset/false), outbound email is skipped in dev and the debug
 * shortcut on /auth/check-email is used.
 */
export function isDevMagicLinkViaEmail(): boolean {
  return process.env.NODE_ENV === "development" && process.env.REEFX_DEV_MAGIC_LINK_VIA_EMAIL === "true";
}
