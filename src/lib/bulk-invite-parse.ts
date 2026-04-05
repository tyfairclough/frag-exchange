/** Max addresses per bulk send (client + server should agree). */
export const MAX_BULK_INVITES = 50;

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Split on commas and newlines; trim; drop empties; dedupe by normalized email (first wins). */
export function parseBulkInviteEmails(raw: string): string[] {
  const segments = raw.split(/[\n,]+/).map((s) => s.trim());
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const seg of segments) {
    if (!seg) continue;
    const n = normalizeInviteEmail(seg);
    if (seen.has(n)) continue;
    seen.add(n);
    ordered.push(n);
  }
  return ordered;
}
