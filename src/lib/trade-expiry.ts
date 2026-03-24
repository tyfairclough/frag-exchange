import { ExchangeKind } from "@/generated/prisma/enums";

const TRADE_MAX_DAYS = 30;

function addDaysUtc(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** End of the UTC calendar day for `d` (23:59:59.999 UTC). */
function endOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}

/**
 * Trade expiry: 30 days from the reference moment, or event date end (UTC day), whichever is sooner.
 * Group exchanges (or events without a date) use the 30-day window only.
 */
export function computeTradeExpiresAt(
  reference: Date,
  exchange: { kind: ExchangeKind; eventDate: Date | null },
): Date {
  const cap30 = addDaysUtc(reference, TRADE_MAX_DAYS);
  if (exchange.kind === ExchangeKind.EVENT && exchange.eventDate) {
    const eventCap = endOfUtcDay(exchange.eventDate);
    return cap30.getTime() <= eventCap.getTime() ? cap30 : eventCap;
  }
  return cap30;
}
