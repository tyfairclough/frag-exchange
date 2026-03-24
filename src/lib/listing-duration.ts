/** Per-exchange listing window (plan: 90 days). */
export const LISTING_DURATION_MS = 90 * 24 * 60 * 60 * 1000;

export function listingExpiresAtFrom(listedAt: Date): Date {
  return new Date(listedAt.getTime() + LISTING_DURATION_MS);
}
